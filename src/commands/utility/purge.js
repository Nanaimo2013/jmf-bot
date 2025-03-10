/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages at once')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('The number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('contains')
        .setDescription('Only delete messages containing this text')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const amount = interaction.options.getInteger('amount');
      const user = interaction.options.getUser('user');
      const contains = interaction.options.getString('contains');
      
      // Fetch messages
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      
      // Filter messages based on options
      let filteredMessages = messages;
      
      if (user) {
        filteredMessages = filteredMessages.filter(msg => msg.author.id === user.id);
      }
      
      if (contains) {
        filteredMessages = filteredMessages.filter(msg => msg.content.includes(contains));
      }
      
      // Take only the requested amount
      filteredMessages = filteredMessages.first(amount);
      
      // Check if there are any messages to delete
      if (filteredMessages.length === 0) {
        return interaction.editReply({ content: '❌ No messages found matching the criteria.' });
      }
      
      // Delete messages
      const deleted = await interaction.channel.bulkDelete(filteredMessages, true);
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('Messages Purged')
        .setDescription(`✅ Successfully deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'}.`)
        .addFields(
          { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
          { name: 'Amount', value: deleted.size.toString(), inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      if (user) {
        successEmbed.addFields({ name: 'User Filter', value: `${user.tag} (${user.id})`, inline: true });
      }
      
      if (contains) {
        successEmbed.addFields({ name: 'Content Filter', value: contains, inline: true });
      }
      
      await interaction.editReply({ embeds: [successEmbed] });
      
      // Log the purge
      logger.info(`${interaction.user.tag} (${interaction.user.id}) purged ${deleted.size} messages in #${interaction.channel.name}`);
      
    } catch (error) {
      logger.error(`Error in purge command: ${error.message}`);
      
      // Handle specific errors
      if (error.code === 10008) {
        await interaction.editReply({ content: '❌ Some messages are too old to be deleted (older than 14 days).' });
      } else {
        await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
      }
    }
  }
}; 