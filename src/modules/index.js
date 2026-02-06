/**
 * JMF Hosting Discord Bot - Module Registry
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This class manages the loading, initialization, and lifecycle of all modules.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const fs = require('fs').promises;
const path = require('path');
const Module = require('./base.module');

class ModuleRegistry {
    constructor(options = {}) {
        this.modules = new Map();
        this.initialized = false;
        this.running = false;
        
        // Get logger from options or global managers
        this.logger = options.logger || global.managers?.logger || console;
        
        // Get bot manager from options or global managers
        this.bot = options.bot || global.managers?.bot;
        
        // Get config manager from global managers
        this.configManager = global.managers?.config;
        
        // Get database manager from global managers
        this.database = global.managers?.database;
    }
    
    /**
     * Initialize the module registry and all modules
     * @param {Client} client - The Discord.js client
     * @returns {Promise<boolean>}
     */
    async initialize(client) {
        try {
            if (this.initialized) {
                this.logger.warn('ModuleRegistry', 'Module registry already initialized');
                return true;
            }
            
            this.logger.info('ModuleRegistry', 'Initializing module registry...');
            
            // Load configuration
            const config = this.configManager.getConfig();
            if (!config) {
                throw new Error('Failed to load configuration');
            }
            
            // Load modules
            await this.loadModules();
            
            // Initialize modules in dependency order
            await this.initializeModules(client);
            
            this.initialized = true;
            this.logger.info('ModuleRegistry', 'Module registry initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('ModuleRegistry', `Failed to initialize module registry: ${error.message}`, error.stack);
            return false;
        }
    }
    
    /**
     * Load all modules from the modules directory
     * @returns {Promise<void>}
     * @private
     */
    async loadModules() {
        try {
            this.logger.info('ModuleRegistry', 'Loading modules...');
            
            // Get modules directory from config
            const modulesDir = this.configManager.getConfig('modules.directory', './src/modules');
            const modulesPath = path.resolve(process.cwd(), modulesDir);
            
            // Get list of entries (files and directories)
            const entries = await fs.readdir(modulesPath, { withFileTypes: true });
            
            // Process each entry
            for (const entry of entries) {
                try {
                    // Skip special files and directories
                    if (entry.name.startsWith('.') || entry.name === 'base.module.js' || entry.name === 'index.js') {
                        continue;
                    }
                    
                    let moduleFile;
                    if (entry.isDirectory()) {
                        // If it's a directory, look for index.js
                        moduleFile = path.join(modulesPath, entry.name, 'index.js');
                    } else if (entry.isFile() && entry.name.endsWith('.js')) {
                        // If it's a JS file, use it directly
                        moduleFile = path.join(modulesPath, entry.name);
                    } else {
                        continue;
                    }
                    
                    // Skip if module file doesn't exist
                    if (!(await fs.stat(moduleFile).catch(() => false))) {
                        continue;
                    }
                    
                    // Load module class
                    const ModuleClass = require(moduleFile);
                    
                    // Validate module class
                    if (!(ModuleClass.prototype instanceof Module)) {
                        this.logger.warn('ModuleRegistry', `Module ${entry.name} does not extend base Module class`);
                        continue;
                    }
                    
                    // Create module instance
                    const module = new ModuleClass({
                        name: entry.name.replace('.js', ''),
                        description: ModuleClass.description || 'No description provided',
                        enabled: true,
                        dependencies: ModuleClass.dependencies || []
                    });
                    
                    // Add module to registry
                    this.modules.set(entry.name.replace('.js', ''), module);
                    this.logger.info('ModuleRegistry', `Loaded module: ${entry.name.replace('.js', '')}`);
                } catch (error) {
                    this.logger.error('ModuleRegistry', `Failed to load module ${entry.name}: ${error.message}`);
                }
            }
            
            this.logger.info('ModuleRegistry', `Loaded ${this.modules.size} modules`);
        } catch (error) {
            throw new Error(`Failed to load modules: ${error.message}`);
        }
    }
    
    /**
     * Initialize modules in dependency order
     * @param {Client} client - The Discord.js client
     * @returns {Promise<void>}
     * @private
     */
    async initializeModules(client) {
        try {
            this.logger.info('ModuleRegistry', 'Initializing modules...');
            
            // Get modules in dependency order
            const moduleOrder = this.getModuleOrder();
            
            // Initialize each module
            for (const moduleName of moduleOrder) {
                const module = this.modules.get(moduleName);
                if (!module) continue;
                
                try {
                    await module.initialize(client);
                    this.logger.info('ModuleRegistry', `Initialized module: ${moduleName}`);
                } catch (error) {
                    this.logger.error('ModuleRegistry', `Failed to initialize module ${moduleName}: ${error.message}`);
                    throw error;
                }
            }
            
            this.logger.info('ModuleRegistry', 'All modules initialized');
        } catch (error) {
            throw new Error(`Failed to initialize modules: ${error.message}`);
        }
    }
    
    /**
     * Start all initialized modules
     * @returns {Promise<boolean>}
     */
    async start() {
        try {
            if (this.running) {
                this.logger.warn('ModuleRegistry', 'Modules already running');
                return true;
            }
            
            if (!this.initialized) {
                throw new Error('Module registry not initialized');
            }
            
            this.logger.info('ModuleRegistry', 'Starting modules...');
            
            // Get modules in dependency order
            const moduleOrder = this.getModuleOrder();
            
            // Start each module
            for (const moduleName of moduleOrder) {
                const module = this.modules.get(moduleName);
                if (!module || !module.isInitialized) continue;
                
                try {
                    await module.start();
                    this.logger.info('ModuleRegistry', `Started module: ${moduleName}`);
                } catch (error) {
                    this.logger.error('ModuleRegistry', `Failed to start module ${moduleName}: ${error.message}`);
                    throw error;
                }
            }
            
            this.running = true;
            this.logger.info('ModuleRegistry', 'All modules started');
            return true;
        } catch (error) {
            this.logger.error('ModuleRegistry', `Failed to start modules: ${error.message}`, error.stack);
            return false;
        }
    }
    
    /**
     * Stop all running modules
     * @returns {Promise<boolean>}
     */
    async stop() {
        try {
            if (!this.running) {
                this.logger.warn('ModuleRegistry', 'Modules not running');
                return true;
            }
            
            this.logger.info('ModuleRegistry', 'Stopping modules...');
            
            // Get modules in reverse dependency order
            const moduleOrder = this.getModuleOrder().reverse();
            
            // Stop each module
            for (const moduleName of moduleOrder) {
                const module = this.modules.get(moduleName);
                if (!module || !module.isRunning) continue;
                
                try {
                    await module.stop();
                    this.logger.info('ModuleRegistry', `Stopped module: ${moduleName}`);
                } catch (error) {
                    this.logger.error('ModuleRegistry', `Failed to stop module ${moduleName}: ${error.message}`);
                }
            }
            
            this.running = false;
            this.logger.info('ModuleRegistry', 'All modules stopped');
            return true;
        } catch (error) {
            this.logger.error('ModuleRegistry', `Failed to stop modules: ${error.message}`, error.stack);
            return false;
        }
    }
    
    /**
     * Get modules in dependency order
     * @returns {string[]}
     * @private
     */
    getModuleOrder() {
        const visited = new Set();
        const visiting = new Set();
        const order = [];
        
        const visit = (moduleName) => {
            if (visited.has(moduleName)) return;
            if (visiting.has(moduleName)) {
                throw new Error(`Circular dependency detected: ${Array.from(visiting).join(' -> ')} -> ${moduleName}`);
            }
            
            visiting.add(moduleName);
            
            const module = this.modules.get(moduleName);
            if (module) {
                for (const dependency of module.dependencies) {
                    visit(dependency);
                }
            }
            
            visiting.delete(moduleName);
            visited.add(moduleName);
            order.push(moduleName);
        };
        
        for (const moduleName of this.modules.keys()) {
            visit(moduleName);
        }
        
        return order;
    }
    
    /**
     * Get a module by name
     * @param {string} name - The name of the module
     * @returns {Module|null}
     */
    getModule(name) {
        return this.modules.get(name) || null;
    }
    
    /**
     * Get the status of all modules
     * @returns {Object}
     */
    getStatus() {
        const status = {};
        for (const [name, module] of this.modules) {
            status[name] = module.getStatus();
        }
        return status;
    }

    /**
     * Get all registered modules
     * @returns {Map<string, Module>}
     */
    getAllModules() {
        return this.modules;
    }
}

// Export the ModuleRegistry class
module.exports = ModuleRegistry; 