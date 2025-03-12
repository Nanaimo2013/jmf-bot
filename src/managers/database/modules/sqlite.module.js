/**
 * JMF Hosting Discord Bot - SQLite Database Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides SQLite database functionality, extending the base
 * database module with SQLite-specific implementations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const BaseDatabaseModule = require('./base.module');
const sqlite3 = require('sqlite3');
const fs = require('fs').promises;
const path = require('path');

class SQLiteModule extends BaseDatabaseModule {
    constructor() {
        super('sqlite');
        this.db = null;
        this.inTransaction = false;
    }

    async _validateConfig(config) {
        await super._validateConfig(config);
        if (!config.database) {
            throw new Error('Database path is required in configuration');
        }
    }

    async initialize(config) {
        await super.initialize(config);
        await this._connect();
        await this._enableForeignKeys();
        await this._initializeSchema();
    }

    async _connect() {
        this.logger.info(this.name, `${this.logger.defaultIcons.connect} Connecting to SQLite database at ${this.config.database}...`);
        
        try {
            // Ensure the database directory exists
            await fs.mkdir(path.dirname(this.config.database), { recursive: true });

            // Connect to the database
            this.db = await new Promise((resolve, reject) => {
                const db = new sqlite3.Database(
                    this.config.database,
                    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
                    (err) => {
                        if (err) reject(err);
                        else resolve(db);
                    }
                );
            });

            this.logger.success(this.name, `${this.logger.defaultIcons.success} Connected to SQLite database`);
        } catch (error) {
            this._logError(error, 'Failed to connect to SQLite database');
            throw error;
        }
    }

    async _enableForeignKeys() {
        await this.query('PRAGMA foreign_keys = ON');
        const [result] = await this.query('PRAGMA foreign_keys');
        if (!result.foreign_keys) {
            throw new Error('Failed to enable foreign key support');
        }
    }

    async _initializeSchema() {
        this.logger.info(this.name, `${this.logger.defaultIcons.upgrade} Initializing database schema...`);
        
        try {
            // Create version tracking table if it doesn't exist
            await this.query(`
                CREATE TABLE IF NOT EXISTS db_version (
                    version INTEGER PRIMARY KEY,
                    description TEXT NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Insert initial version if table is empty
            const [version] = await this.query('SELECT version FROM db_version ORDER BY version DESC LIMIT 1');
            if (!version) {
                await this.query('INSERT INTO db_version (version, description) VALUES (?, ?)', [1, 'Initial schema']);
            }

            this.logger.success(this.name, `${this.logger.defaultIcons.success} Schema initialized successfully`);
        } catch (error) {
            this._logError(error, 'Failed to initialize schema');
            throw error;
        }
    }

    async query(sql, params = []) {
        const start = Date.now();
        try {
            const isSelect = sql.trim().toLowerCase().startsWith('select');
            const result = await new Promise((resolve, reject) => {
                const method = isSelect ? 'all' : 'run';
                this.db[method](sql, params, function(err, result) {
                    if (err) reject(err);
                    else resolve(isSelect ? result : this);
                });
            });

            const duration = Date.now() - start;
            this._logQuery(sql, params, duration);
            return result;
        } catch (error) {
            this._logError(error, 'Query failed');
            throw error;
        }
    }

    async beginTransaction() {
        if (this.inTransaction) {
            throw new Error('Transaction already in progress');
        }

        await this.query('BEGIN TRANSACTION');
        this.inTransaction = true;
        this.logger.debug(this.name, `${this.logger.defaultIcons.start} Transaction started`);
    }

    async commit() {
        if (!this.inTransaction) {
            throw new Error('No transaction in progress');
        }

        await this.query('COMMIT');
        this.inTransaction = false;
        this.logger.debug(this.name, `${this.logger.defaultIcons.success} Transaction committed`);
    }

    async rollback() {
        if (!this.inTransaction) {
            throw new Error('No transaction in progress');
        }

        await this.query('ROLLBACK');
        this.inTransaction = false;
        this.logger.debug(this.name, `${this.logger.defaultIcons.undo} Transaction rolled back`);
    }

    isConnected() {
        return this.db !== null;
    }

    async getVersion() {
        const [version] = await this.query('SELECT version FROM db_version ORDER BY version DESC LIMIT 1');
        return version ? version.version : 0;
    }

    async backup(options = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = options.directory || path.join(process.cwd(), 'backups', 'database');
        const backupPath = path.join(backupDir, `backup_${timestamp}.sqlite`);

        this.logger.info(this.name, `${this.logger.defaultIcons.backup} Creating backup at ${backupPath}...`);

        try {
            // Ensure backup directory exists
            await fs.mkdir(backupDir, { recursive: true });

            // Create backup
            await fs.copyFile(this.config.database, backupPath);

            this.logger.success(this.name, `${this.logger.defaultIcons.success} Backup created successfully`);
            return backupPath;
        } catch (error) {
            this._logError(error, 'Backup failed');
            throw error;
        }
    }

    async restore(backupPath) {
        if (!await fs.access(backupPath).then(() => true).catch(() => false)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }

        this.logger.info(this.name, `${this.logger.defaultIcons.refresh} Restoring from backup ${backupPath}...`);

        try {
            // Close current connection
            await this.close();

            // Replace database file
            await fs.copyFile(backupPath, this.config.database);

            // Reconnect
            await this._connect();
            await this._enableForeignKeys();

            this.logger.success(this.name, `${this.logger.defaultIcons.success} Database restored successfully`);
        } catch (error) {
            this._logError(error, 'Restore failed');
            throw error;
        }
    }

    async verifyIntegrity() {
        this.logger.info(this.name, `${this.logger.defaultIcons.search} Verifying database integrity...`);

        try {
            // Check database integrity
            const integrityCheck = await this.query('PRAGMA integrity_check');
            if (integrityCheck[0].integrity_check !== 'ok') {
                throw new Error('Database integrity check failed');
            }

            // Check foreign key constraints
            const foreignKeyCheck = await this.query('PRAGMA foreign_key_check');
            if (foreignKeyCheck.length > 0) {
                throw new Error('Foreign key constraints violated');
            }

            this.logger.success(this.name, `${this.logger.defaultIcons.success} Database integrity verified`);
            return true;
        } catch (error) {
            this._logError(error, 'Integrity check failed');
            throw error;
        }
    }

    async getStatus() {
        try {
            const stats = await fs.stat(this.config.database);
            const version = await this.getVersion();
            const tables = await this.query("SELECT name FROM sqlite_master WHERE type='table'");

            return {
                connected: this.isConnected(),
                version: version,
                size: stats.size,
                tables: tables.length,
                path: this.config.database,
                lastModified: stats.mtime
            };
        } catch (error) {
            this._logError(error, 'Failed to get database status');
            throw error;
        }
    }

    async close() {
        if (this.db) {
            this.logger.info(this.name, `${this.logger.defaultIcons.stop} Closing database connection...`);
            
            try {
                await new Promise((resolve, reject) => {
                    this.db.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                this.db = null;
                this.logger.success(this.name, `${this.logger.defaultIcons.success} Database connection closed`);
            } catch (error) {
                this._logError(error, 'Failed to close database connection');
                throw error;
            }
        }
    }
}

module.exports = SQLiteModule; 