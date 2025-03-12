const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const logger = new Logger('DatabaseSeed');

class DatabaseSeeder {
    constructor() {
        this.dbPath = path.join('data', 'bot.sqlite');
        this.seedsDir = path.join('src', 'database', 'seeds');
    }
    
    async init() {
        // Open database connection
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
    }
    
    async loadSeedData(file) {
        const seedPath = path.join(this.seedsDir, file);
        return await fs.readJson(seedPath);
    }
    
    async insertData(table, data) {
        if (!Array.isArray(data)) {
            data = [data];
        }
        
        for (const item of data) {
            const columns = Object.keys(item);
            const values = Object.values(item);
            const placeholders = Array(values.length).fill('?').join(',');
            
            const sql = `
                INSERT INTO ${table} (${columns.join(',')})
                VALUES (${placeholders})
            `;
            
            await this.db.run(sql, values);
        }
        
        logger.info(`Seeded ${data.length} records into ${table}`);
    }
    
    async clearTable(table) {
        await this.db.run(`DELETE FROM ${table}`);
        logger.info(`Cleared table: ${table}`);
    }
    
    async seed() {
        // Get list of seed files
        const files = await fs.readdir(this.seedsDir);
        const seedFiles = files.filter(f => f.endsWith('.json')).sort();
        
        // Process each seed file
        for (const file of seedFiles) {
            try {
                logger.info(`Processing seed file: ${file}`);
                
                const data = await this.loadSeedData(file);
                const table = path.basename(file, '.json');
                
                // Clear existing data if specified
                if (data.clear === true) {
                    await this.clearTable(table);
                }
                
                // Insert seed data
                await this.insertData(table, data.records);
                
                logger.success(`Completed seeding: ${file}`);
            } catch (error) {
                logger.error(`Failed to process seed file ${file}:`, error);
                throw error;
            }
        }
    }
    
    async close() {
        if (this.db) {
            await this.db.close();
        }
    }
}

export default async function seed() {
    const seeder = new DatabaseSeeder();
    
    try {
        logger.info('Starting database seeding...');
        
        // Initialize seeder
        await seeder.init();
        
        // Run seeds
        await seeder.seed();
        
        logger.success('Database seeding completed successfully');
        return true;
    } catch (error) {
        logger.error('Database seeding failed:', error);
        throw error;
    } finally {
        await seeder.close();
    }
} 