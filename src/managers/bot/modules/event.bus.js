/**
 * JMF Hosting Discord Bot - Event Bus Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides a centralized event bus for inter-module communication,
 * supporting namespaced events, priority-based handlers, and event filtering.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { Collection } = require('discord.js');

class EventBus extends BaseModule {
    /**
     * Create a new event bus
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Event bus options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'event-bus',
            version: options.version || '1.0.0',
            description: 'Event bus for inter-module communication',
            defaultConfig: {
                debugEvents: false,
                logEventData: false,
                maxListeners: 100,
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Event handlers
        this.handlers = new Collection();
        
        // Event namespaces
        this.namespaces = new Set();
        
        // Event statistics
        this.stats = {
            emitted: 0,
            handled: 0,
            byEvent: new Map(),
            byNamespace: new Map()
        };
        
        // Last events (for debugging)
        this.lastEvents = [];
        
        // Maximum number of last events to store
        this.maxLastEvents = 50;
    }

    /**
     * Initialize the event bus
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        this.logger.info(this.name, 'Event bus initialized');
    }

    /**
     * Register an event handler
     * @param {string} event - The event name (can include namespace with format 'namespace:event')
     * @param {Function} handler - The event handler function
     * @param {Object} [options] - Handler options
     * @param {number} [options.priority=0] - Handler priority (higher numbers execute first)
     * @param {Function} [options.filter] - Event filter function
     * @param {boolean} [options.once=false] - Whether the handler should only be called once
     * @returns {string} - The handler ID
     */
    on(event, handler, options = {}) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        
        // Parse event name and namespace
        const { namespace, eventName } = this._parseEventName(event);
        
        // Add namespace to set
        this.namespaces.add(namespace);
        
        // Create handler ID
        const handlerId = `${namespace}:${eventName}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
        
        // Create handler object
        const handlerObj = {
            id: handlerId,
            event: eventName,
            namespace,
            handler,
            priority: options.priority || 0,
            filter: options.filter,
            once: options.once || false,
            createdAt: Date.now()
        };
        
        // Add handler to collection
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, []);
        }
        
        this.handlers.get(eventName).push(handlerObj);
        
        // Sort handlers by priority (descending)
        this.handlers.get(eventName).sort((a, b) => b.priority - a.priority);
        
        // Check if max listeners exceeded
        const maxListeners = this.getConfig('maxListeners');
        if (this.handlers.get(eventName).length > maxListeners) {
            this.logger.warn(this.name, `Max listeners (${maxListeners}) exceeded for event: ${eventName}`);
        }
        
        this.logger.debug(this.name, `Registered handler for event: ${namespace}:${eventName}`);
        
        return handlerId;
    }

    /**
     * Register a one-time event handler
     * @param {string} event - The event name
     * @param {Function} handler - The event handler function
     * @param {Object} [options] - Handler options
     * @returns {string} - The handler ID
     */
    once(event, handler, options = {}) {
        return this.on(event, handler, { ...options, once: true });
    }

    /**
     * Remove an event handler
     * @param {string} handlerId - The handler ID
     * @returns {boolean} - Whether the handler was removed
     */
    off(handlerId) {
        // Find handler
        for (const [eventName, handlers] of this.handlers.entries()) {
            const index = handlers.findIndex(h => h.id === handlerId);
            
            if (index !== -1) {
                // Remove handler
                handlers.splice(index, 1);
                
                // Remove event if no handlers left
                if (handlers.length === 0) {
                    this.handlers.delete(eventName);
                }
                
                this.logger.debug(this.name, `Removed handler: ${handlerId}`);
                
                return true;
            }
        }
        
        return false;
    }

    /**
     * Remove all event handlers for an event
     * @param {string} event - The event name
     * @param {string} [namespace] - The namespace to remove handlers from
     * @returns {number} - The number of handlers removed
     */
    offAll(event, namespace) {
        // Parse event name and namespace
        const { namespace: parsedNamespace, eventName } = this._parseEventName(event);
        const ns = namespace || parsedNamespace;
        
        // If no handlers for event, return 0
        if (!this.handlers.has(eventName)) {
            return 0;
        }
        
        // Get handlers
        const handlers = this.handlers.get(eventName);
        
        // Filter handlers by namespace
        const filteredHandlers = handlers.filter(h => h.namespace === ns);
        
        // Remove handlers
        const count = filteredHandlers.length;
        
        // Update handlers
        this.handlers.set(eventName, handlers.filter(h => h.namespace !== ns));
        
        // Remove event if no handlers left
        if (this.handlers.get(eventName).length === 0) {
            this.handlers.delete(eventName);
        }
        
        this.logger.debug(this.name, `Removed ${count} handlers for event: ${ns}:${eventName}`);
        
        return count;
    }

    /**
     * Emit an event
     * @param {string} event - The event name
     * @param {*} data - The event data
     * @param {Object} [options] - Emit options
     * @param {string} [options.namespace] - The namespace to emit the event in
     * @param {boolean} [options.async=false] - Whether to emit the event asynchronously
     * @returns {Promise<Array>|Array} - Array of handler results
     */
    emit(event, data, options = {}) {
        // Parse event name and namespace
        const { namespace: parsedNamespace, eventName } = this._parseEventName(event);
        const namespace = options.namespace || parsedNamespace;
        
        // Update statistics
        this._updateStats(eventName, namespace);
        
        // Store event for debugging
        if (this.getConfig('debugEvents')) {
            this._storeEvent(eventName, namespace, data);
        }
        
        // Log event
        if (this.getConfig('debugEvents')) {
            this.logger.debug(
                this.name, 
                `Emitting event: ${namespace}:${eventName}${this.getConfig('logEventData') ? ` with data: ${JSON.stringify(data)}` : ''}`
            );
        }
        
        // If no handlers for event, return empty array
        if (!this.handlers.has(eventName)) {
            return options.async ? Promise.resolve([]) : [];
        }
        
        // Get handlers
        const handlers = this.handlers.get(eventName);
        
        // Filter handlers by namespace
        const filteredHandlers = handlers.filter(h => h.namespace === namespace || h.namespace === '*');
        
        // If no handlers match, return empty array
        if (filteredHandlers.length === 0) {
            return options.async ? Promise.resolve([]) : [];
        }
        
        // Track handlers to remove (once handlers)
        const handlersToRemove = [];
        
        // Call handlers
        const results = filteredHandlers.map(handlerObj => {
            try {
                // Check filter
                if (handlerObj.filter && !handlerObj.filter(data)) {
                    return null;
                }
                
                // Call handler
                const result = handlerObj.handler(data);
                
                // Track for removal if once
                if (handlerObj.once) {
                    handlersToRemove.push(handlerObj.id);
                }
                
                // Update statistics
                this.stats.handled++;
                
                return result;
            } catch (error) {
                this.logger.error(this.name, `Error in event handler for ${namespace}:${eventName}: ${error.message}`);
                
                // Forward error to error handler if available
                const errorHandler = this.manager.getModule('error-handler');
                if (errorHandler) {
                    errorHandler.handleError(error, {
                        type: 'event',
                        source: 'event-bus',
                        data: {
                            event: eventName,
                            namespace,
                            handlerId: handlerObj.id
                        }
                    }).catch(() => {});
                }
                
                return null;
            }
        }).filter(result => result !== null);
        
        // Remove once handlers
        for (const handlerId of handlersToRemove) {
            this.off(handlerId);
        }
        
        // Return results
        if (options.async) {
            return Promise.all(results.map(result => {
                if (result instanceof Promise) {
                    return result;
                }
                return Promise.resolve(result);
            }));
        }
        
        return results;
    }

    /**
     * Emit an event asynchronously
     * @param {string} event - The event name
     * @param {*} data - The event data
     * @param {Object} [options] - Emit options
     * @returns {Promise<Array>} - Array of handler results
     */
    async emitAsync(event, data, options = {}) {
        return this.emit(event, data, { ...options, async: true });
    }

    /**
     * Check if an event has handlers
     * @param {string} event - The event name
     * @param {string} [namespace] - The namespace to check
     * @returns {boolean} - Whether the event has handlers
     */
    hasHandlers(event, namespace) {
        // Parse event name and namespace
        const { namespace: parsedNamespace, eventName } = this._parseEventName(event);
        const ns = namespace || parsedNamespace;
        
        // If no handlers for event, return false
        if (!this.handlers.has(eventName)) {
            return false;
        }
        
        // Get handlers
        const handlers = this.handlers.get(eventName);
        
        // Check if any handlers match namespace
        return handlers.some(h => h.namespace === ns || h.namespace === '*');
    }

    /**
     * Get event statistics
     * @returns {Object} - Event statistics
     */
    getStatistics() {
        return {
            emitted: this.stats.emitted,
            handled: this.stats.handled,
            byEvent: Object.fromEntries(this.stats.byEvent),
            byNamespace: Object.fromEntries(this.stats.byNamespace),
            handlerCount: Array.from(this.handlers.entries()).reduce((total, [, handlers]) => total + handlers.length, 0),
            eventCount: this.handlers.size,
            namespaceCount: this.namespaces.size
        };
    }

    /**
     * Get last events (for debugging)
     * @param {number} [count=10] - The number of events to get
     * @returns {Array} - The last events
     */
    getLastEvents(count = 10) {
        return this.lastEvents.slice(0, count);
    }

    /**
     * Parse event name and namespace
     * @param {string} event - The event name
     * @returns {Object} - The parsed event name and namespace
     * @private
     */
    _parseEventName(event) {
        // Check if event includes namespace
        if (event.includes(':')) {
            const [namespace, ...eventParts] = event.split(':');
            return {
                namespace,
                eventName: eventParts.join(':')
            };
        }
        
        // Default namespace
        return {
            namespace: 'global',
            eventName: event
        };
    }

    /**
     * Update event statistics
     * @param {string} eventName - The event name
     * @param {string} namespace - The namespace
     * @private
     */
    _updateStats(eventName, namespace) {
        // Update total emitted
        this.stats.emitted++;
        
        // Update by event
        if (!this.stats.byEvent.has(eventName)) {
            this.stats.byEvent.set(eventName, 0);
        }
        this.stats.byEvent.set(eventName, this.stats.byEvent.get(eventName) + 1);
        
        // Update by namespace
        if (!this.stats.byNamespace.has(namespace)) {
            this.stats.byNamespace.set(namespace, 0);
        }
        this.stats.byNamespace.set(namespace, this.stats.byNamespace.get(namespace) + 1);
    }

    /**
     * Store event for debugging
     * @param {string} eventName - The event name
     * @param {string} namespace - The namespace
     * @param {*} data - The event data
     * @private
     */
    _storeEvent(eventName, namespace, data) {
        // Add event to last events
        this.lastEvents.unshift({
            event: eventName,
            namespace,
            data: this.getConfig('logEventData') ? data : undefined,
            timestamp: Date.now()
        });
        
        // Limit last events
        if (this.lastEvents.length > this.maxLastEvents) {
            this.lastEvents.pop();
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        // Clear handlers
        this.handlers.clear();
        
        // Clear namespaces
        this.namespaces.clear();
        
        // Reset statistics
        this.stats.emitted = 0;
        this.stats.handled = 0;
        this.stats.byEvent.clear();
        this.stats.byNamespace.clear();
        
        // Clear last events
        this.lastEvents = [];
        
        this.logger.info(this.name, 'Event bus cleaned up');
    }
}

module.exports = EventBus; 