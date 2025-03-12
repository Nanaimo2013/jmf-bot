/**
 * JMF Hosting Discord Bot - MySQL Database Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides MySQL database functionality, extending the base
 * database module with MySQL-specific implementations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const BaseDatabaseModule = require('./base.module');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class MySQLModule extends BaseDatabaseModule {
    constructor() {
        super('mysql');
        this.connection = null;
        this.inTransaction = false;
    }

    async _validateConfig(config) {
        await super._validateConfig(config);
        const required = ['host', 'port', 'database', 'username', 'password'];
        for (const field of required) {
            if (!config[field]) {
                throw new Error(`${field} is required in MySQL configuration`);
            }
        }
    }

    async initialize(config) {
        await super.initialize(config);
        await this._connect();
        await this._initializeSchema();
    }

    async _connect() {
        this.logger.info(this.name, `${this.logger.defaultIcons.connect} Connecting to MySQL database at ${this.config.host}:${this.config.port}...`);
        
        try {
            this.connection = await mysql.createConnection({
                host: this.config.host,
                port: this.config.port,
                user: this.config.username,
                password: this.config.password,
                database: this.config.database,
                charset: this.config.charset || 'utf8mb4',
                multipleStatements: true
            });

            this.logger.success(this.name, `${this.logger.defaultIcons.success} Connected to MySQL database`);
        } catch (error) {
            this._logError(error, 'Failed to connect to MySQL database');
            throw error;
        }
    }

    async _initializeSchema() {
        this.logger.info(this.name, `${this.logger.defaultIcons.upgrade} Initializing database schema...`);
        
        try {
            // Create version tracking table if it doesn't exist
            await this.query(`
                CREATE TABLE IF NOT EXISTS db_version (
                    version INT PRIMARY KEY,
                    description VARCHAR(255) NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
            const [rows] = await this.connection.execute(sql, params);
            const duration = Date.now() - start;
            this._logQuery(sql, params, duration);
            return rows;
        } catch (error) {
            this._logError(error, 'Query failed');
            throw error;
        }
    }

    async beginTransaction() {
        if (this.inTransaction) {
            throw new Error('Transaction already in progress');
        }

        await this.connection.beginTransaction();
        this.inTransaction = true;
        this.logger.debug(this.name, `${this.logger.defaultIcons.start} Transaction started`);
    }

    async commit() {
        if (!this.inTransaction) {
            throw new Error('No transaction in progress');
        }

        await this.connection.commit();
        this.inTransaction = false;
        this.logger.debug(this.name, `${this.logger.defaultIcons.success} Transaction committed`);
    }

    async rollback() {
        if (!this.inTransaction) {
            throw new Error('No transaction in progress');
        }

        await this.connection.rollback();
        this.inTransaction = false;
        this.logger.debug(this.name, `${this.logger.defaultIcons.undo} Transaction rolled back`);
    }

    isConnected() {
        return this.connection !== null && !this.connection._closing;
    }

    async getVersion() {
        const [version] = await this.query('SELECT version FROM db_version ORDER BY version DESC LIMIT 1');
        return version ? version.version : 0;
    }

    async backup(options = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = options.directory || path.join(process.cwd(), 'backups', 'database');
        const backupPath = path.join(backupDir, `backup_${timestamp}.sql`);

        this.logger.info(this.name, `${this.logger.defaultIcons.backup} Creating backup at ${backupPath}...`);

        try {
            // Ensure backup directory exists
            await fs.mkdir(backupDir, { recursive: true });

            // Create backup using mysqldump
            const cmd = [
                'mysqldump',
                `--host=${this.config.host}`,
                `--port=${this.config.port}`,
                `--user=${this.config.username}`,
                `--password=${this.config.password}`,
                '--single-transaction',
                '--routines',
                '--triggers',
                '--add-drop-table',
                '--add-drop-trigger',
                this.config.database
            ].join(' ');

            execSync(`${cmd} > "${backupPath}"`);

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

            // Restore using mysql command
            const cmd = [
                'mysql',
                `--host=${this.config.host}`,
                `--port=${this.config.port}`,
                `--user=${this.config.username}`,
                `--password=${this.config.password}`,
                this.config.database
            ].join(' ');

            execSync(`${cmd} < "${backupPath}"`);

            // Reconnect
            await this._connect();

            this.logger.success(this.name, `${this.logger.defaultIcons.success} Database restored successfully`);
        } catch (error) {
            this._logError(error, 'Restore failed');
            throw error;
        }
    }

    async verifyIntegrity() {
        this.logger.info(this.name, `${this.logger.defaultIcons.search} Verifying database integrity...`);

        try {
            // Check tables
            const tables = await this.query('SHOW TABLES');
            for (const row of tables) {
                const tableName = row[Object.keys(row)[0]];
                const [{ Msg_text }] = await this.query(`CHECK TABLE ${tableName}`);
                if (Msg_text !== 'OK') {
                    throw new Error(`Table ${tableName} integrity check failed: ${Msg_text}`);
                }
            }

            // Check foreign key constraints
            const databases = await this.query('SELECT DATABASE() as db');
            const database = databases[0].db;
            const constraints = await this.query(`
                SELECT TABLE_NAME, CONSTRAINT_NAME
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE CONSTRAINT_TYPE = 'FOREIGN KEY'
                AND TABLE_SCHEMA = ?
            `, [database]);

            for (const { TABLE_NAME, CONSTRAINT_NAME } of constraints) {
                await this.query(`ALTER TABLE ${TABLE_NAME} CHECK CONSTRAINT ${CONSTRAINT_NAME}`);
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
            const version = await this.getVersion();
            const variables = await this.query('SHOW VARIABLES LIKE ?', ['version']);
            const dbVersion = variables[0].Value;
            const tables = await this.query('SHOW TABLES');
            const dbSize = await this.query(`
                SELECT SUM(data_length + index_length) as size
                FROM information_schema.TABLES
                WHERE table_schema = ?
            `, [this.config.database]);

            return {
                connected: this.isConnected(),
                version: version,
                mysqlVersion: dbVersion,
                tables: tables.length,
                size: dbSize[0].size,
                database: this.config.database,
                host: this.config.host,
                port: this.config.port
            };
        } catch (error) {
            this._logError(error, 'Failed to get database status');
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            this.logger.info(this.name, `${this.logger.defaultIcons.stop} Closing database connection...`);
            
            try {
                await this.connection.end();
                this.connection = null;
                this.logger.success(this.name, `${this.logger.defaultIcons.success} Database connection closed`);
            } catch (error) {
                this._logError(error, 'Failed to close database connection');
                throw error;
            }
        }
    }
}

module.exports = MySQLModule; 