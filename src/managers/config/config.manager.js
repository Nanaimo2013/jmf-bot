/**
 * JMF Hosting Discord Bot - Config Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles configuration loading and management for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base/base.manager');
const path = require('path');
const fs = require('fs').promises;

class ConfigManager extends BaseManager {
    /**
     * Create a new ConfigManager
     * @param {Object} options - Manager options
     */
    constructor(options = {}) {
        super('config', {
            version: '1.0.0',
            dependencies: ['logger']
        });

        this.defaultPaths = {
            base: process.cwd(),
            config: path.join(process.cwd(), 'config'),
            data: path.join(process.cwd(), 'data'),
            logs: path.join(process.cwd(), 'logs'),
            archives: path.join(process.cwd(), 'logs', 'archives'),
            backups: path.join(process.cwd(), 'data', 'backups'),
            migrations: path.join(process.cwd(), 'data', 'migrations'),
            database: path.join(process.cwd(), 'data', 'database')
        };

        this.config = {};
        this._initialized = false;
    }

    /**
     * Initialize the config manager
     * @returns {Promise<boolean>}
     */
    async initialize() {
        try {
            await super.initialize();

            // Ensure required directories exist
            await this._ensureDirectories();

            // Load configuration
            await this._loadConfig();

            this._initialized = true;
            this.logger.info('config', 'Config manager initialized');
            return true;
        } catch (error) {
            this.logger.error('config', `Failed to initialize config manager: ${error.message}`);
            throw error;
        }
    }

    /**
     * Ensure required directories exist
     * @private
     */
    async _ensureDirectories() {
        for (const [key, dirPath] of Object.entries(this.defaultPaths)) {
            try {
                await fs.mkdir(dirPath, { recursive: true });
                this.logger.debug('config', `Created directory: ${dirPath}`);
            } catch (error) {
                this.logger.error('config', `Failed to create directory ${key}: ${error.message}`);
                throw error;
            }
        }
    }

    /**
     * Load configuration from files
     * @private
     */
    async _loadConfig() {
        try {
            const configPath = path.join(this.defaultPaths.config, 'config.json');
            
            // Create default config if it doesn't exist
            try {
                await fs.access(configPath);
            } catch (error) {
                const defaultConfig = {
                    bot: {
                        token: process.env.BOT_TOKEN || '',
                        prefix: '!',
                        owners: []
                    },
                    paths: this.defaultPaths,
                    database: {
                        type: 'sqlite',
                        path: path.join(this.defaultPaths.database, 'bot.db'),
                        migrations: {
                            enabled: true,
                            directory: this.defaultPaths.migrations
                        },
                        backup: {
                            enabled: true,
                            directory: path.join(this.defaultPaths.backups, 'database'),
                            maxBackups: 5
                        }
                    },
                    logger: {
                        level: 'info',
                        directory: this.defaultPaths.logs,
                        archives: this.defaultPaths.archives
                    }
                };

                await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 4));
                this.logger.info('config', 'Created default configuration file');
            }

            // Load config
            const configData = await fs.readFile(configPath, 'utf8');
            this.config = JSON.parse(configData);

            // Ensure paths are set
            this.config.paths = {
                ...this.defaultPaths,
                ...(this.config.paths || {})
            };

            // Ensure logger paths are set
            if (!this.config.logger) {
                this.config.logger = {};
            }
            this.config.logger.directory = this.config.logger.directory || this.defaultPaths.logs;
            this.config.logger.archives = this.config.logger.archives || this.defaultPaths.archives;

            // Ensure database paths are set
            if (!this.config.database) {
                this.config.database = {};
            }
            this.config.database.migrations = {
                enabled: true,
                directory: this.defaultPaths.migrations,
                ...(this.config.database.migrations || {})
            };
            this.config.database.backup = {
                enabled: true,
                directory: path.join(this.defaultPaths.backups, 'database'),
                maxBackups: 5,
                ...(this.config.database.backup || {})
            };

            this.logger.info('config', 'Configuration loaded successfully');
        } catch (error) {
            this.logger.error('config', `Failed to load configuration: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get a configuration value
     * @param {string} key - Configuration key (dot notation supported)
     * @param {*} defaultValue - Default value if key not found
     * @returns {*} Configuration value
     */
    get(key, defaultValue = null) {
        try {
            const parts = key.split('.');
            let value = this.config;

            for (const part of parts) {
                if (value === undefined || value === null) {
                    return defaultValue;
                }
                value = value[part];
            }

            return value !== undefined ? value : defaultValue;
        } catch (error) {
            this.logger.error('config', `Failed to get config value for ${key}: ${error.message}`);
            return defaultValue;
        }
    }

    /**
     * Set a configuration value
     * @param {string} key - Configuration key (dot notation supported)
     * @param {*} value - Value to set
     * @returns {boolean} Whether the value was set successfully
     */
    set(key, value) {
        try {
            const parts = key.split('.');
            let current = this.config;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!(part in current)) {
                    current[part] = {};
                }
                current = current[part];
            }

            current[parts[parts.length - 1]] = value;
            return true;
        } catch (error) {
            this.logger.error('config', `Failed to set config value for ${key}: ${error.message}`);
            return false;
        }
    }

    /**
     * Save the current configuration to file
     * @returns {Promise<boolean>}
     */
    async save() {
        try {
            const configPath = path.join(this.defaultPaths.config, 'config.json');
            await fs.writeFile(configPath, JSON.stringify(this.config, null, 4));
            this.logger.info('config', 'Configuration saved successfully');
            return true;
        } catch (error) {
            this.logger.error('config', `Failed to save configuration: ${error.message}`);
            return false;
        }
    }

    /**
     * Get the config manager status
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            name: this.name,
            version: this.version,
            initialized: this._initialized,
            configLoaded: Object.keys(this.config).length > 0
        };
    }
}

module.exports = ConfigManager; 