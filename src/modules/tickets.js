/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  Collection,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const config = require('../../config.json');
const logger = require('../utils/logger');
const db = require('../utils/database');

/**
 * Ticket system module for handling support tickets
 */
module.exports = {
  name: 'tickets',
  
  // Cache to store active tickets per user
  activeTickets: new Collection(),
  
  /**
   * Initialize the ticket system module
   * @param {Client} client - The Discord.js client
   */
  init(client) {
    logger.info('Ticket system module initialized');
    this.client = client;
    
    // Handle button interactions for tickets
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      
      // Record button usage in database
      try {
        await db.query(
          'INSERT INTO button_usage (user_id, guild_id, custom_id, button_id, channel_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
          [interaction.user.id, interaction.guild?.id, interaction.customId, interaction.customId, interaction.channelId, new Date()]
        );
      } catch (error) {
        logger.error(`Failed to record button usage in database: ${error.message}`);
      }
      
      const handlers = {
        'create_ticket': this.handleTicketButton,
        'close_ticket': this.closeTicket,
        'delete_ticket': this.deleteTicket,
        'reopen_ticket': this.reopenTicket,
        'claim_ticket': this.claimTicket
      };

      const handler = handlers[interaction.customId];
      if (handler) {
        try {
          await handler.call(this, interaction);
        } catch (error) {
          logger.error(`Error handling ticket interaction: ${error.message}`);
          await this.handleError(interaction, error);
        }
      }
    });
    
    // Handle select menu interactions for ticket categories
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isStringSelectMenu()) return;
      
      // Record select menu usage in database
      try {
        await db.query(
          'INSERT INTO select_menu_usage (user_id, guild_id, custom_id, values, channel_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
          [interaction.user.id, interaction.guild?.id, interaction.customId, JSON.stringify(interaction.values), interaction.channelId, new Date()]
        );
      } catch (error) {
        logger.error(`Failed to record select menu usage in database: ${error.message}`);
      }
      
      if (interaction.customId === 'ticket_category') {
        try {
          await this.handleTicketCategorySelect(interaction);
        } catch (error) {
          logger.error(`Error handling ticket category selection: ${error.message}`);
          await this.handleError(interaction, error);
        }
      }
    });
    
    // Handle modal submissions for tickets
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isModalSubmit()) return;
      
      // Record modal submission in database
      try {
        await db.query(
          'INSERT INTO modal_submissions (user_id, guild_id, custom_id, channel_id, timestamp) VALUES (?, ?, ?, ?, ?)',
          [interaction.user.id, interaction.guild?.id, interaction.customId, interaction.channelId, new Date()]
        );
      } catch (error) {
        logger.error(`Failed to record modal submission in database: ${error.message}`);
      }
      
      if (interaction.customId.startsWith('ticket_modal_')) {
        try {
          await this.handleTicketModal(interaction);
        } catch (error) {
          logger.error(`Error handling ticket modal: ${error.message}`);
          await this.handleError(interaction, error);
        }
      }
    });

    // Auto-close inactive tickets
    setInterval(() => this.checkInactiveTickets(), 1000 * 60 * 60); // Check every hour
  },

  /**
   * Handle errors gracefully
   * @param {ButtonInteraction} interaction 
   * @param {Error} error
   */
  async handleError(interaction, error) {
    const errorMessage = 'An error occurred while processing your request. Please try again or contact an administrator.';
    
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (e) {
      logger.error(`Failed to send error message: ${e.message}`);
    }
  },

  /**
   * Check for inactive tickets and auto-close them
   */
  async checkInactiveTickets() {
    try {
      const guild = this.client.guilds.cache.first();
      const ticketCategory = guild.channels.cache.find(
        channel => channel.name === config.ticketSystem.categoryName && channel.type === ChannelType.GuildCategory
      );

      if (!ticketCategory) return;

      const now = Date.now();
      const inactiveThreshold = 1000 * 60 * 60 * 24; // 24 hours

      for (const channel of ticketCategory.children.cache.values()) {
        const lastMessage = (await channel.messages.fetch({ limit: 1 })).first();
        if (!lastMessage) continue;

        const timeSinceLastMessage = now - lastMessage.createdTimestamp;
        if (timeSinceLastMessage > inactiveThreshold) {
          const warningEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Inactive Ticket Warning')
            .setDescription('This ticket has been inactive for 24 hours and will be automatically closed in 1 hour if there is no activity.')
            .setTimestamp();

          await channel.send({ embeds: [warningEmbed] });

          // Give 1 hour grace period before closing
          setTimeout(async () => {
            const newLastMessage = (await channel.messages.fetch({ limit: 1 })).first();
            if (newLastMessage.id === lastMessage.id) {
              // No new activity, close the ticket
              const closeInteraction = { 
                channel,
                guild,
                user: this.client.user,
                deferReply: async () => {},
                editReply: async (msg) => channel.send(msg)
              };
              await this.closeTicket(closeInteraction, true);
            }
          }, 1000 * 60 * 60);
        }
      }
    } catch (error) {
      logger.error(`Error checking inactive tickets: ${error.message}`);
    }
  },
  
  /**
   * Create ticket message in channel
   * @param {TextChannel} channel - Discord text channel
   * @param {Object} ticketData - Ticket data
   */
  async createTicketMessage(channel, ticketData = {}) {
    try {
      const { 
        ticketId, 
        user, 
        subject, 
        description, 
        category = 'general',
        categoryDetails = { label: 'General Support', emoji: '❓' },
        priority = 'Medium',
        contactInfo = ''
      } = ticketData;

      // Get guild and support role
      const guild = channel.guild;
      const supportRoleId = config.tickets?.supportRoleId;
      const supportRole = supportRoleId ? guild.roles.cache.get(supportRoleId) : null;

      // Create ticket embed with enhanced design
      const embed = new EmbedBuilder()
        .setTitle(`${categoryDetails.emoji || '🎫'} Ticket #${ticketId}`)
        .setDescription(
          `**Thank you for creating a ticket!**\n` +
          `Our support team will assist you as soon as possible.\n\n` +
          `**Subject:** ${subject}\n` +
          `**Category:** ${categoryDetails.label || category}\n` +
          `**Priority:** ${priority}\n` +
          (contactInfo ? `**Contact:** ${contactInfo}\n\n` : '\n') +
          `**Description:**\n${description}`
        )
        .setColor(config.tickets?.embedColor || '#0099ff')
        .addFields(
          { name: 'Created By', value: `${user}`, inline: true },
          { name: 'Created At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ 
          text: `Ticket ID: ${ticketId}`,
          iconURL: guild.iconURL({ dynamic: true }) 
        })
        .setTimestamp();

      // Create ticket control buttons
      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel(config.tickets?.claimButtonText || 'Claim Ticket')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✋'),
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel(config.tickets?.closeButtonText || 'Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

      // Send initial message in ticket channel
      const message = await channel.send({ 
        content: `${user} ${supportRole ? `| ${supportRole}` : ''}`,
        embeds: [embed],
        components: [buttonRow]
      });

      // Pin the message
      await message.pin().catch(err => logger.warn(`Could not pin ticket message: ${err.message}`));

      // Set channel topic
      await channel.setTopic(`Ticket for ${user.tag} | Subject: ${subject} | Category: ${categoryDetails.label} | Priority: ${priority}`);

      // Return the message
      return message;
    } catch (error) {
      logger.error(`Error creating ticket message: ${error.message}`);
      return null;
    }
  },

  /**
   * Create a new support ticket
   * @param {ButtonInteraction} interaction - The button interaction
   */
  async createTicket(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const guild = interaction.guild;
      const user = interaction.user;

      // Check if user has an active ticket
      const existingTicket = this.activeTickets.get(user.id);
      if (existingTicket) {
        const channel = guild.channels.cache.get(existingTicket);
        if (channel) {
          return await interaction.editReply({
            content: `You already have an active ticket: ${channel}. Please use that ticket or close it before creating a new one.`,
            ephemeral: true
          });
        }
      }

      // Get or create ticket category
      let ticketCategory = guild.channels.cache.find(
        channel => channel.name === config.ticketSystem.categoryName && channel.type === ChannelType.GuildCategory
      );
      
      if (!ticketCategory) {
        ticketCategory = await guild.channels.create({
          name: config.ticketSystem.categoryName,
          type: ChannelType.GuildCategory
        });
      }

      // Generate unique ticket ID
      const ticketId = Date.now().toString(36).toUpperCase();
      
      // Create ticket channel
      const ticketChannel = await guild.channels.create({
        name: `ticket-${ticketId}`,
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        topic: `Support ticket for ${user.tag} | Created: ${new Date().toISOString()}`,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles
            ]
          }
        ]
      });

      // Add support role permissions
      for (const roleName of config.ticketSystem.supportRoles) {
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (role) {
          await ticketChannel.permissionOverwrites.create(role, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            AttachFiles: true
          });
        }
      }

      // Store active ticket
      this.activeTickets.set(user.id, ticketChannel.id);

      // Create ticket embed
      const ticketEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`Ticket #${ticketId}`)
        .setDescription([
          `Welcome ${user}! A support representative will be with you shortly.`,
          "",
          "**Please provide:**",
          "1. A clear description of your issue",
          "2. Any relevant error messages",
          "3. Steps to reproduce the problem",
          "4. Your server ID or hostname",
          "",
          "The more information you provide, the faster we can help you!"
        ].join('\n'))
        .addFields(
          {
            name: '📋 Ticket Information',
            value: [
              `**Created By:** ${user}`,
              `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
              `**Status:** Open`
            ].join('\n')
          }
        )
        .setTimestamp();

      // Create action row with buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('Claim Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('👋'),
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

      // Send initial message
      const ticketMsg = await ticketChannel.send({
        content: `${user} ${config.ticketSystem.supportRoles.map(role => {
          const r = guild.roles.cache.find(r => r.name === role);
          return r ? `<@&${r.id}>` : '';
        }).join(' ')}`,
        embeds: [ticketEmbed],
        components: [row]
      });

      // Pin the initial message
      await ticketMsg.pin();

      // Send confirmation to user
      await interaction.editReply({
        content: `Your ticket has been created: ${ticketChannel}`,
        ephemeral: true
      });

      // Log ticket creation
      await this.logTicketAction(guild, {
        action: 'Ticket Created',
        ticketId,
        user,
        channel: ticketChannel
      });

    } catch (error) {
      logger.error(`Error creating ticket: ${error.message}`);
      await this.handleError(interaction, error);
    }
  },

  /**
   * Claim a ticket
   * @param {ButtonInteraction} interaction 
   */
  async claimTicket(interaction) {
    try {
      await interaction.deferReply();

      // Verify claimer is support staff
      const hasPermission = config.ticketSystem.supportRoles.some(roleName => {
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);
        return role && interaction.member.roles.cache.has(role.id);
      });

      if (!hasPermission) {
        return await interaction.editReply({
          content: 'You do not have permission to claim tickets.',
          ephemeral: true
        });
      }

      const claimEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Ticket Claimed')
        .setDescription(`This ticket has been claimed by ${interaction.user}`)
        .setTimestamp();

      await interaction.editReply({ embeds: [claimEmbed] });

      // Update channel topic
      await interaction.channel.setTopic(
        `${interaction.channel.topic} | Claimed by: ${interaction.user.tag}`
      );

      // Log claim action
      await this.logTicketAction(interaction.guild, {
        action: 'Ticket Claimed',
        ticketId: interaction.channel.name.split('-')[1],
        user: interaction.user,
        channel: interaction.channel
      });

    } catch (error) {
      logger.error(`Error claiming ticket: ${error.message}`);
      await this.handleError(interaction, error);
    }
  },

  /**
   * Close a support ticket
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {boolean} [autoClose=false] - Whether this is an automatic closure
   */
  async closeTicket(interaction, autoClose = false) {
    try {
      if (!autoClose) await interaction.deferReply();

      const channel = interaction.channel;
      
      // Create confirmation buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('delete_ticket')
            .setLabel('Delete Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️'),
          new ButtonBuilder()
            .setCustomId('reopen_ticket')
            .setLabel('Reopen Ticket')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔓')
        );

      // Update permissions
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });

      // Get ticket creator
      const ticketId = channel.name.split('-')[1];
      const ticketCreator = Array.from(this.activeTickets.entries())
        .find(([_, channelId]) => channelId === channel.id)?.[0];

      if (ticketCreator) {
        this.activeTickets.delete(ticketCreator);
      }

      // Create transcript
      const messages = await channel.messages.fetch();
      const transcript = messages.reverse().map(m => {
        return `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`;
      }).join('\n');

      // Save transcript (you would implement this based on your storage solution)
      // await this.saveTranscript(ticketId, transcript);

      const closedEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Ticket Closed')
        .setDescription([
          `Ticket closed by ${autoClose ? 'System (Inactivity)' : interaction.user}`,
          "",
          "This ticket is now closed. The transcript will be saved for reference.",
          "You can delete this ticket or reopen it using the buttons below."
        ].join('\n'))
        .setTimestamp();

      const response = { embeds: [closedEmbed], components: [row] };
      if (autoClose) {
        await channel.send(response);
      } else {
        await interaction.editReply(response);
      }

      // Log closure
      await this.logTicketAction(interaction.guild, {
        action: 'Ticket Closed',
        ticketId,
        user: autoClose ? this.client.user : interaction.user,
        channel,
        autoClose
      });

    } catch (error) {
      logger.error(`Error closing ticket: ${error.message}`);
      if (!autoClose) await this.handleError(interaction, error);
    }
  },

  /**
   * Log a ticket action to the ticket-logs channel
   * @param {Guild} guild 
   * @param {Object} data 
   */
  async logTicketAction(guild, { action, ticketId, user, channel, autoClose = false }) {
    try {
      const ticketLogsChannel = guild.channels.cache.find(
        channel => channel.name === config.channels.ticketLogs
      );

      if (!ticketLogsChannel) return;

      const logEmbed = new EmbedBuilder()
        .setColor(action === 'Ticket Created' ? '#00FF00' : '#FF0000')
        .setTitle(action)
        .addFields(
          { name: 'Ticket ID', value: ticketId, inline: true },
          { name: 'User', value: user.toString(), inline: true },
          { name: 'Channel', value: channel.toString(), inline: true },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

      if (autoClose) {
        logEmbed.setDescription('Automatically closed due to inactivity');
      }

      await ticketLogsChannel.send({ embeds: [logEmbed] });
    } catch (error) {
      logger.error(`Error logging ticket action: ${error.message}`);
    }
  },

  /**
   * Create ticket panel message in channel
   * @param {TextChannel} channel - Discord text channel
   */
  async createTicketPanel(channel) {
    try {
      // Create ticket panel embed with improved design
      const embed = new EmbedBuilder()
        .setTitle(config.tickets?.panelTitle || '🎫 Support Ticket System')
        .setDescription(config.tickets?.panelMessage || 
          '**Need assistance? We\'re here to help!**\n\n' +
          '• Select a ticket category that best matches your issue\n' +
          '• Provide a clear description of what you need help with\n' +
          '• Our support team will respond as soon as possible\n\n' +
          '*Please be patient and provide as much detail as possible to help us assist you better.*')
        .setColor(config.tickets?.embedColor || '#0099ff')
        .setTimestamp();

      // Add thumbnail if configured
      if (config.tickets?.panelThumbnail) {
        embed.setThumbnail(config.tickets?.panelThumbnail);
      }

      // Add image if configured
      if (config.tickets?.panelImage) {
        embed.setImage(config.tickets?.panelImage);
      }

      // Add footer if configured
      if (config.footerText) {
        embed.setFooter({ 
          text: config.footerText,
          iconURL: config.footerIcon || null
        });
      }

      // Create ticket button
      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel(config.tickets?.buttonText || 'Create Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );

      // Create ticket category select menu if categories are configured
      let components = [buttonRow];
      
      if (config.tickets?.categories && Array.isArray(config.tickets.categories) && config.tickets.categories.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('ticket_category')
          .setPlaceholder('Select ticket category')
          .setMinValues(1)
          .setMaxValues(1);
          
        // Add options from config or use defaults
        const categories = config.tickets.categories.length > 0 ? 
          config.tickets.categories : 
          [
            { label: 'General Support', value: 'general', emoji: '❓', description: 'General questions and assistance' },
            { label: 'Technical Support', value: 'technical', emoji: '🔧', description: 'Technical issues and troubleshooting' },
            { label: 'Billing Support', value: 'billing', emoji: '💰', description: 'Billing and payment related issues' },
            { label: 'Report Issue', value: 'report', emoji: '🚨', description: 'Report bugs or other issues' }
          ];
          
        categories.forEach(category => {
          selectMenu.addOptions({
            label: category.label,
            value: category.value,
            emoji: category.emoji,
            description: category.description
          });
        });
        
        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        components = [selectRow, buttonRow];
      }

      // Send ticket panel message
      await channel.send({ embeds: [embed], components });
    } catch (error) {
      logger.error(`Error creating ticket panel: ${error.message}`);
    }
  },

  /**
   * Handle ticket category selection
   * @param {StringSelectMenuInteraction} interaction - Select menu interaction
   */
  async handleTicketCategorySelect(interaction) {
    try {
      const selectedCategory = interaction.values[0];
      
      // Get category details from config or use default
      let categoryDetails = { label: 'General Support', emoji: '❓' };
      if (config.tickets?.categories) {
        const foundCategory = config.tickets.categories.find(c => c.value === selectedCategory);
        if (foundCategory) {
          categoryDetails = foundCategory;
        }
      }
      
      // Create and show modal for ticket creation
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${selectedCategory}`)
        .setTitle(`${categoryDetails.emoji || '🎫'} ${categoryDetails.label || 'Support Ticket'}`);

      // Add ticket subject input
      const subjectInput = new TextInputBuilder()
        .setCustomId('ticket_subject')
        .setLabel('Subject')
        .setPlaceholder('Briefly describe your issue')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      // Add ticket description input
      const descriptionInput = new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('Description')
        .setPlaceholder('Please provide details about your issue')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);
        
      // Add priority input if enabled
      const priorityInput = new TextInputBuilder()
        .setCustomId('ticket_priority')
        .setLabel('Priority')
        .setPlaceholder('Low, Medium, High, or Urgent')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(10);
        
      // Add contact info input
      const contactInput = new TextInputBuilder()
        .setCustomId('ticket_contact')
        .setLabel('Contact Information (optional)')
        .setPlaceholder('Additional contact info (email, etc.)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(100);

      // Add inputs to modal
      const firstActionRow = new ActionRowBuilder().addComponents(subjectInput);
      const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(priorityInput);
      const fourthActionRow = new ActionRowBuilder().addComponents(contactInput);
      
      // Add all components to modal
      modal.addComponents(firstActionRow, secondActionRow);
      
      // Add optional components if configured
      if (config.tickets?.enablePriority !== false) {
        modal.addComponents(thirdActionRow);
      }
      
      if (config.tickets?.enableContactInfo !== false) {
        modal.addComponents(fourthActionRow);
      }

      // Show the modal
      await interaction.showModal(modal);
      
    } catch (error) {
      logger.error(`Error handling ticket category selection: ${error.message}`);
      await this.handleError(interaction, error);
    }
  },

  /**
   * Handle ticket modal submission
   * @param {ModalSubmitInteraction} interaction - Modal submit interaction
   */
  async handleTicketModal(interaction) {
    try {
      // Defer reply to prevent timeout
      await interaction.deferReply({ ephemeral: true });

      const { guild, user, customId } = interaction;
      
      // Extract category from customId (format: ticket_modal_categoryName)
      const category = customId.startsWith('ticket_modal_') 
        ? customId.replace('ticket_modal_', '') 
        : 'general';
      
      // Get ticket information from modal
      const subject = interaction.fields.getTextInputValue('ticket_subject');
      const description = interaction.fields.getTextInputValue('ticket_description');
      
      // Get optional fields if they exist
      let priority = 'Medium';
      let contactInfo = '';
      
      try {
        priority = interaction.fields.getTextInputValue('ticket_priority') || 'Medium';
      } catch (e) {
        // Field not present, use default
      }
      
      try {
        contactInfo = interaction.fields.getTextInputValue('ticket_contact') || '';
      } catch (e) {
        // Field not present, ignore
      }

      // Check if user already has an open ticket
      const hasOpenTicket = Array.from(this.activeTickets.values()).some(
        ticket => ticket.userId === user.id && ticket.guildId === guild.id
      );

      if (hasOpenTicket && !config.tickets?.allowMultipleTickets) {
        return interaction.editReply({ 
          content: 'You already have an open ticket. Please use your existing ticket or close it before creating a new one.', 
          ephemeral: true 
        });
      }

      // Create ticket channel
      const ticketId = this.generateTicketId();
      
      // Get category details from config or use default
      let categoryDetails = { label: 'General Support', emoji: '❓' };
      if (config.tickets?.categories) {
        const foundCategory = config.tickets.categories.find(c => c.value === category);
        if (foundCategory) {
          categoryDetails = foundCategory;
        }
      }
      
      // Format ticket channel name
      const ticketChannelName = config.tickets?.channelNameFormat
        ? config.tickets.channelNameFormat
            .replace('{id}', ticketId)
            .replace('{username}', user.username.replace(/[^a-z0-9]/gi, '').toLowerCase())
            .replace('{category}', category)
        : `ticket-${ticketId}`;

      // Create ticket channel
      const ticketChannel = await guild.channels.create({
        name: ticketChannelName,
        type: ChannelType.GuildText,
        parent: config.tickets?.categoryId,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
            id: this.client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels
            ]
          }
        ]
      });

      // Add support role permissions if configured
      if (config.tickets?.supportRoleId) {
        await ticketChannel.permissionOverwrites.create(config.tickets.supportRoleId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }

      // Store ticket in database
      try {
        await this.client.db.query(
          'INSERT INTO tickets (ticket_id, guild_id, channel_id, user_id, subject, status, category, priority, contact_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [ticketId, guild.id, ticketChannel.id, user.id, subject, 'open', category, priority, contactInfo]
        );
      } catch (dbError) {
        logger.error(`Database error creating ticket: ${dbError.message}`);
        // If the database has an older schema without the new columns, try with the old schema
        try {
          await this.client.db.query(
            'INSERT INTO tickets (ticket_id, guild_id, channel_id, user_id, subject, status) VALUES (?, ?, ?, ?, ?, ?)',
            [ticketId, guild.id, ticketChannel.id, user.id, subject, 'open']
          );
        } catch (fallbackError) {
          logger.error(`Fallback database error creating ticket: ${fallbackError.message}`);
        }
      }

      // Store ticket in memory
      this.activeTickets.set(ticketChannel.id, {
        id: ticketId,
        channelId: ticketChannel.id,
        userId: user.id,
        guildId: guild.id,
        subject,
        category,
        priority,
        contactInfo,
        createdAt: new Date()
      });

      // Create welcome message in ticket channel
      await this.createTicketMessage(ticketChannel, {
        ticketId,
        user,
        subject,
        description,
        category,
        categoryDetails,
        priority,
        contactInfo
      });

      // Log ticket creation
      await this.logTicketAction(guild, {
        action: 'create',
        ticketId,
        user,
        channel: ticketChannel
      });

      // Reply to user
      await interaction.editReply({ 
        content: `Your ticket has been created! Please go to ${ticketChannel} to continue.`, 
        ephemeral: true 
      });

    } catch (error) {
      logger.error(`Error handling ticket modal: ${error.message}`);
      await this.handleError(interaction, error);
    }
  },

  /**
   * Save ticket transcript
   * @param {TextChannel} channel - Ticket channel
   * @param {Object} ticketData - Ticket data
   */
  async saveTicketTranscript(channel, ticketData) {
    try {
      // Get transcript channel
      const transcriptChannel = this.client.channels.cache.get(config.tickets?.transcriptChannel);
      if (!transcriptChannel) {
        logger.error('Transcript channel not found');
        return;
      }

      // Fetch messages from ticket channel
      const messages = await channel.messages.fetch({ limit: 100 });
      
      // Create transcript content
      let transcript = `# Ticket Transcript: #${ticketData.ticketId}\n`;
      transcript += `Created by: ${this.client.users.cache.get(ticketData.userId)?.tag || ticketData.userId}\n`;
      transcript += `Created at: ${ticketData.createdAt}\n`;
      transcript += `Subject: ${ticketData.subject}\n\n`;
      transcript += `## Messages\n\n`;
      
      // Add messages to transcript (in reverse order to get oldest first)
      const sortedMessages = Array.from(messages.values()).reverse();
      for (const message of sortedMessages) {
        if (message.author.bot && message.embeds.length > 0) continue; // Skip bot embed messages
        
        const timestamp = new Date(message.createdTimestamp).toISOString();
        transcript += `**${message.author.tag}** (${timestamp}):\n`;
        transcript += `${message.content || '*No text content*'}\n\n`;
      }
      
      // Create transcript embed
      const transcriptEmbed = new EmbedBuilder()
        .setTitle(`Ticket Transcript: #${ticketData.ticketId}`)
        .setDescription(`Ticket created by <@${ticketData.userId}> has been closed.`)
        .addFields(
          { name: 'Subject', value: ticketData.subject || 'Not specified', inline: true },
          { name: 'Category', value: ticketData.category || 'Support', inline: true },
          { name: 'Created At', value: `<t:${Math.floor(ticketData.createdAt.getTime() / 1000)}:F>`, inline: true }
        )
        .setColor('#0099ff')
        .setTimestamp();
      
      // Send transcript to transcript channel
      await transcriptChannel.send({ 
        embeds: [transcriptEmbed],
        files: [{
          attachment: Buffer.from(transcript, 'utf-8'),
          name: `ticket-${ticketData.ticketId}.txt`
        }]
      });
      
      logger.info(`Transcript saved for ticket #${ticketData.ticketId}`);
    } catch (error) {
      logger.error(`Error saving ticket transcript: ${error.message}`);
    }
  },

  /**
   * Generate a unique ticket ID
   * @returns {string} Ticket ID
   */
  generateTicketId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  },

  /**
   * Handle ticket button interaction
   * @param {ButtonInteraction} interaction - Button interaction
   */
  async handleTicketButton(interaction) {
    try {
      // Create and show modal for ticket creation
      const modal = new ModalBuilder()
        .setCustomId('ticket_modal_general')
        .setTitle('🎫 Create a Support Ticket');

      // Add ticket subject input
      const subjectInput = new TextInputBuilder()
        .setCustomId('ticket_subject')
        .setLabel('Subject')
        .setPlaceholder('Briefly describe your issue')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      // Add ticket description input
      const descriptionInput = new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('Description')
        .setPlaceholder('Please provide details about your issue')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);
        
      // Add priority input if enabled
      const priorityInput = new TextInputBuilder()
        .setCustomId('ticket_priority')
        .setLabel('Priority')
        .setPlaceholder('Low, Medium, High, or Urgent')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(10);
        
      // Add contact info input
      const contactInput = new TextInputBuilder()
        .setCustomId('ticket_contact')
        .setLabel('Contact Information (optional)')
        .setPlaceholder('Additional contact info (email, etc.)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(100);

      // Add inputs to modal
      const firstActionRow = new ActionRowBuilder().addComponents(subjectInput);
      const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(priorityInput);
      const fourthActionRow = new ActionRowBuilder().addComponents(contactInput);
      
      // Add all components to modal
      modal.addComponents(firstActionRow, secondActionRow);
      
      // Add optional components if configured
      if (config.tickets?.enablePriority !== false) {
        modal.addComponents(thirdActionRow);
      }
      
      if (config.tickets?.enableContactInfo !== false) {
        modal.addComponents(fourthActionRow);
      }

      // Show the modal
      await interaction.showModal(modal);
      
    } catch (error) {
      logger.error(`Error handling ticket button: ${error.message}`);
      await this.handleError(interaction, error);
    }
  },

  /**
   * Get ticket statistics
   * @returns {Object} Ticket statistics
   */
  async getTicketStats() {
    try {
      // Get active tickets count
      const activeTickets = this.activeTickets.size;
      
      // Get tickets from database if available
      let totalTickets = activeTickets;
      let closedTickets = 0;
      let averageResponseTime = 0;
      let ticketsToday = 0;
      
      if (this.db && this.db.isConnected) {
        try {
          // Get total tickets
          const totalResult = await this.db.query('SELECT COUNT(*) as count FROM tickets');
          totalTickets = totalResult[0]?.count || activeTickets;
          
          // Get closed tickets
          const closedResult = await this.db.query('SELECT COUNT(*) as count FROM tickets WHERE status = ?', ['closed']);
          closedTickets = closedResult[0]?.count || 0;
          
          // Get tickets created today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayResult = await this.db.query(
            'SELECT COUNT(*) as count FROM tickets WHERE created_at >= ?', 
            [today]
          );
          ticketsToday = todayResult[0]?.count || 0;
          
          // Calculate average response time (if claimed_at data is available)
          const responseTimeResult = await this.db.query(
            'SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, claimed_at)) as avg_time FROM tickets WHERE claimed_at IS NOT NULL'
          );
          averageResponseTime = Math.round(responseTimeResult[0]?.avg_time || 0);
        } catch (error) {
          logger.error(`Error fetching ticket statistics from database: ${error.message}`);
        }
      }
      
      return {
        activeTickets,
        totalTickets,
        closedTickets,
        ticketsToday,
        averageResponseTime,
        categories: {
          general: this.countTicketsByCategory('general'),
          technical: this.countTicketsByCategory('technical'),
          billing: this.countTicketsByCategory('billing'),
          report: this.countTicketsByCategory('report')
        }
      };
    } catch (error) {
      logger.error(`Error getting ticket statistics: ${error.message}`);
      return {
        activeTickets: this.activeTickets.size,
        totalTickets: this.activeTickets.size,
        closedTickets: 0,
        ticketsToday: 0,
        averageResponseTime: 0,
        categories: {}
      };
    }
  },
  
  /**
   * Count tickets by category
   * @param {string} category - Ticket category
   * @returns {number} Number of tickets in the category
   */
  countTicketsByCategory(category) {
    return Array.from(this.activeTickets.values()).filter(ticket => 
      ticket.category === category
    ).length;
  },
}; 