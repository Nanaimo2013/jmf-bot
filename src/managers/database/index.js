const { BaseManager } = require('../base.manager');
const { Logger } = require('../logger');
const path = require('path');
const fs = require('fs-extra');

class DatabaseManager extends BaseManager {
    constructor() {
        super('DatabaseManager');
        this.logger = new Logger('DatabaseManager');
    }

    async init() {
        this.logger.info('Starting database manager...');
        
        try {
            const command = process.argv[2];
            
            switch (command) {
                case 'migrate':
                    await this.migrate();
                    break;
                case 'rollback':
                    await this.rollback();
                    break;
                case 'seed':
                    await this.seed();
                    break;
                case 'backup':
                    await this.backup();
                    break;
                case 'restore':
                    await this.restore();
                    break;
                default:
                    this.logger.error('Invalid command. Use: migrate, rollback, seed, backup, or restore');
                    process.exit(1);
            }
        } catch (error) {
            this.logger.error('Database manager failed:', error);
            process.exit(1);
        }
    }

    async migrate() {
        this.logger.info('Running database migrations...');
        const { default: migrate } = await import('./migrate.js');
        await migrate();
    }

    async rollback() {
        this.logger.info('Rolling back database migrations...');
        const { default: rollback } = await import('./rollback.js');
        await rollback();
    }

    async seed() {
        this.logger.info('Seeding database...');
        const { default: seed } = await import('./seed.js');
        await seed();
    }

    async backup() {
        this.logger.info('Backing up database...');
        const { default: backup } = await import('./backup.js');
        await backup();
    }

    async restore() {
        this.logger.info('Restoring database...');
        const { default: restore } = await import('./restore.js');
        await restore();
    }
}

// Run the database manager
const manager = new DatabaseManager();
manager.init().catch(console.error); 