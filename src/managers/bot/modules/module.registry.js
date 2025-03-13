/**
 * JMF Hosting Discord Bot - Module Registry
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides a centralized registry for all bot modules,
 * handling module loading, dependency injection, lifecycle management,
 * and inter-module communication.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const { Collection } = require('discord.js');

class ModuleRegistry extends BaseModule {
    /**
     * Create a new module registry
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Registry options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'module-registry',
            version: options.version || '1.0.0',
            description: 'Module registry for the bot',
            defaultConfig: {
                modulesPath: path.join(process.cwd(), 'src', 'managers', 'bot', 'modules'),
                autoDiscoverModules: true,
                moduleLoadOrder: [
                    'config-manager',
                    'error-handler',
                    'event-bus',
                    'permissions-manager',
                    'localization-manager',
                    'cooldown-manager',
                    'cache-manager',
                    'statistics-manager',
                    'scheduler-manager'
                ],
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Module storage
        this.modules = new Collection();
        
        // Module instances
        this.instances = new Collection();
        
        // Module dependencies
        this.dependencies = new Map();
        
        // Module states
        this.states = new Map();
        
        // Module events
        this.moduleEvents = new Map();
        
        // Module initialization promises
        this.initPromises = new Map();
        
        // Database connection status
        this._databaseConnected = false;
    }

    /**
     * Initialize the module registry
     * @param {Object} [config] - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Connect to database
        try {
            const database = await this.getDatabase();
            if (database) {
                this._databaseConnected = true;
                this.log('info', 'Connected to database');
            }
        } catch (error) {
            this.log('warn', `Failed to connect to database: ${error.message}`);
        }
        
        // Load module definitions
        await this._loadModuleDefinitions();
        
        // Auto-discover modules if enabled
        if (this.getConfig('autoDiscoverModules')) {
            await this._discoverModules();
        }
        
        // Register event handlers
        this._registerEventHandlers();
        
        this.log('info', `Module registry initialized with ${this.modules.size} modules`);
    }

    /**
     * Load module definitions
     * @returns {Promise<void>}
     * @private
     */
    async _loadModuleDefinitions() {
        try {
            // Import the modules index
            const modulesIndex = require('./index');
            
            // Load modules from the registry
            if (modulesIndex.registry) {
                for (const [name, ModuleClass] of Object.entries(modulesIndex.registry)) {
                    this.modules.set(name, {
                        name,
                        path: null, // No file path for pre-registered modules
                        ModuleClass,
                        dependencies: [],
                        isCore: true
                    });
                    
                    this.log('debug', `Registered core module: ${name}`);
                }
            }
        } catch (error) {
            this.log('error', `Failed to load module definitions: ${error.message}`);
        }
    }

    /**
     * Discover modules in the modules directory
     * @returns {Promise<void>}
     * @private
     */
    async _discoverModules() {
        const modulesPath = this.getConfig('modulesPath');
        
        try {
            const files = await fs.readdir(modulesPath);
            
            for (const file of files) {
                // Skip directories, non-JS files, and index.js
                if (file === 'index.js' || !file.endsWith('.js')) {
                    continue;
                }
                
                const modulePath = path.join(modulesPath, file);
                const moduleName = file.replace(/\.js$/, '');
                
                // Skip if module is already registered
                if (this.modules.has(moduleName)) {
                    continue;
                }
                
                try {
                    const ModuleClass = require(modulePath);
                    
                    // Ensure it's a valid module class
                    if (typeof ModuleClass !== 'function' || !(ModuleClass.prototype instanceof BaseModule)) {
                        this.log('warn', `Skipping invalid module: ${moduleName}`);
                        continue;
                    }
                    
                    this.modules.set(moduleName, {
                        name: moduleName,
                        path: modulePath,
                        ModuleClass,
                        dependencies: [],
                        isCore: false
                    });
                    
                    this.log('debug', `Discovered module: ${moduleName}`);
                } catch (error) {
                    this.log('error', `Failed to load module ${moduleName}: ${error.message}`);
                }
            }
        } catch (error) {
            this.log('error', `Failed to discover modules: ${error.message}`);
        }
    }

    /**
     * Register event handlers
     * @private
     */
    _registerEventHandlers() {
        // Listen for module events
        this.manager.on('moduleInitialized', (data) => {
            this.states.set(data.module, 'initialized');
            this.log('debug', `Module ${data.module} initialized`);
        });
        
        this.manager.on('moduleError', (data) => {
            this.states.set(data.module, 'error');
            this.log('error', `Module ${data.module} error: ${data.error}`);
        });
        
        this.manager.on('moduleShutdown', (data) => {
            this.states.set(data.module, 'shutdown');
            this.log('debug', `Module ${data.module} shut down`);
        });
    }

    /**
     * Get a module instance
     * @param {string} moduleName - Module name
     * @returns {Promise<Object>} Module instance
     */
    async getModule(moduleName) {
        // Return existing instance if available
        if (this.instances.has(moduleName)) {
            return this.instances.get(moduleName);
        }
        
        // Check if module is registered
        if (!this.modules.has(moduleName)) {
            throw new Error(`Module not found: ${moduleName}`);
        }
        
        // Check if module is already being initialized
        if (this.initPromises.has(moduleName)) {
            return this.initPromises.get(moduleName);
        }
        
        // Initialize module
        const initPromise = this._initializeModule(moduleName);
        this.initPromises.set(moduleName, initPromise);
        
        try {
            const instance = await initPromise;
            this.initPromises.delete(moduleName);
            return instance;
        } catch (error) {
            this.initPromises.delete(moduleName);
            throw error;
        }
    }

    /**
     * Initialize a module
     * @param {string} moduleName - Module name
     * @returns {Promise<Object>} Module instance
     * @private
     */
    async _initializeModule(moduleName) {
        const moduleInfo = this.modules.get(moduleName);
        
        if (!moduleInfo) {
            throw new Error(`Module not found: ${moduleName}`);
        }
        
        try {
            // Create module instance
            const instance = new moduleInfo.ModuleClass(this.manager);
            
            // Store instance
            this.instances.set(moduleName, instance);
            
            // Initialize module
            await instance.initialize();
            
            // Update state
            this.states.set(moduleName, 'initialized');
            
            this.log('info', `Module ${moduleName} initialized`);
            
            return instance;
        } catch (error) {
            this.states.set(moduleName, 'error');
            this.log('error', `Failed to initialize module ${moduleName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Initialize modules in the correct order
     * @returns {Promise<void>}
     */
    async initializeModules() {
        const moduleLoadOrder = this.getConfig('moduleLoadOrder');
        
        // Initialize modules in order
        for (const moduleName of moduleLoadOrder) {
            try {
                await this.getModule(moduleName);
            } catch (error) {
                this.log('error', `Failed to initialize module ${moduleName}: ${error.message}`);
            }
        }
        
        // Initialize any remaining modules
        for (const [moduleName] of this.modules) {
            if (!moduleLoadOrder.includes(moduleName) && !this.instances.has(moduleName)) {
                try {
                    await this.getModule(moduleName);
                } catch (error) {
                    this.log('error', `Failed to initialize module ${moduleName}: ${error.message}`);
                }
            }
        }
    }

    /**
     * Get all module instances
     * @returns {Collection<string, Object>} Module instances
     */
    getAllModules() {
        return this.instances;
    }

    /**
     * Get module state
     * @param {string} moduleName - Module name
     * @returns {string|null} Module state
     */
    getModuleState(moduleName) {
        return this.states.get(moduleName) || null;
    }

    /**
     * Check if a module is initialized
     * @param {string} moduleName - Module name
     * @returns {boolean} Whether the module is initialized
     */
    isModuleInitialized(moduleName) {
        return this.states.get(moduleName) === 'initialized';
    }

    /**
     * Reload a module
     * @param {string} moduleName - Module name
     * @returns {Promise<Object>} Reloaded module instance
     */
    async reloadModule(moduleName) {
        // Check if module exists
        if (!this.modules.has(moduleName)) {
            throw new Error(`Module not found: ${moduleName}`);
        }
        
        // Get module info
        const moduleInfo = this.modules.get(moduleName);
        
        // Get existing instance
        const instance = this.instances.get(moduleName);
        
        // Shut down existing instance if it exists
        if (instance) {
            try {
                await instance.shutdown();
                this.log('debug', `Module ${moduleName} shut down for reload`);
            } catch (error) {
                this.log('warn', `Error shutting down module ${moduleName}: ${error.message}`);
            }
        }
        
        // Remove from instances
        this.instances.delete(moduleName);
        
        // Clear module from require cache if it has a path
        if (moduleInfo.path) {
            delete require.cache[require.resolve(moduleInfo.path)];
            
            // Reload module class
            try {
                moduleInfo.ModuleClass = require(moduleInfo.path);
            } catch (error) {
                this.log('error', `Failed to reload module ${moduleName}: ${error.message}`);
                throw error;
            }
        }
        
        // Initialize module
        return await this.getModule(moduleName);
    }

    /**
     * Shutdown all modules
     * @returns {Promise<void>}
     */
    async shutdownModules() {
        // Shutdown in reverse order
        const moduleLoadOrder = [...this.getConfig('moduleLoadOrder')].reverse();
        
        // Shutdown modules in reverse order
        for (const moduleName of moduleLoadOrder) {
            const instance = this.instances.get(moduleName);
            
            if (instance) {
                try {
                    await instance.shutdown();
                    this.log('debug', `Module ${moduleName} shut down`);
                } catch (error) {
                    this.log('error', `Error shutting down module ${moduleName}: ${error.message}`);
                }
            }
        }
        
        // Shutdown any remaining modules
        for (const [moduleName, instance] of this.instances) {
            if (!moduleLoadOrder.includes(moduleName)) {
                try {
                    await instance.shutdown();
                    this.log('debug', `Module ${moduleName} shut down`);
                } catch (error) {
                    this.log('error', `Error shutting down module ${moduleName}: ${error.message}`);
                }
            }
        }
        
        // Clear instances
        this.instances.clear();
        this.states.clear();
        this.initPromises.clear();
    }

    /**
     * Clean up resources
     * @returns {Promise<void>}
     */
    async shutdown() {
        // Shutdown all modules
        await this.shutdownModules();
        
        // Clear collections
        this.modules.clear();
        this.instances.clear();
        this.dependencies.clear();
        this.states.clear();
        this.moduleEvents.clear();
        this.initPromises.clear();
        
        await super.shutdown();
        
        this.log('info', 'Module registry shut down');
    }
}

module.exports = ModuleRegistry; 