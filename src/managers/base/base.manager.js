/**
 * JMF Hosting Discord Bot - Base Manager
 * Version: 1.2.0
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
const { PermissionManager } = require('./permissions');
const utils = require('./utilities');
const managerUtils = require('./manager.utils');

class BaseManager extends EventEmitter {
    /**
     * Create a new base manager
     * @param {string} name - Manager name
     * @param {Object} [options] - Manager options
     * @param {string} [options.version] - Manager version
     * @param {string} [options.configPath] - Custom config path
     * @param {Object} [options.defaultConfig] - Default configuration
     * @param {string[]} [options.dependencies] - Manager dependencies
     * @param {Object} [options.hooks] - Custom hooks
     * @param {Object} [options.events] - Custom event handlers
     */
    constructor(name, options = {}) {
        super();
        this.name = name;
        this.version = options.version || '1.2.0';
        this.modulesPath = path.join(__dirname, '..', name, 'modules');
        this.modules = new Map();
        this._managers = new Map();
        this._initialized = false;
        this._shuttingDown = false;
        this._dependencies = options.dependencies || [];
        this._optionalDependencies = [];
        this._hooks = new Map();
        this._permissionManager = new PermissionManager();
        this._config = options.defaultConfig || {};
        this._configPath = options.configPath || path.join(process.cwd(), 'config', this.name, 'config.json');
        this._metrics = {
            startTime: Date.now(),
            operations: 0,
            errors: 0,
            lastOperation: null,
            performance: {
                operations: new Map(),
                averages: new Map()
            }
        };
        this._database = null;
        this._eventBus = null;
        this._logger = null;
        
        // Basic console logger until the real logger is available
        this.logger = {
            debug: (category, message, ...meta) => console.debug(`[${category}] DEBUG: ${message}`, ...meta),
            info: (category, message, ...meta) => console.info(`[${category}] INFO: ${message}`, ...meta),
            warn: (category, message, ...meta) => console.warn(`[${category}] WARN: ${message}`, ...meta),
            error: (category, message, ...meta) => console.error(`[${category}] ERROR: ${message}`, ...meta),
            success: (category, message, ...meta) => console.log(`[${category}] SUCCESS: ${message}`, ...meta)
        };
        
        // Register default hooks
        this._registerDefaultHooks();
        
        // Register custom hooks if provided
        if (options.hooks) {
            for (const [hookName, handlers] of Object.entries(options.hooks)) {
                const hookHandlers = Array.isArray(handlers) ? handlers : [handlers];
                for (const handler of hookHandlers) {
                    this.registerHook(hookName, handler);
                }
            }
        }

        // Register default events
        managerUtils.registerDefaultEvents(this);
        
        // Register custom event handlers if provided
        if (options.events) {
            for (const [eventName, handler] of Object.entries(options.events)) {
                this.registerEvent(eventName, handler);
            }
        }
    }

    /**
     * Set dependencies for this manager
     * @param {string[]} dependencies - Array of manager names this manager depends on
     */
    setDependencies(dependencies = []) {
        this._dependencies = Array.isArray(dependencies) ? dependencies : [dependencies];
    }

    /**
     * Set optional dependencies for this manager
     * @param {string[]} dependencies - Array of manager names this manager optionally depends on
     */
    setOptionalDependencies(dependencies = []) {
        this._optionalDependencies = Array.isArray(dependencies) ? dependencies : [dependencies];
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
            const managerPath = path.join(__dirname, '..', managerName, `${managerName}.manager.js`);
            
            // Check if manager file exists
            try {
                await fs.access(managerPath);
            } catch (error) {
                throw new Error(`Manager file not found: ${managerPath}`);
            }
            
            const ManagerClass = require(managerPath);
            const manager = new ManagerClass();
            
            // Initialize manager if not already initialized
            if (!manager.isInitialized()) {
                await manager.initialize();
            }
            
            this._managers.set(managerName, manager);
            return manager;
        } catch (error) {
            this.logger.error(this.name, `Failed to load manager: ${managerName}`, error);
            throw error;
        }
    }

    /**
     * Load all modules for this manager
     * @param {Object} [options] - Module loading options
     * @param {boolean} [options.reload=false] - Whether to reload existing modules
     * @returns {Promise<Map<string, Object>>} Loaded modules
     */
    async loadModules(options = { reload: false }) {
        return managerUtils.loadModules(this, options);
    }

    /**
     * Get a specific module instance
     * @param {string} moduleName - Name of the module to get
     * @returns {Object} Module instance
     */
    getModule(moduleName) {
        const module = this.modules.get(moduleName);
        if (!module) {
            const error = new Error(`Module '${moduleName}' not found in ${this.name} manager`);
            this.logger.error(this.name, `${this.logger.defaultIcons.error} ${error.message}`);
            throw error;
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
            this.logger.warn(this.name, `Manager already initialized`);
            return;
        }

        const startTime = Date.now();
        try {
            this.logger.info(this.name, `Initializing manager...`);
            
            // Run before initialize hook
            await managerUtils.runHook(this, 'beforeInitialize');
            
            // Load configuration
            await this.loadConfig();
            this._config = utils.deepMerge(this._config, config);
            
            // Initialize permission manager
            this._permissionManager.initialize(this._config.permissions || {});
            
            // Create necessary directories
            await managerUtils.ensureDirectories(this);
            
            // Initialize dependencies
            await managerUtils.initializeDependencies(this);
            
            // Load modules
            await this.loadModules();
            
            // Run after initialization hook
            await managerUtils.runHook(this, 'afterInitialize');
            
            this._initialized = true;
            const duration = Date.now() - startTime;
            this.emit('initialized', { manager: this.name, duration });
            this.logger.success(this.name, `Manager initialized successfully in ${duration}ms`);
        } catch (error) {
            this.logger.error(this.name, `Manager initialization failed:`, error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Register a hook
     * @param {string} hookName - Name of the hook
     * @param {Function} callback - Hook callback function
     */
    registerHook(hookName, callback) {
        if (!this._hooks.has(hookName)) {
            this._hooks.set(hookName, []);
        }
        
        this._hooks.get(hookName).push(callback);
        this.logger.debug(this.name, `Registered hook: ${hookName}`);
    }

    /**
     * Execute an operation with hooks, error handling, and performance tracking
     * @param {string} operationName - Name of the operation
     * @param {Function} operation - Operation function
     * @param {Object} [data] - Operation data
     * @returns {Promise<any>} Operation result
     */
    async executeOperation(operationName, operation, data = {}) {
        return managerUtils.executeOperation(this, operationName, operation, data);
    }

    /**
     * Check if a user has permission to perform an action
     * @param {string} userId - User ID
     * @param {string} permission - Permission to check
     * @returns {boolean} True if the user has permission
     */
    hasPermission(userId, permission) {
        return this._permissionManager.hasPermission(userId, permission);
    }

    /**
     * Set permissions for a user
     * @param {string} userId - User ID
     * @param {string[]} roles - Array of role names
     * @param {string[]} permissions - Array of additional permission flags
     */
    setUserPermissions(userId, roles = [], permissions = []) {
        this._permissionManager.setUserPermissions(userId, roles, permissions);
    }

    /**
     * Get configuration value
     * @param {string} key - Configuration key
     * @param {any} defaultValue - Default value if key not found
     * @returns {any} Configuration value
     */
    getConfig(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this._config;
        
        for (const k of keys) {
            if (value === undefined || value === null || typeof value !== 'object') {
                return defaultValue;
            }
            value = value[k];
        }
        
        return value !== undefined ? value : defaultValue;
    }

    /**
     * Set configuration value
     * @param {string} key - Configuration key
     * @param {any} value - Configuration value
     */
    setConfig(key, value) {
        const keys = key.split('.');
        let obj = this._config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!obj[k] || typeof obj[k] !== 'object') {
                obj[k] = {};
            }
            obj = obj[k];
        }
        
        obj[keys[keys.length - 1]] = value;
        
        // Emit config changed event
        this.emit('configChanged', { key, value });
    }

    /**
     * Save configuration to file
     * @returns {Promise<void>}
     */
    async saveConfig() {
        return managerUtils.saveConfig(this);
    }

    /**
     * Load configuration from file
     * @returns {Promise<Object>} Loaded configuration
     */
    async loadConfig() {
        return managerUtils.loadConfig(this);
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        if (this._shuttingDown) {
            this.logger.warn(this.name, `Shutdown already in progress`);
            return;
        }

        this._shuttingDown = true;
        try {
            this.logger.info(this.name, `Shutting down manager...`);
            
            // Run before shutdown hook
            await managerUtils.runHook(this, 'beforeShutdown');
            
            // Save configuration
            await this.saveConfig();
            
            // Clean up modules
            for (const [name, module] of this.modules) {
                try {
                    if (typeof module.shutdown === 'function') {
                        await module.shutdown();
                        this.logger.debug(this.name, `Module ${name} shut down successfully`);
                    }
                } catch (error) {
                    this.logger.error(this.name, `Failed to shut down module ${name}:`, error);
                }
            }

            // Clean up other managers
            for (const [name, manager] of this._managers) {
                try {
                    if (typeof manager.shutdown === 'function' && manager.isInitialized() && !manager.isShuttingDown()) {
                        await manager.shutdown();
                        this.logger.debug(this.name, `Manager ${name} shut down successfully`);
                    }
                } catch (error) {
                    this.logger.error(this.name, `Failed to shut down manager ${name}:`, error);
                }
            }

            // Run after shutdown hook
            await managerUtils.runHook(this, 'afterShutdown');

            this.emit('shutdown');
            this.logger.success(this.name, `Manager shut down successfully`);
        } catch (error) {
            this.logger.error(this.name, `Manager shutdown failed:`, error);
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
        return managerUtils.getStatus(this);
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

    /**
     * Register an event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {this} For method chaining
     */
    registerEvent(event, handler) {
        this.on(event, handler);
        this.logger.debug(this.name, `Registered event handler for: ${event}`);
        return this;
    }

    /**
     * Emit an event with data
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emitEvent(event, data = {}) {
        data.manager = this.name;
        data.timestamp = new Date();
        this.emit(event, data);
        this.logger.debug(this.name, `Emitted event: ${event}`);
    }
    
    /**
     * Reload the manager configuration
     * @returns {Promise<Object>} Updated configuration
     */
    async reloadConfig() {
        this.logger.info(this.name, `Reloading configuration...`);
        return await this.loadConfig();
    }
    
    /**
     * Reload a specific module
     * @param {string} moduleName - Name of the module to reload
     * @returns {Promise<Object>} Reloaded module
     */
    async reloadModule(moduleName) {
        this.logger.info(this.name, `Reloading module: ${moduleName}`);
        
        // Unload module
        await managerUtils.unloadModule(this, moduleName);
        
        // Load modules with reload option
        await this.loadModules({ reload: true });
        
        // Return the reloaded module
        return this.getModule(moduleName);
    }
    
    /**
     * Get performance metrics for the manager
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return managerUtils.getPerformanceMetrics(this);
    }
    
    /**
     * Create a new module instance
     * @param {string} moduleName - Name of the module to create
     * @param {Object} [options] - Module options
     * @returns {Promise<Object>} Created module
     */
    async createModule(moduleName, options = {}) {
        const modulePath = path.join(this.modulesPath, `${moduleName}.js`);
        
        try {
            // Check if module already exists
            try {
                await fs.access(modulePath);
                throw new Error(`Module ${moduleName} already exists`);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
            
            // Create module file
            const moduleTemplate = `/**
 * JMF Hosting Discord Bot - ${this.name} ${moduleName} Module
 * Version: 1.0.0
 * Last Updated: ${new Date().toLocaleDateString('en-US')}
 * 
 * ${options.description || `This module provides ${moduleName} functionality for the ${this.name} manager.`}
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');

class ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module extends BaseModule {
    /**
     * Create a new ${moduleName} module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager, {
            name: '${moduleName}',
            version: '1.0.0',
            defaultConfig: ${JSON.stringify(options.defaultConfig || {}, null, 4)}
        });
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Add initialization code here
        
        this.log('info', '${moduleName} module initialized');
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down ${moduleName} module');
        
        // Add cleanup code here
        
        await super.shutdown();
    }
}

module.exports = ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module;`;
            
            await fs.writeFile(modulePath, moduleTemplate);
            this.logger.info(this.name, `Created module: ${moduleName}`);
            
            // Load the new module
            await this.loadModules({ reload: true });
            
            return this.getModule(moduleName);
        } catch (error) {
            this.logger.error(this.name, `Failed to create module: ${moduleName}`, error);
            throw error;
        }
    }
    
    /**
     * Delete a module
     * @param {string} moduleName - Name of the module to delete
     * @returns {Promise<boolean>} Whether the module was deleted
     */
    async deleteModule(moduleName) {
        const modulePath = path.join(this.modulesPath, `${moduleName}.js`);
        
        try {
            // Unload module if it's loaded
            if (this.modules.has(moduleName)) {
                await managerUtils.unloadModule(this, moduleName);
            }
            
            // Delete module file
            await fs.unlink(modulePath);
            this.logger.info(this.name, `Deleted module: ${moduleName}`);
            
            return true;
        } catch (error) {
            this.logger.error(this.name, `Failed to delete module: ${moduleName}`, error);
            return false;
        }
    }
    
    /**
     * Broadcast an event to all modules
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    broadcastToModules(event, data = {}) {
        for (const [name, module] of this.modules) {
            if (module.emit) {
                module.emit(event, { ...data, source: 'manager' });
                this.logger.debug(this.name, `Broadcast event ${event} to module ${name}`);
            }
        }
    }
    
    /**
     * Execute a command on a module
     * @param {string} moduleName - Name of the module
     * @param {string} command - Command name
     * @param {Object} context - Command context
     * @param {Array} args - Command arguments
     * @returns {Promise<any>} Command result
     */
    async executeModuleCommand(moduleName, command, context, args = []) {
        const module = this.getModule(moduleName);
        
        if (typeof module.executeCommand !== 'function') {
            throw new Error(`Module ${moduleName} does not support commands`);
        }
        
        return await module.executeCommand(command, context, args);
    }

    /**
     * Get the database instance
     * @returns {Object|null} Database manager instance
     */
    async getDatabase() {
        if (this._database) {
            return this._database;
        }
        
        try {
            const databaseManager = await this.getManager('database');
            if (databaseManager && databaseManager.isInitialized()) {
                this._database = databaseManager;
                return this._database;
            }
            return null;
        } catch (error) {
            this.log('error', `Failed to get database manager: ${error.message}`);
            return null;
        }
    }

    /**
     * Execute a database query
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async dbQuery(sql, params = []) {
        const database = await this.getDatabase();
        if (!database) {
            throw new Error('Database manager not available');
        }
        
        return database.query(sql, params);
    }

    /**
     * Begin a database transaction
     * @returns {Promise<void>}
     */
    async dbBeginTransaction() {
        const database = await this.getDatabase();
        if (!database) {
            throw new Error('Database manager not available');
        }
        
        return database.beginTransaction();
    }

    /**
     * Commit a database transaction
     * @returns {Promise<void>}
     */
    async dbCommit() {
        const database = await this.getDatabase();
        if (!database) {
            throw new Error('Database manager not available');
        }
        
        return database.commit();
    }

    /**
     * Rollback a database transaction
     * @returns {Promise<void>}
     */
    async dbRollback() {
        const database = await this.getDatabase();
        if (!database) {
            throw new Error('Database manager not available');
        }
        
        return database.rollback();
    }

    /**
     * Get the event bus instance
     * @returns {Object|null} Event bus instance
     */
    async getEventBus() {
        if (this._eventBus) {
            return this._eventBus;
        }
        
        try {
            const botManager = await this.getManager('bot');
            if (botManager && botManager.isInitialized()) {
                const eventBus = botManager.getModule('event-bus');
                if (eventBus) {
                    this._eventBus = eventBus;
                    return this._eventBus;
                }
            }
            return null;
        } catch (error) {
            this.log('error', `Failed to get event bus: ${error.message}`);
            return null;
        }
    }

    /**
     * Publish an event to the event bus
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     * @param {string} namespace - Event namespace
     * @returns {Promise<boolean>} Success status
     */
    async publishEvent(eventName, data = {}, namespace = 'system') {
        const eventBus = await this.getEventBus();
        if (!eventBus) {
            this.emit(eventName, data);
            return false;
        }
        
        return eventBus.publish(eventName, data, namespace);
    }

    /**
     * Subscribe to an event on the event bus
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Subscription options
     * @returns {Promise<string|null>} Subscription ID or null
     */
    async subscribeToEvent(eventName, handler, options = {}) {
        const eventBus = await this.getEventBus();
        if (!eventBus) {
            this.on(eventName, handler);
            return null;
        }
        
        return eventBus.subscribe(eventName, handler, options);
    }

    /**
     * Register default hooks
     * @private
     */
    _registerDefaultHooks() {
        // Register initialization hook
        this.registerHook('afterInitialize', async () => {
            // Try to connect to the database if it's a dependency
            if (this._dependencies.includes('database')) {
                const database = await this.getDatabase();
                if (database) {
                    if (this.logger) {
                        this.logger.info(this.name, `Connected to database for ${this.name} manager`);
                    }
                }
            }
            
            // Try to connect to the event bus if bot is a dependency
            if (this._dependencies.includes('bot')) {
                const eventBus = await this.getEventBus();
                if (eventBus) {
                    if (this.logger) {
                        this.logger.info(this.name, `Connected to event bus for ${this.name} manager`);
                    }
                }
            }
        });
        
        // Register shutdown hook
        this.registerHook('beforeShutdown', async () => {
            // Clean up database resources
            if (this._database) {
                if (this.logger) {
                    this.logger.info(this.name, `Cleaning up database resources for ${this.name} manager`);
                }
            }
            
            // Clean up event bus subscriptions
            if (this._eventBus) {
                if (this.logger) {
                    this.logger.info(this.name, `Cleaning up event bus subscriptions for ${this.name} manager`);
                }
            }
        });
    }

    /**
     * Load a specific module
     * @param {string} moduleName - Name of the module to load
     * @param {string} modulePath - Path to the module file
     * @param {Object} [config={}] - Module configuration
     * @returns {Promise<Object>} Loaded module
     */
    async loadModule(moduleName, modulePath, config = {}) {
        try {
            this.logger.info(this.name, `Initializing module: ${moduleName}`);
            
            // Run before module load hook
            await managerUtils.runHook(this, 'beforeModuleLoad', { moduleName, modulePath });
            
            // Load module
            const moduleExport = require(modulePath);
            const ModuleClass = moduleExport.default || moduleExport;
            
            // Create module instance
            const moduleInstance = new ModuleClass(this, config);
            
            // Initialize module if it has an initialize method
            if (typeof moduleInstance.initialize === 'function') {
                await moduleInstance.initialize(config);
            }
            
            // Run after module load hook
            await managerUtils.runHook(this, 'afterModuleLoad', { module: moduleInstance });
            
            // Add module to manager
            if (this.modules instanceof Map) {
                this.modules.set(moduleName, moduleInstance);
            } else {
                this.modules[moduleName] = moduleInstance;
            }
            
            this.logger.info(this.name, `Loaded module: ${moduleName}`);
            return moduleInstance;
        } catch (error) {
            this.logger.error(this.name, `Failed to load module: ${moduleName}`, error);
            throw error;
        }
    }

    /**
     * Load a dependency manager
     * @param {string} dependencyName - Name of the dependency manager
     * @returns {Promise<Object>} Dependency manager instance
     */
    async loadDependency(dependencyName) {
        try {
            // Check if dependency is already loaded
            if (this._managers.has(dependencyName)) {
                return this._managers.get(dependencyName);
            }
            
            // Check if dependency is available in global managers
            if (global.managers && global.managers[dependencyName]) {
                const dependency = global.managers[dependencyName];
                this._managers.set(dependencyName, dependency);
                this.logger.debug(this.name, `Loaded dependency: ${dependencyName} from global managers`);
                return dependency;
            }
            
            // Check if this is an optional dependency
            const isOptional = this._optionalDependencies && 
                               this._optionalDependencies.includes(dependencyName);
            
            // Dependency not found
            if (!isOptional) {
                throw new Error(`Dependency ${dependencyName} not found`);
            } else {
                this.logger.warn(this.name, `Optional dependency ${dependencyName} not found`);
                return null;
            }
        } catch (error) {
            this.logger.error(this.name, `Failed to load dependency: ${dependencyName}`, error);
            throw error;
        }
    }
}

module.exports = BaseManager; 