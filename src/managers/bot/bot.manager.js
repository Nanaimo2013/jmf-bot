/**
 * JMF Hosting Discord Bot - Bot Manager
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This class manages the Discord bot instance and its lifecycle.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;
const ModuleRegistry = require('../../modules');

class BotManager {
    constructor() {
        this.client = null;
        this.moduleRegistry = null;
        this.isRunning = false;
        this.startTime = null;
        
        // Get logger from global managers
        this.logger = global.managers?.logger || console;
        
        // Get config manager from global managers
        this.configManager = global.managers?.config;
        
        // Get database manager from global managers
        this.database = global.managers?.database;

        // Initialize managers map
        this.managers = new Map();
    }
    
    /**
     * Register a manager with the bot
     * @param {string} name - The name of the manager
     * @param {object} manager - The manager instance to register
     */
    registerManager(name, manager) {
        if (!name || !manager) {
            throw new Error('Name and manager instance are required');
        }
        this.managers.set(name, manager);
        this.logger.debug('BotManager', `Registered manager: ${name}`);
    }
    
    /**
     * Initialize the bot manager
     * @returns {Promise<boolean>}
     */
    async initialize() {
        try {
            this.logger.info('BotManager', 'Initializing bot manager...');
            
            // Get config manager from registered managers
            const configManager = this.managers.get('config') || this.configManager;
            if (!configManager) {
                throw new Error('Config manager not available');
            }
            
            // Load configuration
            const config = configManager.getConfig();
            if (!config) {
                throw new Error('Failed to load configuration');
            }
            
            // Create Discord client with required intents
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.GuildVoiceStates,
                    GatewayIntentBits.MessageContent,
                    GatewayIntentBits.DirectMessages
                ],
                partials: [
                    Partials.Channel,
                    Partials.Message,
                    Partials.User,
                    Partials.GuildMember
                ]
            });
            
            // Initialize module registry
            this.moduleRegistry = new ModuleRegistry({
                logger: this.logger,
                bot: this
            });
            
            // Set up event handlers
            this.setupEventHandlers();
            
            this.logger.info('BotManager', 'Bot manager initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('BotManager', `Failed to initialize bot manager: ${error.message}`, error.stack);
            return false;
        }
    }
    
    /**
     * Start the bot
     * @returns {Promise<boolean>}
     */
    async start() {
        try {
            if (this.isRunning) {
                this.logger.warn('BotManager', 'Bot is already running');
                return true;
            }
            
            this.logger.info('BotManager', 'Starting bot...');
            
            // Get config manager from registered managers
            const configManager = this.managers.get('config') || this.configManager;
            if (!configManager) {
                throw new Error('Config manager not available');
            }
            
            // Get bot token from environment variable first, then config
            let token = process.env.BOT_TOKEN;
            if (!token) {
                token = configManager.getConfig('bot.token');
            }
            if (!token || token === '${BOT_TOKEN}') {
                throw new Error('Bot token not found. Please set BOT_TOKEN environment variable or configure bot.token in config');
            }
            
            // Login to Discord
            await this.client.login(token);
            
            // Initialize and start modules
            await this.moduleRegistry.initialize(this.client);
            await this.moduleRegistry.start();
            
            this.isRunning = true;
            this.startTime = Date.now();
            
            // Save PID to file
            await this.savePid();
            
            this.logger.info('BotManager', 'Bot started successfully');
            return true;
        } catch (error) {
            this.logger.error('BotManager', `Failed to start bot: ${error.message}`, error.stack);
            return false;
        }
    }
    
    /**
     * Stop the bot
     * @returns {Promise<boolean>}
     */
    async stop() {
        try {
            if (!this.isRunning) {
                this.logger.warn('BotManager', 'Bot is not running');
                return true;
            }
            
            this.logger.info('BotManager', 'Stopping bot...');
            
            // Stop modules
            await this.moduleRegistry.stop();
            
            // Destroy client
            await this.client.destroy();
            
            this.isRunning = false;
            this.startTime = null;
            
            // Remove PID file
            await this.removePid();
            
            this.logger.info('BotManager', 'Bot stopped successfully');
            return true;
        } catch (error) {
            this.logger.error('BotManager', `Failed to stop bot: ${error.message}`, error.stack);
            return false;
        }
    }
    
    /**
     * Set up event handlers for the Discord client
     * @private
     */
    setupEventHandlers() {
        // Ready event
        this.client.once('ready', () => {
            this.logger.info('BotManager', `Logged in as ${this.client.user.tag}`);
        });
        
        // Error event
        this.client.on('error', error => {
            this.logger.error('BotManager', `Discord client error: ${error.message}`, error.stack);
        });
        
        // Debug event (only log if debug is enabled)
        this.client.on('debug', info => {
            if (this.configManager.getConfig('bot.debug')) {
                this.logger.debug('BotManager', info);
            }
        });
        
        // Warn event
        this.client.on('warn', info => {
            this.logger.warn('BotManager', info);
        });
        
        // Shard error event
        this.client.on('shardError', (error, shardId) => {
            this.logger.error('BotManager', `Shard ${shardId} error: ${error.message}`, error.stack);
        });
    }
    
    /**
     * Save the process ID to a file
     * @private
     */
    async savePid() {
        try {
            const pidPath = path.join(process.cwd(), '.pid');
            await fs.writeFile(pidPath, process.pid.toString());
        } catch (error) {
            this.logger.error('BotManager', `Failed to save PID: ${error.message}`);
        }
    }
    
    /**
     * Remove the process ID file
     * @private
     */
    async removePid() {
        try {
            const pidPath = path.join(process.cwd(), '.pid');
            await fs.unlink(pidPath);
        } catch (error) {
            this.logger.error('BotManager', `Failed to remove PID file: ${error.message}`);
        }
    }
    
    /**
     * Get the bot's uptime in milliseconds
     * @returns {number}
     */
    getUptime() {
        if (!this.isRunning || !this.startTime) {
            return 0;
        }
        return Date.now() - this.startTime;
    }
    
    /**
     * Get the status of the bot and its modules
     * @returns {Object}
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            uptime: this.getUptime(),
            modules: this.moduleRegistry?.getStatus() || {},
            client: {
                ping: this.client?.ws?.ping || -1,
                status: this.client?.status || 'unknown',
                guilds: this.client?.guilds?.cache?.size || 0,
                users: this.client?.users?.cache?.size || 0
            }
        };
    }
}

module.exports = BotManager; 