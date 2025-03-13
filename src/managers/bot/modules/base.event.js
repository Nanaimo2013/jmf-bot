/**
 * JMF Hosting Discord Bot - Base Event Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides a base class for all bot events.
 * It handles event registration, execution, and error handling.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { Events } = require('discord.js');

class BaseEvent extends BaseModule {
    /**
     * Create a new event
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Event options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'base-event',
            version: options.version || '1.0.0',
            description: options.description || 'Base event module',
            defaultConfig: {
                enabled: true,
                once: false,
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Event properties
        this.type = 'event';
        this.eventName = options.eventName || this.name;
        this.once = options.once || this.getConfig('once') || false;
        
        // Event execution tracking
        this.executionCount = 0;
        this.lastExecutionTime = null;
        this.averageExecutionTime = 0;
        this.errors = 0;
    }

    /**
     * Initialize the event
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Register event with the client
        if (this.manager.client) {
            if (this.once) {
                this.manager.client.once(this.eventName, (...args) => this.execute(...args));
            } else {
                this.manager.client.on(this.eventName, (...args) => this.execute(...args));
            }
            
            // Register event with the bot manager
            if (this.manager.events) {
                this.manager.events.set(this.eventName, this);
            }
            
            this.logger.debug(this.name, `Event initialized: ${this.eventName} (once: ${this.once})`);
        } else {
            this.logger.warn(this.name, `Cannot initialize event: client not available`);
        }
    }

    /**
     * Execute the event
     * @param {...any} args - Event arguments
     * @returns {Promise<void>}
     */
    async execute(...args) {
        // Check if event is enabled
        if (!this.getConfig('enabled')) {
            return;
        }
        
        // Track execution
        this.executionCount++;
        this.lastExecutionTime = Date.now();
        
        // Execute event
        try {
            const startTime = Date.now();
            
            await this.run(...args);
            
            // Track execution time
            const executionTime = Date.now() - startTime;
            this.averageExecutionTime = (this.averageExecutionTime * (this.executionCount - 1) + executionTime) / this.executionCount;
            
            this.logger.debug(this.name, `Event executed in ${executionTime}ms: ${this.eventName}`);
        } catch (error) {
            this.errors++;
            this.logger.error(this.name, `Error executing event ${this.eventName}: ${error.message}`);
            
            // Emit event error
            this.emit('eventError', {
                name: this.eventName,
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Run the event (to be implemented by subclasses)
     * @param {...any} args - Event arguments
     * @returns {Promise<void>}
     */
    async run(...args) {
        throw new Error('Event run method not implemented');
    }

    /**
     * Get event information
     * @returns {Object} - Event information
     */
    getEventInfo() {
        return {
            name: this.name,
            eventName: this.eventName,
            description: this.description,
            once: this.once,
            enabled: this.getConfig('enabled')
        };
    }

    /**
     * Get event statistics
     * @returns {Object} - Event statistics
     */
    getStatistics() {
        return {
            executionCount: this.executionCount,
            lastExecutionTime: this.lastExecutionTime,
            averageExecutionTime: this.averageExecutionTime,
            errors: this.errors
        };
    }

    /**
     * Check if the event is a standard Discord.js event
     * @returns {boolean} - Whether the event is a standard event
     */
    isStandardEvent() {
        return Object.values(Events).includes(this.eventName);
    }
}

module.exports = BaseEvent; 