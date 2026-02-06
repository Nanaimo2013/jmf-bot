/**
 * JMF Hosting Discord Bot - Base Module Class
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This class serves as the foundation for all bot modules.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

class Module extends EventEmitter {
    /**
     * Create a new module
     * @param {Object} options - Module options
     * @param {string} options.name - The name of the module
     * @param {string} options.description - The description of the module
     * @param {boolean} options.enabled - Whether the module is enabled
     * @param {string[]} options.dependencies - Other modules this module depends on
     */
    constructor(options = {}) {
        super();
        
        this.name = options.name || 'unnamed';
        this.description = options.description || 'No description provided';
        this.enabled = options.enabled !== false;
        this.dependencies = options.dependencies || [];
        this.isInitialized = false;
        this.isRunning = false;
        this.startTime = null;
        
        // Get logger from global managers
        this.logger = global.managers?.logger || console;
        
        // Get bot manager from global managers
        this.bot = global.managers?.bot;
        
        // Get config manager from global managers
        this.configManager = global.managers?.config;
        
        // Get database manager from global managers
        this.database = global.managers?.database;
    }
    
    /**
     * Initialize the module
     * @param {Client} client - The Discord.js client
     * @returns {Promise<boolean>}
     */
    async initialize(client) {
        try {
            if (this.isInitialized) {
                this.logger.warn(this.name, 'Module already initialized');
                return true;
            }
            
            this.client = client;
            
            // Load configuration
            await this.loadConfig();
            
            // Skip initialization if module is disabled
            if (!this.isEnabled()) {
                this.logger.info(this.name, 'Module is disabled, skipping initialization');
                return false;
            }
            
            // Initialize module-specific functionality
            await this.setup();
            
            this.isInitialized = true;
            this.emit('initialized');
            this.logger.info(this.name, 'Module initialized');
            
            return true;
        } catch (error) {
            this.handleError('initialize', error);
            return false;
        }
    }
    
    /**
     * Start the module
     * @returns {Promise<boolean>}
     */
    async start() {
        try {
            if (!this.isInitialized) {
                throw new Error('Module not initialized');
            }
            
            if (this.isRunning) {
                this.logger.warn(this.name, 'Module already running');
                return true;
            }
            
            // Skip start if module is disabled
            if (!this.isEnabled()) {
                this.logger.info(this.name, 'Module is disabled, skipping start');
                return false;
            }
            
            this.isRunning = true;
            this.startTime = Date.now();
            this.emit('started');
            this.logger.info(this.name, 'Module started');
            
            return true;
        } catch (error) {
            this.handleError('start', error);
            return false;
        }
    }
    
    /**
     * Stop the module
     * @returns {Promise<boolean>}
     */
    async stop() {
        try {
            if (!this.isRunning) {
                this.logger.warn(this.name, 'Module not running');
                return true;
            }
            
            this.isRunning = false;
            this.emit('stopped');
            this.logger.info(this.name, 'Module stopped');
            
            return true;
        } catch (error) {
            this.handleError('stop', error);
            return false;
        }
    }
    
    /**
     * Handle module errors
     * @param {string} operation - The operation that failed
     * @param {Error} error - The error that occurred
     * @private
     */
    handleError(operation, error) {
        this.logger.error(this.name, `Error during ${operation}: ${error.message}`, error.stack);
        this.emit('error', { operation, error });
    }
    
    /**
     * Get the module's status
     * @returns {Object}
     */
    getStatus() {
        return {
            name: this.name,
            description: this.description,
            enabled: this.enabled,
            initialized: this.isInitialized,
            running: this.isRunning,
            uptime: this.getUptime(),
            dependencies: this.dependencies
        };
    }
    
    /**
     * Get the module's uptime in milliseconds
     * @returns {number}
     */
    getUptime() {
        if (!this.isRunning || !this.startTime) {
            return 0;
        }
        
        return Date.now() - this.startTime;
    }
    
    /**
     * Load module configuration
     * @returns {Promise<boolean>}
     */
    async loadConfig() {
        try {
            // Get main config
            const mainConfig = this.configManager?.getConfig() || {};
            
            // Get module-specific config
            let configPath;
            if (mainConfig.configFiles?.games?.[this.name]) {
                configPath = mainConfig.configFiles.games[this.name];
            } else if (mainConfig.configFiles?.systems?.[this.name]) {
                configPath = mainConfig.configFiles.systems[this.name];
            }
            
            // Load module-specific config if available
            if (configPath) {
                this.config = this.configManager.getConfig(this.name) || {
                    enabled: this.enabled
                };
            } else {
                this.config = {
                    enabled: this.enabled
                };
            }
            
            // Load shared resources if available
            if (mainConfig.configFiles?.features) {
                this.features = this.configManager.getConfig('features') || {};
                this.channels = this.features.channels;
                this.roles = this.features.roles;
                this.categories = this.features.categories;
            }
            
            return true;
        } catch (error) {
            this.logger.error(this.name, `Failed to load config: ${error.message}`, error.stack);
            return false;
        }
    }
    
    /**
     * Set up module-specific functionality
     * @returns {Promise<void>}
     */
    async setup() {
        // To be implemented by subclasses
    }
    
    /**
     * Check if the module is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.config?.enabled === true;
    }
    
    /**
     * Enable the module
     * @returns {Promise<void>}
     */
    async enable() {
        if (!this.config) {
            await this.loadConfig();
        }
        this.config.enabled = true;
        this.enabled = true;
        await this.setup();
    }
    
    /**
     * Disable the module
     * @returns {Promise<void>}
     */
    async disable() {
        if (!this.config) {
            await this.loadConfig();
        }
        this.config.enabled = false;
        this.enabled = false;
        await this.stop();
    }
}

module.exports = Module; 