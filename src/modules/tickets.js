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
  TextInputStyle
} = require('discord.js');
const config = require('../../config.json');
const logger = require('../utils/logger');

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
      
      const handlers = {
        'create_ticket': this.createTicket,
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
   * Create a ticket creation message in the specified channel
   * @param {TextChannel} channel - The channel to send the ticket creation message to
   */
  async createTicketMessage(channel) {
    try {
      // Create ticket embed
      const ticketEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('🎫 JMF Hosting Support Center')
        .setDescription([
          "## Need Help with Your Game Server?",
          "",
          "Our support team is here to assist you with any questions or issues you might have with your JMF Hosting services.",
          "",
          "**Before creating a ticket, please check:**",
          "• Our [Knowledge Base](https://docs.jmfhosting.com)",
          "• [Common Issues](https://jmfhosting.com/support/common-issues)",
          "• [Server Status](https://status.jmfhosting.com)",
          "",
          "If you still need help, click below to create a ticket."
        ].join('\n'))
        .setThumbnail('https://i.imgur.com/XaFYhoO.png')
        .addFields(
          { 
            name: '🎮 Game Server Issues', 
            value: "```• Server not starting\n• Connection problems\n• Plugin/mod installation\n• Performance issues\n• Configuration help```", 
            inline: true 
          },
          { 
            name: '💰 Billing Questions', 
            value: "```• Subscription management\n• Payment issues\n• Invoices and receipts\n• Plan upgrades/downgrades\n• Refund requests```", 
            inline: true 
          },
          { 
            name: '🛠️ Technical Support', 
            value: "```• FTP access\n• Control panel issues\n• Server migration\n• Backups and restores\n• Custom configurations```" 
          },
          { 
            name: '📝 General Inquiries', 
            value: "```• Service information\n• Feature requests\n• Account management\n• Partnership opportunities\n• Other questions```" 
          }
        )
        .setTimestamp()
        .setFooter({ text: `${config.footerText} • Average Response Time: 30 minutes` });
      
      // Create ticket button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Create Support Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );
      
      // Send the ticket creation message
      await channel.send({ embeds: [ticketEmbed], components: [row] });
      logger.info(`Ticket creation message created in channel: ${channel.name}`);
    } catch (error) {
      logger.error(`Error creating ticket message: ${error.message}`);
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
      // Create ticket panel embed
      const embed = new EmbedBuilder()
        .setTitle(config.tickets?.panelTitle || 'Support Tickets')
        .setDescription(config.tickets?.panelMessage || 'Need help? Click the button below to create a support ticket.')
        .setColor(config.tickets?.embedColor || '#0099ff')
        .setTimestamp();

      // Add footer if configured
      if (config.footerText) {
        embed.setFooter({ text: config.footerText });
      }

      // Create ticket button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel(config.tickets?.buttonText || 'Create Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );

      // Send ticket panel message
      await channel.send({ embeds: [embed], components: [row] });
      logger.info(`Ticket panel created in channel: ${channel.name}`);
    } catch (error) {
      logger.error(`Error creating ticket panel: ${error.message}`);
    }
  },

  /**
   * Handle ticket creation button
   * @param {ButtonInteraction} interaction - Button interaction
   */
  async handleTicketButton(interaction) {
    try {
      // Create and show modal for ticket creation
      const modal = new ModalBuilder()
        .setCustomId('ticket_modal')
        .setTitle('Create a Support Ticket');

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

      // Add inputs to modal
      const firstActionRow = new ActionRowBuilder().addComponents(subjectInput);
      const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
      modal.addComponents(firstActionRow, secondActionRow);

      // Show modal to user
      await interaction.showModal(modal);
    } catch (error) {
      logger.error(`Error handling ticket button: ${error.message}`);
      await interaction.reply({ 
        content: 'An error occurred while creating the ticket. Please try again later.', 
        ephemeral: true 
      });
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

      const { guild, user } = interaction;
      
      // Get ticket information from modal
      const subject = interaction.fields.getTextInputValue('ticket_subject');
      const description = interaction.fields.getTextInputValue('ticket_description');

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
      const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${ticketId}`;
      
      // Get support role
      const supportRole = guild.roles.cache.find(
        role => role.name === (config.tickets?.supportRole || 'Support')
      );

      // Create channel permissions
      const channelPermissions = [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: this.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
          ],
        }
      ];

      // Add support role permissions if it exists
      if (supportRole) {
        channelPermissions.push({
          id: supportRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      }

      // Get ticket category if configured
      let parent = null;
      if (config.tickets?.categoryId) {
        parent = guild.channels.cache.get(config.tickets.categoryId);
      }

      // Create ticket channel
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: parent || undefined,
        permissionOverwrites: channelPermissions,
        topic: `Ticket for ${user.tag} | Subject: ${subject}`,
      });

      // Create ticket embed
      const ticketEmbed = new EmbedBuilder()
        .setTitle(`Ticket #${ticketId}: ${subject}`)
        .setDescription('Thank you for creating a ticket. Support staff will assist you shortly.')
        .addFields(
          { name: 'Created By', value: `${user}`, inline: true },
          { name: 'Subject', value: subject, inline: true },
          { name: 'Description', value: description }
        )
        .setColor(config.tickets?.embedColor || '#0099ff')
        .setTimestamp();

      // Create ticket control buttons
      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
          new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('Claim Ticket')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✋')
        );

      // Send initial message in ticket channel
      const message = await ticketChannel.send({ 
        content: `${user} ${supportRole ? `| ${supportRole}` : ''}`,
        embeds: [ticketEmbed],
        components: [buttonRow]
      });

      // Pin the message
      await message.pin();

      // Store ticket in active tickets map
      const ticketData = {
        userId: user.id,
        guildId: guild.id,
        channelId: ticketChannel.id,
        ticketId: ticketId,
        createdAt: new Date(),
        subject: subject,
        category: 'support'
      };
      
      this.activeTickets.set(ticketChannel.id, ticketData);

      // Store ticket in database if connected
      if (this.client.db && this.client.db.isConnected) {
        try {
          await this.client.db.query(
            'INSERT INTO tickets (ticket_id, user_id, guild_id, channel_id, subject, description, status, created_at, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [ticketId, user.id, guild.id, ticketChannel.id, subject, description, 'open', new Date(), 'support']
          );
        } catch (error) {
          logger.error(`Failed to store ticket in database: ${error.message}`);
        }
      }

      // Send confirmation to user
      return interaction.editReply({ 
        content: `Your ticket has been created! Please check ${ticketChannel} to continue.`, 
        ephemeral: true 
      });
    } catch (error) {
      logger.error(`Error creating ticket: ${error.message}`);
      return interaction.editReply({ 
        content: 'An error occurred while creating your ticket. Please try again or contact an administrator.', 
        ephemeral: true 
      });
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
  }
}; 