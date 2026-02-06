/**
 * JMF Hosting Discord Bot - Event Registry
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This file manages all the bot events and provides a centralized
 * way to access and manage them.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

class EventRegistry {
    /**
     * Create a new event registry
     */
    constructor() {
        this.events = new Collection();
        this.initialized = false;
    }
    
    /**
     * Load all events
     * @returns {Promise<Collection>} - Collection of loaded events
     */
    async loadEvents() {
        try {
            const logger = global.managers.logger;
            
            // Get all event files
            const eventFiles = fs.readdirSync(__dirname)
                .filter(file => file.endsWith('.js') && file !== 'index.js' && file !== 'base.event.js');
            
            logger.info('event-registry', `Loading ${eventFiles.length} events...`);
            
            // Load each event
            for (const file of eventFiles) {
                try {
                    const eventPath = path.join(__dirname, file);
                    const eventClass = require(eventPath);
                    
                    // Create event instance
                    const event = new eventClass();
                    
                    // Add to collection
                    this.events.set(event.name, event);
                    
                    logger.debug('event-registry', `Loaded event: ${event.name}`);
                } catch (error) {
                    logger.error('event-registry', `Failed to load event ${file}: ${error.message}`, error.stack);
                }
            }
            
            logger.info('event-registry', `Loaded ${this.events.size} events`);
            
            return this.events;
        } catch (error) {
            const logger = global.managers.logger;
            logger.error('event-registry', `Failed to load events: ${error.message}`, error.stack);
            throw error;
        }
    }
    
    /**
     * Initialize all events
     * @param {Client} client - The Discord.js client
     * @returns {Promise<Collection>} - Collection of initialized events
     */
    async initializeEvents(client) {
        try {
            const logger = global.managers.logger;
            
            if (this.initialized) {
                logger.warn('event-registry', 'Events already initialized');
                return this.events;
            }
            
            logger.info('event-registry', `Initializing ${this.events.size} events...`);
            
            // Initialize each event
            for (const [name, event] of this.events) {
                try {
                    if (!event.enabled) {
                        logger.debug('event-registry', `Skipping disabled event: ${name}`);
                        continue;
                    }
                    
                    await event.initialize(client);
                    logger.debug('event-registry', `Initialized event: ${name}`);
                } catch (error) {
                    logger.error('event-registry', `Failed to initialize event ${name}: ${error.message}`, error.stack);
                }
            }
            
            this.initialized = true;
            logger.info('event-registry', `Initialized ${this.events.size} events`);
            
            return this.events;
        } catch (error) {
            const logger = global.managers.logger;
            logger.error('event-registry', `Failed to initialize events: ${error.message}`, error.stack);
            throw error;
        }
    }
    
    /**
     * Get an event by name
     * @param {string} name - Event name
     * @returns {Object|null} - Event instance or null if not found
     */
    getEvent(name) {
        return this.events.get(name) || null;
    }
    
    /**
     * Get all events
     * @returns {Collection} - Collection of all events
     */
    getAllEvents() {
        return this.events;
    }
    
    /**
     * Shutdown all events
     * @returns {Promise<void>}
     */
    async shutdownEvents() {
        try {
            const logger = global.managers.logger;
            
            if (!this.initialized) {
                logger.warn('event-registry', 'Events not initialized');
                return;
            }
            
            logger.info('event-registry', `Shutting down ${this.events.size} events...`);
            
            // Shutdown each event
            for (const [name, event] of this.events) {
                try {
                    if (typeof event.shutdown === 'function') {
                        await event.shutdown();
                        logger.debug('event-registry', `Shut down event: ${name}`);
                    }
                } catch (error) {
                    logger.error('event-registry', `Failed to shutdown event ${name}: ${error.message}`, error.stack);
                }
            }
            
            this.initialized = false;
            logger.info('event-registry', `Shut down ${this.events.size} events`);
        } catch (error) {
            const logger = global.managers.logger;
            logger.error('event-registry', `Failed to shutdown events: ${error.message}`, error.stack);
            throw error;
        }
    }
}

module.exports = new EventRegistry(); 