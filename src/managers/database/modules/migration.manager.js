/**
 * JMF Hosting Discord Bot - Database Migration Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles database migrations, including loading, applying,
 * and rolling back migrations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const path = require('path');
const fs = require('fs').promises;
const LoggerManager = require('../../logger/logger.manager');

class MigrationManager {
    constructor() {
        this.migrations = new Map();
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'database', 'migrations')
        });
    }

    /**
     * Initialize the migration manager
     * @param {Object} config - Migration configuration
     */
    async initialize(config) {
        this.logger.info('migrations', `${this.logger.defaultIcons.start} Initializing Migration Manager...`);

        try {
            this.config = config;
            await this._ensureDirectories();
            await this._loadMigrations();

            this.logger.success('migrations', `${this.logger.defaultIcons.success} Migration Manager initialized with ${this.migrations.size} migrations`);
        } catch (error) {
            this.logger.error('migrations', `${this.logger.defaultIcons.error} Failed to initialize Migration Manager:`, error);
            throw error;
        }
    }

    /**
     * Ensure required directories exist
     * @private
     */
    async _ensureDirectories() {
        const dirs = [
            this.config.directory,
            path.join(process.cwd(), 'logs', 'database', 'migrations')
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Load all migration files
     * @private
     */
    async _loadMigrations() {
        this.logger.info('migrations', `${this.logger.defaultIcons.load} Loading migrations from ${this.config.directory}...`);

        try {
            const files = await fs.readdir(this.config.directory);
            const migrationFiles = files.filter(f => f.endsWith('.sql'));

            for (const file of migrationFiles) {
                const version = parseInt(file.split('_')[0]);
                if (isNaN(version)) {
                    this.logger.warn('migrations', `${this.logger.defaultIcons.alert} Invalid migration filename: ${file}`);
                    continue;
                }

                const content = await fs.readFile(path.join(this.config.directory, file), 'utf8');
                this.migrations.set(version, {
                    version,
                    name: file,
                    content,
                    path: path.join(this.config.directory, file)
                });
            }

            this.logger.success('migrations', `${this.logger.defaultIcons.success} Loaded ${this.migrations.size} migrations`);
        } catch (error) {
            this.logger.error('migrations', `${this.logger.defaultIcons.error} Failed to load migrations:`, error);
            throw error;
        }
    }

    /**
     * Create a new migration file
     * @param {string} name - Migration name
     * @returns {Promise<string>} Migration file path
     */
    async createMigration(name) {
        const version = Date.now();
        const filename = `${version}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.sql`;
        const filepath = path.join(this.config.directory, filename);

        this.logger.info('migrations', `${this.logger.defaultIcons.add} Creating new migration: ${filename}`);

        try {
            const template = `-- Migration: ${name}
-- Version: ${version}
-- Created: ${new Date().toISOString()}

-- Up
BEGIN;

-- Add your migration SQL here

COMMIT;

-- Down
BEGIN;

-- Add your rollback SQL here

COMMIT;`;

            await fs.writeFile(filepath, template, 'utf8');
            
            // Reload migrations
            await this._loadMigrations();

            this.logger.success('migrations', `${this.logger.defaultIcons.success} Created migration: ${filename}`);
            return filepath;
        } catch (error) {
            this.logger.error('migrations', `${this.logger.defaultIcons.error} Failed to create migration:`, error);
            throw error;
        }
    }

    /**
     * Apply pending migrations
     * @param {Object} db - Database module instance
     * @param {number} [targetVersion] - Target version to migrate to
     * @returns {Promise<Object>} Migration results
     */
    async migrate(db, targetVersion = null) {
        this.logger.info('migrations', `${this.logger.defaultIcons.upgrade} Starting migration process...`);

        try {
            const currentVersion = await db.getVersion();
            const migrations = Array.from(this.migrations.values())
                .sort((a, b) => a.version - b.version);

            // Filter migrations to apply
            const toApply = migrations.filter(m => {
                if (targetVersion === null) return m.version > currentVersion;
                return m.version > currentVersion && m.version <= targetVersion;
            });

            if (toApply.length === 0) {
                this.logger.info('migrations', `${this.logger.defaultIcons.success} Database is up to date`);
                return { applied: [], skipped: 0 };
            }

            const applied = [];
            for (const migration of toApply) {
                this.logger.info('migrations', `${this.logger.defaultIcons.upgrade} Applying migration ${migration.name}...`);

                try {
                    await db.beginTransaction();
                    await db.query(migration.content);
                    await db.query(
                        'INSERT INTO db_version (version, description) VALUES (?, ?)',
                        [migration.version, migration.name]
                    );
                    await db.commit();

                    applied.push(migration.name);
                    this.logger.success('migrations', `${this.logger.defaultIcons.success} Applied migration ${migration.name}`);
                } catch (error) {
                    await db.rollback();
                    this.logger.error('migrations', `${this.logger.defaultIcons.error} Failed to apply migration ${migration.name}:`, error);
                    throw error;
                }
            }

            return {
                applied,
                skipped: migrations.length - applied.length
            };
        } catch (error) {
            this.logger.error('migrations', `${this.logger.defaultIcons.error} Migration process failed:`, error);
            throw error;
        }
    }

    /**
     * Rollback migrations
     * @param {Object} db - Database module instance
     * @param {number} [steps=1] - Number of migrations to roll back
     * @returns {Promise<Object>} Rollback results
     */
    async rollback(db, steps = 1) {
        this.logger.info('migrations', `${this.logger.defaultIcons.undo} Starting rollback process...`);

        try {
            const appliedMigrations = await db.query(
                'SELECT version, description FROM db_version ORDER BY version DESC LIMIT ?',
                [steps]
            );

            if (appliedMigrations.length === 0) {
                this.logger.info('migrations', `${this.logger.defaultIcons.info} No migrations to roll back`);
                return { rolledBack: [] };
            }

            const rolledBack = [];
            for (const { version, description } of appliedMigrations) {
                const migration = this.migrations.get(version);
                if (!migration) {
                    throw new Error(`Migration file not found for version ${version}`);
                }

                this.logger.info('migrations', `${this.logger.defaultIcons.undo} Rolling back migration ${description}...`);

                try {
                    await db.beginTransaction();
                    
                    // Extract and execute the Down section
                    const downSection = this._extractDownSection(migration.content);
                    await db.query(downSection);
                    
                    await db.query('DELETE FROM db_version WHERE version = ?', [version]);
                    await db.commit();

                    rolledBack.push(description);
                    this.logger.success('migrations', `${this.logger.defaultIcons.success} Rolled back migration ${description}`);
                } catch (error) {
                    await db.rollback();
                    this.logger.error('migrations', `${this.logger.defaultIcons.error} Failed to roll back migration ${description}:`, error);
                    throw error;
                }
            }

            return { rolledBack };
        } catch (error) {
            this.logger.error('migrations', `${this.logger.defaultIcons.error} Rollback process failed:`, error);
            throw error;
        }
    }

    /**
     * Extract the Down section from a migration file
     * @param {string} content - Migration file content
     * @returns {string} Down section SQL
     * @private
     */
    _extractDownSection(content) {
        const downMatch = content.match(/-- Down\s+(BEGIN;[\s\S]+COMMIT;)/m);
        if (!downMatch) {
            throw new Error('Down section not found in migration file');
        }
        return downMatch[1];
    }

    /**
     * Get migration status
     * @param {Object} db - Database module instance
     * @returns {Promise<Object>} Migration status
     */
    async getStatus(db) {
        try {
            const currentVersion = await db.getVersion();
            const appliedMigrations = await db.query('SELECT version, description, applied_at FROM db_version ORDER BY version');
            
            const status = {
                currentVersion,
                totalMigrations: this.migrations.size,
                appliedMigrations: appliedMigrations.length,
                pendingMigrations: this.migrations.size - appliedMigrations.length,
                migrations: []
            };

            // Get detailed status for each migration
            for (const [version, migration] of this.migrations) {
                const applied = appliedMigrations.find(m => m.version === version);
                status.migrations.push({
                    version,
                    name: migration.name,
                    status: applied ? 'applied' : 'pending',
                    appliedAt: applied ? applied.applied_at : null
                });
            }

            return status;
        } catch (error) {
            this.logger.error('migrations', `${this.logger.defaultIcons.error} Failed to get migration status:`, error);
            throw error;
        }
    }
}

module.exports = MigrationManager; 