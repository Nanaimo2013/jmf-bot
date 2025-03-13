/**
 * JMF Hosting Discord Bot - Database Migration Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides database migration capabilities for the update manager,
 * including schema versioning, migration execution, and rollback functionality.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class MigrationModule extends BaseModule {
    /**
     * Create a new migration module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager, {
            name: 'migration',
            version: '1.0.0',
            defaultConfig: {
                migrationsDir: 'data/migrations',
                schemaVersionTable: 'schema_versions',
                backupBeforeMigration: true,
                backupDir: 'data/backups/database',
                maxBackups: 5,
                autoMigrate: false,
                migrationTimeout: 60000, // 1 minute
                hooks: {
                    beforeMigration: [],
                    afterMigration: [],
                    onMigrationError: []
                }
            }
        });
        
        this._currentVersion = null;
        this._migrations = new Map();
        this._migrationHistory = [];
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Create migrations directory if it doesn't exist
        const migrationsDir = path.join(process.cwd(), this.getConfig('migrationsDir'));
        await fs.mkdir(migrationsDir, { recursive: true });
        
        // Create backup directory if it doesn't exist
        const backupDir = path.join(process.cwd(), this.getConfig('backupDir'));
        await fs.mkdir(backupDir, { recursive: true });
        
        // Load migrations
        await this._loadMigrations();
        
        // Get current schema version
        await this._getCurrentVersion();
        
        // Auto-migrate if configured
        if (this.getConfig('autoMigrate')) {
            try {
                await this.migrateToLatest();
            } catch (error) {
                this.log('error', `Auto-migration failed: ${error.message}`);
            }
        }
        
        this.log('info', 'Migration module initialized');
    }

    /**
     * Load migrations from the migrations directory
     * @private
     */
    async _loadMigrations() {
        const migrationsDir = path.join(process.cwd(), this.getConfig('migrationsDir'));
        
        try {
            const files = await fs.readdir(migrationsDir);
            
            // Filter and sort migration files
            const migrationFiles = files
                .filter(file => file.endsWith('.js') && /^\d+/.test(file))
                .sort((a, b) => {
                    const versionA = parseInt(a.match(/^(\d+)/)[1], 10);
                    const versionB = parseInt(b.match(/^(\d+)/)[1], 10);
                    return versionA - versionB;
                });
            
            // Load each migration
            for (const file of migrationFiles) {
                try {
                    const filePath = path.join(migrationsDir, file);
                    const migration = require(filePath);
                    
                    // Validate migration
                    if (!migration.version || !migration.up || typeof migration.up !== 'function') {
                        this.log('warn', `Invalid migration file: ${file} (missing version or up function)`);
                        continue;
                    }
                    
                    // Add to migrations map
                    this._migrations.set(migration.version, {
                        version: migration.version,
                        name: migration.name || `Migration ${migration.version}`,
                        description: migration.description || '',
                        up: migration.up,
                        down: migration.down || null,
                        file
                    });
                    
                    this.log('debug', `Loaded migration: ${file} (version ${migration.version})`);
                } catch (error) {
                    this.log('error', `Failed to load migration file ${file}: ${error.message}`);
                }
            }
            
            this.log('info', `Loaded ${this._migrations.size} migrations`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.log('error', `Failed to load migrations: ${error.message}`);
            }
        }
    }

    /**
     * Get the current schema version from the database
     * @private
     */
    async _getCurrentVersion() {
        return this.executeOperation('getCurrentVersion', async () => {
            try {
                // Get database manager
                const dbManager = this.manager.getManager('database');
                if (!dbManager) {
                    throw new Error('Database manager not available');
                }
                
                // Check if schema version table exists
                const schemaVersionTable = this.getConfig('schemaVersionTable');
                const tableExists = await dbManager.tableExists(schemaVersionTable);
                
                if (!tableExists) {
                    // Create schema version table
                    await dbManager.executeQuery(`
                        CREATE TABLE ${schemaVersionTable} (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            version INTEGER NOT NULL,
                            name TEXT NOT NULL,
                            description TEXT,
                            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            execution_time INTEGER,
                            success BOOLEAN NOT NULL DEFAULT 1
                        )
                    `);
                    
                    this._currentVersion = 0;
                    this.log('info', 'Created schema version table');
                } else {
                    // Get current version
                    const result = await dbManager.executeQuery(`
                        SELECT version FROM ${schemaVersionTable}
                        WHERE success = 1
                        ORDER BY version DESC
                        LIMIT 1
                    `);
                    
                    this._currentVersion = result.length > 0 ? result[0].version : 0;
                    
                    // Load migration history
                    const history = await dbManager.executeQuery(`
                        SELECT * FROM ${schemaVersionTable}
                        ORDER BY applied_at DESC
                    `);
                    
                    this._migrationHistory = history;
                }
                
                this.log('info', `Current schema version: ${this._currentVersion}`);
                return this._currentVersion;
            } catch (error) {
                this.log('error', `Failed to get current schema version: ${error.message}`);
                this._currentVersion = 0;
                return 0;
            }
        });
    }

    /**
     * Record a migration in the schema version table
     * @param {Object} migration - Migration information
     * @param {boolean} success - Whether the migration was successful
     * @param {number} executionTime - Execution time in milliseconds
     * @private
     */
    async _recordMigration(migration, success, executionTime) {
        try {
            // Get database manager
            const dbManager = this.manager.getManager('database');
            if (!dbManager) {
                throw new Error('Database manager not available');
            }
            
            const schemaVersionTable = this.getConfig('schemaVersionTable');
            
            // Insert migration record
            await dbManager.executeQuery(`
                INSERT INTO ${schemaVersionTable} (version, name, description, execution_time, success)
                VALUES (?, ?, ?, ?, ?)
            `, [
                migration.version,
                migration.name,
                migration.description,
                executionTime,
                success ? 1 : 0
            ]);
            
            // Update migration history
            const history = await dbManager.executeQuery(`
                SELECT * FROM ${schemaVersionTable}
                ORDER BY applied_at DESC
            `);
            
            this._migrationHistory = history;
        } catch (error) {
            this.log('error', `Failed to record migration: ${error.message}`);
        }
    }

    /**
     * Create a database backup
     * @returns {Promise<string>} Backup file path
     * @private
     */
    async _createBackup() {
        return this.executeOperation('createBackup', async () => {
            if (!this.getConfig('backupBeforeMigration')) {
                return null;
            }
            
            try {
                // Get database manager
                const dbManager = this.manager.getManager('database');
                if (!dbManager) {
                    throw new Error('Database manager not available');
                }
                
                const backupDir = path.join(process.cwd(), this.getConfig('backupDir'));
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFile = path.join(backupDir, `backup-${timestamp}.sqlite`);
                
                // Create backup
                await dbManager.backup(backupFile);
                
                // Clean up old backups
                await this._cleanupOldBackups();
                
                this.log('info', `Created database backup: ${backupFile}`);
                return backupFile;
            } catch (error) {
                this.log('error', `Failed to create database backup: ${error.message}`);
                return null;
            }
        });
    }

    /**
     * Clean up old database backups
     * @private
     */
    async _cleanupOldBackups() {
        const backupDir = path.join(process.cwd(), this.getConfig('backupDir'));
        const maxBackups = this.getConfig('maxBackups');
        
        try {
            const files = await fs.readdir(backupDir);
            
            // Filter backup files
            const backupFiles = files
                .filter(file => file.startsWith('backup-') && file.endsWith('.sqlite'))
                .map(file => ({
                    file,
                    path: path.join(backupDir, file),
                    time: fs.stat(path.join(backupDir, file)).then(stat => stat.mtime.getTime())
                }));
            
            // Get file stats
            for (const backup of backupFiles) {
                backup.time = await backup.time;
            }
            
            // Sort by modification time (oldest first)
            backupFiles.sort((a, b) => a.time - b.time);
            
            // Delete oldest backups if we have too many
            if (backupFiles.length > maxBackups) {
                const toDelete = backupFiles.slice(0, backupFiles.length - maxBackups);
                
                for (const backup of toDelete) {
                    await fs.unlink(backup.path);
                    this.log('debug', `Deleted old backup: ${backup.file}`);
                }
            }
        } catch (error) {
            this.log('warn', `Failed to clean up old backups: ${error.message}`);
        }
    }

    /**
     * Execute a migration
     * @param {Object} migration - Migration to execute
     * @param {boolean} [up=true] - Whether to migrate up or down
     * @returns {Promise<boolean>} Whether the migration was successful
     * @private
     */
    async _executeMigration(migration, up = true) {
        return this.executeOperation('executeMigration', async () => {
            const direction = up ? 'up' : 'down';
            const migrationFn = migration[direction];
            
            if (!migrationFn) {
                throw new Error(`Migration ${migration.version} does not support ${direction} migration`);
            }
            
            // Get database manager
            const dbManager = this.manager.getManager('database');
            if (!dbManager) {
                throw new Error('Database manager not available');
            }
            
            // Create backup before migration
            const backupFile = await this._createBackup();
            
            // Execute hooks before migration
            await this.executeHooks('beforeMigration', { migration, direction, backupFile });
            
            // Start transaction
            await dbManager.beginTransaction();
            
            const startTime = Date.now();
            let success = false;
            
            try {
                // Set timeout for migration
                const timeout = this.getConfig('migrationTimeout');
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Migration timed out after ${timeout}ms`)), timeout);
                });
                
                // Execute migration with timeout
                await Promise.race([
                    migrationFn(dbManager),
                    timeoutPromise
                ]);
                
                // Commit transaction
                await dbManager.commitTransaction();
                
                // Update current version
                this._currentVersion = up ? migration.version : migration.version - 1;
                
                success = true;
                this.log('success', `Migration ${migration.version} ${direction} completed successfully`);
            } catch (error) {
                // Rollback transaction
                await dbManager.rollbackTransaction();
                
                // Execute hooks on migration error
                await this.executeHooks('onMigrationError', { migration, direction, error, backupFile });
                
                this.log('error', `Migration ${migration.version} ${direction} failed: ${error.message}`);
                throw error;
            } finally {
                const executionTime = Date.now() - startTime;
                
                // Record migration
                await this._recordMigration(migration, success, executionTime);
                
                // Execute hooks after migration
                await this.executeHooks('afterMigration', { migration, direction, success, executionTime, backupFile });
            }
            
            return success;
        });
    }

    /**
     * Get all available migrations
     * @returns {Promise<Array>} List of migrations
     */
    async getMigrations() {
        return this.executeOperation('getMigrations', async () => {
            return Array.from(this._migrations.values()).map(migration => ({
                version: migration.version,
                name: migration.name,
                description: migration.description,
                file: migration.file,
                hasDownMigration: !!migration.down
            }));
        });
    }

    /**
     * Get migration history
     * @param {Object} [options] - Options
     * @param {number} [options.limit] - Maximum number of entries to return
     * @param {boolean} [options.successOnly=false] - Whether to only include successful migrations
     * @returns {Promise<Array>} Migration history
     */
    async getMigrationHistory(options = {}) {
        return this.executeOperation('getMigrationHistory', async () => {
            let history = [...this._migrationHistory];
            
            // Filter by success if specified
            if (options.successOnly) {
                history = history.filter(entry => entry.success);
            }
            
            // Limit the number of entries if specified
            if (options.limit && options.limit > 0) {
                history = history.slice(0, options.limit);
            }
            
            return history;
        });
    }

    /**
     * Get the current schema version
     * @returns {Promise<number>} Current schema version
     */
    async getCurrentVersion() {
        return this.executeOperation('getCurrentVersion', async () => {
            if (this._currentVersion === null) {
                await this._getCurrentVersion();
            }
            return this._currentVersion;
        });
    }

    /**
     * Check if there are pending migrations
     * @returns {Promise<boolean>} Whether there are pending migrations
     */
    async hasPendingMigrations() {
        return this.executeOperation('hasPendingMigrations', async () => {
            const currentVersion = await this.getCurrentVersion();
            const latestVersion = this.getLatestVersion();
            return latestVersion > currentVersion;
        });
    }

    /**
     * Get the latest available migration version
     * @returns {number} Latest version
     */
    getLatestVersion() {
        if (this._migrations.size === 0) {
            return 0;
        }
        
        return Math.max(...this._migrations.keys());
    }

    /**
     * Get pending migrations
     * @returns {Promise<Array>} List of pending migrations
     */
    async getPendingMigrations() {
        return this.executeOperation('getPendingMigrations', async () => {
            const currentVersion = await this.getCurrentVersion();
            
            return Array.from(this._migrations.values())
                .filter(migration => migration.version > currentVersion)
                .sort((a, b) => a.version - b.version);
        });
    }

    /**
     * Migrate to a specific version
     * @param {number} targetVersion - Target version to migrate to
     * @returns {Promise<Object>} Migration result
     */
    async migrateToVersion(targetVersion) {
        return this.executeOperation('migrateToVersion', async () => {
            const currentVersion = await this.getCurrentVersion();
            
            if (currentVersion === targetVersion) {
                return {
                    success: true,
                    message: `Already at version ${targetVersion}`,
                    migrationsRun: 0,
                    fromVersion: currentVersion,
                    toVersion: targetVersion
                };
            }
            
            const migratingUp = targetVersion > currentVersion;
            let migrationsToRun = [];
            
            if (migratingUp) {
                // Get migrations to run in ascending order
                migrationsToRun = Array.from(this._migrations.values())
                    .filter(migration => migration.version > currentVersion && migration.version <= targetVersion)
                    .sort((a, b) => a.version - b.version);
            } else {
                // Get migrations to run in descending order
                migrationsToRun = Array.from(this._migrations.values())
                    .filter(migration => migration.version <= currentVersion && migration.version > targetVersion)
                    .sort((a, b) => b.version - a.version);
            }
            
            if (migrationsToRun.length === 0) {
                return {
                    success: true,
                    message: `No migrations to run to reach version ${targetVersion}`,
                    migrationsRun: 0,
                    fromVersion: currentVersion,
                    toVersion: currentVersion
                };
            }
            
            this.log('info', `Migrating ${migratingUp ? 'up' : 'down'} from version ${currentVersion} to ${targetVersion}`);
            
            const results = [];
            let lastSuccessfulVersion = currentVersion;
            
            for (const migration of migrationsToRun) {
                try {
                    await this._executeMigration(migration, migratingUp);
                    lastSuccessfulVersion = migration.version;
                    
                    results.push({
                        version: migration.version,
                        name: migration.name,
                        success: true
                    });
                } catch (error) {
                    results.push({
                        version: migration.version,
                        name: migration.name,
                        success: false,
                        error: error.message
                    });
                    
                    // Stop migration on error
                    break;
                }
            }
            
            const successfulMigrations = results.filter(r => r.success).length;
            const finalVersion = migratingUp ? lastSuccessfulVersion : lastSuccessfulVersion - 1;
            
            return {
                success: successfulMigrations === migrationsToRun.length,
                message: `Migrated from version ${currentVersion} to ${finalVersion}`,
                migrationsRun: successfulMigrations,
                totalMigrations: migrationsToRun.length,
                fromVersion: currentVersion,
                toVersion: finalVersion,
                results
            };
        });
    }

    /**
     * Migrate to the latest version
     * @returns {Promise<Object>} Migration result
     */
    async migrateToLatest() {
        return this.executeOperation('migrateToLatest', async () => {
            const latestVersion = this.getLatestVersion();
            return await this.migrateToVersion(latestVersion);
        });
    }

    /**
     * Rollback the last migration
     * @returns {Promise<Object>} Rollback result
     */
    async rollbackLastMigration() {
        return this.executeOperation('rollbackLastMigration', async () => {
            const currentVersion = await this.getCurrentVersion();
            
            if (currentVersion === 0) {
                return {
                    success: true,
                    message: 'No migrations to rollback',
                    migrationsRun: 0,
                    fromVersion: 0,
                    toVersion: 0
                };
            }
            
            const migration = this._migrations.get(currentVersion);
            
            if (!migration) {
                throw new Error(`Migration for version ${currentVersion} not found`);
            }
            
            if (!migration.down) {
                throw new Error(`Migration ${currentVersion} does not support rollback`);
            }
            
            try {
                await this._executeMigration(migration, false);
                
                return {
                    success: true,
                    message: `Rolled back migration ${currentVersion}`,
                    migrationsRun: 1,
                    fromVersion: currentVersion,
                    toVersion: currentVersion - 1,
                    results: [{
                        version: migration.version,
                        name: migration.name,
                        success: true
                    }]
                };
            } catch (error) {
                return {
                    success: false,
                    message: `Failed to rollback migration ${currentVersion}: ${error.message}`,
                    migrationsRun: 0,
                    fromVersion: currentVersion,
                    toVersion: currentVersion,
                    results: [{
                        version: migration.version,
                        name: migration.name,
                        success: false,
                        error: error.message
                    }]
                };
            }
        });
    }

    /**
     * Create a new migration file
     * @param {Object} options - Migration options
     * @param {string} options.name - Migration name
     * @param {string} [options.description] - Migration description
     * @returns {Promise<Object>} Created migration information
     */
    async createMigration(options) {
        return this.executeOperation('createMigration', async () => {
            if (!options.name) {
                throw new Error('Migration name is required');
            }
            
            // Generate version number
            const latestVersion = this.getLatestVersion();
            const newVersion = latestVersion + 1;
            
            // Create migration file
            const migrationsDir = path.join(process.cwd(), this.getConfig('migrationsDir'));
            const fileName = `${String(newVersion).padStart(3, '0')}_${options.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.js`;
            const filePath = path.join(migrationsDir, fileName);
            
            // Create migration template
            const template = `/**
 * Migration: ${options.name}
 * Version: ${newVersion}
 * Created: ${new Date().toISOString()}
 * Description: ${options.description || ''}
 */

module.exports = {
    version: ${newVersion},
    name: '${options.name}',
    description: '${options.description || ''}',
    
    /**
     * Apply the migration
     * @param {Object} db - Database manager
     * @returns {Promise<void>}
     */
    async up(db) {
        // TODO: Implement migration
        // Example:
        // await db.executeQuery('CREATE TABLE example (id INTEGER PRIMARY KEY, name TEXT)');
    },
    
    /**
     * Rollback the migration
     * @param {Object} db - Database manager
     * @returns {Promise<void>}
     */
    async down(db) {
        // TODO: Implement rollback
        // Example:
        // await db.executeQuery('DROP TABLE example');
    }
};
`;
            
            // Write migration file
            await fs.writeFile(filePath, template, 'utf8');
            
            this.log('info', `Created migration file: ${fileName}`);
            
            // Reload migrations
            await this._loadMigrations();
            
            return {
                version: newVersion,
                name: options.name,
                description: options.description || '',
                file: fileName,
                path: filePath
            };
        });
    }

    /**
     * Restore database from a backup
     * @param {string} backupFile - Backup file path
     * @returns {Promise<Object>} Restore result
     */
    async restoreFromBackup(backupFile) {
        return this.executeOperation('restoreFromBackup', async () => {
            try {
                // Get database manager
                const dbManager = this.manager.getManager('database');
                if (!dbManager) {
                    throw new Error('Database manager not available');
                }
                
                // Create backup of current state
                const currentBackup = await this._createBackup();
                
                // Restore from backup
                await dbManager.restore(backupFile);
                
                // Refresh current version
                await this._getCurrentVersion();
                
                this.log('success', `Restored database from backup: ${backupFile}`);
                
                return {
                    success: true,
                    message: `Restored database from backup: ${backupFile}`,
                    currentVersion: this._currentVersion,
                    currentBackup
                };
            } catch (error) {
                this.log('error', `Failed to restore from backup: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * List available database backups
     * @returns {Promise<Array>} List of backups
     */
    async listBackups() {
        return this.executeOperation('listBackups', async () => {
            const backupDir = path.join(process.cwd(), this.getConfig('backupDir'));
            
            try {
                const files = await fs.readdir(backupDir);
                
                // Filter backup files
                const backupFiles = files.filter(file => file.startsWith('backup-') && file.endsWith('.sqlite'));
                
                // Get file stats
                const backups = await Promise.all(
                    backupFiles.map(async (file) => {
                        const filePath = path.join(backupDir, file);
                        const stats = await fs.stat(filePath);
                        
                        return {
                            file,
                            path: filePath,
                            size: stats.size,
                            created: stats.mtime
                        };
                    })
                );
                
                // Sort by creation time (newest first)
                backups.sort((a, b) => b.created.getTime() - a.created.getTime());
                
                return backups;
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return [];
                }
                throw error;
            }
        });
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down migration module');
        await super.shutdown();
    }
}

module.exports = MigrationModule; 