const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const logger = new Logger('DatabaseRollback');

class DatabaseRollback {
    constructor() {
        this.dbPath = path.join('data', 'bot.sqlite');
        this.migrationsDir = path.join('src', 'database', 'migrations');
        this.migrationsTable = 'migrations';
    }
    
    async init() {
        // Open database connection
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
    }
    
    async getLastBatch() {
        const result = await this.db.get(`
            SELECT MAX(batch) as batch FROM ${this.migrationsTable}
        `);
        return result ? result.batch : 0;
    }
    
    async getMigrationsInBatch(batch) {
        return await this.db.all(`
            SELECT name
            FROM ${this.migrationsTable}
            WHERE batch = ?
            ORDER BY id DESC
        `, [batch]);
    }
    
    async rollbackMigration(file) {
        const migrationPath = path.join(this.migrationsDir, file);
        const sql = await fs.readFile(migrationPath, 'utf8');
        
        // Get the down part of the migration
        const [, down] = sql.split('-- Down');
        
        if (!down) {
            throw new Error(`No down migration found in ${file}`);
        }
        
        try {
            // Begin transaction
            await this.db.exec('BEGIN TRANSACTION');
            
            // Run rollback
            await this.db.exec(down.trim());
            
            // Remove migration record
            await this.db.run(`
                DELETE FROM ${this.migrationsTable}
                WHERE name = ?
            `, [file]);
            
            // Commit transaction
            await this.db.exec('COMMIT');
            
            logger.success(`Rolled back: ${file}`);
        } catch (error) {
            // Rollback on error
            await this.db.exec('ROLLBACK');
            throw error;
        }
    }
    
    async rollback(steps = 1) {
        // Get last batch number
        const lastBatch = await this.getLastBatch();
        if (lastBatch === 0) {
            logger.info('No migrations to roll back');
            return;
        }
        
        // Roll back specified number of batches
        for (let batch = lastBatch; batch > lastBatch - steps && batch > 0; batch--) {
            const migrations = await this.getMigrationsInBatch(batch);
            
            for (const migration of migrations) {
                await this.rollbackMigration(migration.name);
            }
        }
    }
    
    async close() {
        if (this.db) {
            await this.db.close();
        }
    }
}

export default async function rollback() {
    const rollbacker = new DatabaseRollback();
    
    try {
        logger.info('Starting database rollback...');
        
        // Initialize rollbacker
        await rollbacker.init();
        
        // Get number of steps to roll back
        const steps = parseInt(process.argv[3]) || 1;
        
        // Run rollback
        await rollbacker.rollback(steps);
        
        logger.success('Database rollback completed successfully');
        return true;
    } catch (error) {
        logger.error('Database rollback failed:', error);
        throw error;
    } finally {
        await rollbacker.close();
    }
} 