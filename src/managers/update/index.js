const { BaseManager } = require('../base.manager');
const { Logger } = require('../logger');
const path = require('path');
const fs = require('fs-extra');

class UpdateManager extends BaseManager {
    constructor() {
        super('UpdateManager');
        this.logger = new Logger('UpdateManager');
    }

    async init() {
        this.logger.info('Starting update process...');
        
        try {
            // Check for updates
            const hasUpdates = await this.checkUpdates();
            
            if (hasUpdates) {
                // Create backup before updating
                await this.createBackup();
                
                // Run database migrations
                await this.runMigrations();
                
                this.logger.success('Update completed successfully!');
            } else {
                this.logger.info('No updates available.');
            }
        } catch (error) {
            this.logger.error('Update failed:', error);
            process.exit(1);
        }
    }

    async checkUpdates() {
        this.logger.info('Checking for updates...');
        const { default: check } = await import('./check.js');
        return await check();
    }

    async createBackup() {
        this.logger.info('Creating backup...');
        const { default: backup } = await import('./backup.js');
        await backup();
    }

    async runMigrations() {
        this.logger.info('Running database migrations...');
        const { default: migrate } = await import('./migrate.js');
        await migrate();
    }
}

// Run the update manager
const manager = new UpdateManager();
manager.init().catch(console.error); 