/**
 * JMF Hosting Discord Bot - Main Bot Class
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This is the main bot class that initializes and manages all components
 * of the Discord bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { LoggerManager } = require('./managers/logger');
const ConfigManager = require('./managers/config');
const { DatabaseManager, createDatabaseManager } = require('./managers/database');
const { UpdateManager } = require('./managers/update');
const { MonitorManager } = require('./managers/monitor');
const { BotManager, createBotManager } = require('./managers/bot');
const ModuleRegistry = require('./modules');
const path = require('path');
const fs = require('fs');

// Initialize global managers object
if (!global.managers) {
    global.managers = {};
}

/**
 * Main bot class
 */
class Bot {
    /**
     * Create a new bot instance
     */
    constructor() {
        this.isInitialized = false;
        this.isRunning = false;
        this.startTime = Date.now();
        
        // Initialize managers object
        this.managers = {
            logger: null,
            config: null,
            database: null,
            update: null,
            monitor: null,
            bot: null
        };
        
        // Initialize modules registry
        this.moduleRegistry = null;
        
        // Make managers globally accessible
        global.managers = this.managers;
    }
    
    /**
     * Initialize the bot
     * @param {Object} options - Initialization options
     * @returns {Promise<void>}
     */
    async initialize(options = {}) {
        try {
            console.log('Initializing JMF Hosting Discord Bot...');
            
            // Create data directory if it doesn't exist
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // Initialize logger first
            this.managers.logger = new LoggerManager();
            await this.managers.logger.initialize({
                level: options.logLevel || 'info',
                directory: options.logDirectory || path.join(process.cwd(), 'logs')
            });
            global.managers.logger = this.managers.logger;
            
            const logger = this.managers.logger;
            logger.info('bot', 'Logger initialized');
            
            // Initialize config manager
            this.managers.config = new ConfigManager();
            await this.managers.config.initialize({
                configPath: options.configPath || path.join(process.cwd(), 'config')
            });
            global.managers.config = this.managers.config;
            logger.info('bot', 'Config manager initialized');
            
            // Get bot configuration
            const botConfig = this.managers.config.getConfig('bot') || {};
            
            // Initialize database manager
            this.managers.database = await createDatabaseManager(this);
            global.managers.database = this.managers.database;
            logger.info('bot', 'Database manager initialized');
            
            // Initialize update manager
            this.managers.update = new UpdateManager();
            await this.managers.update.initialize(this.managers.config.getConfig('update') || {});
            global.managers.update = this.managers.update;
            logger.info('bot', 'Update manager initialized');
            
            // Initialize monitor manager
            this.managers.monitor = new MonitorManager();
            await this.managers.monitor.initialize(this.managers.config.getConfig('monitor') || {});
            global.managers.monitor = this.managers.monitor;
            logger.info('bot', 'Monitor manager initialized');
            
            // Initialize bot manager last
            this.managers.bot = await createBotManager(this);
            
            // Register managers with bot manager
            this.managers.bot.registerManager('logger', this.managers.logger);
            this.managers.bot.registerManager('config', this.managers.config);
            this.managers.bot.registerManager('database', this.managers.database);
            this.managers.bot.registerManager('update', this.managers.update);
            this.managers.bot.registerManager('monitor', this.managers.monitor);
            
            // Set bot manager globally
            global.managers.bot = this.managers.bot;
            logger.info('bot', 'Bot manager initialized');
            
            // Initialize module registry
            this.moduleRegistry = new ModuleRegistry({
                logger: this.managers.logger,
                bot: this.managers.bot
            });
            await this.moduleRegistry.initialize();
            logger.info('bot', 'Module registry initialized');
            
            // Load modules
            await this.moduleRegistry.loadModules();
            logger.info('bot', 'Modules loaded');
            
            this.isInitialized = true;
            logger.success('bot', 'Bot initialization complete');
            
            return true;
        } catch (error) {
            if (this.managers.logger) {
                this.managers.logger.error('bot', `Initialization failed: ${error.message}`, error.stack);
            } else {
                console.error(`Initialization failed: ${error.message}`, error.stack);
            }
            
            throw error;
        }
    }
    
    /**
     * Start the bot
     * @returns {Promise<void>}
     */
    async start() {
        try {
            if (!this.isInitialized) {
                throw new Error('Bot must be initialized before starting');
            }
            
            const logger = this.managers.logger;
            logger.info('bot', 'Starting bot...');
            
            // Start bot manager
            await this.managers.bot.start();
            logger.info('bot', 'Bot manager started');
            
            // Initialize modules with client
            await this.moduleRegistry.initializeModules(this.managers.bot.client);
            logger.info('bot', 'Modules initialized');
            
            // Start modules
            await this.moduleRegistry.start();
            logger.info('bot', 'Modules started');
            
            // Start monitor manager
            await this.managers.monitor.start();
            logger.info('bot', 'Monitor manager started');
            
            this.isRunning = true;
            logger.success('bot', 'Bot started successfully');
            
            return true;
        } catch (error) {
            this.managers.logger.error('bot', `Failed to start bot: ${error.message}`, error.stack);
            throw error;
        }
    }
    
    /**
     * Stop the bot
     * @returns {Promise<void>}
     */
    async stop() {
        try {
            const logger = this.managers.logger;
            logger.info('bot', 'Stopping bot...');
            
            // Stop modules first
            if (this.moduleRegistry) {
                await this.moduleRegistry.stop();
                logger.info('bot', 'Modules stopped');
            }
            
            // Stop monitor manager
            if (this.managers.monitor) {
                await this.managers.monitor.stop();
                logger.info('bot', 'Monitor manager stopped');
            }
            
            // Stop bot manager last
            if (this.managers.bot) {
                await this.managers.bot.stop();
                logger.info('bot', 'Bot manager stopped');
            }
            
            this.isRunning = false;
            logger.success('bot', 'Bot stopped successfully');
            
            return true;
        } catch (error) {
            if (this.managers.logger) {
                this.managers.logger.error('bot', `Failed to stop bot: ${error.message}`, error.stack);
            } else {
                console.error(`Failed to stop bot: ${error.message}`, error.stack);
            }
            
            throw error;
        }
    }
    
    /**
     * Get the bot's status
     * @returns {Object} - Bot status
     */
    getStatus() {
        const uptime = Date.now() - this.startTime;
        
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            uptime,
            startTime: this.startTime,
            managers: Object.keys(this.managers),
            moduleCount: this.moduleRegistry ? this.moduleRegistry.getAllModules().size : 0
        };
    }
}

module.exports = Bot; 