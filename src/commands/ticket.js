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
        .setName('transcript')
        .setDescription('Generate a transcript of the current ticket')
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
        .setName('priority')
        .setDescription('Set the priority of the current ticket')
        .addStringOption(option =>
          option
            .setName('level')
            .setDescription('Priority level')
            .setRequired(true)
            .addChoices(
              { name: 'Low', value: 'low' },
              { name: 'Medium', value: 'medium' },
              { name: 'High', value: 'high' },
              { name: 'Urgent', value: 'urgent' }
            )
        )
    ),

  async execute(interaction) {
    // Get managers from global object
    const { logger, database, bot } = global.managers;
    
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Get tickets module from bot manager
      const ticketsModule = bot.getModuleRegistry().getModule('tickets');
      
      if (!ticketsModule) {
        return interaction.reply({
          content: '❌ Tickets module is not available.',
          ephemeral: true
        });
      }
      
      // Get config from bot manager
      const config = bot.getConfigManager().getConfig();
      
      // Check if the channel is a ticket channel
      const isTicketChannel = await ticketsModule.isTicketChannel(interaction.channel);
      
      if (!isTicketChannel && !['list', 'panel'].includes(subcommand)) {
        return interaction.reply({
          content: '❌ This command can only be used in a ticket channel.',
          ephemeral: true
        });
      }
      
      // Handle close subcommand
      if (subcommand === 'close') {
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        await interaction.deferReply();
        
        try {
          // Close the ticket
          await ticketsModule.closeTicket(interaction.channel, interaction.user, reason);
          
          // Log the action
          logger.info('commands', `Ticket ${interaction.channel.name} closed by ${interaction.user.tag} (${interaction.user.id}) with reason: ${reason}`);
          
          // No need to reply as the channel will be deleted
        } catch (error) {
          logger.error('commands', `Error closing ticket: ${error.message}`, error.stack);
          
          return interaction.editReply({
            content: `❌ An error occurred while closing the ticket: ${error.message}`
          });
        }
      }
      
      // Handle add subcommand
      else if (subcommand === 'add') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);
        
        if (!member) {
          return interaction.reply({
            content: '❌ User not found in this server.',
            ephemeral: true
          });
        }
        
        try {
          // Add user to ticket
          await ticketsModule.addUserToTicket(interaction.channel, member);
          
          // Log the action
          logger.info('commands', `User ${user.tag} (${user.id}) added to ticket ${interaction.channel.name} by ${interaction.user.tag} (${interaction.user.id})`);
          
          return interaction.reply({
            content: `✅ Added ${user} to the ticket.`
          });
        } catch (error) {
          logger.error('commands', `Error adding user to ticket: ${error.message}`, error.stack);
          
          return interaction.reply({
            content: `❌ An error occurred: ${error.message}`,
            ephemeral: true
          });
        }
      }
      
      // Handle remove subcommand
      else if (subcommand === 'remove') {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);
        
        if (!member) {
          return interaction.reply({
            content: '❌ User not found in this server.',
            ephemeral: true
          });
        }
        
        try {
          // Remove user from ticket
          await ticketsModule.removeUserFromTicket(interaction.channel, member);
          
          // Log the action
          logger.info('commands', `User ${user.tag} (${user.id}) removed from ticket ${interaction.channel.name} by ${interaction.user.tag} (${interaction.user.id})`);
          
          return interaction.reply({
            content: `✅ Removed ${user} from the ticket.`
          });
        } catch (error) {
          logger.error('commands', `Error removing user from ticket: ${error.message}`, error.stack);
          
          return interaction.reply({
            content: `❌ An error occurred: ${error.message}`,
            ephemeral: true
          });
        }
      }
      
      // Handle transcript subcommand
      else if (subcommand === 'transcript') {
        await interaction.deferReply();
        
        try {
          // Generate transcript
          const transcriptUrl = await ticketsModule.generateTranscript(interaction.channel);
          
          // Log the action
          logger.info('commands', `Transcript generated for ticket ${interaction.channel.name} by ${interaction.user.tag} (${interaction.user.id})`);
          
          return interaction.editReply({
            content: `✅ Transcript generated: ${transcriptUrl}`
          });
        } catch (error) {
          logger.error('commands', `Error generating transcript: ${error.message}`, error.stack);
          
          return interaction.editReply({
            content: `❌ An error occurred: ${error.message}`
          });
        }
      }
      
      // Handle rename subcommand
      else if (subcommand === 'rename') {
        const newName = interaction.options.getString('name');
        
        try {
          // Rename ticket
          await ticketsModule.renameTicket(interaction.channel, newName);
          
          // Log the action
          logger.info('commands', `Ticket renamed to ${newName} by ${interaction.user.tag} (${interaction.user.id})`);
          
          return interaction.reply({
            content: `✅ Ticket renamed to ${newName}.`
          });
        } catch (error) {
          logger.error('commands', `Error renaming ticket: ${error.message}`, error.stack);
          
          return interaction.reply({
            content: `❌ An error occurred: ${error.message}`,
            ephemeral: true
          });
        }
      }
      
      // Handle priority subcommand
      else if (subcommand === 'priority') {
        const priority = interaction.options.getString('level');
        
        try {
          // Set priority
          await ticketsModule.setTicketPriority(interaction.channel, priority);
          
          // Log the action
          logger.info('commands', `Ticket ${interaction.channel.name} priority set to ${priority} by ${interaction.user.tag} (${interaction.user.id})`);
          
          return interaction.reply({
            content: `✅ Ticket priority set to ${priority}.`
          });
        } catch (error) {
          logger.error('commands', `Error setting ticket priority: ${error.message}`, error.stack);
          
          return interaction.reply({
            content: `❌ An error occurred: ${error.message}`,
            ephemeral: true
          });
        }
      }
    } catch (error) {
      // Log error
      logger.error('commands', `Error in ticket command: ${error.message}`, error.stack);
      
      return interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
        ephemeral: true
      });
    }
  }
}; 