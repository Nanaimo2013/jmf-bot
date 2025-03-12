/**
 * JMF Hosting Discord Bot - Base Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This is the base manager class that all other managers extend from.
 * It provides common functionality, manager interaction capabilities,
 * and shared utilities that all managers can use.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;
const LoggerManager = require('./logger/logger.manager');

class BaseManager extends EventEmitter {
    constructor(name) {
        super();
        this.name = name;
        this.version = '1.0.0';
        this.modulesPath = path.join(__dirname, name, 'modules');
        this.modules = new Map();
        this._managers = new Map();
        this._initialized = false;
        this._shuttingDown = false;
        
        // Initialize logger
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
            directory: path.join(process.cwd(), 'logs', name)
        });
    }

    /**
     * Get another manager instance
     * @param {string} managerName - Name of the manager to get
     * @returns {Promise<BaseManager>} Manager instance
     */
    async getManager(managerName) {
        if (this._managers.has(managerName)) {
            return this._managers.get(managerName);
        }

        try {
            const managerPath = path.join(__dirname, managerName, `${managerName}.manager.js`);
            const ManagerClass = require(managerPath);
            const manager = new ManagerClass();
            await manager.initialize();
            this._managers.set(managerName, manager);
            return manager;
        } catch (error) {
            this.logger.error(this.name, `${this.logger.defaultIcons.error} Failed to load manager: ${managerName}`, error);
            throw error;
        }
    }

    /**
     * Load all modules for this manager
     * @returns {Promise<void>}
     */
    async loadModules() {
        try {
            this.logger.info(this.name, `${this.logger.defaultIcons.load} Loading modules...`);
            const files = await fs.readdir(this.modulesPath);
            const moduleFiles = files.filter(file => file.endsWith('.js') && !file.startsWith('_'));

            for (const file of moduleFiles) {
                const modulePath = path.join(this.modulesPath, file);
                const moduleClass = require(modulePath);
                const moduleInstance = new moduleClass(this);
                
                // Initialize module if it has an initialize method
                if (typeof moduleInstance.initialize === 'function') {
                    await moduleInstance.initialize();
                }

                this.modules.set(moduleInstance.name, moduleInstance);
                this.logger.info(this.name, `${this.logger.defaultIcons.add} Loaded module: ${moduleInstance.name}`);
            }

            this.logger.success(this.name, `${this.logger.defaultIcons.success} All modules loaded successfully (${this.modules.size} total)`);
        } catch (error) {
            this.logger.error(this.name, `${this.logger.defaultIcons.error} Error loading modules:`, error);
            throw error;
        }
    }

    /**
     * Get a specific module instance
     * @param {string} moduleName - Name of the module to get
     * @returns {Object} Module instance
     */
    getModule(moduleName) {
        const module = this.modules.get(moduleName);
        if (!module) {
            throw new Error(`Module '${moduleName}' not found in ${this.name} manager`);
        }
        return module;
    }

    /**
     * Initialize the manager
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        if (this._initialized) {
            this.logger.warn(this.name, `${this.logger.defaultIcons.alert} Manager already initialized`);
            return;
        }

        try {
            this.logger.info(this.name, `${this.logger.defaultIcons.start} Initializing manager...`);
            
            // Load configuration
            this.config = config;
            
            // Create necessary directories
            await this._ensureDirectories();
            
            // Load modules
            await this.loadModules();
            
            this._initialized = true;
            this.emit('initialized', { manager: this.name });
            this.logger.success(this.name, `${this.logger.defaultIcons.success} Manager initialized successfully`);
        } catch (error) {
            this.logger.error(this.name, `${this.logger.defaultIcons.error} Manager initialization failed:`, error);
            throw error;
        }
    }

    /**
     * Ensure required directories exist
     * @private
     */
    async _ensureDirectories() {
        const dirs = [
            this.modulesPath,
            path.join(process.cwd(), 'logs', this.name),
            path.join(process.cwd(), 'data', this.name)
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        if (this._shuttingDown) {
            this.logger.warn(this.name, `${this.logger.defaultIcons.alert} Shutdown already in progress`);
            return;
        }

        this._shuttingDown = true;
        this.logger.info(this.name, `${this.logger.defaultIcons.stop} Shutting down manager...`);
        
        try {
            // Clean up modules
            for (const [name, module] of this.modules) {
                try {
                    if (typeof module.shutdown === 'function') {
                        await module.shutdown();
                        this.logger.debug(this.name, `${this.logger.defaultIcons.success} Module ${name} shut down successfully`);
                    }
                } catch (error) {
                    this.logger.error(this.name, `${this.logger.defaultIcons.error} Failed to shut down module ${name}:`, error);
                }
            }

            // Clean up other managers
            for (const [name, manager] of this._managers) {
                try {
                    if (typeof manager.shutdown === 'function') {
                        await manager.shutdown();
                        this.logger.debug(this.name, `${this.logger.defaultIcons.success} Manager ${name} shut down successfully`);
                    }
                } catch (error) {
                    this.logger.error(this.name, `${this.logger.defaultIcons.error} Failed to shut down manager ${name}:`, error);
                }
            }

            this.emit('shutdown', { manager: this.name });
            this.logger.success(this.name, `${this.logger.defaultIcons.success} Manager shut down successfully`);
        } catch (error) {
            this.logger.error(this.name, `${this.logger.defaultIcons.error} Manager shutdown failed:`, error);
            throw error;
        } finally {
            this._shuttingDown = false;
            this._initialized = false;
        }
    }

    /**
     * Get the status of the manager and its modules
     * @returns {Promise<Object>} Status object
     */
    async getStatus() {
        const status = {
            name: this.name,
            version: this.version,
            initialized: this._initialized,
            shuttingDown: this._shuttingDown,
            modules: {},
            managers: Array.from(this._managers.keys())
        };

        // Get status from each module
        for (const [name, module] of this.modules) {
            try {
                status.modules[name] = typeof module.getStatus === 'function' 
                    ? await module.getStatus()
                    : { loaded: true };
            } catch (error) {
                this.logger.error(this.name, `${this.logger.defaultIcons.error} Failed to get status for module ${name}:`, error);
                status.modules[name] = { error: error.message };
            }
        }

        return status;
    }

    /**
     * Check if the manager is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this._initialized;
    }

    /**
     * Check if the manager is shutting down
     * @returns {boolean}
     */
    isShuttingDown() {
        return this._shuttingDown;
    }

    /**
     * Get all module names
     * @returns {string[]}
     */
    getModuleNames() {
        return Array.from(this.modules.keys());
    }

    /**
     * Get all manager names
     * @returns {string[]}
     */
    getManagerNames() {
        return Array.from(this._managers.keys());
    }
}

module.exports = BaseManager; 