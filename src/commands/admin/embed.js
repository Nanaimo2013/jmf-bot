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
const { createRulesEmbed } = require('../../embeds/rules-embed');
const { createFAQEmbed } = require('../../embeds/faq-embed');
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
              { name: 'Custom', value: 'custom' }
            )
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to send the embed to')
            .setRequired(true)
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
              { name: 'FAQ', value: 'faq' }
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
        
        // Create the appropriate embed
        switch (type) {
          case 'rules':
            embed = createRulesEmbed();
            break;
          case 'faq':
            embed = createFAQEmbed();
            break;
          case 'custom':
            // For custom embeds, we'll just send a placeholder
            // In a more advanced version, you could add options to customize this
            return interaction.editReply({
              content: 'Custom embeds are not yet implemented. Please use the rules or FAQ options.',
              ephemeral: true
            });
          default:
            return interaction.editReply({
              content: 'Invalid embed type.',
              ephemeral: true
            });
        }
        
        // Send the embed
        const sentMessage = await channel.send({ embeds: [embed] });
        
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
          
          // Create the appropriate embed
          switch (type) {
            case 'rules':
              embed = createRulesEmbed();
              break;
            case 'faq':
              embed = createFAQEmbed();
              break;
            default:
              return interaction.editReply({
                content: 'Invalid embed type.',
                ephemeral: true
              });
          }
          
          // Update the message
          await message.edit({ embeds: [embed] });
          
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
  }
}; 