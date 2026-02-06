/**
 * JMF Hosting Discord Bot - Setup Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command handles setting up various bot features.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { Command } = require('./base.command');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

class SetupCommand extends Command {
    /**
     * Create a new setup command
     */
    constructor() {
        super({
            name: 'setup',
            description: 'Set up various bot features',
            cooldown: 10,
            adminOnly: true,
            requiredPermissions: [PermissionFlagsBits.Administrator],
            guildOnly: true
        });
        
        // Add subcommands to the slash command data
        this.data
            .addSubcommand(subcommand =>
                subcommand
                    .setName('verification')
                    .setDescription('Set up verification system')
                    .addChannelOption(option =>
                        option
                            .setName('channel')
                            .setDescription('Channel to set up verification in')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('tickets')
                    .setDescription('Set up ticket system')
                    .addChannelOption(option =>
                        option
                            .setName('channel')
                            .setDescription('Channel to set up tickets in')
                            .setRequired(true)
                    )
            );
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const channel = interaction.options.getChannel('channel');
            
            // Check if the bot has permission to send messages in the channel
            const permissions = channel.permissionsFor(interaction.client.user);
            if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
                return interaction.reply({
                    content: `❌ I don't have permission to send messages in ${channel}. Please check my permissions and try again.`,
                    ephemeral: true
                });
            }
            
            // Handle subcommands
            switch (subcommand) {
                case 'verification':
                    await this.setupVerification(interaction, channel);
                    break;
                case 'tickets':
                    await this.setupTickets(interaction, channel);
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
     * Set up verification system
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Channel} channel - The channel to set up verification in
     * @returns {Promise<void>}
     */
    async setupVerification(interaction, channel) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Get verification module
            const verificationModule = global.managers?.bot?.moduleRegistry?.getModule('verification');
            
            if (!verificationModule) {
                return interaction.editReply({
                    content: '❌ Verification module is not available.',
                    ephemeral: true
                });
            }
            
            // Create verification message
            await verificationModule.createVerificationMessage(channel);
            
            // Log the action
            this.logger.info(this.name, `Verification system set up in channel ${channel.name} (${channel.id}) by ${interaction.user.tag} (${interaction.user.id})`);
            
            return interaction.editReply({
                content: `✅ Verification system has been set up in ${channel}. Users can now verify themselves by clicking the button.`,
                ephemeral: true
            });
        } catch (error) {
            this.handleError('setupVerification', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred while setting up verification: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: `❌ An error occurred while setting up verification: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Set up ticket system
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Channel} channel - The channel to set up tickets in
     * @returns {Promise<void>}
     */
    async setupTickets(interaction, channel) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Get tickets module
            const ticketsModule = global.managers?.bot?.moduleRegistry?.getModule('tickets');
            
            if (!ticketsModule) {
                return interaction.editReply({
                    content: '❌ Tickets module is not available.',
                    ephemeral: true
                });
            }
            
            // Create ticket panel
            await ticketsModule.createTicketPanel(channel);
            
            // Log the action
            this.logger.info(this.name, `Ticket system set up in channel ${channel.name} (${channel.id}) by ${interaction.user.tag} (${interaction.user.id})`);
            
            return interaction.editReply({
                content: `✅ Ticket system has been set up in ${channel}. Users can now create tickets by clicking the button.`,
                ephemeral: true
            });
        } catch (error) {
            this.handleError('setupTickets', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred while setting up tickets: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: `❌ An error occurred while setting up tickets: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
}

module.exports = new SetupCommand(); 