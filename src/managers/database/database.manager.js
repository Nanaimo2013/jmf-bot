/**
 * JMF Hosting Discord Bot - Database Manager
 * Version: 1.2.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles all database operations, including connections,
 * migrations, backups, and query execution. It supports both SQLite
 * and MySQL databases and provides comprehensive logging.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base/base.manager');
const path = require('path');
const fs = require('fs').promises;

class DatabaseManager extends BaseManager {
    /**
     * Create a new database manager
     * @param {Object} [options] - Manager options
     */
    constructor(options = {}) {
        super('database', {
            version: '1.2.0',
            defaultConfig: {
                type: 'sqlite', // sqlite or mysql
                sqlite: {
                    database: path.join(process.cwd(), 'data', 'database', 'bot.db'),
                    backupDir: path.join(process.cwd(), 'data', 'database', 'backups'),
                    maxBackups: 10,
                    journalMode: 'WAL',
                    busyTimeout: 5000,
                    enableForeignKeys: true
                },
                mysql: {
                    host: 'localhost',
                    port: 3306,
                    user: 'jmfbot',
                    password: '',
                    database: 'jmfbot',
                    connectionLimit: 10,
                    backupDir: path.join(process.cwd(), 'data', 'database', 'backups'),
                    maxBackups: 10
                },
                migrations: {
                    directory: path.join(process.cwd(), 'src', 'database', 'migrations'),
                    tableName: 'migrations',
                    autoMigrate: true
                }
            },
            ...options
        });

        // Connection state
        this.connection = null;
        this.connected = false;
        this.transactionActive = false;
    }

    /**
     * Initialize the database manager
     * @param {Object} [config] - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        try {
            await super.initialize(config);
            
            // Get logger from global managers if available
            this.logger = global.managers?.logger || this.logger;
            
            this.logger.info('database', 'Initializing database manager...');
            
            // Ensure required directories exist
            await this._ensureDirectories();
            
            // Initialize SQLite and MySQL modules first
            await this.loadModule('sqlite', path.join(__dirname, 'modules/sqlite.module.js'), {
                database: this.getConfig('sqlite.database'),
                backupDir: this.getConfig('sqlite.backupDir'),
                maxBackups: this.getConfig('sqlite.maxBackups'),
                journalMode: this.getConfig('sqlite.journalMode'),
                busyTimeout: this.getConfig('sqlite.busyTimeout'),
                enableForeignKeys: this.getConfig('sqlite.enableForeignKeys')
            });
            
            await this.loadModule('mysql', path.join(__dirname, 'modules/mysql.module.js'), {
                host: this.getConfig('mysql.host'),
                port: this.getConfig('mysql.port'),
                user: this.getConfig('mysql.user'),
                password: this.getConfig('mysql.password'),
                database: this.getConfig('mysql.database'),
                connectionLimit: this.getConfig('mysql.connectionLimit'),
                backupDir: this.getConfig('mysql.backupDir'),
                maxBackups: this.getConfig('mysql.maxBackups')
            });
            
            // Connect to the database before initializing other modules
            await this.connect();
            
            // Now load the migration module which depends on a database connection
            await this.loadModule('migration', path.join(__dirname, 'modules/migration.module.js'), {
                directory: this.getConfig('migrations.directory'),
                tableName: this.getConfig('migrations.tableName'),
                autoMigrate: this.getConfig('migrations.autoMigrate')
            });
            
            // Subscribe to events
            await this._subscribeToEvents();
            
            // Run migrations if auto-migrate is enabled
            if (this.getConfig('migrations.autoMigrate')) {
                await this.migrate();
            }
            
            this.logger.success('database', 'Database manager initialized successfully');
        } catch (error) {
            this.logger.error('database', `Failed to initialize database manager: ${error.message}`, error.stack);
            throw error;
        }
    }
    
    /**
     * Subscribe to events
     * @returns {Promise<void>}
     * @private
     */
    async _subscribeToEvents() {
        // Subscribe to bot events if available
        if (global.managers?.bot) {
            const bot = global.managers.bot;
            
            // Subscribe to bot ready event
            bot.on('ready', async () => {
                this.logger.debug('database', 'Bot ready event received, verifying database connection');
                if (!this.connected) {
                    await this.connect();
                }
            });
            
            // Subscribe to bot shutdown event
            bot.on('shutdown', async () => {
                this.logger.debug('database', 'Bot shutdown event received, closing database connection');
                await this.disconnect();
            });
        }
        
        this.logger.debug('database', 'Database event subscriptions set up');
    }

    /**
     * Ensure required directories exist
     * @returns {Promise<void>}
     * @private
     */
    async _ensureDirectories() {
        try {
            // Create data directory if it doesn't exist
            const dataDir = path.join(process.cwd(), 'data');
            await fs.mkdir(dataDir, { recursive: true });
            
            // Create database directory if it doesn't exist
            const dbDir = path.join(dataDir, 'database');
            await fs.mkdir(dbDir, { recursive: true });
            
            // Create backups directory if it doesn't exist
            const backupsDir = path.join(dbDir, 'backups');
            await fs.mkdir(backupsDir, { recursive: true });
            
            // Create migrations directory if it doesn't exist
            if (this.config && this.config.migrations && this.config.migrations.directory) {
                await fs.mkdir(this.config.migrations.directory, { recursive: true });
            }
            
            this.logger.debug('database', 'Database directories created');
        } catch (error) {
            this.logger.error('database', `Failed to create database directories: ${error.message}`);
            throw error;
        }
    }

    /**
     * Connect to the database
     * @returns {Promise<void>}
     */
    async connect() {
        if (this.connected) {
            this.logger.debug('database', 'Already connected to database');
            return;
        }
        
        try {
            const dbType = this.getConfig('type') || 'sqlite';
            this.logger.info('database', `Connecting to ${dbType} database...`);
            
            // Get the appropriate database module
            const dbModule = this.getModule(dbType);
            if (!dbModule) {
                throw new Error(`Unsupported database type: ${dbType}`);
            }
            
            // Connect to the database
            this.connection = await dbModule.connect();
            this.connected = true;
            
            this.logger.success('database', `Connected to ${dbType} database`);
        } catch (error) {
            this.logger.error('database', `Failed to connect to database: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Disconnect from the database
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (!this.connected) {
            this.logger.debug('database', 'Not connected to database');
            return;
        }
        
        try {
            this.logger.info('database', 'Disconnecting from database...');
            
            // Get the appropriate database module
            const dbType = this.getConfig('type') || 'sqlite';
            const dbModule = this.getModule(dbType);
            if (!dbModule) {
                throw new Error(`Unsupported database type: ${dbType}`);
            }
            
            // Disconnect from the database
            await dbModule.disconnect();
            this.connection = null;
            this.connected = false;
            
            this.logger.success('database', 'Disconnected from database');
        } catch (error) {
            this.logger.error('database', `Failed to disconnect from database: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Execute a query on the database
     * @param {string} sql - SQL query to execute
     * @param {Array} [params=[]] - Query parameters
     * @returns {Promise<Object>} Query results
     */
    async query(sql, params = []) {
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            // Get the appropriate database module
            const dbType = this.getConfig('type') || 'sqlite';
            const dbModule = this.getModule(dbType);
            if (!dbModule) {
                throw new Error(`Unsupported database type: ${dbType}`);
            }
            
            // Execute the query
            const result = await dbModule.query(sql, params);
            
            return result;
        } catch (error) {
            this.logger.error('database', `Query error: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Begin a database transaction
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        if (this.transactionActive) {
            this.logger.warn('database', 'Transaction already active');
            return;
        }
        
        if (!this.connected) {
            await this.connect();
        }
        
        try {
            this.logger.debug('database', 'Beginning transaction...');
            
            // Get the appropriate database module
            const dbType = this.getConfig('type') || 'sqlite';
            const dbModule = this.getModule(dbType);
            if (!dbModule) {
                throw new Error(`Unsupported database type: ${dbType}`);
            }
            
            // Begin transaction
            await dbModule.beginTransaction();
            this.transactionActive = true;
            
            this.logger.debug('database', 'Transaction started');
        } catch (error) {
            this.logger.error('database', `Failed to begin transaction: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Commit a database transaction
     * @returns {Promise<void>}
     */
    async commit() {
        if (!this.transactionActive) {
            this.logger.warn('database', 'No active transaction to commit');
            return;
        }
        
        try {
            this.logger.debug('database', 'Committing transaction...');
            
            // Get the appropriate database module
            const dbModule = this.getModule(this.config.type);
            if (!dbModule) {
                throw new Error(`Unsupported database type: ${this.config.type}`);
            }
            
            // Commit transaction
            await dbModule.commit();
            this.transactionActive = false;
            
            this.logger.debug('database', 'Transaction committed');
        } catch (error) {
            this.logger.error('database', `Failed to commit transaction: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Rollback a database transaction
     * @returns {Promise<void>}
     */
    async rollback() {
        if (!this.transactionActive) {
            this.logger.warn('database', 'No active transaction to rollback');
            return;
        }
        
        try {
            this.logger.debug('database', 'Rolling back transaction...');
            
            // Get the appropriate database module
            const dbModule = this.getModule(this.config.type);
            if (!dbModule) {
                throw new Error(`Unsupported database type: ${this.config.type}`);
            }
            
            // Rollback transaction
            await dbModule.rollback();
            this.transactionActive = false;
            
            this.logger.debug('database', 'Transaction rolled back');
        } catch (error) {
            this.logger.error('database', `Failed to rollback transaction: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Run database migrations
     * @param {string} [targetVersion=null] - Target migration version
     * @returns {Promise<void>}
     */
    async migrate(targetVersion = null) {
        try {
            this.logger.info('database', 'Running database migrations...');
            
            // Get the migration module
            const migrationModule = this.getModule('migration');
            await migrationModule.migrate(targetVersion);
            
            this.logger.success('database', 'Database migrations completed');
        } catch (error) {
            this.logger.error('database', `Migration error: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Rollback database migrations
     * @param {string} [targetVersion=null] - Target migration version
     * @returns {Promise<void>}
     */
    async rollback(targetVersion = null) {
        try {
            this.logger.info('database', 'Rolling back database migrations...');
            
            // Get the migration module
            const migrationModule = this.getModule('migration');
            await migrationModule.rollback(targetVersion);
            
            this.logger.success('database', 'Database migration rollback completed');
        } catch (error) {
            this.logger.error('database', `Migration rollback error: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Clean up old backups
     * @returns {Promise<void>}
     * @private
     */
    async _cleanupOldBackups() {
        try {
            const dbType = this.getConfig('type') || 'sqlite';
            const backupDir = this.getConfig(`${dbType}.backupDir`);
            const maxBackups = this.getConfig(`${dbType}.maxBackups`) || 10;
            
            if (!backupDir) {
                return;
            }
            
            // Get all backup files
            const files = await fs.readdir(backupDir);
            
            // Sort by date (newest first)
            const backupFiles = files
                .filter(file => file.endsWith('.db') || file.endsWith('.sql') || file.endsWith('.gz'))
                .map(file => path.join(backupDir, file))
                .sort(async (a, b) => {
                    const statA = await fs.stat(a);
                    const statB = await fs.stat(b);
                    return statB.mtime.getTime() - statA.mtime.getTime();
                });
            
            // Delete old backups
            if (backupFiles.length > maxBackups) {
                for (let i = maxBackups; i < backupFiles.length; i++) {
                    await fs.unlink(backupFiles[i]);
                    this.logger.debug('database', `Deleted old backup: ${backupFiles[i]}`);
                }
            }
        } catch (error) {
            this.logger.error('database', `Failed to clean up old backups: ${error.message}`);
        }
    }

    /**
     * Backup the database
     * @param {Object} [options={}] - Backup options
     * @returns {Promise<string>} Backup file path
     */
    async backup(options = {}) {
        try {
            this.logger.info('database', 'Backing up database...');
            
            // Get the appropriate database module
            const dbType = this.getConfig('type') || 'sqlite';
            const dbModule = this.getModule(dbType);
            if (!dbModule) {
                throw new Error(`Unsupported database type: ${dbType}`);
            }
            
            // Backup database
            const backupPath = await dbModule.backup(options);
            
            // Clean up old backups
            await this._cleanupOldBackups();
            
            this.logger.success('database', `Database backup created at ${backupPath}`);
            return backupPath;
        } catch (error) {
            this.logger.error('database', `Backup error: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Restore the database from a backup
     * @param {string} backupPath - Path to the backup file
     * @returns {Promise<void>}
     */
    async restore(backupPath) {
        try {
            this.logger.info('database', `Restoring database from ${backupPath}...`);
            
            // Get the appropriate database module
            const dbType = this.getConfig('type') || 'sqlite';
            const dbModule = this.getModule(dbType);
            if (!dbModule) {
                throw new Error(`Unsupported database type: ${dbType}`);
            }
            
            // Restore database
            await dbModule.restore(backupPath);
            
            this.logger.success('database', 'Database restored successfully');
        } catch (error) {
            this.logger.error('database', `Restore error: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Verify database integrity
     * @returns {Promise<Object>} Integrity check results
     */
    async verifyIntegrity() {
        try {
            this.logger.info('database', 'Verifying database integrity...');
            
            // Get the appropriate database module
            const dbType = this.getConfig('type') || 'sqlite';
            const dbModule = this.getModule(dbType);
            if (!dbModule) {
                throw new Error(`Unsupported database type: ${dbType}`);
            }
            
            // Verify integrity
            const results = await dbModule.verifyIntegrity();
            
            this.logger.success('database', 'Database integrity verified');
            return results;
        } catch (error) {
            this.logger.error('database', `Integrity check error: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get the status of the database manager
     * @returns {Promise<Object>} Status information
     */
    async getStatus() {
        const status = await super.getStatus();
        const dbType = this.getConfig('type') || 'sqlite';
        
        try {
            // Get migration status
            const migrationModule = this.getModule('migration');
            const migrationStatus = await migrationModule.getStatus();
            
            return {
                ...status,
                connected: this.connected,
                type: dbType,
                transactionActive: this.transactionActive,
                migrations: migrationStatus
            };
        } catch (error) {
            this.logger.error('database', `Failed to get status: ${error.message}`, error.stack);
            return {
                ...status,
                connected: this.connected,
                type: dbType,
                transactionActive: this.transactionActive,
                error: error.message
            };
        }
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        try {
            this.logger.info('database', 'Shutting down database manager...');
            
            // Disconnect from database if connected
            if (this.connected) {
                await this.disconnect();
            }
            
            // Shut down modules
            for (const moduleName of this.getModuleNames()) {
                const module = this.getModule(moduleName);
                if (module && typeof module.shutdown === 'function') {
                    await module.shutdown();
                    this.logger.debug('database', `Module ${moduleName} shut down`);
                }
            }
            
            await super.shutdown();
            
            this.logger.success('database', 'Database manager shut down successfully');
        } catch (error) {
            this.logger.error('database', `Failed to shut down database manager: ${error.message}`, error.stack);
            throw error;
        }
    }
}

module.exports = DatabaseManager; 