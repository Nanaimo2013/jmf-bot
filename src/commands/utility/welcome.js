/**
 * JMF Hosting Discord Bot - Welcome Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command manages welcome messages and settings for new members.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const configManager = require('../../utils/configManager');

class WelcomeCommand extends Command {
    /**
     * Create a new welcome command
     */
    constructor() {
        super({
            name: 'welcome',
            description: 'Manage welcome messages and settings',
            cooldown: 5,
            guildOnly: true,
            requiredPermissions: [PermissionFlagsBits.ManageGuild],
            subcommands: [
                {
                    name: 'test',
                    description: 'Test the welcome message',
                    options: [
                        {
                            name: 'user',
                            description: 'The user to test the welcome message for (defaults to you)',
                            type: 'USER',
                            required: false
                        }
                    ]
                },
                {
                    name: 'channel',
                    description: 'Set the welcome channel',
                    options: [
                        {
                            name: 'channel',
                            description: 'The channel to send welcome messages to',
                            type: 'CHANNEL',
                            channelTypes: [ChannelType.GuildText],
                            required: true
                        }
                    ]
                },
                {
                    name: 'toggle',
                    description: 'Toggle welcome messages on or off',
                    options: [
                        {
                            name: 'enabled',
                            description: 'Whether welcome messages are enabled',
                            type: 'BOOLEAN',
                            required: true
                        }
                    ]
                },
                {
                    name: 'message',
                    description: 'Set the welcome message',
                    options: [
                        {
                            name: 'message',
                            description: 'The welcome message to send',
                            type: 'STRING',
                            required: true
                        }
                    ]
                },
                {
                    name: 'setup',
                    description: 'Interactive setup for welcome messages'
                }
            ]
        });
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'test':
                    await this.handleWelcomeTest(interaction);
                    break;
                case 'channel':
                    await this.handleSetChannel(interaction);
                    break;
                case 'toggle':
                    await this.handleToggle(interaction);
                    break;
                case 'message':
                    await this.handleSetMessage(interaction);
                    break;
                case 'setup':
                    await this.handleSetup(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Invalid subcommand. Please use one of the available subcommands.',
                        ephemeral: true
                    });
            }
            
            // Log command usage
            this.logger.debug(this.name, `Welcome command (${subcommand}) executed by ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild.name} (${interaction.guild.id})`);
            
        } catch (error) {
            this.handleError('execute', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ An error occurred: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle the welcome test subcommand
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async handleWelcomeTest(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Get the guild configuration
            const guildConfig = await configManager.getGuildConfig(interaction.guild.id);
            
            if (!guildConfig.welcome || !guildConfig.welcome.enabled) {
                return interaction.editReply({
                    content: '❌ Welcome messages are not enabled for this server. Use `/welcome toggle enabled:true` to enable them.'
                });
            }
            
            if (!guildConfig.welcome.channelId) {
                return interaction.editReply({
                    content: '❌ No welcome channel has been set. Use `/welcome channel` to set one.'
                });
            }
            
            // Get the user to test with
            const user = interaction.options.getUser('user') || interaction.user;
            const member = await interaction.guild.members.fetch(user.id);
            
            // Create the welcome message
            const welcomeMessage = guildConfig.welcome.message || 'Welcome to the server, {user}!';
            const { embed, components } = this.createWelcomeEmbed(member, welcomeMessage);
            
            // Send the test message
            await interaction.editReply({
                content: `✅ Here's a preview of the welcome message for ${user.tag}:`,
                embeds: [embed],
                components: components
            });
            
        } catch (error) {
            this.handleError('handleWelcomeTest', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred while testing the welcome message: ${error.message}`
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle the set channel subcommand
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async handleSetChannel(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const channel = interaction.options.getChannel('channel');
            
            // Ensure the channel is a text channel
            if (channel.type !== ChannelType.GuildText) {
                return interaction.editReply({
                    content: '❌ The welcome channel must be a text channel.'
                });
            }
            
            // Update the guild configuration
            const guildConfig = await configManager.getGuildConfig(interaction.guild.id);
            
            if (!guildConfig.welcome) {
                guildConfig.welcome = {
                    enabled: true,
                    channelId: channel.id,
                    message: 'Welcome to the server, {user}!'
                };
            } else {
                guildConfig.welcome.channelId = channel.id;
                
                // Enable welcome messages if they were disabled
                if (!guildConfig.welcome.enabled) {
                    guildConfig.welcome.enabled = true;
                }
            }
            
            // Save the configuration
            await configManager.saveGuildConfig(interaction.guild.id, guildConfig);
            
            await interaction.editReply({
                content: `✅ Welcome channel set to ${channel}. Welcome messages are now enabled.`
            });
            
        } catch (error) {
            this.handleError('handleSetChannel', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred while setting the welcome channel: ${error.message}`
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle the toggle subcommand
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async handleToggle(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const enabled = interaction.options.getBoolean('enabled');
            
            // Update the guild configuration
            const guildConfig = await configManager.getGuildConfig(interaction.guild.id);
            
            if (!guildConfig.welcome) {
                guildConfig.welcome = {
                    enabled: enabled,
                    message: 'Welcome to the server, {user}!'
                };
            } else {
                guildConfig.welcome.enabled = enabled;
            }
            
            // Save the configuration
            await configManager.saveGuildConfig(interaction.guild.id, guildConfig);
            
            await interaction.editReply({
                content: `✅ Welcome messages are now ${enabled ? 'enabled' : 'disabled'}.`
            });
            
        } catch (error) {
            this.handleError('handleToggle', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred while toggling welcome messages: ${error.message}`
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle the set message subcommand
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async handleSetMessage(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const message = interaction.options.getString('message');
            
            // Update the guild configuration
            const guildConfig = await configManager.getGuildConfig(interaction.guild.id);
            
            if (!guildConfig.welcome) {
                guildConfig.welcome = {
                    enabled: true,
                    message: message
                };
            } else {
                guildConfig.welcome.message = message;
            }
            
            // Save the configuration
            await configManager.saveGuildConfig(interaction.guild.id, guildConfig);
            
            // Preview the message
            const member = interaction.member;
            const { embed, components } = this.createWelcomeEmbed(member, message);
            
            await interaction.editReply({
                content: `✅ Welcome message updated. Here's a preview:`,
                embeds: [embed],
                components: components
            });
            
        } catch (error) {
            this.handleError('handleSetMessage', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred while setting the welcome message: ${error.message}`
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle the setup subcommand
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async handleSetup(interaction) {
        try {
            // Create the setup embed
            const setupEmbed = new EmbedBuilder()
                .setColor(this.config.embedColor || '#0099ff')
                .setTitle('Welcome Message Setup')
                .setDescription('Configure welcome messages for your server. Use the options below to set up welcome messages.')
                .addFields(
                    { name: 'Current Status', value: 'Loading...' }
                )
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
                .setTimestamp();
            
            // Create the setup components
            const setupRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('welcome_toggle')
                        .setLabel('Toggle On/Off')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('welcome_channel')
                        .setLabel('Set Channel')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('welcome_message')
                        .setLabel('Set Message')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('welcome_test')
                        .setLabel('Test')
                        .setStyle(ButtonStyle.Success)
                );
            
            // Send the initial reply
            const reply = await interaction.reply({
                embeds: [setupEmbed],
                components: [setupRow],
                ephemeral: true,
                fetchReply: true
            });
            
            // Update the embed with current settings
            await this.updateSetupEmbed(interaction, reply);
            
            // Create a collector for the buttons
            const filter = i => i.user.id === interaction.user.id && i.message.id === reply.id;
            const collector = reply.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes
            
            collector.on('collect', async i => {
                try {
                    switch (i.customId) {
                        case 'welcome_toggle':
                            await this.handleSetupToggle(i);
                            break;
                        case 'welcome_channel':
                            await this.handleSetupChannel(i);
                            break;
                        case 'welcome_message':
                            await this.handleSetupMessage(i);
                            break;
                        case 'welcome_test':
                            await this.handleSetupTest(i);
                            break;
                    }
                    
                    // Update the embed
                    await this.updateSetupEmbed(interaction, reply);
                    
                } catch (error) {
                    this.handleError('setupCollector', error);
                    await i.reply({
                        content: `❌ An error occurred: ${error.message}`,
                        ephemeral: true
                    }).catch(() => {});
                }
            });
            
            collector.on('end', () => {
                // Remove the buttons when the collector ends
                const endedEmbed = EmbedBuilder.from(reply.embeds[0])
                    .setDescription('Setup session ended. Use `/welcome setup` to start a new setup session.');
                
                interaction.editReply({
                    embeds: [endedEmbed],
                    components: []
                }).catch(() => {});
            });
            
        } catch (error) {
            this.handleError('handleSetup', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ An error occurred: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Update the setup embed with current settings
     * @param {CommandInteraction} interaction - The original interaction
     * @param {Message} message - The message to update
     * @returns {Promise<void>}
     */
    async updateSetupEmbed(interaction, message) {
        try {
            // Get the guild configuration
            const guildConfig = await configManager.getGuildConfig(interaction.guild.id);
            const welcome = guildConfig.welcome || { enabled: false };
            
            // Create status field value
            let statusValue = `**Enabled:** ${welcome.enabled ? '✅' : '❌'}\n`;
            
            if (welcome.channelId) {
                const channelMention = this.getChannelMention(interaction.guild, welcome.channelId);
                statusValue += `**Channel:** ${channelMention}\n`;
            } else {
                statusValue += `**Channel:** Not set\n`;
            }
            
            statusValue += `**Message:** ${welcome.message || 'Default welcome message'}\n`;
            
            // Update the embed
            const updatedEmbed = EmbedBuilder.from(message.embeds[0])
                .spliceFields(0, 1, { name: 'Current Status', value: statusValue });
            
            await interaction.editReply({
                embeds: [updatedEmbed]
            });
            
        } catch (error) {
            this.handleError('updateSetupEmbed', error);
        }
    }
    
    /**
     * Handle the toggle button in setup
     * @param {ButtonInteraction} interaction - The button interaction
     * @returns {Promise<void>}
     */
    async handleSetupToggle(interaction) {
        try {
            await interaction.deferUpdate();
            
            // Get the guild configuration
            const guildConfig = await configManager.getGuildConfig(interaction.guild.id);
            
            if (!guildConfig.welcome) {
                guildConfig.welcome = {
                    enabled: true,
                    message: 'Welcome to the server, {user}!'
                };
            } else {
                guildConfig.welcome.enabled = !guildConfig.welcome.enabled;
            }
            
            // Save the configuration
            await configManager.saveGuildConfig(interaction.guild.id, guildConfig);
            
        } catch (error) {
            this.handleError('handleSetupToggle', error);
        }
    }
    
    /**
     * Handle the channel button in setup
     * @param {ButtonInteraction} interaction - The button interaction
     * @returns {Promise<void>}
     */
    async handleSetupChannel(interaction) {
        try {
            // Create a select menu for channels
            const textChannels = interaction.guild.channels.cache
                .filter(channel => channel.type === ChannelType.GuildText)
                .map(channel => ({
                    label: channel.name,
                    value: channel.id,
                    description: `#${channel.name}`
                }));
            
            if (textChannels.length === 0) {
                return interaction.reply({
                    content: '❌ No text channels found in this server.',
                    ephemeral: true
                });
            }
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('welcome_channel_select')
                .setPlaceholder('Select a channel')
                .addOptions(textChannels.slice(0, 25)); // Discord limits to 25 options
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            const response = await interaction.reply({
                content: 'Select a channel to send welcome messages to:',
                components: [row],
                ephemeral: true
            });
            
            // Create a collector for the select menu
            const filter = i => i.customId === 'welcome_channel_select' && i.user.id === interaction.user.id;
            const collector = response.createMessageComponentCollector({ filter, time: 60000, max: 1 });
            
            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    
                    const channelId = i.values[0];
                    
                    // Update the guild configuration
                    const guildConfig = await configManager.getGuildConfig(interaction.guild.id);
                    
                    if (!guildConfig.welcome) {
                        guildConfig.welcome = {
                            enabled: true,
                            channelId: channelId,
                            message: 'Welcome to the server, {user}!'
                        };
                    } else {
                        guildConfig.welcome.channelId = channelId;
                        
                        // Enable welcome messages if they were disabled
                        if (!guildConfig.welcome.enabled) {
                            guildConfig.welcome.enabled = true;
                        }
                    }
                    
                    // Save the configuration
                    await configManager.saveGuildConfig(interaction.guild.id, guildConfig);
                    
                    await i.editReply({
                        content: `✅ Welcome channel set to <#${channelId}>. Welcome messages are now enabled.`,
                        components: []
                    });
                    
                } catch (error) {
                    this.handleError('channelSelect', error);
                }
            });
            
        } catch (error) {
            this.handleError('handleSetupChannel', error);
            await interaction.reply({
                content: `❌ An error occurred: ${error.message}`,
                ephemeral: true
            }).catch(() => {});
        }
    }
    
    /**
     * Handle the message button in setup
     * @param {ButtonInteraction} interaction - The button interaction
     * @returns {Promise<void>}
     */
    async handleSetupMessage(interaction) {
        try {
            // Get the current message
            const guildConfig = await configManager.getGuildConfig(interaction.guild.id);
            const currentMessage = guildConfig.welcome?.message || 'Welcome to the server, {user}!';
            
            // Create a modal for the message
            const modal = new ModalBuilder()
                .setCustomId('welcome_message_modal')
                .setTitle('Set Welcome Message');
            
            const messageInput = new TextInputBuilder()
                .setCustomId('welcome_message_input')
                .setLabel('Welcome Message')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(currentMessage)
                .setPlaceholder('Enter your welcome message. Use {user} for the user mention, {server} for the server name.')
                .setRequired(true)
                .setMaxLength(2000);
            
            const row = new ActionRowBuilder().addComponents(messageInput);
            modal.addComponents(row);
            
            await interaction.showModal(modal);
            
            // Wait for the modal submission
            const filter = i => i.customId === 'welcome_message_modal' && i.user.id === interaction.user.id;
            const submission = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(() => null);
            
            if (!submission) return;
            
            await submission.deferUpdate();
            
            const message = submission.fields.getTextInputValue('welcome_message_input');
            
            // Update the guild configuration
            if (!guildConfig.welcome) {
                guildConfig.welcome = {
                    enabled: true,
                    message: message
                };
            } else {
                guildConfig.welcome.message = message;
            }
            
            // Save the configuration
            await configManager.saveGuildConfig(interaction.guild.id, guildConfig);
            
        } catch (error) {
            this.handleError('handleSetupMessage', error);
        }
    }
    
    /**
     * Handle the test button in setup
     * @param {ButtonInteraction} interaction - The button interaction
     * @returns {Promise<void>}
     */
    async handleSetupTest(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Get the guild configuration
            const guildConfig = await configManager.getGuildConfig(interaction.guild.id);
            
            if (!guildConfig.welcome || !guildConfig.welcome.enabled) {
                return interaction.editReply({
                    content: '❌ Welcome messages are not enabled for this server. Enable them first.'
                });
            }
            
            // Create the welcome message
            const welcomeMessage = guildConfig.welcome.message || 'Welcome to the server, {user}!';
            const { embed, components } = this.createWelcomeEmbed(interaction.member, welcomeMessage);
            
            // Send the test message
            await interaction.editReply({
                content: `✅ Here's a preview of the welcome message:`,
                embeds: [embed],
                components: components
            });
            
        } catch (error) {
            this.handleError('handleSetupTest', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred: ${error.message}`
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Create a welcome embed for a member
     * @param {GuildMember} member - The member to create the embed for
     * @param {string} welcomeMessage - The welcome message template
     * @returns {Object} - The embed and components
     */
    createWelcomeEmbed(member, welcomeMessage) {
        // Replace placeholders in the message
        const message = welcomeMessage
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{server}/g, member.guild.name)
            .replace(/{username}/g, member.user.username)
            .replace(/{tag}/g, member.user.tag)
            .replace(/{count}/g, member.guild.memberCount);
        
        // Create the embed
        const embed = new EmbedBuilder()
            .setColor(this.config.embedColor || '#0099ff')
            .setTitle(`Welcome to ${member.guild.name}!`)
            .setDescription(message)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
            .setTimestamp();
        
        // Add server icon if available
        if (member.guild.iconURL()) {
            embed.setAuthor({
                name: member.guild.name,
                iconURL: member.guild.iconURL({ dynamic: true })
            });
        }
        
        // Create buttons
        const components = this.createWelcomeButtons();
        
        return { embed, components };
    }
    
    /**
     * Create welcome buttons
     * @returns {Array} - Array of action rows with buttons
     */
    createWelcomeButtons() {
        // Create buttons for common actions
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Rules')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('welcome_rules'),
                new ButtonBuilder()
                    .setLabel('Roles')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('welcome_roles'),
                new ButtonBuilder()
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Success)
                    .setCustomId('welcome_support'),
                new ButtonBuilder()
                    .setLabel('Website')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://jmfhosting.com')
            );
        
        return [row];
    }
    
    /**
     * Get a channel mention from a channel ID
     * @param {Guild} guild - The guild
     * @param {string} channelId - The channel ID
     * @returns {string} - The channel mention or "Unknown Channel"
     */
    getChannelMention(guild, channelId) {
        const channel = guild.channels.cache.get(channelId);
        return channel ? `<#${channelId}>` : 'Unknown Channel';
    }
}

module.exports = WelcomeCommand; 