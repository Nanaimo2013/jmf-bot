/**
 * JMF Hosting Discord Bot - Bot Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles the Discord bot functionality, including commands,
 * events, and other Discord-specific features.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base/base.manager');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;

class BotManager extends BaseManager {
    /**
     * Create a new bot manager
     */
    constructor() {
        super('bot');
        
        // Set dependencies
        this.setOptionalDependencies(['database', 'logger']);
        
        // Discord.js client
        this.client = null;
        
        // Collections
        this.commands = new Collection();
        this.events = new Collection();
        
        // Bot state
        this.isReady = false;
        this.startTime = null;
    }

    /**
     * Initialize the bot manager
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        // Call parent initialize
        await super.initialize(config);
        
        try {
            // Create Discord client with default intents if not provided
            const intents = this.config && this.config.intents ? this.config.intents : [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent
            ];
            
            const partials = this.config && this.config.partials ? this.config.partials : [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction
            ];
            
            this.client = new Client({ intents, partials });
            
            // Register basic events
            this._registerBasicEvents();
            
            this.logger.success(this.name, `Bot manager initialized successfully`);
        } catch (error) {
            this.logger.error(this.name, `Failed to initialize bot manager:`, error);
            throw error;
        }
    }
    
    /**
     * Start the Discord bot
     * @returns {Promise<void>}
     */
    async start() {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        
        const token = this.config && this.config.token ? this.config.token : process.env.DISCORD_TOKEN;
        
        if (!token) {
            throw new Error('Discord token not provided');
        }
        
        try {
            this.logger.info(this.name, 'Starting Discord bot...');
            
            // Check if client.login is a function
            if (typeof this.client.login !== 'function') {
                this.logger.error(this.name, 'Discord client login method is not available');
                throw new Error('Discord client login method is not available');
            }
            
            await this.client.login(token);
            this.startTime = Date.now();
            this.logger.success(this.name, 'Discord bot started successfully');
        } catch (error) {
            this.logger.error(this.name, `Failed to start Discord bot:`, error);
            throw error;
        }
    }
    
    /**
     * Stop the Discord bot
     * @returns {Promise<void>}
     */
    async stop() {
        if (this.client) {
            this.logger.info(this.name, 'Stopping Discord bot...');
            
            // Destroy the client
            this.client.destroy();
            this.isReady = false;
            
            this.logger.success(this.name, 'Discord bot stopped successfully');
        }
    }
    
    /**
     * Register basic Discord.js events
     * @private
     */
    _registerBasicEvents() {
        // Ready event
        this.client.on('ready', () => {
            this.isReady = true;
            this.logger.info(this.name, `Logged in as ${this.client.user.tag}`);
        });
        
        // Error event
        this.client.on('error', (error) => {
            this.logger.error(this.name, `Discord client error:`, error);
        });
        
        // Warning event
        this.client.on('warn', (warning) => {
            this.logger.warn(this.name, `Discord client warning:`, warning);
        });
        
        // Debug event (only in development)
        if (process.env.NODE_ENV === 'development') {
            this.client.on('debug', (info) => {
                this.logger.debug(this.name, `Discord client debug:`, info);
            });
        }
    }
    
    /**
     * Shutdown the manager
     * @returns {Promise<void>}
     */
    async shutdown() {
        await this.stop();
        await super.shutdown();
    }
}

module.exports = BotManager; 