/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createRulesEmbed } = require('../../embeds/rules-embed');
const { createFAQEmbed } = require('../../embeds/faq-embed');
const { createWelcomeEmbed } = require('../../embeds/welcome-embed');
const { createRolesEmbed } = require('../../embeds/roles-embed');
const { createAnnouncementEmbed } = require('../../embeds/announcement-embed');
const { createServerSetupEmbed } = require('../../embeds/server-setup-embed');
const { createNodeStatusEmbed } = require('../../embeds/node-status-embed');
const { createServerStatusEmbed } = require('../../embeds/server-status-embed');
const { createVerifyEmbed } = require('../../embeds/verify-embed');
const config = require('../../../config.json');
const logger = require('../../utils/logger');

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Manage server embeds')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('send')
        .setDescription('Send an embed to a channel')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of embed to send')
            .setRequired(true)
            .addChoices(
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
            )
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to send the embed to')
            .setRequired(true)
        )
        .addBooleanOption(option =>
          option
            .setName('customize')
            .setDescription('Customize the embed before sending')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update an existing embed')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of embed to update')
            .setRequired(true)
            .addChoices(
              { name: 'Rules', value: 'rules' },
              { name: 'FAQ', value: 'faq' },
              { name: 'Welcome', value: 'welcome' },
              { name: 'Roles', value: 'roles' },
              { name: 'Announcement', value: 'announcement' },
              { name: 'Server Setup', value: 'server-setup' },
              { name: 'Node Status', value: 'node-status' },
              { name: 'Server Status', value: 'server-status' },
              { name: 'Verification', value: 'verify' }
            )
        )
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('ID of the message to update')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel where the message is located')
            .setRequired(true)
        )
        .addBooleanOption(option =>
          option
            .setName('customize')
            .setDescription('Customize the embed before updating')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('custom')
        .setDescription('Create and send a fully custom embed')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to send the embed to')
            .setRequired(true)
        )
    ),

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
                .setLabel(config.verification?.buttonText || 'Verify')
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
          
          return interaction.editReply({
            content: `Customize your ${embedTemplates[type]?.name || type} embed before sending:`,
            embeds: [embed],
            components: [customizeRow, fieldsRow, actionRow],
            ephemeral: true
          });
        }
        
        // Send the embed
        const messageOptions = { embeds: [embed] };
        if (components.length > 0) {
          messageOptions.components = components;
        }
        
        const sentMessage = await channel.send(messageOptions);
        
        return interaction.editReply({
          content: `Embed sent to ${channel}. Message ID: \`${sentMessage.id}\` (save this ID if you want to update the embed later)`,
          ephemeral: true
        });
      }
      
      else if (subcommand === 'update') {
        const type = interaction.options.getString('type');
        const messageId = interaction.options.getString('message_id');
        const channel = interaction.options.getChannel('channel');
        const customize = interaction.options.getBoolean('customize') || false;
        
        // Check if the bot has permission to view and send messages in the channel
        if (!channel.permissionsFor(interaction.client.user).has(['ViewChannel', 'SendMessages'])) {
          return interaction.editReply({
            content: `I don't have permission to view or send messages in ${channel}.`,
            ephemeral: true
          });
        }
        
        try {
          // Fetch the message
          const message = await channel.messages.fetch(messageId);
          
          if (!message) {
            return interaction.editReply({
              content: `Message with ID \`${messageId}\` not found in ${channel}.`,
              ephemeral: true
            });
          }
          
          // Check if the message is from the bot
          if (message.author.id !== interaction.client.user.id) {
            return interaction.editReply({
              content: `Message with ID \`${messageId}\` was not sent by me and cannot be updated.`,
              ephemeral: true
            });
          }
          
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
                  .setLabel(config.verification?.buttonText || 'Verify')
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
            
            return interaction.editReply({
              content: `Customize your ${embedTemplates[type]?.name || type} embed before updating:`,
              embeds: [embed],
              components: [customizeRow, fieldsRow, actionRow],
              ephemeral: true
            });
          }
          
          // Update the message
          const messageOptions = { embeds: [embed] };
          if (components.length > 0) {
            messageOptions.components = components;
          }
          
          await message.edit(messageOptions);
          
          return interaction.editReply({
            content: `Embed in ${channel} has been updated.`,
            ephemeral: true
          });
        } catch (error) {
          logger.error(`Error updating embed: ${error.message}`);
          return interaction.editReply({
            content: `Error updating embed: ${error.message}`,
            ephemeral: true
          });
        }
      }
    } catch (error) {
      logger.error(`Error in embed command: ${error.message}`);
      if (interaction.deferred) {
        return interaction.editReply({
          content: 'An error occurred while executing this command.',
          ephemeral: true
        });
      } else {
        return interaction.reply({
          content: 'An error occurred while executing this command.',
          ephemeral: true
        });
      }
    }
  },
  
  /**
   * Handle custom embed creation with modal
   * @param {Interaction} interaction - The interaction
   */
  async handleCustomEmbedModal(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    // Check if the bot has permission to send messages in the channel
    if (!channel.permissionsFor(interaction.client.user).has('SendMessages')) {
      return interaction.reply({
        content: `I don't have permission to send messages in ${channel}.`,
        ephemeral: true
      });
    }
    
    // Create a modal for the custom embed
    const modal = new ModalBuilder()
      .setCustomId(`custom_embed_${channel.id}`)
      .setTitle('Create Custom Embed');
    
    // Add inputs for title and description
    const titleInput = new TextInputBuilder()
      .setCustomId('embed_title')
      .setLabel('Embed Title')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter a title for your embed')
      .setRequired(true)
      .setMaxLength(256);
    
    const descriptionInput = new TextInputBuilder()
      .setCustomId('embed_description')
      .setLabel('Embed Description')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter a description for your embed')
      .setRequired(true)
      .setMaxLength(4000);
    
    const colorInput = new TextInputBuilder()
      .setCustomId('embed_color')
      .setLabel('Embed Color (hex code)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('#00AAFF')
      .setRequired(false)
      .setMaxLength(7);
    
    const imageInput = new TextInputBuilder()
      .setCustomId('embed_image')
      .setLabel('Image URL (optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://example.com/image.png')
      .setRequired(false);
    
    const fieldInput = new TextInputBuilder()
      .setCustomId('embed_field')
      .setLabel('Field (format: name|value)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Field Name|Field Value\nAnother Field|Another Value')
      .setRequired(false);
    
    // Add inputs to action rows
    const titleActionRow = new ActionRowBuilder().addComponents(titleInput);
    const descriptionActionRow = new ActionRowBuilder().addComponents(descriptionInput);
    const colorActionRow = new ActionRowBuilder().addComponents(colorInput);
    const imageActionRow = new ActionRowBuilder().addComponents(imageInput);
    const fieldActionRow = new ActionRowBuilder().addComponents(fieldInput);
    
    // Add action rows to the modal
    modal.addComponents(titleActionRow, descriptionActionRow, colorActionRow, imageActionRow, fieldActionRow);
    
    // Show the modal
    await interaction.showModal(modal);
  },
  
  /**
   * Process an embed to replace channel placeholders
   * @param {EmbedBuilder} embed - The embed to process
   * @param {Guild} guild - The guild
   * @returns {EmbedBuilder} The processed embed
   */
  processEmbed(embed, guild) {
    // Get the embed data
    const data = embed.data;
    
    // Process description
    if (data.description) {
      data.description = this.replaceChannelPlaceholders(data.description, guild);
    }
    
    // Process fields
    if (data.fields) {
      for (let i = 0; i < data.fields.length; i++) {
        if (data.fields[i].value) {
          data.fields[i].value = this.replaceChannelPlaceholders(data.fields[i].value, guild);
        }
      }
    }
    
    // Return the processed embed
    return EmbedBuilder.from(data);
  },
  
  /**
   * Replace channel placeholders in a string
   * @param {string} text - The text to process
   * @param {Guild} guild - The guild
   * @returns {string} The processed text
   */
  replaceChannelPlaceholders(text, guild) {
    // Replace channel name placeholders with channel mentions
    const channelRegex = /<#([A-Za-z0-9_-]+)>/g;
    
    return text.replace(channelRegex, (match, channelName) => {
      // Check if it's already a channel ID (starts with a number)
      if (/^\d+$/.test(channelName)) {
        return `<#${channelName}>`;
      }
      
      // Try to find the channel by name in config
      const configChannelId = config.channels?.[channelName];
      if (configChannelId) {
        // If it's a channel ID
        if (/^\d+$/.test(configChannelId)) {
          return `<#${configChannelId}>`;
        }
        
        // If it's a channel name
        const channel = guild.channels.cache.find(ch => ch.name === configChannelId);
        if (channel) {
          return `<#${channel.id}>`;
        }
      }
      
      // Try to find the channel directly by name
      const channel = guild.channels.cache.find(ch => ch.name === channelName);
      if (channel) {
        return `<#${channel.id}>`;
      }
      
      // Return the original placeholder if no channel found
      return match;
    });
  }
}; 