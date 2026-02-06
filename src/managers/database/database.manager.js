/**
 * JMF Hosting Discord Bot - Database Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles all database operations for the bot.
 * It provides a modular database system with support for SQLite and MySQL.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base/base.manager');
const path = require('path');
const fs = require('fs').promises;

class DatabaseManager extends BaseManager {
    /**
     * Create a new DatabaseManager
     * @param {object} [bot] - The main bot instance (optional)
     */
    constructor(bot) {
        super('database', {
            version: '1.0.0',
            dependencies: ['logger'],
            defaultConfig: {
                type: 'sqlite',
                path: path.join(process.cwd(), 'data', 'database', 'bot.db'),
                options: {
                    enableWAL: true,
                    enableForeignKeys: true,
                    timeout: 5000
                }
            }
        });
        
        this.bot = bot;
        this.connection = null;
        this._isConnected = false;
        this.modules = new Map();
        this.activeModule = null;
    }
    
    /**
     * Initialize the database manager
     * @returns {Promise<boolean>}
     */
    async initialize() {
        try {
            // Call parent initialize
            await super.initialize();
            
            // Log initialization
            this.logger.info('database', 'Initializing database manager...');
            
            // Load core database modules (SQLite and MySQL)
            await this._loadDatabaseModules();
            
            // Connect to the database
            await this._connect();
            
            // Set connected flag
            this._isConnected = true;
            
            // Load and setup migration module after database connection
            try {
                const MigrationModule = require('./modules/migration.module');
                const migrationModule = new MigrationModule(this, {
                    defaultConfig: {
                        enabled: true
                    }
                });
                
                await migrationModule.initialize();
                await migrationModule.connect();
                await migrationModule.completeSetup();
                
                this.modules.set('migration', migrationModule);
                this.logger.info('database', 'Migration module loaded and setup completed');
            } catch (error) {
                this.logger.error('database', 'Failed to load migration module:', error);
                // Don't throw since migrations are optional
            }

            this.logger.info('database', 'Database manager initialized');
            return true;
        } catch (error) {
            this._isConnected = false;
            if (this.logger) {
                this.logger.error('database', 'Failed to initialize database manager:', error);
            } else {
                console.error('Failed to initialize database manager:', error);
            }
            throw error;
        }
    }
    
    /**
     * Load database modules
     * @private
     */
    async _loadDatabaseModules() {
        const logger = this.logger;
        const config = this._config || {};
        
        // Load SQLite module by default
        try {
            const SQLiteModule = require('./modules/sqlite.module');
            const sqliteModule = new SQLiteModule(this, {
                enabled: true,
                path: config.path || path.join(process.cwd(), 'data', 'database', 'bot.db'),
                options: {
                    enableWAL: true,
                    enableForeignKeys: true,
                    timeout: 5000,
                    ...(config.options || {})
                }
            });
            
            await sqliteModule.initialize();
            this.modules.set('sqlite', sqliteModule);
            logger.info('database', 'SQLite module loaded');
        } catch (error) {
            logger.error('database', 'Failed to load SQLite module:', error);
            throw error; // SQLite is required, so we throw the error
        }
        
        // Load MySQL module if configured
        const mysqlConfig = config.mysql || {};
        if (mysqlConfig.enabled) {
            try {
                const MySQLModule = require('./modules/mysql.module');
                const mysqlModule = new MySQLModule(this, mysqlConfig);
                await mysqlModule.initialize();
                this.modules.set('mysql', mysqlModule);
                logger.info('database', 'MySQL module loaded');
            } catch (error) {
                logger.error('database', 'Failed to load MySQL module:', error);
                // Don't throw since MySQL is optional
            }
        }
    }
    
    /**
     * Override loadModules to exclude migration module from auto-loading
     * @param {Object} [options] - Module loading options
     * @returns {Promise<Map<string, Object>>} Loaded modules
     */
    async loadModules(options = {}) {
        // Call parent loadModules but exclude migration module
        const allModules = await super.loadModules(options);
        
        // Remove migration module if it was loaded (we'll load it manually after connection)
        if (this.modules.has('migration')) {
            this.modules.delete('migration');
        }
        
        return allModules;
    }
    
    /**
     * Connect to the database
     * @private
     */
    async _connect() {
        const logger = this.logger;
        
        try {
            // Determine which database type to use
            const dbType = this.config?.type || 'sqlite';
            
            // Get the module
            const module = this.modules.get(dbType);
            
            // Check if module exists
            if (!module) {
                logger.error('database', `Database module "${dbType}" not found`);
                throw new Error(`Database module "${dbType}" not found`);
            }
            
            // Initialize the module if not already initialized
            if (!module.isInitialized()) {
                await module.initialize();
            }
            
            // Connect to the database
            await module.connect();
            
            // Set as active module
            this.activeModule = module;
            
            // Set connected flag
            this._isConnected = true;
            
            logger.info('database', `Connected to ${dbType} database`);
        } catch (error) {
            this._isConnected = false;
            this.activeModule = null;
            logger.error('database', `Failed to connect to database: ${error.message}`, error.stack);
            throw error;
        }
    }
    
    /**
     * Get the active database module
     * @returns {object} - The active database module
     */
    getActiveModule() {
        try {
            if (!this.activeModule) {
                const dbType = this.config?.type || 'sqlite';
                const module = this.modules.get(dbType);
                
                if (!module) {
                    this.logger.warn('database', `Database module '${dbType}' not found. Available modules: ${Array.from(this.modules.keys()).join(', ')}`);
                    return null;
                }
                
                this.activeModule = module;
            }
            
            return this.activeModule;
        } catch (error) {
            this.logger.error('database', `Error getting active module: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Check if a table exists in the database
     * @param {string} tableName - Name of the table to check
     * @returns {Promise<boolean>} - True if the table exists, false otherwise
     */
    async tableExists(tableName) {
        try {
            // Get the active module
            const module = this.getActiveModule();
            
            // Check if module exists
            if (!module) {
                this.logger.error('database', 'No active database module');
                return false;
            }
            
            // Check if the module has a tableExists method
            if (typeof module.tableExists === 'function') {
                return await module.tableExists(tableName);
            }
            
            // Default implementation for SQLite
            if (this.config.type === 'sqlite' || !this.config.type) {
                const result = await this.query(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    [tableName]
                );
                return result.length > 0;
            }
            
            // Default implementation for MySQL
            if (this.config.type === 'mysql') {
                const result = await this.query(
                    'SHOW TABLES LIKE ?',
                    [tableName]
                );
                return result.length > 0;
            }
            
            return false;
        } catch (error) {
            this.logger.error('database', `Error checking if table ${tableName} exists:`, error);
            return false;
        }
    }
    
    /**
     * Execute a database query
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} - Query results
     */
    async query(sql, params = []) {
        try {
            // Check if connected
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }
            
            // Get the active module
            const module = this.getActiveModule();
            
            // Check if module exists
            if (!module) {
                throw new Error('No active database module');
            }
            
            // Execute the query
            return await module.query(sql, params);
        } catch (error) {
            this.logger.error('database', `Query error: ${error.message}`, { sql, params });
            throw error;
        }
    }
    
    /**
     * Begin a transaction
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        try {
            // Check if connected
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }
            
            // Get the active module
            const module = this.getActiveModule();
            
            // Check if module exists
            if (!module) {
                throw new Error('No active database module');
            }
            
            // Begin the transaction
            await module.beginTransaction();
        } catch (error) {
            this.logger.error('database', `Begin transaction error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Commit a transaction
     * @returns {Promise<void>}
     */
    async commit() {
        try {
            // Check if connected
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }
            
            // Get the active module
            const module = this.getActiveModule();
            
            // Check if module exists
            if (!module) {
                throw new Error('No active database module');
            }
            
            // Commit the transaction
            await module.commit();
        } catch (error) {
            this.logger.error('database', `Commit transaction error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Rollback a transaction
     * @returns {Promise<void>}
     */
    async rollback() {
        try {
            // Check if connected
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }
            
            // Get the active module
            const module = this.getActiveModule();
            
            // Check if module exists
            if (!module) {
                throw new Error('No active database module');
            }
            
            // Rollback the transaction
            await module.rollback();
        } catch (error) {
            this.logger.error('database', `Rollback transaction error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Create a backup of the database
     * @returns {Promise<string>} - Path to the backup file
     */
    async createBackup() {
        try {
            // Check if connected
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }
            
            // Get the active module
            const module = this.getActiveModule();
            
            // Check if module exists
            if (!module) {
                throw new Error('No active database module');
            }
            
            // Create the backup
            return await module.createBackup();
        } catch (error) {
            this.logger.error('database', `Create backup error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Run database migrations
     * @returns {Promise<Array>} - Applied migrations
     */
    async migrate() {
        try {
            // Get the migration module
            const migrationModule = this.modules.get('migration');
            
            // Check if module exists
            if (!migrationModule) {
                throw new Error('Migration module not found or not enabled');
            }
            
            // Run migrations
            return await migrationModule.migrate();
        } catch (error) {
            this.logger.error('database', `Migration error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Rollback the last migration
     * @returns {Promise<Object>} - Rolled back migration
     */
    async rollbackLastMigration() {
        try {
            // Get the migration module
            const migrationModule = this.modules.get('migration');
            
            // Check if module exists
            if (!migrationModule) {
                throw new Error('Migration module not found or not enabled');
            }
            
            // Rollback the last migration
            return await migrationModule.rollbackLast();
        } catch (error) {
            this.logger.error('database', `Rollback migration error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Create a new migration
     * @param {string} name - Migration name
     * @returns {Promise<string>} - Path to the created migration file
     */
    async createMigration(name) {
        try {
            // Get the migration module
            const migrationModule = this.modules.get('migration');
            
            // Check if module exists
            if (!migrationModule) {
                throw new Error('Migration module not found or not enabled');
            }
            
            // Create the migration
            return await migrationModule.createMigration(name);
        } catch (error) {
            this.logger.error('database', `Create migration error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Check if the database is connected
     * @returns {boolean}
     */
    isConnected() {
        return this._isConnected === true && this.activeModule?.isConnected() === true;
    }
    
    /**
     * Connect to the database
     * @returns {Promise<void>}
     */
    async connect() {
        return this._connect();
    }
    
    /**
     * Disconnect from the database
     * @returns {Promise<void>}
     */
    async disconnect() {
        return this._disconnect();
    }
    
    /**
     * Get database configuration
     * @param {string} key - Configuration key
     * @returns {any} Configuration value
     */
    getConfig(key) {
        if (key) {
            return this._config[key];
        }
        return this._config;
    }
    
    /**
     * Get database version
     * @returns {string} Database version
     */
    get version() {
        return this.activeModule?.version || '1.0.0';
    }
    
    /**
     * Set database version (for compatibility)
     * @param {string} version - Database version
     */
    set version(version) {
        // This is a getter-only property, but we need to allow setting for compatibility
        // The actual version comes from the active module
    }
    
    /**
     * Check if the manager is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this._initialized === true;
    }
    
    /**
     * Get the database manager status
     * @returns {Object} Status object
     */
    async getStatus() {
        try {
            const status = {
                name: this.name,
                version: this.version,
                initialized: this._initialized === true,
                connected: this._isConnected === true,
                activeModule: this.activeModule?.name || null,
                timestamp: new Date().toISOString(),
                modules: {}
            };
            
            // Get status of all modules
            if (this.modules && this.modules instanceof Map) {
                for (const [moduleName, module] of this.modules.entries()) {
                    if (!module) {
                        status.modules[moduleName] = { 
                            name: moduleName,
                            error: 'Module is null or undefined',
                            initialized: false
                        };
                        continue;
                    }
                    
                    try {
                        if (typeof module.getStatus === 'function') {
                            status.modules[moduleName] = await module.getStatus();
                        } else {
                            status.modules[moduleName] = {
                                name: module.name || moduleName,
                                enabled: typeof module.isEnabled === 'function' ? await module.isEnabled() : 
                                        (module.enabled !== undefined ? module.enabled : false),
                                initialized: typeof module.isInitialized === 'function' ? await module.isInitialized() : 
                                           (module._initialized !== undefined ? module._initialized : false),
                                connected: typeof module.isConnected === 'function' ? await module.isConnected() :
                                         (module.isConnected !== undefined ? module.isConnected : false),
                                error: module.error || null
                            };
                        }
                    } catch (error) {
                        this.logger.error('database', `Failed to get status for module ${moduleName}: ${error.message}`);
                        status.modules[moduleName] = {
                            name: moduleName,
                            error: error.message,
                            initialized: false
                        };
                    }
                }
            }
            
            return status;
        } catch (error) {
            this.logger.error('database', `Failed to get status: ${error.message}`);
            return {
                name: this.name,
                error: error.message,
                initialized: this._initialized === true,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Stop the database manager
     * @returns {Promise<boolean>}
     */
    async stop() {
        try {
            // Call parent stop
            await super.stop();
            
            // Close the database connection
            await this._disconnect();
            
            this.logger.info('database', 'Database manager stopped');
            return true;
        } catch (error) {
            this.logger.error('database', `Failed to stop database manager: ${error.message}`, error.stack);
            throw error;
        }
    }
    
    /**
     * Disconnect from the database
     * @private
     */
    async _disconnect() {
        try {
            // Check if connected
            if (!this._isConnected) {
                this.logger.debug('database', 'Not connected, skipping disconnect');
                return;
            }
            
            // Get the active module
            const module = this.getActiveModule();
            
            // Check if module exists
            if (!module) {
                this.logger.warn('database', 'No active module found, resetting connection state');
                this._isConnected = false;
                this.activeModule = null;
                return;
            }
            
            // Close the connection
            if (typeof module.close === 'function') {
                await module.close();
                this.logger.info('database', `Disconnected from ${module.name || 'database'}`);
            } else {
                this.logger.warn('database', 'Module does not have a close method, cannot disconnect properly');
            }
            
            // Reset connection state
            this._isConnected = false;
            this.activeModule = null;
            
            this.logger.info('database', 'Disconnected from database');
        } catch (error) {
            this.logger.error('database', `Failed to disconnect from database: ${error.message}`, error.stack);
            
            // Reset connection state even on error
            this._isConnected = false;
            this.activeModule = null;
            
            throw error;
        }
    }
}

module.exports = DatabaseManager; 