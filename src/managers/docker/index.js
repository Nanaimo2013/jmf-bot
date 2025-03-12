const { BaseManager } = require('../base.manager');
const { Logger } = require('../logger');
const path = require('path');
const fs = require('fs-extra');

class DockerManager extends BaseManager {
    constructor() {
        super('DockerManager');
        this.logger = new Logger('DockerManager');
    }

    async init() {
        this.logger.info('Starting Docker manager...');
        
        try {
            const command = process.argv[2];
            
            switch (command) {
                case 'build':
                    await this.build();
                    break;
                case 'start':
                    await this.start();
                    break;
                case 'stop':
                    await this.stop();
                    break;
                case 'logs':
                    await this.logs();
                    break;
                default:
                    this.logger.error('Invalid command. Use: build, start, stop, or logs');
                    process.exit(1);
            }
        } catch (error) {
            this.logger.error('Docker manager failed:', error);
            process.exit(1);
        }
    }

    async build() {
        this.logger.info('Building Docker container...');
        const { default: build } = await import('./build.js');
        await build();
    }

    async start() {
        this.logger.info('Starting Docker container...');
        const { default: start } = await import('./start.js');
        await start();
    }

    async stop() {
        this.logger.info('Stopping Docker container...');
        const { default: stop } = await import('./stop.js');
        await stop();
    }

    async logs() {
        this.logger.info('Fetching Docker logs...');
        const { default: logs } = await import('./logs.js');
        await logs();
    }
}

// Run the Docker manager
const manager = new DockerManager();
manager.init().catch(console.error);