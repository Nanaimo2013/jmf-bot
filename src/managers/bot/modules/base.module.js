/**
 * JMF Hosting Discord Bot - Bot Base Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module serves as the base for all bot-specific modules.
 * It extends the base module from the base manager and adds
 * bot-specific functionality.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');

class BotBaseModule extends BaseModule {
    /**
     * Create a new bot base module
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} options - Module options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'bot-module',
            version: options.version || '1.0.0',
            description: options.description || 'A bot module',
            defaultConfig: options.defaultConfig || {},
            requiredPermissions: options.requiredPermissions || []
        });

        // Bot-specific properties
        this.client = manager.client;
        this.commands = new Map();
        this.events = new Map();
        this.interactions = {
            buttons: new Map(),
            selectMenus: new Map(),
            modals: new Map()
        };
    }

    /**
     * Register a command with the module
     * @param {Object} command - The command object
     * @returns {BotBaseModule} - The module instance for chaining
     */
    registerCommand(command) {
        if (!command.data || !command.execute) {
            this.logger.warn(this.name, `Command is missing required properties`);
            return this;
        }

        this.commands.set(command.data.name, command);
        this.logger.debug(this.name, `Registered command: ${command.data.name}`);
        return this;
    }

    /**
     * Register an event with the module
     * @param {Object} event - The event object
     * @returns {BotBaseModule} - The module instance for chaining
     */
    registerEvent(event) {
        if (!event.name || !event.execute) {
            this.logger.warn(this.name, `Event is missing required properties`);
            return this;
        }

        this.events.set(event.name, event);
        this.logger.debug(this.name, `Registered event: ${event.name}`);
        return this;
    }

    /**
     * Register a button interaction handler
     * @param {string} customId - The button's custom ID
     * @param {Function} handler - The handler function
     * @returns {BotBaseModule} - The module instance for chaining
     */
    registerButton(customId, handler) {
        this.interactions.buttons.set(customId, handler);
        this.logger.debug(this.name, `Registered button handler: ${customId}`);
        return this;
    }

    /**
     * Register a select menu interaction handler
     * @param {string} customId - The select menu's custom ID
     * @param {Function} handler - The handler function
     * @returns {BotBaseModule} - The module instance for chaining
     */
    registerSelectMenu(customId, handler) {
        this.interactions.selectMenus.set(customId, handler);
        this.logger.debug(this.name, `Registered select menu handler: ${customId}`);
        return this;
    }

    /**
     * Register a modal submit interaction handler
     * @param {string} customId - The modal's custom ID
     * @param {Function} handler - The handler function
     * @returns {BotBaseModule} - The module instance for chaining
     */
    registerModal(customId, handler) {
        this.interactions.modals.set(customId, handler);
        this.logger.debug(this.name, `Registered modal handler: ${customId}`);
        return this;
    }

    /**
     * Get all commands registered with this module
     * @returns {Map} - Map of commands
     */
    getCommands() {
        return this.commands;
    }

    /**
     * Get all events registered with this module
     * @returns {Map} - Map of events
     */
    getEvents() {
        return this.events;
    }

    /**
     * Get all interaction handlers registered with this module
     * @returns {Object} - Object containing maps of interaction handlers
     */
    getInteractions() {
        return this.interactions;
    }
}

module.exports = BotBaseModule; 