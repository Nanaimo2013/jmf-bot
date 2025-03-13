/**
 * JMF Hosting Discord Bot - Database Migration Module
 * Version: 1.1.0
 * Last Updated: 03/12/2025
 * 
 * This module provides database migration functionality, extending the base
 * module with migration-specific implementations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const fs = require('fs').promises;
const path = require('path');
const semver = require('semver');

class MigrationModule extends BaseModule {
    /**
     * Create a new migration module
     * @param {Object} manager - The parent manager instance
     * @param {Object} [options] - Module options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: 'migration',
            version: '1.1.0',
            defaultConfig: {
                migrationsDir: path.join(process.cwd(), 'src', 'database', 'migrations'),
                seedsDir: path.join(process.cwd(), 'src', 'database', 'seeds'),
                tableName: 'migrations',
                testMigrationsDir: path.join(process.cwd(), 'src', 'database', 'test', 'migrations')
            },
            ...options
        });

        this.migrations = [];
        this.seeds = [];
        this.isTestMode = process.env.NODE_ENV === 'test';
    }

    /**
     * Initialize the migration module
     * @returns {Promise<void>}
     */
    async initialize() {
        return this.executeOperation('initialize', async () => {
            await super.initialize();
            
            // Ensure migrations directory exists
            const migrationsDir = this.isTestMode ? 
                this.getConfig('testMigrationsDir') : 
                this.getConfig('migrationsDir');
                
            await fs.mkdir(migrationsDir, { recursive: true });
            
            // Ensure seeds directory exists
            await fs.mkdir(this.getConfig('seedsDir'), { recursive: true });
            
            // Load migrations and seeds
        await this._loadMigrations();
            await this._loadSeeds();
            
            // Ensure migrations table exists
            await this._ensureMigrationsTable();
            
            this.logger.info('migration', 'Migration module initialized');
        });
    }

    /**
     * Load migrations from the migrations directory
     * @returns {Promise<void>}
     * @private
     */
    async _loadMigrations() {
        return this.executeOperation('loadMigrations', async () => {
            const migrationsDir = this.isTestMode ? 
                this.getConfig('testMigrationsDir') : 
                this.getConfig('migrationsDir');
                
            this.logger.info('migration', `Loading migrations from ${migrationsDir}`);
            
            try {
                // Get all migration files
                const files = await fs.readdir(migrationsDir);
                
                // Filter for JavaScript files
                const migrationFiles = files.filter(file => file.endsWith('.js'));
                
                // Clear existing migrations
                this.migrations = [];
                
                // Load each migration
            for (const file of migrationFiles) {
                    const filePath = path.join(migrationsDir, file);
                    
                    try {
                        // Clear require cache to ensure fresh load
                        delete require.cache[require.resolve(filePath)];
                        
                        // Load migration
                        const migration = require(filePath);
                        
                        // Parse version from filename (format: v1.0.0_description.js)
                        const versionMatch = file.match(/^v([\d.]+)_(.+)\.js$/);
                        
                        if (!versionMatch) {
                            this.logger.warn('migration', `Invalid migration filename format: ${file}. Expected format: v1.0.0_description.js`);
                            continue;
                        }
                        
                        const [, version, description] = versionMatch;
                        
                        // Validate migration
                        if (!migration.up || typeof migration.up !== 'function') {
                            this.logger.warn('migration', `Migration ${file} is missing 'up' function`);
                            continue;
                        }
                        
                        if (!migration.down || typeof migration.down !== 'function') {
                            this.logger.warn('migration', `Migration ${file} is missing 'down' function`);
                            continue;
                        }
                        
                        // Add to migrations list
                        this.migrations.push({
                        version,
                            description: description.replace(/_/g, ' '),
                            up: migration.up,
                            down: migration.down,
                            file
                        });
                    } catch (error) {
                        this.logger.error('migration', `Failed to load migration ${file}: ${error.message}`);
                    }
                }
                
                // Sort migrations by version
                this.migrations.sort((a, b) => semver.compare(a.version, b.version));
                
                this.logger.info('migration', `Loaded ${this.migrations.length} migrations`);
            } catch (error) {
                this.logger.error('migration', `Failed to load migrations: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Load seeds from the seeds directory
     * @returns {Promise<void>}
     * @private
     */
    async _loadSeeds() {
        return this.executeOperation('loadSeeds', async () => {
            const seedsDir = this.getConfig('seedsDir');
            
            this.logger.info('migration', `Loading seeds from ${seedsDir}`);
            
            try {
                // Get all seed files
                const files = await fs.readdir(seedsDir);
                
                // Filter for JavaScript files
                const seedFiles = files.filter(file => file.endsWith('.js'));
                
                // Clear existing seeds
                this.seeds = [];
                
                // Load each seed
                for (const file of seedFiles) {
                    const filePath = path.join(seedsDir, file);
                    
                    try {
                        // Clear require cache to ensure fresh load
                        delete require.cache[require.resolve(filePath)];
                        
                        // Load seed
                        const seed = require(filePath);
                        
                        // Parse name from filename (format: 001_users.js)
                        const nameMatch = file.match(/^(\d+)_(.+)\.js$/);
                        
                        if (!nameMatch) {
                            this.logger.warn('migration', `Invalid seed filename format: ${file}. Expected format: 001_name.js`);
                            continue;
                        }
                        
                        const [, order, name] = nameMatch;
                        
                        // Validate seed
                        if (!seed.seed || typeof seed.seed !== 'function') {
                            this.logger.warn('migration', `Seed ${file} is missing 'seed' function`);
                            continue;
                        }
                        
                        if (!seed.unseed || typeof seed.unseed !== 'function') {
                            this.logger.warn('migration', `Seed ${file} is missing 'unseed' function`);
                            continue;
                        }
                        
                        // Add to seeds list
                        this.seeds.push({
                            order: parseInt(order, 10),
                            name: name.replace(/_/g, ' '),
                            seed: seed.seed,
                            unseed: seed.unseed,
                            file
                        });
                    } catch (error) {
                        this.logger.error('migration', `Failed to load seed ${file}: ${error.message}`);
                    }
                }
                
                // Sort seeds by order
                this.seeds.sort((a, b) => a.order - b.order);
                
                this.logger.info('migration', `Loaded ${this.seeds.length} seeds`);
        } catch (error) {
                this.logger.error('migration', `Failed to load seeds: ${error.message}`);
            throw error;
        }
        });
    }

    /**
     * Ensure migrations table exists
     * @returns {Promise<void>}
     * @private
     */
    async _ensureMigrationsTable() {
        return this.executeOperation('ensureMigrationsTable', async () => {
            const db = this.manager.getModule('sqlite') || this.manager.getModule('mysql');
            
            if (!db) {
                throw new Error('No database module found');
            }
            
            const tableName = this.getConfig('tableName');
            
            try {
                // Check if migrations table exists
                const tableExists = await this._tableExists(tableName);
                
                if (!tableExists) {
                    this.logger.info('migration', `Creating migrations table: ${tableName}`);
                    
                    // Create migrations table
                    await db.query(`
                        CREATE TABLE ${tableName} (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            version VARCHAR(255) NOT NULL,
                            description VARCHAR(255) NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
                    
                    this.logger.success('migration', 'Migrations table created');
                }
        } catch (error) {
                this.logger.error('migration', `Failed to ensure migrations table: ${error.message}`);
            throw error;
        }
        });
    }

    /**
     * Check if a table exists
     * @param {string} tableName - Table name
     * @returns {Promise<boolean>} Whether the table exists
     * @private
     */
    async _tableExists(tableName) {
        return this.executeOperation('tableExists', async () => {
            const db = this.manager.getModule('sqlite') || this.manager.getModule('mysql');
            
            if (!db) {
                throw new Error('No database module found');
            }
            
            try {
                // SQLite
                if (db.name === 'sqlite') {
                    const result = await db.query(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                        [tableName]
                    );
                    return result.length > 0;
                }
                
                // MySQL
                if (db.name === 'mysql') {
                    const [result] = await db.query(
                        "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND TABLE_NAME = ?",
                        [db.isTestMode ? db.getConfig('testDatabase') : db.getConfig('database'), tableName]
                    );
                    return result.length > 0;
                }
                
                return false;
            } catch (error) {
                this.logger.error('migration', `Failed to check if table exists: ${error.message}`);
                return false;
            }
        });
    }

    /**
     * Get applied migrations
     * @returns {Promise<Array>} Applied migrations
     */
    async getAppliedMigrations() {
        return this.executeOperation('getAppliedMigrations', async () => {
            const db = this.manager.getModule('sqlite') || this.manager.getModule('mysql');
            
            if (!db) {
                throw new Error('No database module found');
            }
            
            const tableName = this.getConfig('tableName');
            
            try {
                // Check if migrations table exists
                const tableExists = await this._tableExists(tableName);
                
                if (!tableExists) {
                    return [];
                }
                
                // Get applied migrations
                const migrations = await db.query(
                    `SELECT * FROM ${tableName} ORDER BY id ASC`
                );
                
                return migrations;
        } catch (error) {
                this.logger.error('migration', `Failed to get applied migrations: ${error.message}`);
            throw error;
        }
        });
    }

    /**
     * Get pending migrations
     * @returns {Promise<Array>} Pending migrations
     */
    async getPendingMigrations() {
        return this.executeOperation('getPendingMigrations', async () => {
            // Get applied migrations
            const applied = await this.getAppliedMigrations();
            
            // Get applied versions
            const appliedVersions = applied.map(m => m.version);
            
            // Filter out applied migrations
            const pending = this.migrations.filter(m => !appliedVersions.includes(m.version));
            
            return pending;
        });
    }

    /**
     * Run migrations
     * @param {Object} [options] - Migration options
     * @param {string} [options.to] - Target version to migrate to
     * @returns {Promise<Array>} Applied migrations
     */
    async migrate(options = {}) {
        return this.executeOperation('migrate', async () => {
            const db = this.manager.getModule('sqlite') || this.manager.getModule('mysql');
            
            if (!db) {
                throw new Error('No database module found');
            }
            
            // Get pending migrations
            const pending = await this.getPendingMigrations();
            
            if (pending.length === 0) {
                this.logger.info('migration', 'No pending migrations');
                return [];
            }
            
            // Filter migrations if target version is specified
            let migrationsToApply = pending;
            if (options.to) {
                migrationsToApply = pending.filter(m => semver.lte(m.version, options.to));
            }
            
            if (migrationsToApply.length === 0) {
                this.logger.info('migration', `No migrations to apply up to version ${options.to}`);
                return [];
            }
            
            this.logger.info('migration', `Applying ${migrationsToApply.length} migrations`);
            
            const applied = [];
            const tableName = this.getConfig('tableName');
            
            // Begin transaction
            await db.beginTransaction();
            
            try {
                // Apply each migration
                for (const migration of migrationsToApply) {
                    this.logger.info('migration', `Applying migration v${migration.version}: ${migration.description}`);
                    
                    // Apply migration
                    await migration.up(db);
                    
                    // Record migration
                    await db.query(
                        `INSERT INTO ${tableName} (version, description) VALUES (?, ?)`,
                        [migration.version, migration.description]
                    );
                    
                    applied.push(migration);
                    
                    this.logger.success('migration', `Applied migration v${migration.version}`);
                }
                
                // Commit transaction
                await db.commit();
                
                this.logger.success('migration', `Successfully applied ${applied.length} migrations`);
                return applied;
            } catch (error) {
                // Rollback transaction
                await db.rollback();
                
                this.logger.error('migration', `Migration failed: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Rollback migrations
     * @param {Object} [options] - Rollback options
     * @param {number} [options.steps=1] - Number of migrations to rollback
     * @param {string} [options.to] - Target version to rollback to
     * @returns {Promise<Array>} Rolled back migrations
     */
    async rollback(options = {}) {
        return this.executeOperation('rollback', async () => {
            const db = this.manager.getModule('sqlite') || this.manager.getModule('mysql');
            
            if (!db) {
                throw new Error('No database module found');
            }
            
            // Get applied migrations
            const applied = await this.getAppliedMigrations();
            
            if (applied.length === 0) {
                this.logger.info('migration', 'No migrations to rollback');
                return [];
            }
            
            // Determine migrations to rollback
            let migrationsToRollback = [];
            
            if (options.to) {
                // Rollback to specific version
                const targetIndex = this.migrations.findIndex(m => m.version === options.to);
                
                if (targetIndex === -1) {
                    throw new Error(`Target version ${options.to} not found`);
                }
                
                // Get migrations after target version
                migrationsToRollback = this.migrations
                    .filter(m => semver.gt(m.version, options.to))
                    .filter(m => applied.some(a => a.version === m.version))
                    .reverse();
            } else {
                // Rollback specified number of steps
                const steps = options.steps || 1;
                
                // Get last N applied migrations
                const appliedMigrations = this.migrations
                    .filter(m => applied.some(a => a.version === m.version))
                    .reverse()
                    .slice(0, steps);
                
                migrationsToRollback = appliedMigrations;
            }
            
            if (migrationsToRollback.length === 0) {
                this.logger.info('migration', 'No migrations to rollback');
                return [];
            }
            
            this.logger.info('migration', `Rolling back ${migrationsToRollback.length} migrations`);
            
            const rolledBack = [];
            const tableName = this.getConfig('tableName');
            
            // Begin transaction
            await db.beginTransaction();
            
            try {
                // Rollback each migration
                for (const migration of migrationsToRollback) {
                    this.logger.info('migration', `Rolling back migration v${migration.version}: ${migration.description}`);
                    
                    // Rollback migration
                    await migration.down(db);
                    
                    // Remove migration record
                    await db.query(
                        `DELETE FROM ${tableName} WHERE version = ?`,
                        [migration.version]
                    );
                    
                    rolledBack.push(migration);
                    
                    this.logger.success('migration', `Rolled back migration v${migration.version}`);
                }
                
                // Commit transaction
                await db.commit();
                
                this.logger.success('migration', `Successfully rolled back ${rolledBack.length} migrations`);
                return rolledBack;
        } catch (error) {
                // Rollback transaction
                await db.rollback();
                
                this.logger.error('migration', `Rollback failed: ${error.message}`);
            throw error;
        }
        });
    }

    /**
     * Run database seeds
     * @param {Object} [options] - Seed options
     * @param {string} [options.name] - Specific seed to run
     * @returns {Promise<Array>} Applied seeds
     */
    async seed(options = {}) {
        return this.executeOperation('seed', async () => {
            const db = this.manager.getModule('sqlite') || this.manager.getModule('mysql');
            
            if (!db) {
                throw new Error('No database module found');
            }
            
            // Filter seeds if name is specified
            let seedsToApply = this.seeds;
            if (options.name) {
                seedsToApply = this.seeds.filter(s => s.name.toLowerCase().includes(options.name.toLowerCase()));
                
                if (seedsToApply.length === 0) {
                    throw new Error(`No seeds found matching '${options.name}'`);
                }
            }
            
            if (seedsToApply.length === 0) {
                this.logger.info('migration', 'No seeds to apply');
                return [];
            }
            
            this.logger.info('migration', `Applying ${seedsToApply.length} seeds`);
            
            const applied = [];
            
            // Begin transaction
            await db.beginTransaction();
            
            try {
                // Apply each seed
                for (const seed of seedsToApply) {
                    this.logger.info('migration', `Applying seed: ${seed.name}`);
                    
                    // Apply seed
                    await seed.seed(db);
                    
                    applied.push(seed);
                    
                    this.logger.success('migration', `Applied seed: ${seed.name}`);
                }
                
                // Commit transaction
                await db.commit();
                
                this.logger.success('migration', `Successfully applied ${applied.length} seeds`);
                return applied;
            } catch (error) {
                // Rollback transaction
                await db.rollback();
                
                this.logger.error('migration', `Seeding failed: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Unseed the database
     * @param {Object} [options] - Unseed options
     * @param {string} [options.name] - Specific seed to unseed
     * @returns {Promise<Array>} Removed seeds
     */
    async unseed(options = {}) {
        return this.executeOperation('unseed', async () => {
            const db = this.manager.getModule('sqlite') || this.manager.getModule('mysql');
            
            if (!db) {
                throw new Error('No database module found');
            }
            
            // Filter seeds if name is specified
            let seedsToRemove = [...this.seeds].reverse();
            if (options.name) {
                seedsToRemove = seedsToRemove.filter(s => s.name.toLowerCase().includes(options.name.toLowerCase()));
                
                if (seedsToRemove.length === 0) {
                    throw new Error(`No seeds found matching '${options.name}'`);
                }
            }
            
            if (seedsToRemove.length === 0) {
                this.logger.info('migration', 'No seeds to remove');
                return [];
            }
            
            this.logger.info('migration', `Removing ${seedsToRemove.length} seeds`);
            
            const removed = [];
            
            // Begin transaction
            await db.beginTransaction();
            
            try {
                // Remove each seed
                for (const seed of seedsToRemove) {
                    this.logger.info('migration', `Removing seed: ${seed.name}`);
                    
                    // Remove seed
                    await seed.unseed(db);
                    
                    removed.push(seed);
                    
                    this.logger.success('migration', `Removed seed: ${seed.name}`);
                }
                
                // Commit transaction
                await db.commit();
                
                this.logger.success('migration', `Successfully removed ${removed.length} seeds`);
                return removed;
        } catch (error) {
                // Rollback transaction
                await db.rollback();
                
                this.logger.error('migration', `Unseeding failed: ${error.message}`);
            throw error;
        }
        });
    }

    /**
     * Create a new migration file
     * @param {string} description - Migration description
     * @returns {Promise<string>} Path to created migration file
     */
    async createMigration(description) {
        return this.executeOperation('createMigration', async () => {
            // Sanitize description for filename
            const sanitizedDescription = description
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
            
            // Get current version
            const currentVersion = await this._getCurrentVersion();
            
            // Increment version
            const newVersion = semver.inc(currentVersion, 'patch');
            
            // Create filename
            const filename = `v${newVersion}_${sanitizedDescription}.js`;
            
            // Get migrations directory
            const migrationsDir = this.isTestMode ? 
                this.getConfig('testMigrationsDir') : 
                this.getConfig('migrationsDir');
            
            // Create file path
            const filePath = path.join(migrationsDir, filename);
            
            // Create migration template
            const template = `/**
 * Migration: ${description}
 * Version: ${newVersion}
 * Created: ${new Date().toISOString()}
 */

/**
 * Apply the migration
 * @param {Object} db - Database module
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    // TODO: Implement migration
};

/**
 * Revert the migration
 * @param {Object} db - Database module
 * @returns {Promise<void>}
 */
exports.down = async (db) => {
    // TODO: Implement rollback
};
`;
            
            // Write file
            await fs.writeFile(filePath, template);
            
            this.logger.success('migration', `Created migration file: ${filename}`);
            
            return filePath;
        });
    }

    /**
     * Create a new seed file
     * @param {string} name - Seed name
     * @returns {Promise<string>} Path to created seed file
     */
    async createSeed(name) {
        return this.executeOperation('createSeed', async () => {
            // Sanitize name for filename
            const sanitizedName = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
            
            // Get next order number
            const nextOrder = this._getNextSeedOrder();
            
            // Create filename
            const filename = `${nextOrder}_${sanitizedName}.js`;
            
            // Create file path
            const filePath = path.join(this.getConfig('seedsDir'), filename);
            
            // Create seed template
            const template = `/**
 * Seed: ${name}
 * Created: ${new Date().toISOString()}
 */

/**
 * Apply the seed
 * @param {Object} db - Database module
 * @returns {Promise<void>}
 */
exports.seed = async (db) => {
    // TODO: Implement seed
};

/**
 * Revert the seed
 * @param {Object} db - Database module
 * @returns {Promise<void>}
 */
exports.unseed = async (db) => {
    // TODO: Implement unseed
};
`;
            
            // Write file
            await fs.writeFile(filePath, template);
            
            this.logger.success('migration', `Created seed file: ${filename}`);
            
            return filePath;
        });
    }

    /**
     * Get current database version
     * @returns {Promise<string>} Current version
     * @private
     */
    async _getCurrentVersion() {
        return this.executeOperation('getCurrentVersion', async () => {
            // Get applied migrations
            const applied = await this.getAppliedMigrations();
            
            if (applied.length === 0) {
                return '0.0.0';
            }
            
            // Get latest version
            const latestMigration = applied[applied.length - 1];
            return latestMigration.version;
        });
    }

    /**
     * Get next seed order number
     * @returns {string} Next order number (padded with zeros)
     * @private
     */
    _getNextSeedOrder() {
        // Get highest order
        let highestOrder = 0;
        
        for (const seed of this.seeds) {
            if (seed.order > highestOrder) {
                highestOrder = seed.order;
            }
        }
        
        // Increment order
        const nextOrder = highestOrder + 1;
        
        // Pad with zeros
        return nextOrder.toString().padStart(3, '0');
    }

    /**
     * Get migration status
     * @returns {Promise<Object>} Migration status
     */
    async getStatus() {
        return this.executeOperation('getStatus', async () => {
        const status = await super.getStatus();
            
            // Get applied migrations
            const applied = await this.getAppliedMigrations();
            
            // Get pending migrations
            const pending = await this.getPendingMigrations();
            
            // Get current version
            const currentVersion = await this._getCurrentVersion();
            
            // Get latest available version
            const latestVersion = this.migrations.length > 0 ? 
                this.migrations[this.migrations.length - 1].version : 
                '0.0.0';
        
        return {
            ...status,
                currentVersion,
                latestVersion,
                upToDate: currentVersion === latestVersion,
                appliedCount: applied.length,
                pendingCount: pending.length,
                totalMigrations: this.migrations.length,
                seedsCount: this.seeds.length,
                testMode: this.isTestMode
            };
        });
    }

    /**
     * Create a test migration for unit testing
     * @returns {Promise<string>} Path to created migration file
     */
    async createTestMigration() {
        return this.executeOperation('createTestMigration', async () => {
            // Store original environment
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';
            
            try {
                // Create test migration
                const filePath = await this.createMigration('test_migration');
                
                // Update migration content
                const template = `/**
 * Test Migration
 * Version: ${await this._getCurrentVersion()}
 * Created: ${new Date().toISOString()}
 */

/**
 * Apply the migration
 * @param {Object} db - Database module
 * @returns {Promise<void>}
 */
exports.up = async (db) => {
    await db.query(\`
        CREATE TABLE test_migration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    \`);
    
    await db.query(
        'INSERT INTO test_migration (name) VALUES (?)',
        ['Test Record']
    );
};

/**
 * Revert the migration
 * @param {Object} db - Database module
 * @returns {Promise<void>}
 */
exports.down = async (db) => {
    await db.query('DROP TABLE IF EXISTS test_migration');
};
`;
                
                // Write updated content
                await fs.writeFile(filePath, template);
                
                this.logger.success('migration', 'Created test migration');
                
                return filePath;
            } finally {
                // Restore original environment
                process.env.NODE_ENV = originalEnv;
            }
        });
    }
}

module.exports = MigrationModule; 