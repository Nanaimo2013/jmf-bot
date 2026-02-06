/**
 * JMF Hosting Discord Bot - MySQL Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides MySQL database functionality for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const DatabaseBaseModule = require('./base.module');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs').promises;

class MySQLModule extends DatabaseBaseModule {
    /**
     * Create a new MySQL module
     * @param {DatabaseManager} manager - The database manager instance
     * @param {Object} config - Module configuration
     */
    constructor(manager, config = {}) {
        super(manager, {
            name: 'mysql',
            version: '1.0.0',
            description: 'MySQL database module',
            ...config
        });

        // MySQL-specific properties
        this.config = {
            host: config.host || 'localhost',
            port: config.port || 3306,
            user: config.user || 'root',
            password: config.password || '',
            database: config.database || 'jmf_bot',
            connectionLimit: config.connectionLimit || 10,
            timezone: config.timezone || 'local',
            charset: config.charset || 'utf8mb4',
            ...config
        };

        this.backupDir = config.backupDir || path.join(process.cwd(), 'data', 'backups');
        this.maxBackups = config.maxBackups || 5;
        this.pool = null;
    }

    /**
     * Initialize the MySQL module
     * @returns {Promise<boolean>}
     */
    async initialize() {
        try {
            await super.initialize();
            
            // Ensure directories exist
            await this._ensureDirectories();
            
            // Connect to database
            await this.connect();
            
            return true;
        } catch (error) {
            this._initialized = false;
            this.logger.error(this.name, `Failed to initialize MySQL module: ${error.message}`);
            throw error;
        }
    }

    /**
     * Ensure required directories exist
     * @private
     */
    async _ensureDirectories() {
        try {
            // Ensure backup directory exists
            await fs.mkdir(this.backupDir, { recursive: true });
            this.logger.debug(this.name, 'Directories created successfully');
        } catch (error) {
            this.logger.error(this.name, `Failed to create directories: ${error.message}`);
            throw error;
        }
    }

    /**
     * Connect to the MySQL database
     * @returns {Promise<boolean>}
     */
    async connect() {
        try {
            if (!this._initialized) {
                throw new Error('Module not initialized');
            }

            // Create connection pool
            this.pool = mysql.createPool({
                ...this.config,
                waitForConnections: true,
                queueLimit: 0
            });

            // Test connection
            const connection = await this.pool.getConnection();
            await connection.release();

            this._isConnected = true;
            this.connectionStartTime = Date.now();
            this.logger.info(this.name, `Connected to MySQL database at ${this.config.host}:${this.config.port}`);
            return true;
        } catch (error) {
            this._isConnected = false;
            this.connectionStartTime = null;
            this.pool = null;
            this.logger.error(this.name, `Failed to connect to database: ${error.message}`);
            throw error;
        }
    }

    /**
     * Disconnect from the MySQL database
     * @returns {Promise<boolean>}
     */
    async disconnect() {
        try {
            if (this.pool) {
                await this.pool.end();
            }

            this._isConnected = false;
            this.connectionStartTime = null;
            this.pool = null;
            this.logger.info(this.name, 'Disconnected from database');
            return true;
        } catch (error) {
            this.logger.error(this.name, `Failed to disconnect from database: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute a query on the MySQL database
     * @param {string} sql - SQL query to execute
     * @param {Array} params - Query parameters
     * @returns {Promise<any>} Query results
     */
    async query(sql, params = []) {
        try {
            if (!this._isConnected) {
                throw new Error('Database not connected');
            }

            const connection = await this.pool.getConnection();
            try {
                const [rows] = await connection.query(sql, params);
                this.queryCount++;
                this.lastQuery = sql;
                return rows;
            } finally {
                connection.release();
            }
        } catch (error) {
            this.errors++;
            this.logger.error(this.name, `Query error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a backup of the MySQL database
     * @returns {Promise<string>} Backup file path
     */
    async createBackup() {
        try {
            if (!this._isConnected) {
                throw new Error('Database not connected');
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `backup-${timestamp}.sql`);

            // Create backup using mysqldump
            const { exec } = require('child_process');
            const mysqldump = require('mysqldump');

            await mysqldump({
                connection: {
                    host: this.config.host,
                    port: this.config.port,
                    user: this.config.user,
                    password: this.config.password,
                    database: this.config.database
                },
                dumpToFile: backupPath
            });

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
                .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
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
     * Get the MySQL module status
     * @returns {Object} Status object
     */
    async getStatus() {
        try {
            const status = await super.getStatus();
            return {
                ...status,
                type: 'mysql',
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.user,
                backupDir: this.backupDir,
                maxBackups: this.maxBackups,
                connectionLimit: this.config.connectionLimit
            };
        } catch (error) {
            return {
                name: this.name,
                error: error.message,
                initialized: this._initialized === true,
                connected: this._isConnected === true,
                type: 'mysql'
            };
        }
    }
}

module.exports = MySQLModule; 