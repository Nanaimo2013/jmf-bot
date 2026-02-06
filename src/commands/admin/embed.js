/**
 * JMF Hosting Discord Bot - Embed Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command allows administrators to manage server embeds.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createRulesEmbed } = require('../../embeds/rules-embed');
const { createFAQEmbed } = require('../../embeds/faq-embed');
const { createWelcomeEmbed } = require('../../embeds/welcome-embed');
const { createRolesEmbed } = require('../../embeds/roles-embed');
const { createAnnouncementEmbed } = require('../../embeds/announcement-embed');
const { createServerSetupEmbed } = require('../../embeds/server-setup-embed');
const { createNodeStatusEmbed } = require('../../embeds/node-status-embed');
const { createServerStatusEmbed } = require('../../embeds/server-status-embed');
const { createVerifyEmbed } = require('../../embeds/verify-embed');

// Store embed templates for quick access
const embedTemplates = {
  rules: { create: createRulesEmbed, name: 'Rules' },
  faq: { create: createFAQEmbed, name: 'FAQ' },
  welcome: { create: createWelcomeEmbed, name: 'Welcome' },
  roles: { create: createRolesEmbed, name: 'Roles' },
  announcement: { create: () => createAnnouncementEmbed('announcement'), name: 'Announcement' },
  update: { create: () => createAnnouncementEmbed('update'), name: 'Update' },
  maintenance: { create: () => createAnnouncementEmbed('maintenance'), name: 'Maintenance' },
  game: { create: () => createAnnouncementEmbed('game'), name: 'Game Info' },
  'server-setup': { create: createServerSetupEmbed, name: 'Server Setup' },
  'node-status': { create: createNodeStatusEmbed, name: 'Node Status' },
  'server-status': { create: createServerStatusEmbed, name: 'Server Status' },
  verify: { create: createVerifyEmbed, name: 'Verification' }
};

class EmbedCommand extends Command {
    /**
     * Create a new embed command
     */
    constructor() {
        super({
            name: 'embed',
            description: 'Manage server embeds',
            cooldown: 10,
            guildOnly: true,
            requiredPermissions: [PermissionFlagsBits.Administrator],
            options: [
                {
                    name: 'send',
                    description: 'Send an embed to a channel',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'type',
                            description: 'Type of embed to send',
                            type: 'STRING',
                            required: true,
                            choices: [
                                { name: 'Rules', value: 'rules' },
                                { name: 'FAQ', value: 'faq' },
                                { name: 'Welcome', value: 'welcome' },
                                { name: 'Roles', value: 'roles' },
                                { name: 'Announcement', value: 'announcement' },
                                { name: 'Update', value: 'update' },
                                { name: 'Maintenance', value: 'maintenance' },
                                { name: 'Game Info', value: 'game' },
                                { name: 'Server Setup', value: 'server-setup' },
                                { name: 'Node Status', value: 'node-status' },
                                { name: 'Server Status', value: 'server-status' },
                                { name: 'Verification', value: 'verify' },
                                { name: 'Custom', value: 'custom' }
                            ]
                        },
                        {
                            name: 'channel',
                            description: 'Channel to send the embed to',
                            type: 'CHANNEL',
                            required: true
                        },
                        {
                            name: 'customize',
                            description: 'Customize the embed before sending',
                            type: 'BOOLEAN',
                            required: false
                        }
                    ]
                },
                {
                    name: 'update',
                    description: 'Update an existing embed',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'type',
                            description: 'Type of embed to update',
                            type: 'STRING',
                            required: true,
                            choices: [
                                { name: 'Rules', value: 'rules' },
                                { name: 'FAQ', value: 'faq' },
                                { name: 'Welcome', value: 'welcome' },
                                { name: 'Roles', value: 'roles' },
                                { name: 'Announcement', value: 'announcement' },
                                { name: 'Server Setup', value: 'server-setup' },
                                { name: 'Node Status', value: 'node-status' },
                                { name: 'Server Status', value: 'server-status' },
                                { name: 'Verification', value: 'verify' }
                            ]
                        },
                        {
                            name: 'message_id',
                            description: 'ID of the message to update',
                            type: 'STRING',
                            required: true
                        },
                        {
                            name: 'channel',
                            description: 'Channel where the message is located',
                            type: 'CHANNEL',
                            required: true
                        },
                        {
                            name: 'customize',
                            description: 'Customize the embed before updating',
                            type: 'BOOLEAN',
                            required: false
                        }
                    ]
                },
                {
                    name: 'custom',
                    description: 'Create and send a fully custom embed',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'channel',
                            description: 'Channel to send the embed to',
                            type: 'CHANNEL',
                            required: true
                        }
                    ]
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
            
            // Handle custom embed creation with modal
            if (subcommand === 'custom') {
                return this.handleCustomEmbedModal(interaction);
            }
            
            // For other commands, defer the reply
            await interaction.deferReply({ ephemeral: true });
            
            if (subcommand === 'send') {
                const type = interaction.options.getString('type');
                const channel = interaction.options.getChannel('channel');
                const customize = interaction.options.getBoolean('customize') || false;
                
                // Check if the bot has permission to send messages in the channel
                if (!channel.permissionsFor(interaction.client.user).has('SendMessages')) {
                    return interaction.editReply({
                        content: `I don't have permission to send messages in ${channel}.`,
                        ephemeral: true
                    });
                }
                
                // If it's a custom embed and customize is true, show the modal
                if (type === 'custom') {
                    // We need to follow up with a new interaction since we already deferred
                    await interaction.editReply({
                        content: 'Please use `/embed custom` to create a custom embed.',
                        ephemeral: true
                    });
                    return;
                }
                
                // Get the embed template
                let embed;
                let components = [];
                
                // Create the appropriate embed
                if (type === 'node-status') {
                    embed = await createNodeStatusEmbed();
                } else if (embedTemplates[type]) {
                    embed = embedTemplates[type].create();
                } else {
                    return interaction.editReply({
                        content: 'Invalid embed type.',
                        ephemeral: true
                    });
                }
                
                // Add components for special embeds
                if (type === 'verify') {
                    // Add verification button
                    const verifyRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('verify')
                                .setLabel(this.config.verification?.buttonText || 'Verify')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('✅')
                        );
                    
                    components.push(verifyRow);
                }
                
                // Process any channel references in the embed
                embed = this.processEmbed(embed, interaction.guild);
                
                // If customize is true, store the embed data and show customization options
                if (customize) {
                    // Store the embed data in a temporary object
                    const embedData = {
                        type,
                        channel: channel.id,
                        embed: embed.toJSON(),
                        components
                    };
                    
                    // Store in the client's temporary storage
                    if (!interaction.client.embedStorage) {
                        interaction.client.embedStorage = new Map();
                    }
                    
                    const storageKey = `${interaction.user.id}-${Date.now()}`;
                    interaction.client.embedStorage.set(storageKey, embedData);
                    
                    // Create customization buttons
                    const customizeRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`edit_title_${storageKey}`)
                                .setLabel('Edit Title')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`edit_description_${storageKey}`)
                                .setLabel('Edit Description')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`edit_color_${storageKey}`)
                                .setLabel('Edit Color')
                                .setStyle(ButtonStyle.Primary)
                        );
                    
                    const fieldsRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`add_field_${storageKey}`)
                                .setLabel('Add Field')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`add_image_${storageKey}`)
                                .setLabel('Add Image')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`add_button_${storageKey}`)
                                .setLabel('Add Button')
                                .setStyle(ButtonStyle.Secondary)
                        );
                    
                    const actionRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`send_embed_${storageKey}`)
                                .setLabel('Send Embed')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`preview_embed_${storageKey}`)
                                .setLabel('Preview')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`cancel_embed_${storageKey}`)
                                .setLabel('Cancel')
                                .setStyle(ButtonStyle.Danger)
                        );
                    
                    // Show the customization options
                    await interaction.editReply({
                        content: `Customizing ${embedTemplates[type].name} embed for ${channel}. Use the buttons below to customize the embed.`,
                        components: [customizeRow, fieldsRow, actionRow]
                    });
                    
                    // Log the action
                    this.logger.info(`${interaction.user.tag} (${interaction.user.id}) is customizing a ${type} embed for channel ${channel.name} (${channel.id})`);
                    
                    return;
                }
                
                // Send the embed to the channel
                const sentMessage = await channel.send({
                    embeds: [embed],
                    components: components.length > 0 ? components : undefined
                });
                
                // Reply with success message
                await interaction.editReply({
                    content: `Successfully sent ${embedTemplates[type].name} embed to ${channel}.\nMessage ID: \`${sentMessage.id}\``,
                    ephemeral: true
                });
                
                // Log the action
                this.logger.info(`${interaction.user.tag} (${interaction.user.id}) sent a ${type} embed to channel ${channel.name} (${channel.id})`);
                
            } else if (subcommand === 'update') {
                const type = interaction.options.getString('type');
                const messageId = interaction.options.getString('message_id');
                const channel = interaction.options.getChannel('channel');
                const customize = interaction.options.getBoolean('customize') || false;
                
                // Check if the bot has permission to view and edit messages in the channel
                if (!channel.permissionsFor(interaction.client.user).has(['ViewChannel', 'ReadMessageHistory'])) {
                    return interaction.editReply({
                        content: `I don't have permission to view messages in ${channel}.`,
                        ephemeral: true
                    });
                }
                
                // Try to fetch the message
                let message;
                try {
                    message = await channel.messages.fetch(messageId);
                } catch (error) {
                    return interaction.editReply({
                        content: `Could not find a message with ID \`${messageId}\` in ${channel}.`,
                        ephemeral: true
                    });
                }
                
                // Check if the message is from the bot
                if (message.author.id !== interaction.client.user.id) {
                    return interaction.editReply({
                        content: `The message with ID \`${messageId}\` was not sent by me.`,
                        ephemeral: true
                    });
                }
                
                // Get the embed template
                let embed;
                let components = [];
                
                // Create the appropriate embed
                if (type === 'node-status') {
                    embed = await createNodeStatusEmbed();
                } else if (embedTemplates[type]) {
                    embed = embedTemplates[type].create();
                } else {
                    return interaction.editReply({
                        content: 'Invalid embed type.',
                        ephemeral: true
                    });
                }
                
                // Add components for special embeds
                if (type === 'verify') {
                    // Add verification button
                    const verifyRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('verify')
                                .setLabel(this.config.verification?.buttonText || 'Verify')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('✅')
                        );
                    
                    components.push(verifyRow);
                }
                
                // Process any channel references in the embed
                embed = this.processEmbed(embed, interaction.guild);
                
                // If customize is true, store the embed data and show customization options
                if (customize) {
                    // Store the embed data in a temporary object
                    const embedData = {
                        type,
                        channel: channel.id,
                        messageId,
                        embed: embed.toJSON(),
                        components,
                        isUpdate: true
                    };
                    
                    // Store in the client's temporary storage
                    if (!interaction.client.embedStorage) {
                        interaction.client.embedStorage = new Map();
                    }
                    
                    const storageKey = `${interaction.user.id}-${Date.now()}`;
                    interaction.client.embedStorage.set(storageKey, embedData);
                    
                    // Create customization buttons (same as in send)
                    const customizeRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`edit_title_${storageKey}`)
                                .setLabel('Edit Title')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`edit_description_${storageKey}`)
                                .setLabel('Edit Description')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`edit_color_${storageKey}`)
                                .setLabel('Edit Color')
                                .setStyle(ButtonStyle.Primary)
                        );
                    
                    const fieldsRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`add_field_${storageKey}`)
                                .setLabel('Add Field')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`add_image_${storageKey}`)
                                .setLabel('Add Image')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`add_button_${storageKey}`)
                                .setLabel('Add Button')
                                .setStyle(ButtonStyle.Secondary)
                        );
                    
                    const actionRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`update_embed_${storageKey}`)
                                .setLabel('Update Embed')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`preview_embed_${storageKey}`)
                                .setLabel('Preview')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`cancel_embed_${storageKey}`)
                                .setLabel('Cancel')
                                .setStyle(ButtonStyle.Danger)
                        );
                    
                    // Show the customization options
                    await interaction.editReply({
                        content: `Customizing ${embedTemplates[type].name} embed for message ID \`${messageId}\` in ${channel}. Use the buttons below to customize the embed.`,
                        components: [customizeRow, fieldsRow, actionRow]
                    });
                    
                    // Log the action
                    this.logger.info(`${interaction.user.tag} (${interaction.user.id}) is customizing a ${type} embed update for message ${messageId} in channel ${channel.name} (${channel.id})`);
                    
                    return;
                }
                
                // Update the message
                await message.edit({
                    embeds: [embed],
                    components: components.length > 0 ? components : undefined
                });
                
                // Reply with success message
                await interaction.editReply({
                    content: `Successfully updated ${embedTemplates[type].name} embed in ${channel}.`,
                    ephemeral: true
                });
                
                // Log the action
                this.logger.info(`${interaction.user.tag} (${interaction.user.id}) updated a ${type} embed in message ${messageId} in channel ${channel.name} (${channel.id})`);
            }
            
        } catch (error) {
            this.handleError('execute', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ content: `❌ An error occurred: ${error.message}` }).catch(() => {});
            } else if (!interaction.replied) {
                await interaction.reply({ content: `❌ An error occurred: ${error.message}`, ephemeral: true }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle the custom embed modal
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async handleCustomEmbedModal(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            
            // Check if the bot has permission to send messages in the channel
            if (!channel.permissionsFor(interaction.client.user).has('SendMessages')) {
                return interaction.reply({
                    content: `I don't have permission to send messages in ${channel}.`,
                    ephemeral: true
                });
            }
            
            // Create the modal
            const modal = new ModalBuilder()
                .setCustomId(`custom_embed_${interaction.user.id}_${channel.id}`)
                .setTitle('Create Custom Embed');
            
            // Add components to the modal
            const titleInput = new TextInputBuilder()
                .setCustomId('embed_title')
                .setLabel('Embed Title')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter the title for your embed')
                .setRequired(true)
                .setMaxLength(256);
            
            const descriptionInput = new TextInputBuilder()
                .setCustomId('embed_description')
                .setLabel('Embed Description')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter the description for your embed')
                .setRequired(true)
                .setMaxLength(4000);
            
            const colorInput = new TextInputBuilder()
                .setCustomId('embed_color')
                .setLabel('Embed Color (hex code)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('#0099ff')
                .setRequired(false)
                .setMaxLength(7);
            
            const imageInput = new TextInputBuilder()
                .setCustomId('embed_image')
                .setLabel('Image URL (optional)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https://example.com/image.png')
                .setRequired(false);
            
            const footerInput = new TextInputBuilder()
                .setCustomId('embed_footer')
                .setLabel('Footer Text (optional)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter footer text')
                .setRequired(false)
                .setMaxLength(2048);
            
            // Add inputs to the modal
            const titleRow = new ActionRowBuilder().addComponents(titleInput);
            const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
            const colorRow = new ActionRowBuilder().addComponents(colorInput);
            const imageRow = new ActionRowBuilder().addComponents(imageInput);
            const footerRow = new ActionRowBuilder().addComponents(footerInput);
            
            modal.addComponents(titleRow, descriptionRow, colorRow, imageRow, footerRow);
            
            // Show the modal
            await interaction.showModal(modal);
            
            // Log the action
            this.logger.info(`${interaction.user.tag} (${interaction.user.id}) opened the custom embed modal for channel ${channel.name} (${channel.id})`);
            
        } catch (error) {
            this.handleError('handleCustomEmbedModal', error);
            await interaction.reply({ content: `❌ An error occurred: ${error.message}`, ephemeral: true }).catch(() => {});
        }
    }
    
    /**
     * Process an embed to replace channel placeholders
     * @param {EmbedBuilder} embed - The embed to process
     * @param {Guild} guild - The guild
     * @returns {EmbedBuilder} The processed embed
     */
    processEmbed(embed, guild) {
        // Get the embed data
        const data = embed.data;
        
        // Process title
        if (data.title) {
            data.title = this.replaceChannelPlaceholders(data.title, guild);
        }
        
        // Process description
        if (data.description) {
            data.description = this.replaceChannelPlaceholders(data.description, guild);
        }
        
        // Process fields
        if (data.fields) {
            for (const field of data.fields) {
                if (field.name) {
                    field.name = this.replaceChannelPlaceholders(field.name, guild);
                }
                if (field.value) {
                    field.value = this.replaceChannelPlaceholders(field.value, guild);
                }
            }
        }
        
        // Return the processed embed
        return new EmbedBuilder(data);
    }
    
    /**
     * Replace channel placeholders in text
     * @param {string} text - The text to process
     * @param {Guild} guild - The guild
     * @returns {string} The processed text
     */
    replaceChannelPlaceholders(text, guild) {
        // Replace channel mentions like {#channel-name}
        return text.replace(/{#([a-z0-9-]+)}/g, (match, channelName) => {
            const channel = guild.channels.cache.find(c => c.name === channelName);
            return channel ? `<#${channel.id}>` : match;
        });
    }
}

module.exports = EmbedCommand; 