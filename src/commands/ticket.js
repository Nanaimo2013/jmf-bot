/**
 * JMF Hosting Discord Bot - Ticket Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command handles ticket-related operations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { Command } = require('./base.command');
const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder,
    ChannelType
} = require('discord.js');

class TicketCommand extends Command {
    /**
     * Create a new ticket command
     */
    constructor() {
        super({
            name: 'ticket',
            description: 'Manage support tickets',
            cooldown: 3,
            guildOnly: true,
            requiredPermissions: [PermissionFlagsBits.SendMessages]
        });
        
        // Add subcommands to the slash command data
        this.data
            .addSubcommand(subcommand =>
                subcommand
                    .setName('close')
                    .setDescription('Close the current ticket')
                    .addStringOption(option =>
                        option
                            .setName('reason')
                            .setDescription('Reason for closing the ticket')
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('add')
                    .setDescription('Add a user to the current ticket')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User to add to the ticket')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('remove')
                    .setDescription('Remove a user from the current ticket')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User to remove from the ticket')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('rename')
                    .setDescription('Rename the current ticket')
                    .addStringOption(option =>
                        option
                            .setName('name')
                            .setDescription('New name for the ticket')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('transcript')
                    .setDescription('Generate a transcript of the current ticket')
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('priority')
                    .setDescription('Set the priority level of the current ticket')
                    .addStringOption(option =>
                        option
                            .setName('level')
                            .setDescription('Priority level')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Low', value: 'low' },
                                { name: 'Medium', value: 'medium' },
                                { name: 'High', value: 'high' },
                                { name: 'Critical', value: 'critical' }
                            )
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('help')
                    .setDescription('Show help for ticket commands')
            );
    }
    
    /**
     * Initialize the command
     * @param {Client} client - The Discord.js client
     * @returns {Promise<boolean>}
     */
    async initialize(client) {
        try {
            await super.initialize(client);
            
            // Get tickets module
            this.ticketsModule = global.managers?.bot?.moduleRegistry?.getModule('tickets');
            
            if (!this.ticketsModule) {
                this.logger.warn(this.name, 'Tickets module not found, some functionality may be limited');
            }
            
            return true;
        } catch (error) {
            this.handleError('initialize', error);
            return false;
        }
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            // Check if tickets module is available
            if (!this.ticketsModule && subcommand !== 'help') {
                return interaction.reply({
                    content: '❌ The ticket system is currently unavailable.',
                    ephemeral: true
                });
            }
            
            // Handle subcommands
            switch (subcommand) {
                case 'close':
                    await this.closeTicket(interaction, this.ticketsModule);
                    break;
                case 'add':
                    await this.addUserToTicket(interaction, this.ticketsModule);
                    break;
                case 'remove':
                    await this.removeUserFromTicket(interaction, this.ticketsModule);
                    break;
                case 'rename':
                    await this.renameTicket(interaction, this.ticketsModule);
                    break;
                case 'transcript':
                    await this.generateTranscript(interaction, this.ticketsModule);
                    break;
                case 'priority':
                    await this.setPriority(interaction, this.ticketsModule);
                    break;
                case 'help':
                    await this.showHelp(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            this.handleError('execute', error);
            
            // Reply to the interaction if not already replied
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while executing this command.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Close a ticket
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Object} ticketsModule - The tickets module
     * @returns {Promise<void>}
     */
    async closeTicket(interaction, ticketsModule) {
        try {
            // Check if the channel is a ticket
            const isTicket = await ticketsModule.isTicketChannel(interaction.channel.id);
            
            if (!isTicket) {
                return interaction.reply({
                    content: '❌ This command can only be used in a ticket channel.',
                    ephemeral: true
                });
            }
            
            // Get reason if provided
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            // Defer reply as this might take some time
            await interaction.deferReply();
            
            // Close the ticket
            const result = await ticketsModule.closeTicket(interaction.channel.id, interaction.user.id, reason);
            
            if (result.success) {
                await interaction.editReply({
                    content: `✅ Ticket closed: ${reason}`
                });
            } else {
                await interaction.editReply({
                    content: `❌ Failed to close ticket: ${result.error}`
                });
            }
        } catch (error) {
            this.handleError('closeTicket', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while closing the ticket.'
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: 'An error occurred while closing the ticket.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Add a user to a ticket
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Object} ticketsModule - The tickets module
     * @returns {Promise<void>}
     */
    async addUserToTicket(interaction, ticketsModule) {
        try {
            // Check if the channel is a ticket
            const isTicket = await ticketsModule.isTicketChannel(interaction.channel.id);
            
            if (!isTicket) {
                return interaction.reply({
                    content: '❌ This command can only be used in a ticket channel.',
                    ephemeral: true
                });
            }
            
            // Get user to add
            const user = interaction.options.getUser('user');
            
            // Defer reply as this might take some time
            await interaction.deferReply();
            
            // Add user to ticket
            const result = await ticketsModule.addUserToTicket(interaction.channel.id, user.id, interaction.user.id);
            
            if (result.success) {
                await interaction.editReply({
                    content: `✅ Added ${user.toString()} to the ticket.`
                });
            } else {
                await interaction.editReply({
                    content: `❌ Failed to add user to ticket: ${result.error}`
                });
            }
        } catch (error) {
            this.handleError('addUserToTicket', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while adding the user to the ticket.'
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: 'An error occurred while adding the user to the ticket.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Remove a user from a ticket
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Object} ticketsModule - The tickets module
     * @returns {Promise<void>}
     */
    async removeUserFromTicket(interaction, ticketsModule) {
        try {
            // Check if the channel is a ticket
            const isTicket = await ticketsModule.isTicketChannel(interaction.channel.id);
            
            if (!isTicket) {
                return interaction.reply({
                    content: '❌ This command can only be used in a ticket channel.',
                    ephemeral: true
                });
            }
            
            // Get user to remove
            const user = interaction.options.getUser('user');
            
            // Defer reply as this might take some time
            await interaction.deferReply();
            
            // Remove user from ticket
            const result = await ticketsModule.removeUserFromTicket(interaction.channel.id, user.id, interaction.user.id);
            
            if (result.success) {
                await interaction.editReply({
                    content: `✅ Removed ${user.toString()} from the ticket.`
                });
            } else {
                await interaction.editReply({
                    content: `❌ Failed to remove user from ticket: ${result.error}`
                });
            }
        } catch (error) {
            this.handleError('removeUserFromTicket', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while removing the user from the ticket.'
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: 'An error occurred while removing the user from the ticket.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Rename a ticket
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Object} ticketsModule - The tickets module
     * @returns {Promise<void>}
     */
    async renameTicket(interaction, ticketsModule) {
        try {
            // Check if the channel is a ticket
            const isTicket = await ticketsModule.isTicketChannel(interaction.channel.id);
            
            if (!isTicket) {
                return interaction.reply({
                    content: '❌ This command can only be used in a ticket channel.',
                    ephemeral: true
                });
            }
            
            // Get new name
            const newName = interaction.options.getString('name');
            
            // Defer reply as this might take some time
            await interaction.deferReply();
            
            // Rename ticket
            const result = await ticketsModule.renameTicket(interaction.channel.id, newName, interaction.user.id);
            
            if (result.success) {
                await interaction.editReply({
                    content: `✅ Renamed ticket to \`${newName}\`.`
                });
            } else {
                await interaction.editReply({
                    content: `❌ Failed to rename ticket: ${result.error}`
                });
            }
        } catch (error) {
            this.handleError('renameTicket', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while renaming the ticket.'
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: 'An error occurred while renaming the ticket.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Generate a transcript of a ticket
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Object} ticketsModule - The tickets module
     * @returns {Promise<void>}
     */
    async generateTranscript(interaction, ticketsModule) {
        try {
            // Check if the channel is a ticket
            const isTicket = await ticketsModule.isTicketChannel(interaction.channel.id);
            
            if (!isTicket) {
                return interaction.reply({
                    content: '❌ This command can only be used in a ticket channel.',
                    ephemeral: true
                });
            }
            
            // Defer reply as this might take some time
            await interaction.deferReply();
            
            // Generate transcript
            const result = await ticketsModule.generateTranscript(interaction.channel.id, interaction.user.id);
            
            if (result.success) {
                await interaction.editReply({
                    content: '✅ Transcript generated.',
                    files: [result.file]
                });
            } else {
                await interaction.editReply({
                    content: `❌ Failed to generate transcript: ${result.error}`
                });
            }
        } catch (error) {
            this.handleError('generateTranscript', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while generating the transcript.'
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: 'An error occurred while generating the transcript.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Set the priority of a ticket
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Object} ticketsModule - The tickets module
     * @returns {Promise<void>}
     */
    async setPriority(interaction, ticketsModule) {
        try {
            // Check if the channel is a ticket
            const isTicket = await ticketsModule.isTicketChannel(interaction.channel.id);
            
            if (!isTicket) {
                return interaction.reply({
                    content: '❌ This command can only be used in a ticket channel.',
                    ephemeral: true
                });
            }
            
            // Get priority
            const priority = interaction.options.getString('level');
            
            // Defer reply as this might take some time
            await interaction.deferReply();
            
            // Set priority
            const result = await ticketsModule.setPriority(interaction.channel.id, priority, interaction.user.id);
            
            if (result.success) {
                await interaction.editReply({
                    content: `✅ Set ticket priority to \`${priority}\`.`
                });
            } else {
                await interaction.editReply({
                    content: `❌ Failed to set priority: ${result.error}`
                });
            }
        } catch (error) {
            this.handleError('setPriority', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while setting the priority.'
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: 'An error occurred while setting the priority.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Show help for the ticket command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async showHelp(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('Ticket Command Help')
                .setDescription('Here are all the available ticket commands:')
                .setColor(this.config.embedColor || '#00AAFF')
                .addFields(
                    { name: '/ticket close [reason]', value: 'Close the current ticket with an optional reason.' },
                    { name: '/ticket add <user>', value: 'Add a user to the current ticket.' },
                    { name: '/ticket remove <user>', value: 'Remove a user from the current ticket.' },
                    { name: '/ticket rename <name>', value: 'Rename the current ticket.' },
                    { name: '/ticket transcript', value: 'Generate a transcript of the current ticket.' },
                    { name: '/ticket priority <level>', value: 'Set the priority level of the current ticket.' },
                    { name: '/ticket help', value: 'Show this help message.' }
                )
                .setFooter({ text: 'JMF Hosting Discord Bot' })
                .setTimestamp();
            
            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            this.handleError('showHelp', error);
            
            await interaction.reply({
                content: 'An error occurred while showing the help message.',
                ephemeral: true
            }).catch(() => {});
        }
    }
}

module.exports = new TicketCommand(); 