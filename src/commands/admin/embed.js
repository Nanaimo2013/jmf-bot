/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('Title for custom embed (required for custom embeds)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Description for custom embed (required for custom embeds)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription('Color for custom embed (hex code, e.g. #00AAFF)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('image')
            .setDescription('Image URL for custom embed')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('thumbnail')
            .setDescription('Thumbnail URL for custom embed')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field1_name')
            .setDescription('Name for field 1')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field1_value')
            .setDescription('Value for field 1')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field2_name')
            .setDescription('Name for field 2')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field2_value')
            .setDescription('Value for field 2')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field3_name')
            .setDescription('Name for field 3')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('field3_value')
            .setDescription('Value for field 3')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('add_timestamp')
            .setDescription('Add timestamp to the embed')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('add_button')
            .setDescription('Add a button to the embed')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('button_label')
            .setDescription('Label for the button')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('button_url')
            .setDescription('URL for the button')
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
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'send') {
        const type = interaction.options.getString('type');
        const channel = interaction.options.getChannel('channel');
        
        // Check if the bot has permission to send messages in the channel
        if (!channel.permissionsFor(interaction.client.user).has('SendMessages')) {
          return interaction.editReply({
            content: `I don't have permission to send messages in ${channel}.`,
            ephemeral: true
          });
        }
        
        let embed;
        let components = [];
        
        // Create the appropriate embed
        switch (type) {
          case 'rules':
            embed = createRulesEmbed();
            break;
          case 'faq':
            embed = createFAQEmbed();
            break;
          case 'welcome':
            embed = createWelcomeEmbed();
            break;
          case 'roles':
            embed = createRolesEmbed();
            break;
          case 'announcement':
            embed = createAnnouncementEmbed('announcement');
            break;
          case 'update':
            embed = createAnnouncementEmbed('update');
            break;
          case 'maintenance':
            embed = createAnnouncementEmbed('maintenance');
            break;
          case 'game':
            embed = createAnnouncementEmbed('game');
            break;
          case 'server-setup':
            embed = createServerSetupEmbed();
            break;
          case 'node-status':
            embed = await createNodeStatusEmbed();
            break;
          case 'server-status':
            embed = createServerStatusEmbed();
            break;
          case 'verify':
            embed = createVerifyEmbed();
            
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
            break;
          case 'custom':
            // For custom embeds, get all the options
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            
            if (!title || !description) {
              return interaction.editReply({
                content: 'Custom embeds require at least a title and description.',
                ephemeral: true
              });
            }
            
            const color = interaction.options.getString('color') || config.embedColor || '#00AAFF';
            const image = interaction.options.getString('image');
            const thumbnail = interaction.options.getString('thumbnail');
            const addTimestamp = interaction.options.getBoolean('add_timestamp') || false;
            
            // Create custom embed
            embed = new EmbedBuilder()
              .setTitle(title)
              .setDescription(this.replaceChannelPlaceholders(description, interaction.guild))
              .setColor(color);
            
            if (image) embed.setImage(image);
            if (thumbnail) embed.setThumbnail(thumbnail);
            if (addTimestamp) embed.setTimestamp();
            
            // Add footer
            embed.setFooter({ 
              text: config.footerText || 'JMF Hosting | Game Server Solutions'
            });
            
            // Add fields if provided
            for (let i = 1; i <= 3; i++) {
              const fieldName = interaction.options.getString(`field${i}_name`);
              const fieldValue = interaction.options.getString(`field${i}_value`);
              
              if (fieldName && fieldValue) {
                embed.addFields({
                  name: fieldName,
                  value: this.replaceChannelPlaceholders(fieldValue, interaction.guild),
                  inline: false
                });
              }
            }
            
            // Add button if requested
            const addButton = interaction.options.getBoolean('add_button') || false;
            if (addButton) {
              const buttonLabel = interaction.options.getString('button_label');
              const buttonUrl = interaction.options.getString('button_url');
              
              if (buttonLabel && buttonUrl) {
                const row = new ActionRowBuilder()
                  .addComponents(
                    new ButtonBuilder()
                      .setLabel(buttonLabel)
                      .setURL(buttonUrl)
                      .setStyle(ButtonStyle.Link)
                  );
                
                components.push(row);
              }
            }
            break;
          default:
            return interaction.editReply({
              content: 'Invalid embed type.',
              ephemeral: true
            });
        }
        
        // Process any channel references in the embed
        if (type !== 'custom') {
          embed = this.processEmbed(embed, interaction.guild);
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
          switch (type) {
            case 'rules':
              embed = createRulesEmbed();
              break;
            case 'faq':
              embed = createFAQEmbed();
              break;
            case 'welcome':
              embed = createWelcomeEmbed();
              break;
            case 'roles':
              embed = createRolesEmbed();
              break;
            case 'announcement':
              embed = createAnnouncementEmbed('announcement');
              break;
            case 'server-setup':
              embed = createServerSetupEmbed();
              break;
            case 'node-status':
              embed = await createNodeStatusEmbed();
              break;
            case 'server-status':
              embed = createServerStatusEmbed();
              break;
            case 'verify':
              embed = createVerifyEmbed();
              
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
              break;
            default:
              return interaction.editReply({
                content: 'Invalid embed type.',
                ephemeral: true
              });
          }
          
          // Process any channel references in the embed
          embed = this.processEmbed(embed, interaction.guild);
          
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
      return interaction.editReply({
        content: 'An error occurred while executing this command.',
        ephemeral: true
      });
    }
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