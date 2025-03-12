const { BaseManager } = require('../base.manager');
const { Logger } = require('../logger');
const path = require('path');
const fs = require('fs-extra');

class MonitorManager extends BaseManager {
    constructor() {
        super('MonitorManager');
        this.logger = new Logger('MonitorManager');
        this.isRunning = false;
    }

    async init() {
        this.logger.info('Starting monitor manager...');
        
        try {
            const command = process.argv[2];
            
            switch (command) {
                case 'start':
                    await this.start();
                    break;
                case 'stop':
                    await this.stop();
                    break;
                case 'status':
                    await this.status();
                    break;
                default:
                    this.logger.error('Invalid command. Use: start, stop, or status');
                    process.exit(1);
            }
        } catch (error) {
            this.logger.error('Monitor manager failed:', error);
            process.exit(1);
        }
    }

    async start() {
        this.logger.info('Starting monitoring system...');
        const { default: start } = await import('./start.js');
        await start();
    }

    async stop() {
        this.logger.info('Stopping monitoring system...');
        const { default: stop } = await import('./stop.js');
        await stop();
    }

    async status() {
        this.logger.info('Checking monitoring system status...');
        const { default: status } = await import('./status.js');
        await status();
    }
}

// Run the monitor manager
const manager = new MonitorManager();
manager.init().catch(console.error); 