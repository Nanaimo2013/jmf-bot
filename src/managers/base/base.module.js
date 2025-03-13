/**
 * JMF Hosting Discord Bot - Base Module
 * Version: 1.1.0
 * Last Updated: 03/12/2025
 * 
 * This is the base module class that all other modules extend from.
 * It provides common functionality, event handling, and shared utilities
 * that all modules can use.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;
const utils = require('../../utils');

class BaseModule extends EventEmitter {
    /**
     * Create a new base module
     * @param {Object} manager - The parent manager instance
     * @param {Object} [options] - Module options
     * @param {string} [options.name] - Override default module name
     * @param {string} [options.version] - Module version
     * @param {Object} [options.defaultConfig] - Default configuration
     * @param {string[]} [options.requiredPermissions] - Required permissions
     */
    constructor(manager, options = {}) {
        super();
        this.manager = manager;
        this.bot = manager.bot;
        this.logger = manager.logger;
        this.name = options.name || this.constructor.name;
        this.version = options.version || '1.0.0';
        this._enabled = false;
        this._initialized = false;
        this._permissions = new Set();
        this._dependencies = new Set();
        this._hooks = new Map();
        this._dataDir = path.join(process.cwd(), 'data', manager.name, 'modules', this.name);
        this._metrics = {
            operations: 0,
            errors: 0,
            lastError: null
        };
        this._prefixes = {
            commands: '!',
            events: 'on',
            webhooks: '/api/webhooks'
        };
        this._registeredCommands = new Map();
        this._registeredEvents = new Map();
        this._registeredWebhooks = new Map();
        this._database = null;
        this._eventBus = null;
        this._cache = null;
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        if (this._initialized) {
            this.logger.warn(this.name, `Module already initialized`);
            return;
        }

        try {
            this.logger.info(this.name, `Initializing module...`);
            
            // Load configuration from new structure
            const moduleConfig = this.manager._config.modules?.[this.name] || {};
            this._config = utils.deepMerge({
                enabled: true,
                permissions: [],
                commands: {},
                features: {}
            }, moduleConfig, config);
            
            // Set up permissions based on new structure
            if (this._config.permissions) {
                this.setPermissions(this._config.permissions);
            }
            
            // Register commands with new permission structure
            if (this._config.commands) {
                for (const [name, cmdConfig] of Object.entries(this._config.commands)) {
                    this.registerCommand(name, {
                        ...cmdConfig,
                        permissions: cmdConfig.permissions || []
                    });
                }
            }
            
            this._initialized = true;
            this._enabled = this._config.enabled;
            this.logger.success(this.name, `Module initialized successfully`);
        } catch (error) {
            this.logger.error(this.name, `Module initialization failed:`, error);
            throw error;
        }
    }

    /**
     * Check if all dependencies are available
     * @private
     */
    async _checkDependencies() {
        if (this._dependencies.size === 0) return;
        
        const missingDependencies = [];
        
        for (const dependency of this._dependencies) {
            try {
                // Check if dependency is a module in the same manager
                if (this.manager.modules.has(dependency)) {
                    continue;
                }
                
                // Check if dependency is another manager
                try {
                    await this.manager.getManager(dependency);
                } catch (error) {
                    missingDependencies.push(dependency);
                }
            } catch (error) {
                missingDependencies.push(dependency);
            }
        }
        
        if (missingDependencies.length > 0) {
            throw new Error(`Missing dependencies: ${missingDependencies.join(', ')}`);
        }
    }

    /**
     * Register hooks
     * @private
     */
    _registerHooks() {
        // Default hooks
        this._hooks.set('beforeOperation', []);
        this._hooks.set('afterOperation', []);
        this._hooks.set('onError', []);
        this._hooks.set('beforeShutdown', []);
        this._hooks.set('afterShutdown', []);
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
        this.log('debug', `Registered hook: ${hookName}`);
    }

    /**
     * Run a hook
     * @param {string} hookName - Name of the hook
     * @param {Object} [data] - Hook data
     * @private
     */
    async _runHook(hookName, data = {}) {
        if (!this._hooks.has(hookName)) return;
        
        const hooks = this._hooks.get(hookName);
        for (const hook of hooks) {
            try {
                await hook(data, this);
            } catch (error) {
                this.log('error', `Error running hook ${hookName}:`, error);
            }
        }
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Override in subclasses
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        try {
            this.logger.debug(this.name, `Shutting down module: ${this.name}`);
            
            // Run before shutdown hook
            await this._runHook('beforeShutdown');
            
            // Clean up resources
            await this._cleanupResources();
            
            // Run after shutdown hook
            await this._runHook('afterShutdown');
            
            this.emit('shutdown', { module: this.name });
            this.logger.debug(this.name, `Module ${this.name} shut down successfully`);
        } catch (error) {
            this.logger.error(this.name, `Module ${this.name} shutdown failed:`, error);
            throw error;
        }
    }

    /**
     * Clean up resources
     * @private
     */
    async _cleanupResources() {
        // Override in subclasses
        this.removeAllListeners();
    }

    /**
     * Get the status of the module
     * @returns {Promise<Object>} Status object
     */
    async getStatus() {
        return {
            name: this.name,
            version: this.version,
            initialized: this._initialized,
            enabled: this._enabled,
            permissions: Array.from(this._permissions),
            dependencies: Array.from(this._dependencies),
            metrics: {
                operations: this._metrics.operations,
                errors: this._metrics.errors,
                uptime: Date.now() - this._metrics.startTime
            },
            commands: Array.from(this._registeredCommands.keys()),
            events: Array.from(this._registeredEvents.keys()),
            webhooks: Array.from(this._registeredWebhooks.keys())
        };
    }

    /**
     * Check if the module is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this._initialized;
    }

    /**
     * Check if the module is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this._enabled;
    }

    /**
     * Enable the module
     */
    enable() {
        this._enabled = true;
        this.log('info', 'Module enabled');
        this.emit('enabled');
    }

    /**
     * Disable the module
     */
    disable() {
        this._enabled = false;
        this.log('info', 'Module disabled');
        this.emit('disabled');
    }

    /**
     * Set dependencies for this module
     * @param {string[]} dependencies - Array of dependency names
     */
    setDependencies(dependencies = []) {
        this._dependencies = new Set(Array.isArray(dependencies) ? dependencies : [dependencies]);
    }

    /**
     * Add a dependency to this module
     * @param {string} dependency - Dependency name
     */
    addDependency(dependency) {
        this._dependencies.add(dependency);
    }

    /**
     * Set permissions for this module
     * @param {string[]} permissions - Array of permission names
     */
    setPermissions(permissions = []) {
        this._permissions = new Set(Array.isArray(permissions) ? permissions : [permissions]);
    }

    /**
     * Check if the module has a specific permission
     * @param {string} permission - Permission name to check
     * @returns {boolean}
     */
    hasPermission(permission) {
        return this._permissions.has(permission);
    }

    /**
     * Add a permission to this module
     * @param {string} permission - Permission name to add
     */
    addPermission(permission) {
        this._permissions.add(permission);
    }

    /**
     * Remove a permission from this module
     * @param {string} permission - Permission name to remove
     */
    removePermission(permission) {
        this._permissions.delete(permission);
    }

    /**
     * Get all permissions for this module
     * @returns {string[]}
     */
    getPermissions() {
        return Array.from(this._permissions);
    }

    /**
     * Set command prefix
     * @param {string} prefix - Command prefix
     */
    setCommandPrefix(prefix) {
        this._prefixes.commands = prefix;
    }

    /**
     * Get command prefix
     * @returns {string} Command prefix
     */
    getCommandPrefix() {
        return this._prefixes.commands;
    }

    /**
     * Set event prefix
     * @param {string} prefix - Event prefix
     */
    setEventPrefix(prefix) {
        this._prefixes.events = prefix;
    }

    /**
     * Get event prefix
     * @returns {string} Event prefix
     */
    getEventPrefix() {
        return this._prefixes.events;
    }

    /**
     * Set webhook prefix
     * @param {string} prefix - Webhook prefix
     */
    setWebhookPrefix(prefix) {
        this._prefixes.webhooks = prefix;
    }

    /**
     * Get webhook prefix
     * @returns {string} Webhook prefix
     */
    getWebhookPrefix() {
        return this._prefixes.webhooks;
    }

    /**
     * Register a command
     * @param {string} name - Command name
     * @param {Function} handler - Command handler function
     * @param {Object} [options] - Command options
     * @param {string} [options.description] - Command description
     * @param {string[]} [options.aliases] - Command aliases
     * @param {string[]} [options.permissions] - Required permissions
     * @param {boolean} [options.enabled=true] - Whether the command is enabled
     */
    registerCommand(name, handler, options = {}) {
        const command = {
            name,
            handler,
            description: options.description || '',
            aliases: options.aliases || [],
            permissions: options.permissions || [],
            enabled: options.enabled !== false
        };
        
        this._registeredCommands.set(name, command);
        
        // Register aliases
        for (const alias of command.aliases) {
            this._registeredCommands.set(alias, { ...command, isAlias: true, originalName: name });
        }
        
        this.log('debug', `Registered command: ${name}`);
    }

    /**
     * Unregister a command
     * @param {string} name - Command name
     */
    unregisterCommand(name) {
        const command = this._registeredCommands.get(name);
        if (!command) return;
        
        this._registeredCommands.delete(name);
        
        // Unregister aliases
        if (!command.isAlias) {
            for (const alias of command.aliases) {
                this._registeredCommands.delete(alias);
            }
        }
        
        this.log('debug', `Unregistered command: ${name}`);
    }

    /**
     * Execute a command
     * @param {string} name - Command name
     * @param {Object} context - Command context
     * @param {Array} args - Command arguments
     * @returns {Promise<any>} Command result
     */
    async executeCommand(name, context, args = []) {
        if (!this._enabled) {
            throw new Error('Module is disabled');
        }
        
        const command = this._registeredCommands.get(name);
        if (!command) {
            throw new Error(`Command not found: ${name}`);
        }
        
        if (!command.enabled) {
            throw new Error(`Command is disabled: ${name}`);
        }
        
        // Check permissions using new structure
        if (command.permissions.length > 0 && context.userId) {
            const hasPermission = command.permissions.every(permission => {
                // Convert permission to flag format if needed
                const permFlag = permission.includes('_') ? permission : permission.replace(/([A-Z])/g, '_$1').toLowerCase();
                return this.manager.hasPermission(context.userId, permFlag);
            });
            
            if (!hasPermission) {
                throw new Error('Insufficient permissions');
            }
        }
        
        try {
            this._metrics.operations++;
            return await command.handler(context, args);
        } catch (error) {
            this._metrics.errors++;
            this.logger.error(this.name, `Error executing command ${name}:`, error);
            throw error;
        }
    }

    /**
     * Register an event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     * @param {Object} [options] - Event options
     * @param {boolean} [options.once=false] - Whether to handle the event only once
     * @param {boolean} [options.enabled=true] - Whether the event handler is enabled
     */
    registerEvent(event, handler, options = {}) {
        const eventHandler = {
            event,
            handler,
            once: options.once || false,
            enabled: options.enabled !== false
        };
        
        this._registeredEvents.set(event, eventHandler);
        
        // Register with manager's event emitter
        const wrappedHandler = async (...args) => {
            if (!this._enabled || !eventHandler.enabled) return;
            
            try {
                await handler(...args);
            } catch (error) {
                this.log('error', `Error handling event ${event}:`, error);
                this._metrics.errors++;
            }
        };
        
        if (eventHandler.once) {
            this.manager.once(event, wrappedHandler);
        } else {
            this.manager.on(event, wrappedHandler);
        }
        
        this.log('debug', `Registered event handler: ${event}`);
    }

    /**
     * Unregister an event handler
     * @param {string} event - Event name
     */
    unregisterEvent(event) {
        const eventHandler = this._registeredEvents.get(event);
        if (!eventHandler) return;
        
        this._registeredEvents.delete(event);
        
        // Unregister from manager's event emitter
        this.manager.removeAllListeners(event);
        
        this.log('debug', `Unregistered event handler: ${event}`);
    }

    /**
     * Register a webhook
     * @param {string} path - Webhook path
     * @param {Function} handler - Webhook handler function
     * @param {Object} [options] - Webhook options
     * @param {string} [options.method='POST'] - HTTP method
     * @param {boolean} [options.enabled=true] - Whether the webhook is enabled
     */
    registerWebhook(path, handler, options = {}) {
        const webhook = {
            path: this._prefixes.webhooks + '/' + path,
            handler,
            method: options.method || 'POST',
            enabled: options.enabled !== false
        };
        
        this._registeredWebhooks.set(path, webhook);
        
        this.log('debug', `Registered webhook: ${path}`);
        
        // Emit webhook registration event for API manager to pick up
        this.manager.emitEvent('webhookRegistered', {
            module: this.name,
            webhook
        });
    }

    /**
     * Unregister a webhook
     * @param {string} path - Webhook path
     */
    unregisterWebhook(path) {
        const webhook = this._registeredWebhooks.get(path);
        if (!webhook) return;
        
        this._registeredWebhooks.delete(path);
        
        this.log('debug', `Unregistered webhook: ${path}`);
        
        // Emit webhook unregistration event for API manager to pick up
        this.manager.emitEvent('webhookUnregistered', {
            module: this.name,
            path: webhook.path
        });
    }

    /**
     * Execute a webhook
     * @param {string} path - Webhook path
     * @param {Object} request - HTTP request
     * @param {Object} response - HTTP response
     * @returns {Promise<any>} Webhook result
     */
    async executeWebhook(path, request, response) {
        if (!this._enabled) {
            throw new Error('Module is disabled');
        }
        
        const webhook = this._registeredWebhooks.get(path);
        if (!webhook) {
            throw new Error(`Webhook not found: ${path}`);
        }
        
        if (!webhook.enabled) {
            throw new Error(`Webhook is disabled: ${path}`);
        }
        
        if (request.method !== webhook.method) {
            throw new Error(`Method not allowed: ${request.method}`);
        }
        
        try {
            this._metrics.operations++;
            return await webhook.handler(request, response);
        } catch (error) {
            this._metrics.errors++;
            this.log('error', `Error executing webhook ${path}:`, error);
            throw error;
        }
    }

    /**
     * Save data to a file
     * @param {string} filename - Filename
     * @param {any} data - Data to save
     * @returns {Promise<void>}
     */
    async saveData(filename, data) {
        const filePath = path.join(this._dataDir, filename);
        
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            this.log('debug', `Saved data to: ${filename}`);
        } catch (error) {
            this.log('error', `Failed to save data to ${filename}:`, error);
            throw error;
        }
    }

    /**
     * Load data from a file
     * @param {string} filename - Filename
     * @param {any} [defaultData] - Default data if file doesn't exist
     * @returns {Promise<any>} Loaded data
     */
    async loadData(filename, defaultData = null) {
        const filePath = path.join(this._dataDir, filename);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.log('debug', `Data file not found: ${filename}, using defaults`);
                
                if (defaultData !== null) {
                    await this.saveData(filename, defaultData);
                }
                
                return defaultData;
            }
            
            this.log('error', `Failed to load data from ${filename}:`, error);
            throw error;
        }
    }

    /**
     * Delete a data file
     * @param {string} filename - Filename
     * @returns {Promise<boolean>} Whether the file was deleted
     */
    async deleteData(filename) {
        const filePath = path.join(this._dataDir, filename);
        
        try {
            await fs.unlink(filePath);
            this.log('debug', `Deleted data file: ${filename}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            
            this.log('error', `Failed to delete data file ${filename}:`, error);
            throw error;
        }
    }

    /**
     * List all data files
     * @returns {Promise<string[]>} Array of filenames
     */
    async listDataFiles() {
        try {
            const files = await fs.readdir(this._dataDir);
            return files;
        } catch (error) {
            this.log('error', 'Failed to list data files:', error);
            throw error;
        }
    }

    /**
     * Execute an operation with error handling and metrics tracking
     * @param {string} operationName - Name of the operation
     * @param {Function} operation - Operation function
     * @param {Object} [data] - Operation data
     * @returns {Promise<any>} Operation result
     */
    async executeOperation(operationName, operation, data = {}) {
        if (!this._enabled) {
            throw new Error('Module is disabled');
        }
        
        this._metrics.operations++;
        
        try {
            // Run before operation hook
            await this._runHook('beforeOperation', { operation: operationName, data });
            
            // Execute operation
            const result = await operation(data);
            
            // Run after operation hook
            await this._runHook('afterOperation', { operation: operationName, data, result });
            
            return result;
        } catch (error) {
            this._metrics.errors++;
            
            // Run error hook
            await this._runHook('onError', { operation: operationName, data, error });
            
            this.log('error', `Operation ${operationName} failed:`, error);
            throw error;
        }
    }

    /**
     * Get a module from the manager
     * @param {string} moduleName - Name of the module to get
     * @returns {Object} Module instance
     */
    getModule(moduleName) {
        return this.manager.getModule(moduleName);
    }

    /**
     * Get a manager
     * @param {string} managerName - Name of the manager to get
     * @returns {Promise<Object>} Manager instance
     */
    async getManager(managerName) {
        return await this.manager.getManager(managerName);
    }

    /**
     * Log an event with the manager's logger
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {...any} args - Additional arguments
     */
    log(level, message, ...args) {
        if (this.logger && typeof this.logger[level] === 'function') {
            this.logger[level](this.name, `[${this.name}] ${message}`, ...args);
        }
    }

    /**
     * Emit an event with data
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emitEvent(event, data = {}) {
        data.module = this.name;
        data.timestamp = new Date();
        this.emit(event, data);
        this.log('debug', `Emitted event: ${event}`);
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
    }

    /**
     * Get the database instance
     * @returns {Promise<Object|null>} Database manager instance
     */
    async getDatabase() {
        if (this._database) {
            return this._database;
        }
        
        try {
            this._database = await this.manager.getDatabase();
            return this._database;
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
     * @returns {Promise<Object|null>} Event bus instance
     */
    async getEventBus() {
        if (this._eventBus) {
            return this._eventBus;
        }
        
        try {
            this._eventBus = await this.manager.getEventBus();
            return this._eventBus;
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
    async publishEvent(eventName, data = {}, namespace = this.manager.name) {
        const eventBus = await this.getEventBus();
        if (!eventBus) {
            this.emit(eventName, data);
            this.manager.emit(eventName, data);
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
        
        return eventBus.subscribe(eventName, handler, {
            namespace: this.manager.name,
            module: this.name,
            ...options
        });
    }

    /**
     * Get the cache manager instance
     * @returns {Promise<Object|null>} Cache manager instance
     */
    async getCache() {
        if (this._cache) {
            return this._cache;
        }
        
        try {
            const botManager = await this.manager.getManager('bot');
            if (botManager && botManager.isInitialized()) {
                const cacheManager = botManager.getModule('cache-manager');
                if (cacheManager) {
                    this._cache = cacheManager;
                    return this._cache;
                }
            }
            return null;
        } catch (error) {
            this.log('error', `Failed to get cache manager: ${error.message}`);
            return null;
        }
    }

    /**
     * Get a value from the cache
     * @param {string} key - Cache key
     * @param {*} defaultValue - Default value if key not found
     * @returns {Promise<*>} Cached value or default
     */
    async getCacheValue(key, defaultValue = null) {
        const cache = await this.getCache();
        if (!cache) {
            return defaultValue;
        }
        
        return cache.get(`${this.manager.name}:${this.name}:${key}`, defaultValue);
    }

    /**
     * Set a value in the cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} Success status
     */
    async setCacheValue(key, value, ttl = 3600) {
        const cache = await this.getCache();
        if (!cache) {
            return false;
        }
        
        return cache.set(`${this.manager.name}:${this.name}:${key}`, value, ttl);
    }

    /**
     * Delete a value from the cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async deleteCacheValue(key) {
        const cache = await this.getCache();
        if (!cache) {
            return false;
        }
        
        return cache.delete(`${this.manager.name}:${this.name}:${key}`);
    }
}

module.exports = BaseModule; 