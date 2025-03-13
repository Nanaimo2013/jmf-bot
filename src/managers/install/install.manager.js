/**
 * JMF Hosting Discord Bot - Install Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles installation and setup of the bot,
 * including configuration, dependencies, and initial setup.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base.manager');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class InstallManager extends BaseManager {
    /**
     * Create a new Install manager
     * @param {Object} [options] - Manager options
     */
    constructor(options = {}) {
        super('install', {
            version: '1.0.0',
            defaultConfig: {
                configDir: path.join(process.cwd(), 'config'),
                dataDir: path.join(process.cwd(), 'data'),
                logsDir: path.join(process.cwd(), 'logs'),
                dependencies: [
                    'discord.js',
                    'express',
                    'winston',
                    'sqlite3',
                    'mysql2'
                ]
            },
            ...options
        });
    }

    /**
     * Initialize the Install manager
     * @param {Object} [config] - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        this.logger.info('install', 'Install manager initialized');
    }

    /**
     * Run the installation process
     * @returns {Promise<void>}
     */
    async install() {
        this.logger.info('install', 'Starting installation process...');
        
        try {
            // Create required directories
            await this.createDirectories();
            
            // Create configuration files
            await this.createConfigFiles();
            
            // Install dependencies
            await this.installDependencies();
            
            this.logger.success('install', 'Installation completed successfully');
        } catch (error) {
            this.logger.error('install', `Installation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create required directories
     * @returns {Promise<void>}
     */
    async createDirectories() {
        this.logger.info('install', 'Creating required directories...');
        
        const directories = [
            this.config.configDir,
            this.config.dataDir,
            this.config.logsDir,
            path.join(this.config.dataDir, 'database'),
            path.join(this.config.dataDir, 'backups')
        ];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
                this.logger.debug('install', `Created directory: ${dir}`);
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
        
        this.logger.success('install', 'Directories created successfully');
    }

    /**
     * Create configuration files
     * @returns {Promise<void>}
     */
    async createConfigFiles() {
        this.logger.info('install', 'Creating configuration files...');
        
        // Check if .env file exists, if not create it from .env.example
        const envPath = path.join(process.cwd(), '.env');
        const envExamplePath = path.join(process.cwd(), '.env.example');
        
        try {
            await fs.access(envPath);
            this.logger.debug('install', '.env file already exists');
        } catch (error) {
            if (error.code === 'ENOENT') {
                try {
                    const envExample = await fs.readFile(envExamplePath, 'utf8');
                    await fs.writeFile(envPath, envExample);
                    this.logger.debug('install', 'Created .env file from .env.example');
                } catch (err) {
                    this.logger.warn('install', `Could not create .env file: ${err.message}`);
                }
            }
        }
        
        // Check if config.json exists, if not create it from config.json.example
        const configPath = path.join(process.cwd(), 'config.json');
        const configExamplePath = path.join(process.cwd(), 'config.json.example');
        
        try {
            await fs.access(configPath);
            this.logger.debug('install', 'config.json file already exists');
        } catch (error) {
            if (error.code === 'ENOENT') {
                try {
                    const configExample = await fs.readFile(configExamplePath, 'utf8');
                    await fs.writeFile(configPath, configExample);
                    this.logger.debug('install', 'Created config.json file from config.json.example');
                } catch (err) {
                    this.logger.warn('install', `Could not create config.json file: ${err.message}`);
                }
            }
        }
        
        this.logger.success('install', 'Configuration files created successfully');
    }

    /**
     * Install dependencies
     * @returns {Promise<void>}
     */
    async installDependencies() {
        this.logger.info('install', 'Installing dependencies...');
        
        try {
            // Check if node_modules exists
            const nodeModulesPath = path.join(process.cwd(), 'node_modules');
            
            try {
                await fs.access(nodeModulesPath);
                this.logger.debug('install', 'node_modules directory already exists');
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // Install dependencies using npm
                    this.logger.debug('install', 'Running npm install...');
                    execSync('npm install', { stdio: 'inherit' });
                }
            }
            
            this.logger.success('install', 'Dependencies installed successfully');
        } catch (error) {
            this.logger.error('install', `Failed to install dependencies: ${error.message}`);
            throw error;
        }
    }

    /**
     * Shut down the Install manager
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.logger.info('install', 'Shutting down Install manager');
        await super.shutdown();
    }
}

module.exports = InstallManager; 