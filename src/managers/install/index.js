const { InstallBaseModule } = require('./base.module');
const { LoggerManager } = require('../logger/manager');
const path = require('path');
const fs = require('fs-extra');

class InstallManager extends InstallBaseModule {
    constructor() {
        super('InstallManager');
        this.logger = LoggerManager.getLogger('InstallManager');
        this.requiredDirs = [
            'config',
            'data',
            'logs',
            'src/database/migrations',
            'src/database/seeds'
        ];
    }

    async init() {
        this.logger.info('Starting installation process...');
        
        try {
            const command = process.argv[2];
            
            switch (command) {
                case 'check':
                    await this.check();
                    break;
                case 'dependencies':
                    await this.installDependencies();
                    break;
                case 'config':
                    await this.setupConfig();
                    break;
                case 'all':
                    await this.installAll();
                    break;
                default:
                    this.logger.error('Invalid command. Use: check, dependencies, config, or all');
                    process.exit(1);
            }
        } catch (error) {
            this.logger.error('Installation failed:', error);
            process.exit(1);
        }
    }

    async check() {
        this.logger.info('Checking installation requirements...');
        const { default: check } = await import('./check.js');
        await check();
    }

    async installDependencies() {
        this.logger.info('Installing dependencies...');
        const { default: dependencies } = await import('./dependencies.js');
        await dependencies();
    }

    async setupConfig() {
        this.logger.info('Setting up configuration...');
        const { default: config } = await import('./config.js');
        await config();
    }

    async installAll() {
        try {
            // Validate environment
            await this.validateEnvironment();
            
            // Create required directories
            await this.ensureDirectories(this.requiredDirs);
            
            // Run all installation steps
            await this.check();
            await this.installDependencies();
            await this.setupConfig();
            
            this.logger.success('Installation completed successfully');
            return true;
        } catch (error) {
            this.logger.error('Full installation failed:', error);
            throw error;
        }
    }
}

// Run the install manager
const manager = new InstallManager();
manager.init().catch(console.error); 