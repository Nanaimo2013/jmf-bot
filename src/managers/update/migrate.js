const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const logger = new Logger('UpdateMigrate');

class DatabaseMigrator {
    constructor() {
        this.dbPath = process.env.DB_PATH || './data/database.sqlite';
        this.migrationsDir = path.join('src', 'database', 'migrations');
    }
    
    async init() {
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
        
        // Ensure migrations table exists
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
    
    async close() {
        if (this.db) {
            await this.db.close();
        }
    }
    
    async getAppliedMigrations() {
        return await this.db.all('SELECT name FROM migrations ORDER BY id ASC');
    }
    
    async getPendingMigrations() {
        const appliedMigrations = await this.getAppliedMigrations();
        const appliedNames = new Set(appliedMigrations.map(m => m.name));
        
        const files = await fs.readdir(this.migrationsDir);
        const migrationFiles = files
            .filter(f => f.endsWith('.sql'))
            .sort((a, b) => {
                const versionA = parseInt(a.split('_')[0]);
                const versionB = parseInt(b.split('_')[0]);
                return versionA - versionB;
            });
            
        return migrationFiles.filter(f => !appliedNames.has(f));
    }
    
    async applyMigration(filename) {
        const filePath = path.join(this.migrationsDir, filename);
        const sql = await fs.readFile(filePath, 'utf8');
        
        // Split the file into up/down migrations
        const [upMigration, downMigration] = sql.split('-- Down');
        
        try {
            // Begin transaction
            await this.db.exec('BEGIN TRANSACTION');
            
            // Apply the up migration
            await this.db.exec(upMigration);
            
            // Record the migration
            await this.db.run(
                'INSERT INTO migrations (name) VALUES (?)',
                [filename]
            );
            
            // Commit transaction
            await this.db.exec('COMMIT');
            
            logger.info(`Applied migration: ${filename}`);
        } catch (error) {
            // Rollback on error
            await this.db.exec('ROLLBACK');
            logger.error(`Failed to apply migration ${filename}:`, error);
            throw error;
        }
    }
    
    async migrate() {
        const pendingMigrations = await this.getPendingMigrations();
        
        if (pendingMigrations.length === 0) {
            logger.info('No pending migrations');
            return;
        }
        
        logger.info(`Found ${pendingMigrations.length} pending migrations`);
        
        for (const migration of pendingMigrations) {
            await this.applyMigration(migration);
        }
        
        logger.success('All migrations applied successfully');
    }
}

export default async function migrate() {
    const migrator = new DatabaseMigrator();
    
    try {
        await migrator.init();
        await migrator.migrate();
        return true;
    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
    } finally {
        await migrator.close();
    }
} 