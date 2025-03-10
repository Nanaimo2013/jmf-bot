/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const tickets = require('../modules/tickets');
const logger = require('../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support tickets')
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
            .setDescription('The user to add to the ticket')
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
            .setDescription('The user to remove from the ticket')
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
            .setDescription('The new name for the ticket')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const { channel, guild, member } = interaction;
      const subcommand = interaction.options.getSubcommand();
      
      // Check if the channel is a ticket
      if (!tickets.activeTickets.has(channel.id)) {
        return interaction.reply({
          content: 'This command can only be used in ticket channels.',
          ephemeral: true
        });
      }
      
      // Get ticket data
      const ticketData = tickets.activeTickets.get(channel.id);
      
      // Check if user has permission to manage tickets
      const supportRole = guild.roles.cache.find(
        role => role.name === (config.tickets?.supportRole || 'Support')
      );
      
      const canManageTicket = 
        member.id === ticketData.userId || 
        (supportRole && member.roles.cache.has(supportRole.id)) ||
        member.permissions.has(PermissionFlagsBits.ManageChannels);
      
      if (!canManageTicket) {
        return interaction.reply({
          content: 'You do not have permission to manage this ticket.',
          ephemeral: true
        });
      }
      
      // Handle close subcommand
      if (subcommand === 'close') {
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        await interaction.deferReply();
        
        // Create closing message
        const closingEmbed = new EmbedBuilder()
          .setTitle(`Ticket #${ticketData.ticketId} Closed`)
          .setDescription(`This ticket has been closed by ${member}.`)
          .addFields({ name: 'Reason', value: reason })
          .setColor('#ff0000')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [closingEmbed] });
        
        // Update ticket status in database
        if (interaction.client.db && interaction.client.db.isConnected) {
          try {
            await interaction.client.db.query(
              'UPDATE tickets SET status = ?, closed_at = ?, closed_by = ? WHERE channel_id = ?',
              ['closed', new Date(), member.id, channel.id]
            );
          } catch (error) {
            logger.error(`Failed to update ticket status in database: ${error.message}`);
          }
        }
        
        // Remove ticket from active tickets
        tickets.activeTickets.delete(channel.id);
        
        // Archive transcript if configured
        if (config.tickets?.saveTranscripts) {
          await tickets.saveTicketTranscript(channel, ticketData);
        }
        
        // Delete channel after delay
        setTimeout(async () => {
          try {
            await channel.delete();
            logger.info(`Ticket #${ticketData.ticketId} channel deleted`);
          } catch (error) {
            logger.error(`Failed to delete ticket channel: ${error.message}`);
          }
        }, config.tickets?.deleteDelay || 5000);
      }
      
      // Handle add subcommand
      else if (subcommand === 'add') {
        const user = interaction.options.getUser('user');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        
        if (!targetMember) {
          return interaction.reply({
            content: 'Could not find that user in the server.',
            ephemeral: true
          });
        }
        
        // Check if user is already in the ticket
        if (channel.permissionsFor(targetMember).has(PermissionFlagsBits.ViewChannel)) {
          return interaction.reply({
            content: `${user} is already in this ticket.`,
            ephemeral: true
          });
        }
        
        // Add user to ticket
        await channel.permissionOverwrites.edit(targetMember, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
        
        // Send confirmation
        await interaction.reply({
          content: `${user} has been added to the ticket.`
        });
        
        // Log in database
        if (interaction.client.db && interaction.client.db.isConnected) {
          try {
            await interaction.client.db.query(
              'INSERT INTO ticket_actions (ticket_id, user_id, action_by, action_type, timestamp) VALUES (?, ?, ?, ?, ?)',
              [ticketData.ticketId, user.id, member.id, 'add_user', new Date()]
            );
          } catch (error) {
            logger.error(`Failed to log ticket action in database: ${error.message}`);
          }
        }
      }
      
      // Handle remove subcommand
      else if (subcommand === 'remove') {
        const user = interaction.options.getUser('user');
        
        // Check if user is the ticket creator
        if (user.id === ticketData.userId) {
          return interaction.reply({
            content: 'You cannot remove the ticket creator from the ticket.',
            ephemeral: true
          });
        }
        
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        
        if (!targetMember) {
          return interaction.reply({
            content: 'Could not find that user in the server.',
            ephemeral: true
          });
        }
        
        // Check if user is in the ticket
        if (!channel.permissionsFor(targetMember).has(PermissionFlagsBits.ViewChannel)) {
          return interaction.reply({
            content: `${user} is not in this ticket.`,
            ephemeral: true
          });
        }
        
        // Remove user from ticket
        await channel.permissionOverwrites.edit(targetMember, {
          ViewChannel: false,
          SendMessages: false,
          ReadMessageHistory: false
        });
        
        // Send confirmation
        await interaction.reply({
          content: `${user} has been removed from the ticket.`
        });
        
        // Log in database
        if (interaction.client.db && interaction.client.db.isConnected) {
          try {
            await interaction.client.db.query(
              'INSERT INTO ticket_actions (ticket_id, user_id, action_by, action_type, timestamp) VALUES (?, ?, ?, ?, ?)',
              [ticketData.ticketId, user.id, member.id, 'remove_user', new Date()]
            );
          } catch (error) {
            logger.error(`Failed to log ticket action in database: ${error.message}`);
          }
        }
      }
      
      // Handle rename subcommand
      else if (subcommand === 'rename') {
        const newName = interaction.options.getString('name');
        const formattedName = `ticket-${newName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${ticketData.ticketId}`;
        
        // Rename channel
        await channel.setName(formattedName);
        
        // Send confirmation
        await interaction.reply({
          content: `Ticket has been renamed to ${formattedName}.`
        });
        
        // Log in database
        if (interaction.client.db && interaction.client.db.isConnected) {
          try {
            await interaction.client.db.query(
              'INSERT INTO ticket_actions (ticket_id, action_by, action_type, details, timestamp) VALUES (?, ?, ?, ?, ?)',
              [ticketData.ticketId, member.id, 'rename', newName, new Date()]
            );
          } catch (error) {
            logger.error(`Failed to log ticket action in database: ${error.message}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Error in ticket command: ${error.message}`);
      return interaction.reply({
        content: 'An error occurred while executing this command.',
        ephemeral: true
      });
    }
  }
}; 