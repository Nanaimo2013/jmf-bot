/**
 * JMF Hosting Discord Bot - Database Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles all database operations, including connections,
 * migrations, backups, and query execution. It supports both SQLite
 * and MySQL databases and provides comprehensive logging.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const BaseManager = require('../base.manager');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3');
const mysql = require('mysql2/promise');
const LoggerManager = require('../logger/logger.manager');

class DatabaseManager extends BaseManager {
    constructor() {
        super('database');
        this.connection = null;
        this.config = null;
        this.migrations = new Map();
        this.queryLog = new Map();

        // Initialize logger
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'database')
        });
    }

    async initialize(config = {}) {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.start} Initializing Database Manager...`);
            
            // Load configuration
            await this._loadConfig();

            // Initialize base functionality
            await super.initialize(config);

            // Ensure directories exist
            await this._ensureDirectories();

            // Connect to database
            await this._connect();

            // Load migrations
            await this._loadMigrations();

            this.logger.success('database', `${this.logger.defaultIcons.success} Database Manager initialized successfully`);
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Database initialization failed:`, error);
            throw error;
        }
    }

    async _loadConfig() {
        try {
            const configPath = path.join(process.cwd(), 'config', 'database.json');
            const configContent = await fs.readFile(configPath, 'utf8');
            this.config = JSON.parse(configContent);
            
            // Override with environment variables if present
            if (process.env.DB_TYPE) this.config.default = process.env.DB_TYPE;
            if (process.env.DB_HOST) this.config.connections.mysql.host = process.env.DB_HOST;
            if (process.env.DB_PORT) this.config.connections.mysql.port = parseInt(process.env.DB_PORT);
            if (process.env.DB_DATABASE) this.config.connections.mysql.database = process.env.DB_DATABASE;
            if (process.env.DB_USERNAME) this.config.connections.mysql.username = process.env.DB_USERNAME;
            if (process.env.DB_PASSWORD) this.config.connections.mysql.password = process.env.DB_PASSWORD;
            if (process.env.DB_PATH) this.config.connections.sqlite.database = process.env.DB_PATH;
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Failed to load database config:`, error);
            throw error;
        }
    }

    async _ensureDirectories() {
        const dirs = [
            path.dirname(this.config.connections.sqlite.database),
            this.config.migrations.directory,
            this.config.backup.directory,
            this.config.logging.directory
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    async _connect() {
        const driver = this.config.default;
        this.logger.info('database', `${this.logger.defaultIcons.connect} Connecting to ${driver} database...`);

        try {
            if (driver === 'sqlite') {
                this.connection = await this._connectSQLite();
            } else if (driver === 'mysql') {
                this.connection = await this._connectMySQL();
            } else {
                throw new Error(`Unsupported database driver: ${driver}`);
            }

            this.logger.success('database', `${this.logger.defaultIcons.success} Connected to database successfully`);
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Database connection failed:`, error);
            throw error;
        }
    }

    async _connectSQLite() {
        return new Promise((resolve, reject) => {
            const dbPath = path.resolve(process.cwd(), this.config.connections.sqlite.database);
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) reject(err);
                else resolve(db);
            });
        });
    }

    async _connectMySQL() {
        const config = this.config.connections.mysql;
        return await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database,
            charset: config.charset
        });
    }

    async _loadMigrations() {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.load} Loading database migrations...`);
            const migrationsDir = path.join(process.cwd(), this.config.migrations.directory);
            const files = await fs.readdir(migrationsDir);
            
            for (const file of files) {
                if (file.endsWith('.sql')) {
                    const version = parseInt(file.split('_')[0]);
                    const content = await fs.readFile(path.join(migrationsDir, file), 'utf8');
                    this.migrations.set(version, {
                        version,
                        name: file,
                        content
                    });
                }
            }

            this.logger.success('database', `${this.logger.defaultIcons.success} Loaded ${this.migrations.size} migrations`);
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Failed to load migrations:`, error);
            throw error;
        }
    }

    async query(sql, params = []) {
        const start = Date.now();
        try {
            let result;
            if (this.config.default === 'sqlite') {
                result = await this._querySQLite(sql, params);
            } else {
                result = await this._queryMySQL(sql, params);
            }

            const duration = Date.now() - start;
            this._logQuery(sql, params, duration);

            return result;
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Query failed:`, {
                sql,
                params,
                error: error.message
            });
            throw error;
        }
    }

    async _querySQLite(sql, params) {
        return new Promise((resolve, reject) => {
            const isSelect = sql.trim().toLowerCase().startsWith('select');
            const method = isSelect ? 'all' : 'run';

            this.connection[method](sql, params, function(err, result) {
                if (err) reject(err);
                else resolve(isSelect ? result : this);
            });
        });
    }

    async _queryMySQL(sql, params) {
        const [rows] = await this.connection.execute(sql, params);
        return rows;
    }

    _logQuery(sql, params, duration) {
        const queryId = Date.now();
        this.queryLog.set(queryId, {
            sql,
            params,
            duration,
            timestamp: new Date()
        });

        // Keep only last 100 queries
        if (this.queryLog.size > 100) {
            const oldestKey = this.queryLog.keys().next().value;
            this.queryLog.delete(oldestKey);
        }

        this.logger.debug('database', `${this.logger.defaultIcons.query} Query executed in ${duration}ms:`, {
            sql,
            params
        });
    }

    async migrate(targetVersion = null) {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.upgrade} Starting database migration...`);
            
            // Get current version
            const currentVersion = await this._getCurrentVersion();
            
            // Get sorted migrations
            const migrations = Array.from(this.migrations.values())
                .sort((a, b) => a.version - b.version);

            // Filter migrations to apply
            const toApply = migrations.filter(m => {
                if (targetVersion === null) return m.version > currentVersion;
                return m.version > currentVersion && m.version <= targetVersion;
            });

            if (toApply.length === 0) {
                this.logger.info('database', `${this.logger.defaultIcons.success} Database is up to date`);
                return { success: true, appliedMigrations: [] };
            }

            // Apply migrations
            const appliedMigrations = [];
            for (const migration of toApply) {
                this.logger.info('database', `${this.logger.defaultIcons.upgrade} Applying migration ${migration.name}...`);
                
                try {
                    await this.query(migration.content);
                    await this._updateVersion(migration.version, migration.name);
                    appliedMigrations.push(migration);
                    
                    this.logger.success('database', `${this.logger.defaultIcons.success} Migration ${migration.name} applied successfully`);
                } catch (error) {
                    this.logger.error('database', `${this.logger.defaultIcons.error} Migration ${migration.name} failed:`, error);
                    throw error;
                }
            }

            return {
                success: true,
                appliedMigrations: appliedMigrations.map(m => m.name)
            };
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Migration failed:`, error);
            throw error;
        }
    }

    async _getCurrentVersion() {
        try {
            const result = await this.query('SELECT version FROM db_version ORDER BY version DESC LIMIT 1');
            return result.length > 0 ? result[0].version : 0;
        } catch {
            return 0;
        }
    }

    async _updateVersion(version, description) {
        await this.query('INSERT INTO db_version (version, description) VALUES (?, ?)', [version, description]);
    }

    async backup() {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.backup} Creating database backup...`);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.resolve(process.cwd(), this.config.backup.directory);
            let backupPath;

            if (this.config.default === 'sqlite') {
                backupPath = path.join(backupDir, `backup_${timestamp}.sqlite`);
                await fs.copyFile(
                    path.resolve(process.cwd(), this.config.connections.sqlite.database),
                    backupPath
                );
            } else {
                backupPath = path.join(backupDir, `backup_${timestamp}.sql`);
                const config = this.config.connections.mysql;
                const cmd = `mysqldump -h${config.host} -P${config.port} -u${config.username} -p${config.password} ${config.database} > "${backupPath}"`;
                await require('child_process').execSync(cmd);
            }

            // Clean up old backups
            await this._cleanupOldBackups();

            this.logger.success('database', `${this.logger.defaultIcons.success} Database backup created at ${backupPath}`);
            return { success: true, path: backupPath };
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Backup failed:`, error);
            throw error;
        }
    }

    async _cleanupOldBackups() {
        try {
            const backupDir = path.resolve(process.cwd(), this.config.backup.directory);
            const files = await fs.readdir(backupDir);
            const backups = files
                .filter(f => f.startsWith('backup_'))
                .sort()
                .reverse();

            if (backups.length > this.config.backup.keep) {
                const toDelete = backups.slice(this.config.backup.keep);
                for (const file of toDelete) {
                    await fs.unlink(path.join(backupDir, file));
                    this.logger.debug('database', `${this.logger.defaultIcons.delete} Deleted old backup: ${file}`);
                }
            }
        } catch (error) {
            this.logger.warn('database', `${this.logger.defaultIcons.alert} Failed to cleanup old backups:`, error);
        }
    }

    async restore(backupPath) {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.refresh} Restoring database from backup...`);

            if (this.config.default === 'sqlite') {
                await fs.copyFile(
                    backupPath,
                    path.resolve(process.cwd(), this.config.connections.sqlite.database)
                );
            } else {
                const config = this.config.connections.mysql;
                const cmd = `mysql -h${config.host} -P${config.port} -u${config.username} -p${config.password} ${config.database} < "${backupPath}"`;
                await require('child_process').execSync(cmd);
            }

            this.logger.success('database', `${this.logger.defaultIcons.success} Database restored successfully`);
            return { success: true };
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Restore failed:`, error);
            throw error;
        }
    }

    async verifyIntegrity() {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.search} Verifying database integrity...`);

            if (this.config.default === 'sqlite') {
                await this.query('PRAGMA integrity_check');
                await this.query('PRAGMA foreign_key_check');
            } else {
                await this.query('CHECK TABLE users, guilds, guild_members, roles, member_roles, commands, command_usage');
            }

            this.logger.success('database', `${this.logger.defaultIcons.success} Database integrity verified`);
            return { success: true };
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Integrity check failed:`, error);
            throw error;
        }
    }

    async getStatus() {
        try {
            const status = {
                driver: this.config.default,
                connected: !!this.connection,
                migrations: this.migrations.size,
                queries: this.queryLog.size
            };

            if (this.connection) {
                if (this.config.default === 'sqlite') {
                    const dbPath = path.resolve(process.cwd(), this.config.connections.sqlite.database);
                    const stats = await fs.stat(dbPath);
                    status.size = stats.size;
                } else {
                    const [result] = await this.query('SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = ?', [this.config.connections.mysql.database]);
                    status.tables = result.tables;
                }
            }

            return status;
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Failed to get status:`, error);
            throw error;
        }
    }

    async shutdown() {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.stop} Shutting down database connection...`);
            
            if (this.connection) {
                if (this.config.default === 'sqlite') {
                    await new Promise((resolve, reject) => {
                        this.connection.close((err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                } else {
                    await this.connection.end();
                }
            }

            this.logger.success('database', `${this.logger.defaultIcons.success} Database connection closed`);
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Failed to close database connection:`, error);
            throw error;
        }
    }
}

module.exports = DatabaseManager; 