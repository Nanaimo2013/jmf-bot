/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const verification = require('../modules/verification');
const tickets = require('../modules/tickets');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up various bot features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('verification')
        .setDescription('Set up the verification system')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to set up verification in')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('tickets')
        .setDescription('Set up the ticket system')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to set up tickets in')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const channel = interaction.options.getChannel('channel');

      // Check if the bot has permission to send messages in the channel
      const permissions = channel.permissionsFor(interaction.client.user);
      if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
        return interaction.reply({
          content: `I don't have permission to send messages in ${channel}. Please check my permissions and try again.`,
          ephemeral: true
        });
      }

      // Handle verification setup
      if (subcommand === 'verification') {
        await interaction.deferReply({ ephemeral: true });
        
        try {
          await verification.createVerificationMessage(channel);
          return interaction.editReply({
            content: `Verification system has been set up in ${channel}. Users can now verify themselves by clicking the button.`,
            ephemeral: true
          });
        } catch (error) {
          logger.error(`Error setting up verification: ${error.message}`);
          return interaction.editReply({
            content: `An error occurred while setting up verification: ${error.message}`,
            ephemeral: true
          });
        }
      }
      
      // Handle ticket setup
      else if (subcommand === 'tickets') {
        await interaction.deferReply({ ephemeral: true });
        
        try {
          await tickets.createTicketPanel(channel);
          return interaction.editReply({
            content: `Ticket system has been set up in ${channel}. Users can now create tickets by clicking the button.`,
            ephemeral: true
          });
        } catch (error) {
          logger.error(`Error setting up tickets: ${error.message}`);
          return interaction.editReply({
            content: `An error occurred while setting up tickets: ${error.message}`,
            ephemeral: true
          });
        }
      }
    } catch (error) {
      logger.error(`Error in setup command: ${error.message}`);
      return interaction.reply({
        content: 'An error occurred while executing this command.',
        ephemeral: true
      });
    }
  }
}; 