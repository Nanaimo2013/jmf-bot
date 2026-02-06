/**
 * JMF Hosting Discord Bot - SQLite Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides SQLite database functionality for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const DatabaseBaseModule = require('./base.module');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class SQLiteModule extends DatabaseBaseModule {
    /**
     * Create a new SQLite module
     * @param {DatabaseManager} manager - The database manager instance
     * @param {Object} config - Module configuration
     */
    constructor(manager, config = {}) {
        super(manager, {
            name: 'sqlite',
            version: '1.0.0',
            description: 'SQLite database module',
            ...config
        });

        // SQLite-specific properties
        this.dbPath = config.path || path.join(process.cwd(), 'data', 'bot.db');
        this.backupDir = config.backupDir || path.join(process.cwd(), 'data', 'backups');
        this.maxBackups = config.maxBackups || 5;
        this.options = {
            enableWAL: config.enableWAL !== false,
            enableForeignKeys: config.enableForeignKeys !== false,
            timeout: config.timeout || 5000,
            ...config.options
        };
    }

    /**
     * Initialize the SQLite module
     * @returns {Promise<boolean>}
     */
    async initialize() {
        try {
            await super.initialize();
            
            // Ensure directories exist
            await this._ensureDirectories();
            
            // Connect to database
            await this.connect();
            
            this._initialized = true;
            this.logger.info(this.name, 'SQLite module initialized successfully');
            return true;
        } catch (error) {
            this._initialized = false;
            this.logger.error(this.name, `Failed to initialize SQLite module: ${error.message}`);
            throw error;
        }
    }

    /**
     * Ensure required directories exist
     * @private
     */
    async _ensureDirectories() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            await fs.mkdir(dataDir, { recursive: true });
            
            // Ensure backup directory exists
            await fs.mkdir(this.backupDir, { recursive: true });
            
            this.logger.debug(this.name, 'Directories created successfully');
        } catch (error) {
            this.logger.error(this.name, `Failed to create directories: ${error.message}`);
            throw error;
        }
    }

    /**
     * Connect to the SQLite database
     * @returns {Promise<boolean>}
     */
    async connect() {
        try {
            if (!this._initialized) {
                throw new Error('Module not initialized');
            }

            // Create database connection
            return new Promise((resolve, reject) => {
                this.connection = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
                    if (err) {
                        this._isConnected = false;
                        this.logger.error(`Failed to connect to database: ${err.message}`);
                        reject(err);
                        return;
                    }

                    try {
                        // Set connection state before configuring
                        this._isConnected = true;
                        this.connectionStartTime = Date.now();

                        // Configure database
                        await this._configureDatabase();

                        this.logger.info(`Connected to SQLite database at ${this.dbPath}`);
                        resolve(true);
                    } catch (error) {
                        this._isConnected = false;
                        this.connectionStartTime = null;
                        this.connection = null;
                        reject(error);
                    }
                });
            });
        } catch (error) {
            this._isConnected = false;
            this.connectionStartTime = null;
            this.connection = null;
            this.logger.error(`Failed to connect to database: ${error.message}`);
            throw error;
        }
    }

    /**
     * Configure the SQLite database
     * @private
     */
    async _configureDatabase() {
        const promises = [];

        // Enable Write-Ahead Logging if configured
        if (this.options.enableWAL) {
            promises.push(new Promise((resolve, reject) => {
                this.connection.run('PRAGMA journal_mode=WAL', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }));
        }

        // Enable foreign key support if configured
        if (this.options.enableForeignKeys) {
            promises.push(new Promise((resolve, reject) => {
                this.connection.run('PRAGMA foreign_keys=ON', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }));
        }

        // Set busy timeout
        if (this.options.timeout) {
            promises.push(new Promise((resolve, reject) => {
                this.connection.run(`PRAGMA busy_timeout=${this.options.timeout}`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }));
        }

        try {
            await Promise.all(promises);
            this.logger.debug('Database configured successfully');
        } catch (error) {
            this.logger.error(`Failed to configure database: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute a query on the SQLite database
     * @param {string} sql - SQL query to execute
     * @param {Array} params - Query parameters
     * @returns {Promise<any>} Query results
     */
    async query(sql, params = []) {
        if (!this.connection || !this._isConnected) {
            throw new Error('Database not connected');
        }

        return new Promise((resolve, reject) => {
            const isSelect = sql.trim().toLowerCase().startsWith('select');
            
            if (isSelect) {
                this.connection.all(sql, params, (err, rows) => {
                    if (err) {
                        this.errors++;
                        reject(err);
                    } else {
                        this.queryCount++;
                        this.lastQuery = sql;
                        resolve(rows);
                    }
                });
            } else {
                this.connection.run(sql, params, (err) => {
                    if (err) {
                        this.errors++;
                        reject(err);
                    } else {
                        this.queryCount++;
                        this.lastQuery = sql;
                        resolve({
                            changes: this.connection.changes,
                            lastID: this.connection.lastID
                        });
                    }
                });
            }
        });
    }

    /**
     * Create a backup of the SQLite database
     * @returns {Promise<string>} Backup file path
     */
    async createBackup() {
        try {
            if (!this._isConnected) {
                throw new Error('Database not connected');
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `backup-${timestamp}.db`);

            // Create backup
            await fs.copyFile(this.dbPath, backupPath);

            // Clean up old backups
            await this._cleanupBackups();

            this.logger.info(this.name, `Created backup at ${backupPath}`);
            return backupPath;
        } catch (error) {
            this.logger.error(this.name, `Failed to create backup: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean up old backups
     * @private
     */
    async _cleanupBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = files
                .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
                .sort()
                .reverse();

            // Remove excess backups
            if (backups.length > this.maxBackups) {
                const toRemove = backups.slice(this.maxBackups);
                for (const backup of toRemove) {
                    const backupPath = path.join(this.backupDir, backup);
                    await fs.unlink(backupPath);
                    this.logger.debug(this.name, `Removed old backup: ${backup}`);
                }
            }
        } catch (error) {
            this.logger.error(this.name, `Failed to clean up backups: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get the SQLite module status
     * @returns {Object} Status object
     */
    async getStatus() {
        try {
            const status = await super.getStatus();
            return {
                ...status,
                type: 'sqlite',
                path: this.dbPath,
                backupDir: this.backupDir,
                maxBackups: this.maxBackups,
                options: this.options
            };
        } catch (error) {
            return {
                name: this.name,
                error: error.message,
                initialized: this._initialized === true,
                connected: this._isConnected === true,
                type: 'sqlite'
            };
        }
    }
}

module.exports = SQLiteModule; 