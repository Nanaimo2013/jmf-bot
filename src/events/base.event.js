/**
 * JMF Hosting Discord Bot - Base Event
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This is the base event class that all events should extend from.
 * It provides common functionality and standardizes the event structure.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseEvent = require('../managers/bot/modules/base.event');

class Event extends BaseEvent {
    /**
     * Create a new event
     * @param {Object} options - Event options
     */
    constructor(options = {}) {
        super(options);
        
        // Default properties
        this.name = options.name || 'event';
        this.description = options.description || 'An event';
        this.once = options.once !== undefined ? options.once : false;
        this.enabled = options.enabled !== undefined ? options.enabled : true;
    }
    
    /**
     * Initialize the event
     * @param {Client} client - The Discord.js client
     * @returns {Promise<boolean>}
     */
    async initialize(client) {
        try {
            this.client = client;
            
            // Get managers
            this.logger = global.managers.logger;
            this.database = global.managers.database;
            this.config = global.managers.config;
            
            // Register the event
            if (this.once) {
                this.client.once(this.name, this.execute.bind(this));
            } else {
                this.client.on(this.name, this.execute.bind(this));
            }
            
            return true;
        } catch (error) {
            if (this.logger) {
                this.logger.error(this.name, `Failed to initialize event ${this.name}: ${error.message}`, error.stack);
            } else {
                console.error(`Failed to initialize event ${this.name}: ${error.message}`, error.stack);
            }
            return false;
        }
    }
    
    /**
     * Execute the event
     * @param {...any} args - Event arguments
     * @returns {Promise<void>}
     */
    async execute(...args) {
        throw new Error('Event execute method not implemented');
    }
    
    /**
     * Handle event error
     * @param {string} context - Error context
     * @param {Error} error - The error object
     */
    handleError(context, error) {
        if (this.logger) {
            this.logger.error(this.name, `Error in ${context}: ${error.message}`, error.stack);
        } else {
            console.error(`[${this.name}] Error in ${context}: ${error.message}`, error.stack);
        }
    }
}

module.exports = Event;

// Export as a proper Discord.js event for compatibility
module.exports.name = 'base';
module.exports.once = false;
module.exports.execute = async (...args) => {
    const event = new Event();
    return event.execute(...args);
}; 