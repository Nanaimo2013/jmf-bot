/**
 * JMF Hosting Discord Bot - Database Module Registry
 * Version: 1.0.0
 * Last Updated: 03/13/2025
 * 
 * This module provides a registry for database modules, allowing
 * for dynamic loading and management of database modules.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');

class DatabaseModuleRegistry extends BaseModule {
    /**
     * Create a new database module registry
     * @param {Object} manager - The parent manager instance
     * @param {Object} [options] - Module options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: 'registry',
            version: '1.0.0',
            defaultConfig: {
                modulesDir: path.join(__dirname, '..', 'modules'),
                enabledModules: ['sqlite']
            },
            ...options
        });
        
        this.modules = new Map();
        this.logger = this.manager.logger || winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} [${level.toUpperCase()}] [registry] ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console()
            ]
        });
    }

    /**
     * Initialize the database module registry
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            await super.initialize();
            this.logger.info('Initializing Database Module Registry...');
            
            // Load SQLite module directly
            const SQLiteModule = require('./sqlite.module');
            const dbPath = path.join(process.cwd(), 'data', 'database', 'bot.db');
            const sqliteModule = new SQLiteModule(this.manager, {
                path: dbPath,
                options: {
                    enableWAL: true,
                    enableForeignKeys: true,
                    timeout: 5000,
                    ...(this.manager.config?.options || {})
                }
            });
            
            // Initialize and register the SQLite module
            await sqliteModule.initialize();
            this.modules.set('sqlite', sqliteModule);
            
            // Connect to the database
            await sqliteModule.connect();
            
            this._initialized = true;
            this.logger.info('Database Module Registry initialized successfully');
        } catch (error) {
            this._initialized = false;
            this.logger.error(`Failed to initialize Database Module Registry: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get a database module
     * @param {string} moduleName - Name of the module to get
     * @returns {Object} Database module
     */
    getModule(moduleName) {
        return this.modules.get(moduleName);
    }

    /**
     * Check if a module exists
     * @param {string} moduleName - Name of the module to check
     * @returns {boolean} Whether the module exists
     */
    hasModule(moduleName) {
        return this.modules.has(moduleName);
    }

    /**
     * Get the default database module
     * @returns {Object} Default database module
     */
    getDefaultModule() {
        return this.modules.get('sqlite') || this.modules.values().next().value;
    }

    /**
     * Check if the registry is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this._initialized === true;
    }

    /**
     * Get the registry status
     * @returns {Object} Status object
     */
    async getStatus() {
        try {
            const status = await super.getStatus();
            return {
                ...status,
                initialized: this._initialized === true,
                modules: Array.from(this.modules.keys()),
                defaultModule: this.getDefaultModule()?.name || null
            };
        } catch (error) {
            return {
                name: this.name,
                error: error.message,
                initialized: this._initialized === true
            };
        }
    }

    /**
     * Shutdown the database module registry
     * @returns {Promise<void>}
     */
    async shutdown() {
        try {
            this.logger.info('Shutting down Database Module Registry...');
            
            // Shutdown all modules
            for (const [name, module] of this.modules.entries()) {
                try {
                    if (module && typeof module.shutdown === 'function') {
                        await module.shutdown();
                    }
                } catch (error) {
                    this.logger.error(`Failed to shutdown module ${name}: ${error.message}`);
                }
            }
            
            this.logger.info('Database Module Registry shut down successfully');
        } catch (error) {
            this.logger.error(`Failed to shutdown Database Module Registry: ${error.message}`);
            throw error;
        }
    }
}

module.exports = DatabaseModuleRegistry; 