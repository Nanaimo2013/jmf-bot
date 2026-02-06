/**
 * JMF Hosting Discord Bot - Interaction Create Event
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This event handles all interactions with the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Event = require('./base.event');
const { 
    Collection, 
    InteractionType, 
    PermissionFlagsBits 
} = require('discord.js');

class InteractionCreateEvent extends Event {
    /**
     * Create a new interaction create event
     */
    constructor() {
        super({
            name: 'interactionCreate',
            description: 'Handles all interactions with the bot',
            once: false,
            enabled: true
        });
        
        // Command cooldowns
        this.cooldowns = new Collection();
    }
    
    /**
     * Initialize the event
     * @param {Client} client - The Discord.js client
     * @returns {Promise<boolean>}
     */
    async initialize(client) {
        try {
            await super.initialize(client);
            
            // Get command registry
            this.commandRegistry = global.managers.bot.commandRegistry;
            
            // Get module registry
            this.moduleRegistry = global.managers.bot.moduleRegistry;
            
            return true;
        } catch (error) {
            this.handleError('initialize', error);
            return false;
        }
    }
    
    /**
     * Execute the event
     * @param {Interaction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            // Handle different interaction types
            if (interaction.isChatInputCommand()) {
                await this.handleCommand(interaction);
            } else if (interaction.isButton()) {
                await this.handleButton(interaction);
            } else if (interaction.isStringSelectMenu()) {
                await this.handleSelectMenu(interaction);
            } else if (interaction.isModalSubmit()) {
                await this.handleModalSubmit(interaction);
            } else if (interaction.isContextMenuCommand()) {
                await this.handleContextMenu(interaction);
            } else if (interaction.isAutocomplete()) {
                await this.handleAutocomplete(interaction);
            }
        } catch (error) {
            this.handleError('execute', error);
        }
    }
    
    /**
     * Handle a command interaction
     * @param {CommandInteraction} interaction - The command interaction
     * @returns {Promise<void>}
     */
    async handleCommand(interaction) {
        try {
            // Get the command
            const command = this.commandRegistry.getCommand(interaction.commandName);
            
            if (!command) {
                this.logger.warn(this.name, `Command not found: ${interaction.commandName}`);
                return;
            }
            
            // Check if command is enabled
            if (!command.enabled) {
                return interaction.reply({
                    content: '⚠️ This command is currently disabled.',
                    ephemeral: true
                });
            }
            
            // Check if user has permission to use the command
            const hasPermission = await command.hasPermission(interaction);
            if (!hasPermission) {
                return interaction.reply({
                    content: '⚠️ You do not have permission to use this command.',
                    ephemeral: true
                });
            }
            
            // Check cooldown
            if (command.cooldown > 0) {
                if (!this.cooldowns.has(command.name)) {
                    this.cooldowns.set(command.name, new Collection());
                }
                
                const now = Date.now();
                const timestamps = this.cooldowns.get(command.name);
                const cooldownAmount = command.cooldown * 1000;
                
                if (timestamps.has(interaction.user.id)) {
                    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                    
                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        return interaction.reply({
                            content: `⏱️ Please wait ${timeLeft.toFixed(1)} more second(s) before using the \`${command.name}\` command again.`,
                            ephemeral: true
                        });
                    }
                }
                
                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            }
            
            // Execute the command
            await command.execute(interaction);
            
            // Log command usage
            this.logger.info(this.name, `Command executed: ${interaction.commandName} by ${interaction.user.tag} (${interaction.user.id})`);
        } catch (error) {
            this.handleError('handleCommand', error);
            
            // Reply to the interaction if not already replied
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while executing this command.',
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: 'An error occurred while executing this command.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle a button interaction
     * @param {ButtonInteraction} interaction - The button interaction
     * @returns {Promise<void>}
     */
    async handleButton(interaction) {
        try {
            const { customId } = interaction;
            
            // Check if the button is handled by a module
            for (const [name, module] of this.moduleRegistry.getAllModules()) {
                if (module.handleButton && await module.handleButton(interaction)) {
                    return;
                }
            }
            
            // If no module handled the button, log it
            this.logger.warn(this.name, `Button not handled: ${customId}`);
            
            // Reply with a generic message
            await interaction.reply({
                content: 'This button is not currently handled by any module.',
                ephemeral: true
            });
        } catch (error) {
            this.handleError('handleButton', error);
            
            // Reply to the interaction if not already replied
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while processing this button.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle a select menu interaction
     * @param {StringSelectMenuInteraction} interaction - The select menu interaction
     * @returns {Promise<void>}
     */
    async handleSelectMenu(interaction) {
        try {
            const { customId } = interaction;
            
            // Check if the select menu is handled by a module
            for (const [name, module] of this.moduleRegistry.getAllModules()) {
                if (module.handleSelectMenu && await module.handleSelectMenu(interaction)) {
                    return;
                }
            }
            
            // If no module handled the select menu, log it
            this.logger.warn(this.name, `Select menu not handled: ${customId}`);
            
            // Reply with a generic message
            await interaction.reply({
                content: 'This select menu is not currently handled by any module.',
                ephemeral: true
            });
        } catch (error) {
            this.handleError('handleSelectMenu', error);
            
            // Reply to the interaction if not already replied
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while processing this select menu.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle a modal submit interaction
     * @param {ModalSubmitInteraction} interaction - The modal submit interaction
     * @returns {Promise<void>}
     */
    async handleModalSubmit(interaction) {
        try {
            const { customId } = interaction;
            
            // Check if the modal is handled by a module
            for (const [name, module] of this.moduleRegistry.getAllModules()) {
                if (module.handleModalSubmit && await module.handleModalSubmit(interaction)) {
                    return;
                }
            }
            
            // If no module handled the modal, log it
            this.logger.warn(this.name, `Modal not handled: ${customId}`);
            
            // Reply with a generic message
            await interaction.reply({
                content: 'This modal is not currently handled by any module.',
                ephemeral: true
            });
        } catch (error) {
            this.handleError('handleModalSubmit', error);
            
            // Reply to the interaction if not already replied
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while processing this modal.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle a context menu interaction
     * @param {ContextMenuCommandInteraction} interaction - The context menu interaction
     * @returns {Promise<void>}
     */
    async handleContextMenu(interaction) {
        try {
            // Get the command
            const command = this.commandRegistry.getCommand(interaction.commandName);
            
            if (!command) {
                this.logger.warn(this.name, `Context menu command not found: ${interaction.commandName}`);
                return;
            }
            
            // Execute the command
            await command.execute(interaction);
            
            // Log command usage
            this.logger.info(this.name, `Context menu command executed: ${interaction.commandName} by ${interaction.user.tag} (${interaction.user.id})`);
        } catch (error) {
            this.handleError('handleContextMenu', error);
            
            // Reply to the interaction if not already replied
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while executing this context menu command.',
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: 'An error occurred while executing this context menu command.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle an autocomplete interaction
     * @param {AutocompleteInteraction} interaction - The autocomplete interaction
     * @returns {Promise<void>}
     */
    async handleAutocomplete(interaction) {
        try {
            // Get the command
            const command = this.commandRegistry.getCommand(interaction.commandName);
            
            if (!command) {
                this.logger.warn(this.name, `Autocomplete command not found: ${interaction.commandName}`);
                return;
            }
            
            // Check if command has autocomplete method
            if (!command.autocomplete) {
                this.logger.warn(this.name, `Command ${interaction.commandName} does not have an autocomplete method`);
                return;
            }
            
            // Execute the autocomplete method
            await command.autocomplete(interaction);
        } catch (error) {
            this.handleError('handleAutocomplete', error);
        }
    }
}

module.exports = InteractionCreateEvent;

// Export as a proper Discord.js event for compatibility
module.exports.name = 'interactionCreate';
module.exports.once = false;
module.exports.execute = async (interaction) => {
    const event = new InteractionCreateEvent();
    await event.initialize(interaction.client);
    return event.execute(interaction);
}; 