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
const userLogger = require('../../utils/userLogger');
const logger = require('../../utils/logger');
const config = require('../../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user for a specified duration')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('The duration of the timeout')
        .setRequired(true)
        .addChoices(
          { name: '60 seconds', value: '60s' },
          { name: '5 minutes', value: '5m' },
          { name: '10 minutes', value: '10m' },
          { name: '1 hour', value: '1h' },
          { name: '1 day', value: '1d' },
          { name: '3 days', value: '3d' },
          { name: '1 week', value: '7d' }
        ))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for the timeout')
        .setRequired(false))
    .addBooleanOption(option => 
      option.setName('silent')
        .setDescription('Whether to silently timeout the user (don\'t send them a DM)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const targetUser = interaction.options.getUser('user');
      const durationString = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const silent = interaction.options.getBoolean('silent') || false;
      
      // Parse duration
      const durationMs = this.parseDuration(durationString);
      
      // Check if the user is trying to timeout themselves
      if (targetUser.id === interaction.user.id) {
        return interaction.editReply({ content: '❌ You cannot timeout yourself.' });
      }
      
      // Check if the user is trying to timeout a bot
      if (targetUser.bot) {
        return interaction.editReply({ content: '❌ You cannot timeout a bot using this command.' });
      }
      
      // Get the target member
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      // Check if the member exists
      if (!targetMember) {
        return interaction.editReply({ content: '❌ This user is not in the server.' });
      }
      
      // Check if the bot can timeout the target
      if (!targetMember.moderatable) {
        return interaction.editReply({ content: '❌ I cannot timeout this user. They may have higher permissions than me.' });
      }
      
      // Check if the user has a higher role than the target
      const executorMember = await interaction.guild.members.fetch(interaction.user.id);
      if (targetMember.roles.highest.position >= executorMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.editReply({ content: '❌ You cannot timeout this user as they have the same or higher role than you.' });
      }
      
      // Create timeout embed to send to the user
      const timeoutEmbed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle(`You have been timed out in ${interaction.guild.name}`)
        .setDescription(`**Reason:** ${reason}\n**Duration:** ${this.formatDuration(durationMs)}`)
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      // Send DM to the user if not silent
      if (!silent) {
        try {
          await targetUser.send({ embeds: [timeoutEmbed] });
        } catch (error) {
          logger.warn(`Could not send DM to ${targetUser.tag} (${targetUser.id}): ${error.message}`);
        }
      }
      
      // Timeout the user
      await targetMember.timeout(durationMs, reason);
      
      // Log the timeout
      await userLogger.logMute(targetUser, interaction.user, reason, durationMs, interaction.client);
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('User Timed Out')
        .setDescription(`✅ **${targetUser.tag}** has been timed out.`)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Duration', value: this.formatDuration(durationMs), inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Silent', value: silent ? 'Yes' : 'No', inline: true },
          { name: 'Expires', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      await interaction.editReply({ embeds: [successEmbed] });
      
    } catch (error) {
      logger.error(`Error in timeout command: ${error.message}`);
      await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
    }
  },
  
  /**
   * Parse duration string to milliseconds
   * @param {string} durationString - The duration string (e.g., '1h', '30m')
   * @returns {number} The duration in milliseconds
   */
  parseDuration(durationString) {
    const timeValues = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const value = parseInt(durationString);
    const unit = durationString.slice(-1);
    
    return value * timeValues[unit];
  },
  
  /**
   * Format duration in milliseconds to a human-readable string
   * @param {number} ms - The duration in milliseconds
   * @returns {string} The formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
}; 