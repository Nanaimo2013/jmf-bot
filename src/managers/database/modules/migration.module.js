/**
 * JMF Hosting Discord Bot - Database Migration Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module handles database migrations, including version tracking,
 * applying migrations, and rollback functionality.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const path = require('path');
const fs = require('fs').promises;
const BaseDatabaseModule = require('./base.module');

class MigrationModule extends BaseDatabaseModule {
    constructor(manager) {
        super('migration');
        this.manager = manager;
        this.migrationsPath = path.join(process.cwd(), 'src', 'database', 'migrations');
        this.migrations = new Map();
    }

    async initialize(config = {}) {
        await super.initialize(config);
        await this._loadMigrations();
        await this._ensureMigrationTable();
    }

    async _loadMigrations() {
        try {
            this.logger.info('migration', `${this.logger.defaultIcons.load} Loading migrations...`);
            
            // Create migrations directory if it doesn't exist
            await fs.mkdir(this.migrationsPath, { recursive: true });
            
            // Read migration files
            const files = await fs.readdir(this.migrationsPath);
            const migrationFiles = files.filter(f => f.endsWith('.sql'));
            
            for (const file of migrationFiles) {
                const version = parseInt(file.split('_')[0]);
                if (!isNaN(version)) {
                    const content = await fs.readFile(path.join(this.migrationsPath, file), 'utf8');
                    this.migrations.set(version, {
                        version,
                        name: file,
                        content,
                        up: this._extractSection(content, 'Up'),
                        down: this._extractSection(content, 'Down')
                    });
                }
            }

            this.logger.success('migration', `${this.logger.defaultIcons.success} Loaded ${this.migrations.size} migrations`);
        } catch (error) {
            this.logger.error('migration', `${this.logger.defaultIcons.error} Failed to load migrations:`, error);
            throw error;
        }
    }

    async _ensureMigrationTable() {
        try {
            await this.query(`
                CREATE TABLE IF NOT EXISTS migrations (
                    version INTEGER PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } catch (error) {
            this.logger.error('migration', `${this.logger.defaultIcons.error} Failed to create migrations table:`, error);
            throw error;
        }
    }

    async getCurrentVersion() {
        try {
            const [result] = await this.query('SELECT MAX(version) as version FROM migrations');
            return result ? result.version || 0 : 0;
        } catch (error) {
            this.logger.error('migration', `${this.logger.defaultIcons.error} Failed to get current version:`, error);
            throw error;
        }
    }

    async migrate(targetVersion = null) {
        const currentVersion = await this.getCurrentVersion();
        const versions = Array.from(this.migrations.keys()).sort((a, b) => a - b);
        
        if (targetVersion === null) {
            targetVersion = Math.max(...versions);
        }

        if (currentVersion >= targetVersion) {
            this.logger.info('migration', `${this.logger.defaultIcons.info} Database is up to date (version ${currentVersion})`);
            return { success: true, version: currentVersion };
        }

        try {
            this.logger.info('migration', `${this.logger.defaultIcons.start} Starting migration from version ${currentVersion} to ${targetVersion}`);
            
            // Begin transaction
            await this.beginTransaction();

            // Apply migrations in order
            for (const version of versions) {
                if (version > currentVersion && version <= targetVersion) {
                    const migration = this.migrations.get(version);
                    
                    this.logger.info('migration', `${this.logger.defaultIcons.migrate} Applying migration ${migration.name}...`);
                    
                    // Execute migration
                    await this.query(migration.up);
                    
                    // Record migration
                    await this.query(
                        'INSERT INTO migrations (version, name) VALUES (?, ?)',
                        [version, migration.name]
                    );

                    this.logger.success('migration', `${this.logger.defaultIcons.success} Applied migration ${migration.name}`);
                }
            }

            // Commit transaction
            await this.commit();
            
            const newVersion = await this.getCurrentVersion();
            this.logger.success('migration', `${this.logger.defaultIcons.success} Migration completed successfully (version ${newVersion})`);
            
            return { success: true, version: newVersion };
        } catch (error) {
            // Rollback transaction on error
            await this.rollback();
            this.logger.error('migration', `${this.logger.defaultIcons.error} Migration failed:`, error);
            throw error;
        }
    }

    async rollback(steps = 1) {
        const currentVersion = await this.getCurrentVersion();
        const versions = Array.from(this.migrations.keys())
            .sort((a, b) => b - a) // Sort in descending order for rollback
            .filter(v => v <= currentVersion)
            .slice(0, steps);

        if (versions.length === 0) {
            this.logger.info('migration', `${this.logger.defaultIcons.info} No migrations to roll back`);
            return { success: true, version: currentVersion };
        }

        try {
            this.logger.info('migration', `${this.logger.defaultIcons.start} Rolling back ${steps} migration(s)...`);
            
            // Begin transaction
            await this.beginTransaction();

            // Roll back migrations in reverse order
            for (const version of versions) {
                const migration = this.migrations.get(version);
                
                this.logger.info('migration', `${this.logger.defaultIcons.rollback} Rolling back migration ${migration.name}...`);
                
                // Execute rollback
                await this.query(migration.down);
                
                // Remove migration record
                await this.query('DELETE FROM migrations WHERE version = ?', [version]);

                this.logger.success('migration', `${this.logger.defaultIcons.success} Rolled back migration ${migration.name}`);
            }

            // Commit transaction
            await this.commit();
            
            const newVersion = await this.getCurrentVersion();
            this.logger.success('migration', `${this.logger.defaultIcons.success} Rollback completed successfully (version ${newVersion})`);
            
            return { success: true, version: newVersion };
        } catch (error) {
            // Rollback transaction on error
            await this.rollback();
            this.logger.error('migration', `${this.logger.defaultIcons.error} Rollback failed:`, error);
            throw error;
        }
    }

    async createMigration(name) {
        try {
            const timestamp = Date.now();
            const fileName = `${timestamp}_${name}.sql`;
            const filePath = path.join(this.migrationsPath, fileName);

            const template = `-- Migration: ${name}
-- Version: ${timestamp}
-- Created: ${new Date(timestamp).toISOString()}

-- Up
BEGIN;

-- Add your migration SQL here

COMMIT;

-- Down
BEGIN;

-- Add your rollback SQL here

COMMIT;`;

            await fs.writeFile(filePath, template, 'utf8');
            
            this.logger.success('migration', `${this.logger.defaultIcons.success} Created migration file: ${fileName}`);
            return { success: true, file: fileName };
        } catch (error) {
            this.logger.error('migration', `${this.logger.defaultIcons.error} Failed to create migration:`, error);
            throw error;
        }
    }

    async getMigrationStatus() {
        try {
            // Get applied migrations
            const applied = await this.query('SELECT * FROM migrations ORDER BY version');
            const appliedVersions = new Set(applied.map(m => m.version));

            // Get all migrations with their status
            const status = Array.from(this.migrations.values()).map(migration => ({
                version: migration.version,
                name: migration.name,
                applied: appliedVersions.has(migration.version),
                appliedAt: applied.find(m => m.version === migration.version)?.applied_at
            }));

            return {
                current: await this.getCurrentVersion(),
                latest: Math.max(...this.migrations.keys()),
                migrations: status
            };
        } catch (error) {
            this.logger.error('migration', `${this.logger.defaultIcons.error} Failed to get migration status:`, error);
            throw error;
        }
    }

    _extractSection(content, section) {
        const regex = new RegExp(`-- ${section}\\s*([\\s\\S]*?)(?:-- \\w+|$)`);
        const match = content.match(regex);
        return match ? match[1].trim() : '';
    }

    async getStatus() {
        const status = await super.getStatus();
        const migrationStatus = await this.getMigrationStatus();
        
        return {
            ...status,
            migrations: {
                count: this.migrations.size,
                current: migrationStatus.current,
                latest: migrationStatus.latest,
                pending: migrationStatus.migrations.filter(m => !m.applied).length
            }
        };
    }
}

module.exports = MigrationModule; 