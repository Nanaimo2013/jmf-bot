/**
 * JMF Hosting Discord Bot - Configuration Manager Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides advanced configuration management for the bot,
 * including validation, environment variable support, and defaults.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class ConfigManager extends BaseModule {
    /**
     * Create a new configuration manager
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Configuration options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'config-manager',
            version: options.version || '1.0.0',
            description: 'Configuration manager for the bot',
            defaultConfig: {
                configPath: options.configPath || path.join(process.cwd(), 'config', 'bot.config.json'),
                envPrefix: 'BOT_',
                autoSave: true,
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Configuration storage
        this.config = new Map();
        
        // Default configuration
        this.defaultConfig = {
            token: process.env.DISCORD_TOKEN || '',
            clientId: process.env.DISCORD_CLIENT_ID || '',
            guildId: process.env.DISCORD_GUILD_ID || '',
            ownerId: process.env.DISCORD_OWNER_ID || '',
            prefix: '!',
            status: 'online',
            activity: {
                type: ActivityType.Playing,
                name: 'with Discord.js'
            },
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction
            ],
            commandsPath: path.join(process.cwd(), 'src', 'commands'),
            eventsPath: path.join(process.cwd(), 'src', 'events'),
            cooldowns: {
                default: 3,
                commands: {}
            },
            logging: {
                level: 'info',
                directory: path.join(process.cwd(), 'logs', 'bot')
            },
            database: {
                enabled: false,
                type: 'sqlite',
                path: path.join(process.cwd(), 'data', 'bot.db')
            },
            development: {
                enabled: process.env.NODE_ENV === 'development',
                debugMode: false,
                testGuildId: process.env.TEST_GUILD_ID || ''
            },
            security: {
                rateLimit: {
                    enabled: true,
                    maxRequests: 5,
                    timeWindow: 10000
                },
                allowedUsers: [],
                blockedUsers: []
            },
            features: {
                autoModeration: false,
                welcomeMessages: false,
                customCommands: true,
                voiceSupport: false
            }
        };
        
        // Configuration validators
        this.validators = {
            token: (value) => typeof value === 'string' && value.length > 0,
            clientId: (value) => typeof value === 'string' && value.length > 0,
            intents: (value) => Array.isArray(value),
            partials: (value) => Array.isArray(value),
            status: (value) => ['online', 'idle', 'dnd', 'invisible'].includes(value),
            activity: (value) => typeof value === 'object' && value !== null,
            prefix: (value) => typeof value === 'string',
            cooldowns: (value) => typeof value === 'object' && value !== null
        };
        
        // Load configuration
        this._loadDefaults();
    }

    /**
     * Initialize the configuration manager
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Load configuration from file
        await this.loadConfig();
        
        // Load environment variables
        this._loadEnvVars();
        
        // Validate configuration
        this._validateConfig();
        
        this.logger.info(this.name, 'Configuration manager initialized');
    }

    /**
     * Load configuration from file
     * @returns {Promise<void>}
     */
    async loadConfig() {
        const configPath = this.getConfig('configPath');
        
        try {
            // Check if config file exists
            try {
                await fs.access(configPath);
            } catch (error) {
                this.logger.warn(this.name, `Config file not found: ${configPath}`);
                return;
            }
            
            // Read config file
            const configData = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configData);
            
            // Merge with current config
            this._mergeConfig(config);
            
            this.logger.info(this.name, `Loaded configuration from ${configPath}`);
        } catch (error) {
            this.logger.error(this.name, `Failed to load configuration: ${error.message}`);
        }
    }

    /**
     * Save configuration to file
     * @returns {Promise<void>}
     */
    async saveConfig() {
        const configPath = this.getConfig('configPath');
        
        try {
            // Create config directory if it doesn't exist
            const configDir = path.dirname(configPath);
            try {
                await fs.access(configDir);
            } catch (error) {
                await fs.mkdir(configDir, { recursive: true });
            }
            
            // Convert config to JSON
            const configData = JSON.stringify(this._configToObject(), null, 2);
            
            // Write config file
            await fs.writeFile(configPath, configData, 'utf8');
            
            this.logger.info(this.name, `Saved configuration to ${configPath}`);
        } catch (error) {
            this.logger.error(this.name, `Failed to save configuration: ${error.message}`);
        }
    }

    /**
     * Get a configuration value
     * @param {string} key - The configuration key
     * @param {*} [defaultValue] - The default value if the key doesn't exist
     * @returns {*} - The configuration value
     */
    get(key, defaultValue) {
        if (!key) {
            return this._configToObject();
        }
        
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value instanceof Map) {
                if (!value.has(k)) {
                    return defaultValue;
                }
                value = value.get(k);
            } else if (typeof value === 'object' && value !== null) {
                if (!(k in value)) {
                    return defaultValue;
                }
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    /**
     * Set a configuration value
     * @param {string} key - The configuration key
     * @param {*} value - The configuration value
     * @returns {ConfigManager} - The configuration manager instance for chaining
     */
    set(key, value) {
        if (!key) {
            throw new Error('Configuration key is required');
        }
        
        const keys = key.split('.');
        const lastKey = keys.pop();
        let configObj = this.config;
        
        for (const k of keys) {
            if (configObj instanceof Map) {
                if (!configObj.has(k)) {
                    configObj.set(k, new Map());
                }
                configObj = configObj.get(k);
            } else if (typeof configObj === 'object' && configObj !== null) {
                if (!(k in configObj)) {
                    configObj[k] = {};
                }
                configObj = configObj[k];
            } else {
                throw new Error(`Cannot set property ${key}`);
            }
        }
        
        if (configObj instanceof Map) {
            configObj.set(lastKey, value);
        } else if (typeof configObj === 'object' && configObj !== null) {
            configObj[lastKey] = value;
        } else {
            throw new Error(`Cannot set property ${key}`);
        }
        
        // Auto-save if enabled
        if (this.getConfig('autoSave')) {
            this.saveConfig().catch(() => {});
        }
        
        return this;
    }

    /**
     * Check if a configuration key exists
     * @param {string} key - The configuration key
     * @returns {boolean} - Whether the key exists
     */
    has(key) {
        if (!key) {
            return false;
        }
        
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value instanceof Map) {
                if (!value.has(k)) {
                    return false;
                }
                value = value.get(k);
            } else if (typeof value === 'object' && value !== null) {
                if (!(k in value)) {
                    return false;
                }
                value = value[k];
            } else {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Delete a configuration key
     * @param {string} key - The configuration key
     * @returns {boolean} - Whether the key was deleted
     */
    delete(key) {
        if (!key) {
            return false;
        }
        
        const keys = key.split('.');
        const lastKey = keys.pop();
        let value = this.config;
        
        for (const k of keys) {
            if (value instanceof Map) {
                if (!value.has(k)) {
                    return false;
                }
                value = value.get(k);
            } else if (typeof value === 'object' && value !== null) {
                if (!(k in value)) {
                    return false;
                }
                value = value[k];
            } else {
                return false;
            }
        }
        
        let result = false;
        
        if (value instanceof Map) {
            result = value.delete(lastKey);
        } else if (typeof value === 'object' && value !== null) {
            if (lastKey in value) {
                delete value[lastKey];
                result = true;
            }
        }
        
        // Auto-save if enabled
        if (result && this.getConfig('autoSave')) {
            this.saveConfig().catch(() => {});
        }
        
        return result;
    }

    /**
     * Reset configuration to defaults
     * @returns {ConfigManager} - The configuration manager instance for chaining
     */
    reset() {
        this.config.clear();
        this._loadDefaults();
        
        // Auto-save if enabled
        if (this.getConfig('autoSave')) {
            this.saveConfig().catch(() => {});
        }
        
        return this;
    }

    /**
     * Load default configuration
     * @private
     */
    _loadDefaults() {
        this._mergeConfig(this.defaultConfig);
    }

    /**
     * Load environment variables
     * @private
     */
    _loadEnvVars() {
        const envPrefix = this.getConfig('envPrefix');
        
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith(envPrefix)) {
                const configKey = key.slice(envPrefix.length).toLowerCase().replace(/_/g, '.');
                this.set(configKey, this._parseEnvValue(value));
            }
        }
    }

    /**
     * Parse environment variable value
     * @param {string} value - The environment variable value
     * @returns {*} - The parsed value
     * @private
     */
    _parseEnvValue(value) {
        // Try to parse as JSON
        try {
            return JSON.parse(value);
        } catch (error) {
            // Not valid JSON, return as string
            return value;
        }
    }

    /**
     * Validate configuration
     * @private
     */
    _validateConfig() {
        for (const [key, validator] of Object.entries(this.validators)) {
            const value = this.get(key);
            
            if (!validator(value)) {
                this.logger.warn(this.name, `Invalid configuration value for ${key}`);
            }
        }
    }

    /**
     * Merge configuration
     * @param {Object} config - The configuration to merge
     * @private
     */
    _mergeConfig(config) {
        for (const [key, value] of Object.entries(config)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Recursively merge nested objects
                const existingValue = this.get(key, {});
                this.set(key, { ...existingValue, ...value });
            } else {
                this.set(key, value);
            }
        }
    }

    /**
     * Convert configuration to object
     * @returns {Object} - The configuration object
     * @private
     */
    _configToObject() {
        const result = {};
        
        for (const [key, value] of this.config.entries()) {
            if (value instanceof Map) {
                result[key] = this._mapToObject(value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }

    /**
     * Convert Map to object
     * @param {Map} map - The Map to convert
     * @returns {Object} - The converted object
     * @private
     */
    _mapToObject(map) {
        const result = {};
        
        for (const [key, value] of map.entries()) {
            if (value instanceof Map) {
                result[key] = this._mapToObject(value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }
}

module.exports = ConfigManager; 