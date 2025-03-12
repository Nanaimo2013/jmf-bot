/**
 * JMF Hosting Discord Bot - Database Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module handles database operations during updates,
 * including migrations, backups, and version tracking.
 * Supports both SQLite and MySQL databases.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const LoggerManager = require('../../logger/logger.manager');

class DatabaseModule {
    constructor(manager) {
        this.name = 'database';
        this.manager = manager;
        this.migrationsDir = path.join(process.cwd(), 'src', 'database', 'migrations');
        this.backupsDir = path.join(process.cwd(), 'backups', 'database');

        // Initialize logger
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'database')
        });
    }

    async _loadDbConfig() {
        try {
            const envPath = path.join(process.cwd(), '.env');
            const envContent = await fs.readFile(envPath, 'utf8');
            const config = {};
            
            envContent.split('\n').forEach(line => {
                if (line.startsWith('DB_')) {
                    const [key, value] = line.split('=');
                    config[key.trim()] = value.trim();
                }
            });

            return config;
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Failed to load database config:`, error);
            throw error;
        }
    }

    async _ensureDirectories() {
        await fs.mkdir(this.migrationsDir, { recursive: true });
        await fs.mkdir(this.backupsDir, { recursive: true });
    }

    async checkForUpdates() {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.search} Checking for database updates...`);
            await this._ensureDirectories();
            
            // Get list of migration files
            const files = await fs.readdir(this.migrationsDir);
            const migrations = files.filter(f => f.endsWith('.sql'));
            
            // Get current database version
            const currentVersion = await this._getCurrentVersion();
            
            // Check if there are new migrations
            const pendingMigrations = migrations.filter(m => {
                const version = parseInt(m.split('_')[0]);
                return version > currentVersion;
            });

            if (pendingMigrations.length > 0) {
                this.logger.info('database', `${this.logger.defaultIcons.upgrade} Found ${pendingMigrations.length} pending migrations`);
            } else {
                this.logger.info('database', `${this.logger.defaultIcons.success} Database is up to date`);
            }

            return {
                module: this.name,
                hasUpdate: pendingMigrations.length > 0,
                currentVersion,
                pendingMigrations,
                dbType: this.dbConfig.DB_TYPE
            };
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Database update check failed:`, error);
            throw error;
        }
    }

    async _getCurrentVersion() {
        try {
            if (this.dbConfig.DB_TYPE === 'sqlite') {
                const dbPath = path.resolve(process.cwd(), this.dbConfig.DB_PATH);
                if (!await this._fileExists(dbPath)) {
                    return 0;
                }

                // For SQLite, check the version table
                const { stdout } = await execAsync(`sqlite3 "${dbPath}" "SELECT version FROM db_version ORDER BY version DESC LIMIT 1;"`);
                return parseInt(stdout) || 0;
            } else if (this.dbConfig.DB_TYPE === 'mysql') {
                // For MySQL, check the version table
                const cmd = `mysql -h${this.dbConfig.DB_HOST} -P${this.dbConfig.DB_PORT} -u${this.dbConfig.DB_USERNAME} -p${this.dbConfig.DB_PASSWORD} ${this.dbConfig.DB_DATABASE} -e "SELECT version FROM db_version ORDER BY version DESC LIMIT 1;"`;
                const { stdout } = await execAsync(cmd);
                return parseInt(stdout.split('\n')[1]) || 0;
            }

            return 0;
        } catch {
            return 0; // If table doesn't exist or other error
        }
    }

    async _fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async preUpdateCheck() {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.search} Running database pre-update checks...`);
            const updates = await this.checkForUpdates();
            
            // Additional checks based on database type
            if (this.dbConfig.DB_TYPE === 'sqlite') {
                const dbPath = path.resolve(process.cwd(), this.dbConfig.DB_PATH);
                const dbExists = await this._fileExists(dbPath);
                
                if (!dbExists) {
                    this.logger.warn('database', `${this.logger.defaultIcons.alert} SQLite database does not exist, will be created during update`);
                }
            } else if (this.dbConfig.DB_TYPE === 'mysql') {
                // Test MySQL connection
                try {
                    await execAsync(`mysql -h${this.dbConfig.DB_HOST} -P${this.dbConfig.DB_PORT} -u${this.dbConfig.DB_USERNAME} -p${this.dbConfig.DB_PASSWORD} ${this.dbConfig.DB_DATABASE} -e "SELECT 1;"`);
                    this.logger.debug('database', `${this.logger.defaultIcons.connect} MySQL connection successful`);
                } catch {
                    throw new Error('Cannot connect to MySQL database');
                }
            }

            this.logger.success('database', `${this.logger.defaultIcons.success} Database pre-update checks completed`);
            return updates;
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Database pre-update check failed:`, error);
            throw error;
        }
    }

    async backup() {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.backup} Creating database backup...`);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            let backupPath;

            if (this.dbConfig.DB_TYPE === 'sqlite') {
                const dbPath = path.resolve(process.cwd(), this.dbConfig.DB_PATH);
                if (!await this._fileExists(dbPath)) {
                    this.logger.warn('database', `${this.logger.defaultIcons.alert} No database to backup`);
                    return true;
                }

                backupPath = path.join(this.backupsDir, `backup_${timestamp}.sqlite`);
                await fs.copyFile(dbPath, backupPath);
            } else if (this.dbConfig.DB_TYPE === 'mysql') {
                backupPath = path.join(this.backupsDir, `backup_${timestamp}.sql`);
                const cmd = `mysqldump -h${this.dbConfig.DB_HOST} -P${this.dbConfig.DB_PORT} -u${this.dbConfig.DB_USERNAME} -p${this.dbConfig.DB_PASSWORD} ${this.dbConfig.DB_DATABASE} > "${backupPath}"`;
                await execAsync(cmd);
            }

            this.logger.success('database', `${this.logger.defaultIcons.success} Database backed up to ${backupPath}`);
            return true;
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Database backup failed:`, error);
            throw error;
        }
    }

    async update() {
        try {
            const updates = await this.checkForUpdates();
            if (!updates.hasUpdate) {
                this.logger.info('database', `${this.logger.defaultIcons.success} No database updates needed`);
                return { success: true, updated: false };
            }

            this.logger.info('database', `${this.logger.defaultIcons.upgrade} Applying database migrations...`);

            // Sort migrations by version
            const migrations = updates.pendingMigrations.sort();
            
            for (const migration of migrations) {
                const migrationPath = path.join(this.migrationsDir, migration);
                const sql = await fs.readFile(migrationPath, 'utf8');

                if (this.dbConfig.DB_TYPE === 'sqlite') {
                    const dbPath = path.resolve(process.cwd(), this.dbConfig.DB_PATH);
                    await execAsync(`sqlite3 "${dbPath}" "${sql}"`);
                } else if (this.dbConfig.DB_TYPE === 'mysql') {
                    const cmd = `mysql -h${this.dbConfig.DB_HOST} -P${this.dbConfig.DB_PORT} -u${this.dbConfig.DB_USERNAME} -p${this.dbConfig.DB_PASSWORD} ${this.dbConfig.DB_DATABASE}`;
                    await execAsync(`${cmd} -e "${sql}"`);
                }

                this.logger.info('database', `${this.logger.defaultIcons.success} Applied migration: ${migration}`);
            }

            this.logger.success('database', `${this.logger.defaultIcons.success} Database update completed`);
            return {
                success: true,
                updated: true,
                appliedMigrations: migrations
            };
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Database update failed:`, error);
            throw error;
        }
    }

    async rollback() {
        try {
            this.logger.info('database', `${this.logger.defaultIcons.refresh} Starting database rollback...`);
            
            // Find latest backup
            const files = await fs.readdir(this.backupsDir);
            const latestBackup = files
                .filter(f => f.startsWith('backup_'))
                .sort()
                .pop();

            if (!latestBackup) {
                this.logger.warn('database', `${this.logger.defaultIcons.alert} No database backup found for rollback`);
                return false;
            }

            const backupPath = path.join(this.backupsDir, latestBackup);

            if (this.dbConfig.DB_TYPE === 'sqlite') {
                const dbPath = path.resolve(process.cwd(), this.dbConfig.DB_PATH);
                await fs.copyFile(backupPath, dbPath);
            } else if (this.dbConfig.DB_TYPE === 'mysql') {
                const cmd = `mysql -h${this.dbConfig.DB_HOST} -P${this.dbConfig.DB_PORT} -u${this.dbConfig.DB_USERNAME} -p${this.dbConfig.DB_PASSWORD} ${this.dbConfig.DB_DATABASE} < "${backupPath}"`;
                await execAsync(cmd);
            }

            this.logger.success('database', `${this.logger.defaultIcons.success} Database restored from ${backupPath}`);
            return true;
        } catch (error) {
            this.logger.error('database', `${this.logger.defaultIcons.error} Database rollback failed:`, error);
            throw error;
        }
    }
}

module.exports = DatabaseModule; 