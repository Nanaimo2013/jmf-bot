const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const logger = new Logger('DatabaseMigrate');

class DatabaseMigrator {
    constructor() {
        this.dbPath = path.join('data', 'bot.sqlite');
        this.migrationsDir = path.join('src', 'database', 'migrations');
        this.migrationsTable = 'migrations';
    }
    
    async init() {
        // Ensure database directory exists
        await fs.ensureDir(path.dirname(this.dbPath));
        
        // Open database connection
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
        
        // Create migrations table if it doesn't exist
        await this.createMigrationsTable();
    }
    
    async createMigrationsTable() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                batch INTEGER NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
    
    async getExecutedMigrations() {
        return await this.db.all(`SELECT name FROM ${this.migrationsTable}`);
    }
    
    async getCurrentBatch() {
        const result = await this.db.get(`
            SELECT MAX(batch) as batch FROM ${this.migrationsTable}
        `);
        return (result && result.batch) || 0;
    }
    
    async runMigration(file, batch) {
        const migrationPath = path.join(this.migrationsDir, file);
        const sql = await fs.readFile(migrationPath, 'utf8');
        
        // Split SQL into up/down parts
        const [up] = sql.split('-- Down');
        
        try {
            // Begin transaction
            await this.db.exec('BEGIN TRANSACTION');
            
            // Run migration
            await this.db.exec(up);
            
            // Record migration
            await this.db.run(`
                INSERT INTO ${this.migrationsTable} (name, batch)
                VALUES (?, ?)
            `, [file, batch]);
            
            // Commit transaction
            await this.db.exec('COMMIT');
            
            logger.success(`Migrated: ${file}`);
        } catch (error) {
            // Rollback on error
            await this.db.exec('ROLLBACK');
            throw error;
        }
    }
    
    async migrate() {
        // Get list of migration files
        const files = await fs.readdir(this.migrationsDir);
        const migrations = files.filter(f => f.endsWith('.sql')).sort();
        
        // Get executed migrations
        const executed = await this.getExecutedMigrations();
        const executedNames = executed.map(m => m.name);
        
        // Get current batch number
        const batch = await this.getCurrentBatch() + 1;
        
        // Run pending migrations
        for (const file of migrations) {
            if (!executedNames.includes(file)) {
                await this.runMigration(file, batch);
            }
        }
    }
    
    async close() {
        if (this.db) {
            await this.db.close();
        }
    }
}

export default async function migrate() {
    const migrator = new DatabaseMigrator();
    
    try {
        logger.info('Starting database migration...');
        
        // Initialize migrator
        await migrator.init();
        
        // Run migrations
        await migrator.migrate();
        
        logger.success('Database migration completed successfully');
        return true;
    } catch (error) {
        logger.error('Database migration failed:', error);
        throw error;
    } finally {
        await migrator.close();
    }
} 