/**
 * JMF Hosting Discord Bot - SQLite Database Module
 * Version: 1.1.0
 * Last Updated: 03/12/2025
 * 
 * This module provides SQLite database functionality, extending the base
 * module with SQLite-specific implementations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const sqlite3 = require('sqlite3');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execPromise = promisify(exec);

class SQLiteModule extends BaseModule {
    /**
     * Create a new SQLite module
     * @param {Object} manager - The parent manager instance
     * @param {Object} [options] - Module options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: 'sqlite',
            version: '1.1.0',
            defaultConfig: {
                database: path.join(process.cwd(), 'data', 'database', 'bot.db'),
                backupDir: path.join(process.cwd(), 'data', 'database', 'backups'),
                maxBackups: 10,
                journalMode: 'WAL',
                busyTimeout: 5000,
                enableForeignKeys: true,
                testDatabase: path.join(process.cwd(), 'data', 'database', 'test.db')
            },
            ...options
        });

        this.db = null;
        this.inTransaction = false;
        this.queryCount = 0;
        this.isTestMode = process.env.NODE_ENV === 'test';
    }

    /**
     * Initialize the SQLite module
     * @returns {Promise<void>}
     */
    async initialize() {
        return this.executeOperation('initialize', async () => {
            await super.initialize();
            
            // Ensure database directory exists
            const dbPath = this.isTestMode ? 
                this.getConfig('testDatabase') : 
                this.getConfig('database');
                
            await fs.mkdir(path.dirname(dbPath), { recursive: true });
            
            this.logger.info('sqlite', 'SQLite module initialized');
        });
    }

    /**
     * Connect to the SQLite database
     * @returns {Promise<Object>} Database connection
     */
    async connect() {
        return this.executeOperation('connect', async () => {
            const dbPath = this.isTestMode ? 
                this.getConfig('testDatabase') : 
                this.getConfig('database');
                
            this.logger.info('sqlite', `Connecting to SQLite database at ${dbPath}`);
            
            try {
                // Connect to the database
                this.db = await new Promise((resolve, reject) => {
                    const db = new sqlite3.Database(
                        dbPath,
                        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
                        (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(db);
                            }
                        }
                    );
                });
                
                // Configure database
                await this._configureDatabase();
                
                // Initialize schema if needed
                await this._initializeSchema();
                
                this.logger.success('sqlite', 'Connected to SQLite database');
                return this.db;
            } catch (error) {
                this.logger.error('sqlite', `Failed to connect to SQLite database: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Configure the SQLite database
     * @returns {Promise<void>}
     * @private
     */
    async _configureDatabase() {
        return this.executeOperation('configureDatabase', async () => {
            // Set busy timeout
            await this.run(`PRAGMA busy_timeout = ${this.getConfig('busyTimeout')}`);
            
            // Set journal mode
            await this.run(`PRAGMA journal_mode = ${this.getConfig('journalMode')}`);
            
            // Enable foreign keys if configured
            if (this.getConfig('enableForeignKeys')) {
                await this.run('PRAGMA foreign_keys = ON');
            }
            
            this.logger.debug('sqlite', 'SQLite database configured');
        });
    }

    /**
     * Initialize the database schema
     * @returns {Promise<void>}
     * @private
     */
    async _initializeSchema() {
        return this.executeOperation('initializeSchema', async () => {
            // Check if migrations table exists
            const result = await this.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
            );
            
            if (!result) {
                // Create migrations table
                await this.run(`
                    CREATE TABLE migrations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        version TEXT NOT NULL,
                        description TEXT NOT NULL,
                        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                this.logger.info('sqlite', 'Created migrations table');
            }
        });
    }

    /**
     * Execute a SQL query
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<any>} Query result
     */
    async query(sql, params = []) {
        return this.executeOperation('query', async () => {
            if (!this.db) {
                throw new Error('Database not connected');
            }
            
            this.queryCount++;
            
            const isSelect = sql.trim().toLowerCase().startsWith('select');
            const method = isSelect ? 'all' : 'run';
            
            return new Promise((resolve, reject) => {
                this.db[method](sql, params, function(err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(isSelect ? result : this);
                    }
                });
            });
        });
    }

    /**
     * Execute a SQL query that returns a single row
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async get(sql, params = []) {
        return this.executeOperation('get', async () => {
            if (!this.db) {
                throw new Error('Database not connected');
            }
            
            this.queryCount++;
            
            return new Promise((resolve, reject) => {
                this.db.get(sql, params, (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
        });
    }

    /**
     * Execute a SQL query that doesn't return results
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async run(sql, params = []) {
        return this.executeOperation('run', async () => {
            if (!this.db) {
                throw new Error('Database not connected');
            }
            
            this.queryCount++;
            
            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            lastID: this.lastID,
                            changes: this.changes
                        });
                    }
                });
            });
        });
    }

    /**
     * Begin a transaction
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        return this.executeOperation('beginTransaction', async () => {
            if (this.inTransaction) {
                throw new Error('Transaction already in progress');
            }
            
            await this.run('BEGIN TRANSACTION');
            this.inTransaction = true;
            this.logger.debug('sqlite', 'Transaction started');
        });
    }

    /**
     * Commit a transaction
     * @returns {Promise<void>}
     */
    async commit() {
        return this.executeOperation('commit', async () => {
            if (!this.inTransaction) {
                throw new Error('No transaction in progress');
            }
            
            await this.run('COMMIT');
            this.inTransaction = false;
            this.logger.debug('sqlite', 'Transaction committed');
        });
    }

    /**
     * Rollback a transaction
     * @returns {Promise<void>}
     */
    async rollback() {
        return this.executeOperation('rollback', async () => {
            if (!this.inTransaction) {
                throw new Error('No transaction in progress');
            }
            
            await this.run('ROLLBACK');
            this.inTransaction = false;
            this.logger.debug('sqlite', 'Transaction rolled back');
        });
    }

    /**
     * Check if the database is connected
     * @returns {boolean} Whether the database is connected
     */
    isConnected() {
        return this.db !== null;
    }

    /**
     * Get the current database version
     * @returns {Promise<string>} Database version
     */
    async getVersion() {
        return this.executeOperation('getVersion', async () => {
            try {
                const row = await this.get(
                    'SELECT version FROM migrations ORDER BY id DESC LIMIT 1'
                );
                return row ? row.version : '0.0.0';
            } catch (error) {
                return '0.0.0';
            }
        });
    }

    /**
     * Create a database backup
     * @param {Object} [options] - Backup options
     * @returns {Promise<string>} Backup file path
     */
    async backup(options = {}) {
        return this.executeOperation('backup', async () => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = this.getConfig('backupDir');
            const dbPath = this.isTestMode ? 
                this.getConfig('testDatabase') : 
                this.getConfig('database');
            const backupPath = path.join(backupDir, `sqlite_backup_${timestamp}.db`);
            
            // Ensure backup directory exists
            await fs.mkdir(backupDir, { recursive: true });
            
            this.logger.info('sqlite', `Creating backup at ${backupPath}`);
            
            // Create backup
            if (options.vacuum) {
                // Use sqlite3 command line to create a vacuumed backup
                await execPromise(`sqlite3 "${dbPath}" ".backup '${backupPath}'" && sqlite3 "${backupPath}" "VACUUM"`);
            } else {
                // Simple file copy
                await fs.copyFile(dbPath, backupPath);
            }
            
            this.logger.success('sqlite', `Backup created at ${backupPath}`);
            return backupPath;
        });
    }

    /**
     * Restore database from backup
     * @param {string} backupPath - Path to backup file
     * @returns {Promise<void>}
     */
    async restore(backupPath) {
        return this.executeOperation('restore', async () => {
            const dbPath = this.isTestMode ? 
                this.getConfig('testDatabase') : 
                this.getConfig('database');
                
            this.logger.info('sqlite', `Restoring database from ${backupPath}`);
            
            // Close database connection
            await this.disconnect();
            
            // Copy backup file to database file
            await fs.copyFile(backupPath, dbPath);
            
            // Reconnect to database
            await this.connect();
            
            this.logger.success('sqlite', 'Database restored successfully');
        });
    }

    /**
     * Verify database integrity
     * @returns {Promise<Object>} Integrity check result
     */
    async verifyIntegrity() {
        return this.executeOperation('verifyIntegrity', async () => {
            this.logger.info('sqlite', 'Verifying database integrity');
            
            try {
                // Run integrity check
                const integrityResult = await this.query('PRAGMA integrity_check');
                
                // Run foreign key check
                const foreignKeyResult = await this.query('PRAGMA foreign_key_check');
                
                const valid = integrityResult.length === 1 && 
                             integrityResult[0].integrity_check === 'ok' &&
                             foreignKeyResult.length === 0;
                
                if (valid) {
                    this.logger.success('sqlite', 'Database integrity check passed');
                } else {
                    this.logger.error('sqlite', 'Database integrity check failed', {
                        integrity: integrityResult,
                        foreignKeys: foreignKeyResult
                    });
                }
                
                return {
                    valid,
                    integrity: integrityResult,
                    foreignKeys: foreignKeyResult
                };
            } catch (error) {
                this.logger.error('sqlite', `Integrity check failed: ${error.message}`);
                return {
                    valid: false,
                    errors: [error.message]
                };
            }
        });
    }

    /**
     * Get database status
     * @returns {Promise<Object>} Status information
     */
    async getStatus() {
        return this.executeOperation('getStatus', async () => {
            const status = await super.getStatus();
            
            const dbPath = this.isTestMode ? 
                this.getConfig('testDatabase') : 
                this.getConfig('database');
                
            let dbSize = 0;
            let tableCount = 0;
            
            if (this.isConnected()) {
                try {
                    // Get database file size
                    const stats = await fs.stat(dbPath);
                    dbSize = stats.size;
                    
                    // Get table count
                    const tables = await this.query("SELECT name FROM sqlite_master WHERE type='table'");
                    tableCount = tables.length;
                } catch (error) {
                    this.logger.error('sqlite', `Failed to get database stats: ${error.message}`);
                }
            }
            
            return {
                ...status,
                connected: this.isConnected(),
                path: dbPath,
                size: dbSize,
                tables: tableCount,
                queryCount: this.queryCount,
                inTransaction: this.inTransaction,
                testMode: this.isTestMode
            };
        });
    }

    /**
     * Disconnect from the database
     * @returns {Promise<void>}
     */
    async disconnect() {
        return this.executeOperation('disconnect', async () => {
            if (!this.db) {
                return;
            }
            
            this.logger.info('sqlite', 'Disconnecting from SQLite database');
            
            // Rollback any active transaction
            if (this.inTransaction) {
                try {
                    await this.rollback();
                } catch (error) {
                    this.logger.warn('sqlite', `Failed to rollback transaction: ${error.message}`);
                }
            }
            
            // Close the database
            await new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            
            this.db = null;
            this.logger.success('sqlite', 'Disconnected from SQLite database');
        });
    }

    /**
     * Create a test database for unit testing
     * @returns {Promise<void>}
     */
    async createTestDatabase() {
        return this.executeOperation('createTestDatabase', async () => {
            const testDbPath = this.getConfig('testDatabase');
            
            // Ensure test database directory exists
            await fs.mkdir(path.dirname(testDbPath), { recursive: true });
            
            // Remove existing test database if it exists
            try {
                await fs.unlink(testDbPath);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
            
            // Create a new test database
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';
            
            try {
                await this.connect();
                
                // Create test tables
                await this.run(`
                    CREATE TABLE test_users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                await this.run(`
                    CREATE TABLE test_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES test_users(id) ON DELETE CASCADE
                    )
                `);
                
                // Insert test data
                await this.run(
                    'INSERT INTO test_users (username, email) VALUES (?, ?)',
                    ['testuser', 'test@example.com']
                );
                
                await this.run(
                    'INSERT INTO test_items (user_id, name, description) VALUES (?, ?, ?)',
                    [1, 'Test Item', 'This is a test item']
                );
                
                this.logger.success('sqlite', 'Test database created successfully');
            } finally {
                await this.disconnect();
                process.env.NODE_ENV = originalEnv;
            }
        });
    }

    /**
     * Clean up the test database
     * @returns {Promise<void>}
     */
    async cleanupTestDatabase() {
        return this.executeOperation('cleanupTestDatabase', async () => {
            const testDbPath = this.getConfig('testDatabase');
            
            try {
                await fs.unlink(testDbPath);
                this.logger.info('sqlite', 'Test database cleaned up');
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    this.logger.error('sqlite', `Failed to clean up test database: ${error.message}`);
                    throw error;
                }
            }
        });
    }
}

module.exports = SQLiteModule; 