/**
 * JMF Hosting Discord Bot - MySQL Database Module
 * Version: 1.1.0
 * Last Updated: 03/12/2025
 * 
 * This module provides MySQL database functionality, extending the base
 * module with MySQL-specific implementations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

class MySQLModule extends BaseModule {
    /**
     * Create a new MySQL module
     * @param {Object} manager - The parent manager instance
     * @param {Object} [options] - Module options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: 'mysql',
            version: '1.1.0',
            defaultConfig: {
                host: 'localhost',
                port: 3306,
                user: 'jmfbot',
                password: '',
                database: 'jmfbot',
                connectionLimit: 10,
                backupDir: path.join(process.cwd(), 'data', 'database', 'backups'),
                maxBackups: 10,
                charset: 'utf8mb4',
                testDatabase: 'jmfbot_test'
            },
            ...options
        });

        this.connection = null;
        this.pool = null;
        this.inTransaction = false;
        this.queryCount = 0;
        this.isTestMode = process.env.NODE_ENV === 'test';
    }

    /**
     * Initialize the MySQL module
     * @returns {Promise<void>}
     */
    async initialize() {
        return this.executeOperation('initialize', async () => {
            await super.initialize();
            
            // Ensure backup directory exists
            const backupDir = this.getConfig('backupDir');
            await fs.mkdir(backupDir, { recursive: true });
            
            this.logger.info('mysql', 'MySQL module initialized');
        });
    }

    /**
     * Connect to the MySQL database
     * @returns {Promise<Object>} Database connection
     */
    async connect() {
        return this.executeOperation('connect', async () => {
            const dbName = this.isTestMode ? 
                this.getConfig('testDatabase') : 
                this.getConfig('database');
                
            this.logger.info('mysql', `Connecting to MySQL database at ${this.getConfig('host')}:${this.getConfig('port')}/${dbName}`);
            
            try {
                // Create connection pool
                this.pool = mysql.createPool({
                    host: this.getConfig('host'),
                    port: this.getConfig('port'),
                    user: this.getConfig('user'),
                    password: this.getConfig('password'),
                    database: dbName,
                    waitForConnections: true,
                    connectionLimit: this.getConfig('connectionLimit'),
                    queueLimit: 0,
                    charset: this.getConfig('charset')
                });
                
                // Get a connection from the pool
                this.connection = await this.pool.getConnection();
                
                // Initialize schema if needed
                await this._initializeSchema();
                
                this.logger.success('mysql', 'Connected to MySQL database');
                return this.connection;
            } catch (error) {
                this.logger.error('mysql', `Failed to connect to MySQL database: ${error.message}`);
                throw error;
            }
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
            const [tables] = await this.query(
                "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND TABLE_NAME = 'migrations'",
                [this.isTestMode ? this.getConfig('testDatabase') : this.getConfig('database')]
            );
            
            if (tables.length === 0) {
                // Create migrations table
                await this.query(`
                    CREATE TABLE migrations (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        version VARCHAR(255) NOT NULL,
                        description VARCHAR(255) NOT NULL,
                        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                this.logger.info('mysql', 'Created migrations table');
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
            if (!this.connection && !this.pool) {
                throw new Error('Database not connected');
            }
            
            this.queryCount++;
            
            try {
                // Use connection if available, otherwise use pool
                const conn = this.connection || this.pool;
                const [results] = await conn.query(sql, params);
                return results;
            } catch (error) {
                this.logger.error('mysql', `Query error: ${error.message}`, { sql });
                throw error;
            }
        });
    }

    /**
     * Begin a transaction
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        return this.executeOperation('beginTransaction', async () => {
            if (!this.connection) {
                throw new Error('Database not connected');
            }
            
            if (this.inTransaction) {
                throw new Error('Transaction already in progress');
            }
            
            await this.connection.beginTransaction();
            this.inTransaction = true;
            this.logger.debug('mysql', 'Transaction started');
        });
    }

    /**
     * Commit a transaction
     * @returns {Promise<void>}
     */
    async commit() {
        return this.executeOperation('commit', async () => {
            if (!this.connection) {
                throw new Error('Database not connected');
            }
            
            if (!this.inTransaction) {
                throw new Error('No transaction in progress');
            }
            
            await this.connection.commit();
            this.inTransaction = false;
            this.logger.debug('mysql', 'Transaction committed');
        });
    }

    /**
     * Rollback a transaction
     * @returns {Promise<void>}
     */
    async rollback() {
        return this.executeOperation('rollback', async () => {
            if (!this.connection) {
                throw new Error('Database not connected');
            }
            
            if (!this.inTransaction) {
                throw new Error('No transaction in progress');
            }
            
            await this.connection.rollback();
            this.inTransaction = false;
            this.logger.debug('mysql', 'Transaction rolled back');
        });
    }

    /**
     * Check if the database is connected
     * @returns {boolean} Whether the database is connected
     */
    isConnected() {
        return this.connection !== null || this.pool !== null;
    }

    /**
     * Get the current database version
     * @returns {Promise<string>} Database version
     */
    async getVersion() {
        return this.executeOperation('getVersion', async () => {
            try {
                const rows = await this.query(
                    'SELECT version FROM migrations ORDER BY id DESC LIMIT 1'
                );
                return rows.length > 0 ? rows[0].version : '0.0.0';
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
            const dbName = this.isTestMode ? 
                this.getConfig('testDatabase') : 
                this.getConfig('database');
            const backupPath = path.join(backupDir, `mysql_backup_${dbName}_${timestamp}.sql`);
            
            // Ensure backup directory exists
            await fs.mkdir(backupDir, { recursive: true });
            
            this.logger.info('mysql', `Creating backup at ${backupPath}`);
            
            // Create backup using mysqldump
            const cmd = `mysqldump -h ${this.getConfig('host')} -P ${this.getConfig('port')} -u ${this.getConfig('user')} ${this.getConfig('password') ? `-p${this.getConfig('password')}` : ''} ${dbName} > "${backupPath}"`;
            
            try {
                await execPromise(cmd);
                
                // Compress backup if requested
                if (options.compress) {
                    const gzipPath = `${backupPath}.gz`;
                    await execPromise(`gzip -f "${backupPath}"`);
                    this.logger.success('mysql', `Backup compressed to ${gzipPath}`);
                    return gzipPath;
                }
                
                this.logger.success('mysql', `Backup created at ${backupPath}`);
                return backupPath;
            } catch (error) {
                this.logger.error('mysql', `Failed to create backup: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Restore database from backup
     * @param {string} backupPath - Path to backup file
     * @returns {Promise<void>}
     */
    async restore(backupPath) {
        return this.executeOperation('restore', async () => {
            const dbName = this.isTestMode ? 
                this.getConfig('testDatabase') : 
                this.getConfig('database');
                
            this.logger.info('mysql', `Restoring database from ${backupPath}`);
            
            // Disconnect from database
            await this.disconnect();
            
            try {
                // Decompress backup if it's compressed
                let restorePath = backupPath;
                if (backupPath.endsWith('.gz')) {
                    restorePath = backupPath.replace('.gz', '');
                    await execPromise(`gunzip -c "${backupPath}" > "${restorePath}"`);
                    this.logger.info('mysql', `Decompressed backup to ${restorePath}`);
                }
                
                // Restore from backup
                const cmd = `mysql -h ${this.getConfig('host')} -P ${this.getConfig('port')} -u ${this.getConfig('user')} ${this.getConfig('password') ? `-p${this.getConfig('password')}` : ''} ${dbName} < "${restorePath}"`;
                await execPromise(cmd);
                
                // Clean up decompressed file if needed
                if (backupPath.endsWith('.gz')) {
                    await fs.unlink(restorePath);
                }
                
                // Reconnect to database
                await this.connect();
                
                this.logger.success('mysql', 'Database restored successfully');
            } catch (error) {
                this.logger.error('mysql', `Failed to restore database: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Verify database integrity
     * @returns {Promise<Object>} Integrity check result
     */
    async verifyIntegrity() {
        return this.executeOperation('verifyIntegrity', async () => {
            this.logger.info('mysql', 'Verifying database integrity');
            
            try {
                // Get all tables
                const [tables] = await this.query(
                    "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?",
                    [this.isTestMode ? this.getConfig('testDatabase') : this.getConfig('database')]
                );
                
                // Check each table
                const tableNames = tables.map(t => t.TABLE_NAME);
                const checkResults = [];
                
                for (const table of tableNames) {
                    const [checkResult] = await this.query(`CHECK TABLE ${table}`);
                    checkResults.push(...checkResult);
                }
                
                // Check for errors
                const errors = checkResults.filter(r => r.Msg_type === 'error' || r.Msg_type === 'warning');
                
                const valid = errors.length === 0;
                
                if (valid) {
                    this.logger.success('mysql', 'Database integrity check passed');
                } else {
                    this.logger.error('mysql', 'Database integrity check failed', { errors });
                }
                
                return {
                    valid,
                    tables: tableNames.length,
                    checks: checkResults,
                    errors: errors.map(e => `${e.Table}: ${e.Msg_text}`)
                };
            } catch (error) {
                this.logger.error('mysql', `Integrity check failed: ${error.message}`);
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
            
            const dbName = this.isTestMode ? 
                this.getConfig('testDatabase') : 
                this.getConfig('database');
                
            let tableCount = 0;
            let databaseSize = 0;
            
            if (this.isConnected()) {
                try {
                    // Get table count
                    const [tables] = await this.query(
                        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?",
                        [dbName]
                    );
                    tableCount = tables[0].count;
                    
                    // Get database size
                    const [sizeResult] = await this.query(
                        "SELECT SUM(data_length + index_length) as size FROM information_schema.tables WHERE table_schema = ?",
                        [dbName]
                    );
                    databaseSize = sizeResult[0].size || 0;
                } catch (error) {
                    this.logger.error('mysql', `Failed to get database stats: ${error.message}`);
                }
            }
            
            return {
                ...status,
                connected: this.isConnected(),
                host: this.getConfig('host'),
                port: this.getConfig('port'),
                database: dbName,
                tables: tableCount,
                size: databaseSize,
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
            if (!this.connection && !this.pool) {
                return;
            }
            
            this.logger.info('mysql', 'Disconnecting from MySQL database');
            
            // Rollback any active transaction
            if (this.inTransaction && this.connection) {
                try {
                    await this.rollback();
                } catch (error) {
                    this.logger.warn('mysql', `Failed to rollback transaction: ${error.message}`);
                }
            }
            
            // Release connection back to pool
            if (this.connection) {
                this.connection.release();
                this.connection = null;
            }
            
            // Close pool
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
            }
            
            this.logger.success('mysql', 'Disconnected from MySQL database');
        });
    }

    /**
     * Create a test database for unit testing
     * @returns {Promise<void>}
     */
    async createTestDatabase() {
        return this.executeOperation('createTestDatabase', async () => {
            const testDbName = this.getConfig('testDatabase');
            
            this.logger.info('mysql', `Creating test database: ${testDbName}`);
            
            // Store original environment
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';
            
            try {
                // Connect to MySQL without database
                const tempPool = mysql.createPool({
                    host: this.getConfig('host'),
                    port: this.getConfig('port'),
                    user: this.getConfig('user'),
                    password: this.getConfig('password'),
                    waitForConnections: true,
                    connectionLimit: 1,
                    queueLimit: 0
                });
                
                // Drop test database if it exists
                await tempPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
                
                // Create test database
                await tempPool.query(`CREATE DATABASE ${testDbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
                
                // Close temporary pool
                await tempPool.end();
                
                // Connect to test database
                await this.connect();
                
                // Create test tables
                await this.query(`
                    CREATE TABLE test_users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(255) NOT NULL,
                        email VARCHAR(255) NOT NULL UNIQUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                await this.query(`
                    CREATE TABLE test_items (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES test_users(id) ON DELETE CASCADE
                    )
                `);
                
                // Insert test data
                await this.query(
                    'INSERT INTO test_users (username, email) VALUES (?, ?)',
                    ['testuser', 'test@example.com']
                );
                
                await this.query(
                    'INSERT INTO test_items (user_id, name, description) VALUES (?, ?, ?)',
                    [1, 'Test Item', 'This is a test item']
                );
                
                this.logger.success('mysql', 'Test database created successfully');
            } catch (error) {
                this.logger.error('mysql', `Failed to create test database: ${error.message}`);
                throw error;
            } finally {
                // Disconnect from test database
                await this.disconnect();
                
                // Restore original environment
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
            const testDbName = this.getConfig('testDatabase');
            
            this.logger.info('mysql', `Cleaning up test database: ${testDbName}`);
            
            try {
                // Connect to MySQL without database
                const tempPool = mysql.createPool({
                    host: this.getConfig('host'),
                    port: this.getConfig('port'),
                    user: this.getConfig('user'),
                    password: this.getConfig('password'),
                    waitForConnections: true,
                    connectionLimit: 1,
                    queueLimit: 0
                });
                
                // Drop test database
                await tempPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
                
                // Close temporary pool
                await tempPool.end();
                
                this.logger.info('mysql', 'Test database cleaned up');
            } catch (error) {
                this.logger.error('mysql', `Failed to clean up test database: ${error.message}`);
                throw error;
            }
        });
    }
}

module.exports = MySQLModule; 