/**
 * JMF Hosting Discord Bot - Database Module Registry
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This registry manages all database modules and provides a centralized
 * way to access and manage them.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const path = require('path');
const LoggerManager = require('../../logger/logger.manager');
const SQLiteModule = require('./sqlite.module');
const MySQLModule = require('./mysql.module');

class DatabaseModuleRegistry {
    constructor() {
        this.modules = new Map();
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'database', 'registry')
        });
    }

    /**
     * Initialize the registry and load all modules
     */
    async initialize() {
        this.logger.info('registry', `${this.logger.defaultIcons.start} Initializing Database Module Registry...`);

        try {
            // Register built-in modules
            this.register('sqlite', new SQLiteModule());
            this.register('mysql', new MySQLModule());

            this.logger.success('registry', `${this.logger.defaultIcons.success} Database Module Registry initialized with ${this.modules.size} modules`);
        } catch (error) {
            this.logger.error('registry', `${this.logger.defaultIcons.error} Failed to initialize Database Module Registry:`, error);
            throw error;
        }
    }

    /**
     * Register a new database module
     * @param {string} name - Module name
     * @param {BaseDatabaseModule} module - Module instance
     */
    register(name, module) {
        if (this.modules.has(name)) {
            throw new Error(`Module '${name}' is already registered`);
        }

        this.modules.set(name, module);
        this.logger.info('registry', `${this.logger.defaultIcons.add} Registered database module: ${name}`);
    }

    /**
     * Unregister a database module
     * @param {string} name - Module name
     */
    unregister(name) {
        if (!this.modules.has(name)) {
            throw new Error(`Module '${name}' is not registered`);
        }

        this.modules.delete(name);
        this.logger.info('registry', `${this.logger.defaultIcons.delete} Unregistered database module: ${name}`);
    }

    /**
     * Get a database module by name
     * @param {string} name - Module name
     * @returns {BaseDatabaseModule} Module instance
     */
    get(name) {
        const module = this.modules.get(name);
        if (!module) {
            throw new Error(`Module '${name}' not found`);
        }
        return module;
    }

    /**
     * Check if a module is registered
     * @param {string} name - Module name
     * @returns {boolean}
     */
    has(name) {
        return this.modules.has(name);
    }

    /**
     * Get all registered module names
     * @returns {string[]}
     */
    getModuleNames() {
        return Array.from(this.modules.keys());
    }

    /**
     * Get the status of all registered modules
     * @returns {Promise<Object>}
     */
    async getStatus() {
        const status = {};
        for (const [name, module] of this.modules) {
            try {
                status[name] = await module.getStatus();
            } catch (error) {
                this.logger.error('registry', `${this.logger.defaultIcons.error} Failed to get status for module ${name}:`, error);
                status[name] = { error: error.message };
            }
        }
        return status;
    }

    /**
     * Close all module connections
     */
    async shutdown() {
        this.logger.info('registry', `${this.logger.defaultIcons.stop} Shutting down all database modules...`);

        const errors = [];
        for (const [name, module] of this.modules) {
            try {
                await module.close();
            } catch (error) {
                this.logger.error('registry', `${this.logger.defaultIcons.error} Failed to close module ${name}:`, error);
                errors.push({ name, error });
            }
        }

        if (errors.length > 0) {
            throw new Error('Failed to close all modules: ' + JSON.stringify(errors, null, 2));
        }

        this.logger.success('registry', `${this.logger.defaultIcons.success} All database modules shut down successfully`);
    }
}

module.exports = DatabaseModuleRegistry; 