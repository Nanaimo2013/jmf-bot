/**
 * JMF Hosting Discord Bot - Database Migration Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides database migration functionality for the bot.
 * It handles creating, applying, and rolling back migrations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const DatabaseBaseModule = require('./base.module');
const path = require('path');
const fs = require('fs').promises;

class MigrationModule extends DatabaseBaseModule {
    /**
     * Create a new migration module
     * @param {DatabaseManager} manager - The database manager instance
     * @param {Object} config - Module configuration
     */
    constructor(manager, config = {}) {
        super(manager, {
            name: 'migration',
            version: '1.0.0',
            description: 'Database migration module',
            ...config
        });
        
        this.migrationsDir = path.join(process.cwd(), 'src', 'database', 'migrations');
        this.tableName = 'migrations';
        this.migrations = [];
        this.appliedMigrations = new Set();
        this._initialized = false;
        this._migrationsLoaded = false;
    }
    
    /**
     * Initialize the migration module
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            await super.initialize();
            
            // Ensure migrations directory exists
            await this._ensureDirectories();
            
            // Only create migrations table and load migrations if database is connected
            if (this._isConnected) {
                await this._createMigrationsTable();
                await this._loadMigrations();
            } else {
                this.logger.debug('Database not connected, deferring migration operations');
            }
            
            this._initialized = true;
            this.logger.info('Migration module initialized successfully');
        } catch (error) {
            this._initialized = false;
            this.logger.error(`Failed to initialize migration module: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Complete migration setup when database is connected
     * @returns {Promise<void>}
     */
    async completeSetup() {
        try {
            if (this._isConnected && !this._migrationsLoaded) {
                await this._createMigrationsTable();
                await this._loadMigrations();
                this.logger.debug('Migration setup completed');
            }
        } catch (error) {
            this.logger.error(`Failed to complete migration setup: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Check if the module is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this._initialized === true;
    }
    
    /**
     * Ensure migrations directory exists
     * @private
     */
    async _ensureDirectories() {
        try {
            await fs.mkdir(this.migrationsDir, { recursive: true });
            this.logger.debug(this.name, `Ensured migrations directory exists: ${this.migrationsDir}`);
        } catch (error) {
            this.logger.error(this.name, `Failed to ensure migrations directory: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Create migrations table if it doesn't exist
     * @private
     */
    async _createMigrationsTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        try {
            await this.query(sql);
            this.logger.debug('Migrations table created/verified');
        } catch (error) {
            this.logger.error(`Failed to create migrations table: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Connect to the database
     * @returns {Promise<boolean>}
     */
    async connect() {
        try {
            // Call parent connect
            await super.connect();
            
            // Ensure migrations table exists
            await this._ensureMigrationsTable();
            
            // Load migrations
            await this._loadMigrations();
            
            return true;
        } catch (error) {
            this.logger.error(this.name, `Failed to connect migration module: ${error.message}`);
            this.errors++;
            throw error;
        }
    }
    
    /**
     * Ensure migrations table exists
     * @private
     */
    async _ensureMigrationsTable() {
        try {
            const dbManager = this.manager;
            
            // Check if migrations table exists
            const tableExists = await dbManager.tableExists(this.tableName);
            
            if (!tableExists) {
                this.logger.info(this.name, `Creating migrations table: ${this.tableName}`);
                
                // Get database type from active module or config
                const dbType = dbManager.activeModule?.type || dbManager.getConfig('type') || 'sqlite';
                
                // Create migrations table
                await dbManager.query(`
                    CREATE TABLE ${this.tableName} (
                        id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                        name VARCHAR(255) NOT NULL,
                        batch INTEGER NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                this.logger.info(this.name, `Created migrations table: ${this.tableName}`);
            } else {
                this.logger.debug(this.name, `Migrations table already exists: ${this.tableName}`);
            }
        } catch (error) {
            // If the error is that the table already exists, that's okay
            if (error.message && error.message.includes('already exists')) {
                this.logger.debug(this.name, `Migrations table already exists: ${this.tableName}`);
                return;
            }
            this.logger.error(this.name, `Failed to ensure migrations table: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Load migrations from the migrations directory
     * @private
     */
    async _loadMigrations() {
        try {
            // Get list of migration files
            const files = await fs.readdir(this.migrationsDir);
            const migrationFiles = files.filter(file => file.endsWith('.js'));
            
            // Load each migration
            this.migrations = [];
            for (const file of migrationFiles) {
                try {
                    const migration = require(path.join(this.migrationsDir, file));
                    this.migrations.push({
                        name: file,
                        ...migration
                    });
                } catch (error) {
                    this.logger.error(`Failed to load migration ${file}: ${error.message}`);
                }
            }
            
            // Get applied migrations
            const appliedMigrations = await this._loadAppliedMigrations();
            this.appliedMigrations = new Set(appliedMigrations.map(m => m.name));
            
            this._migrationsLoaded = true;
            this.logger.info(`Loaded ${this.migrations.length} migrations`);
        } catch (error) {
            this.logger.error(`Failed to load migrations: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Load applied migrations from the database
     * @private
     * @returns {Promise<Array>} List of applied migrations
     */
    async _loadAppliedMigrations() {
        try {
            const sql = 'SELECT * FROM migrations ORDER BY id ASC';
            return await this.query(sql);
        } catch (error) {
            this.logger.error(`Failed to load applied migrations: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Get pending migrations
     * @returns {Array} - Pending migrations
     */
    getPendingMigrations() {
        // Get names of applied migrations
        const appliedNames = Array.from(this.appliedMigrations);
        
        // Filter out migrations that have already been applied
        return this.migrations.filter(m => !appliedNames.includes(m.name));
    }
    
    /**
     * Get applied migrations
     * @returns {Array} - Applied migrations
     */
    getAppliedMigrations() {
        // Get names of applied migrations
        const appliedNames = Array.from(this.appliedMigrations);
        
        // Return migrations that have been applied
        return this.migrations.filter(m => appliedNames.includes(m.name));
    }
    
    /**
     * Run migrations
     * @returns {Promise<Array>} - Applied migrations
     */
    async migrate() {
        try {
            const dbManager = this.manager;
            const pendingMigrations = this.getPendingMigrations();
            
            if (pendingMigrations.length === 0) {
                this.logger.info(this.name, 'No pending migrations');
                return [];
            }
            
            this.logger.info(this.name, `Running ${pendingMigrations.length} migrations...`);
            
            // Get current batch number
            let batch = 1;
            
            if (this.appliedMigrations.size > 0) {
                const maxBatch = Math.max(...Array.from(this.appliedMigrations).map(m => m.batch));
                batch = maxBatch + 1;
            }
            
            // Run each migration
            const applied = [];
            
            for (const migration of pendingMigrations) {
                try {
                    this.logger.info(this.name, `Migrating: ${migration.name}`);
                    
                    // Begin transaction
                    await dbManager.beginTransaction();
                    
                    // Run migration
                    await migration.up(dbManager);
                    
                    // Record migration
                    await dbManager.query(`
                        INSERT INTO ${this.tableName} (name, batch)
                        VALUES (?, ?)
                    `, [migration.name, batch]);
                    
                    // Commit transaction
                    await dbManager.commit();
                    
                    this.logger.info(this.name, `Migrated: ${migration.name}`);
                    
                    applied.push({
                        name: migration.name,
                        batch
                    });
                } catch (error) {
                    // Rollback transaction
                    await dbManager.rollback();
                    
                    this.logger.error(this.name, `Failed to migrate: ${migration.name}`, error);
                    throw error;
                }
            }
            
            // Reload applied migrations
            await this._loadAppliedMigrations();
            
            this.logger.info(this.name, `Ran ${applied.length} migrations`);
            
            return applied;
        } catch (error) {
            this.logger.error(this.name, `Migration failed: ${error.message}`);
            this.errors++;
            throw error;
        }
    }
    
    /**
     * Rollback the last batch of migrations
     * @returns {Promise<Array>} - Rolled back migrations
     */
    async rollbackLast() {
        try {
            const dbManager = this.manager;
            
            // Get last batch number
            if (this.appliedMigrations.size === 0) {
                this.logger.info(this.name, 'No migrations to rollback');
                return [];
            }
            
            const maxBatch = Math.max(...Array.from(this.appliedMigrations).map(m => m.batch));
            
            // Get migrations from last batch
            const lastBatchMigrations = Array.from(this.appliedMigrations)
                .filter(m => m.batch === maxBatch)
                .reverse(); // Rollback in reverse order
            
            if (lastBatchMigrations.length === 0) {
                this.logger.info(this.name, 'No migrations to rollback');
                return [];
            }
            
            this.logger.info(this.name, `Rolling back ${lastBatchMigrations.length} migrations from batch ${maxBatch}...`);
            
            // Rollback each migration
            const rolledBack = [];
            
            for (const appliedMigration of lastBatchMigrations) {
                // Find migration in loaded migrations
                const migration = this.migrations.find(m => m.name === appliedMigration.name);
                
                if (!migration) {
                    this.logger.warn(this.name, `Migration not found: ${appliedMigration.name}`);
                    continue;
                }
                
                try {
                    this.logger.info(this.name, `Rolling back: ${migration.name}`);
                    
                    // Begin transaction
                    await dbManager.beginTransaction();
                    
                    // Run migration down method
                    await migration.down(dbManager);
                    
                    // Remove migration record
                    await dbManager.query(`
                        DELETE FROM ${this.tableName}
                        WHERE name = ?
                    `, [migration.name]);
                    
                    // Commit transaction
                    await dbManager.commit();
                    
                    this.logger.info(this.name, `Rolled back: ${migration.name}`);
                    
                    rolledBack.push({
                        name: migration.name,
                        batch: appliedMigration.batch
                    });
                } catch (error) {
                    // Rollback transaction
                    await dbManager.rollback();
                    
                    this.logger.error(this.name, `Failed to rollback: ${migration.name}`, error);
                    throw error;
                }
            }
            
            // Reload applied migrations
            await this._loadAppliedMigrations();
            
            this.logger.info(this.name, `Rolled back ${rolledBack.length} migrations`);
            
            return rolledBack;
        } catch (error) {
            this.logger.error(this.name, `Rollback failed: ${error.message}`);
            this.errors++;
            throw error;
        }
    }
    
    /**
     * Create a new migration file
     * @param {string} name - Migration name
     * @returns {Promise<string>} - Path to the created migration file
     */
    async createMigration(name) {
        try {
            // Format name
            const formattedName = name
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            
            // Create timestamp
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
            
            // Create filename
            const filename = `${timestamp}_${formattedName}.js`;
            const filePath = path.join(this.migrationsDir, filename);
            
            // Create migration template
            const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

/**
 * Run the migration
 * @param {DatabaseManager} db - Database manager
 */
exports.up = async function(db) {
    // Add your migration code here
    // Example:
    // await db.query(\`
    //     CREATE TABLE users (
    //         id INTEGER PRIMARY KEY AUTOINCREMENT,
    //         username VARCHAR(255) NOT NULL,
    //         email VARCHAR(255) NOT NULL,
    //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //     )
    // \`);
};

/**
 * Rollback the migration
 * @param {DatabaseManager} db - Database manager
 */
exports.down = async function(db) {
    // Add your rollback code here
    // Example:
    // await db.query('DROP TABLE users');
};
`;
            
            // Ensure migrations directory exists
            await this._ensureDirectories();
            
            // Write migration file
            await fs.writeFile(filePath, template);
            
            this.logger.info(this.name, `Created migration: ${filename}`);
            
            // Reload migrations
            await this._loadMigrations();
            
            return filePath;
        } catch (error) {
            this.logger.error(this.name, `Failed to create migration: ${error.message}`);
            this.errors++;
            throw error;
        }
    }
    
    /**
     * Get the migration module status
     * @returns {Object} - Module status
     */
    async getStatus() {
        try {
            const status = await super.getStatus();
            
            return {
                ...status,
                initialized: this._initialized,
                migrationsDir: this.migrationsDir,
                tableName: this.tableName,
                totalMigrations: this.migrations.length,
                appliedMigrations: this.appliedMigrations.size,
                pendingMigrations: this.getPendingMigrations().length
            };
        } catch (error) {
            this.logger.error(this.name, `Error getting status: ${error.message}`);
            return {
                name: this.name,
                error: error.message,
                initialized: this._initialized
            };
        }
    }
}

module.exports = MigrationModule; 