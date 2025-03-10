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
const config = require('../../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warns a user for breaking the rules')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for the warning')
        .setRequired(true))
    .addBooleanOption(option => 
      option.setName('silent')
        .setDescription('Whether to send the warning silently (only visible to moderators)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const silent = interaction.options.getBoolean('silent') || false;
    
    // Check if user is trying to warn themselves
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ 
        content: 'You cannot warn yourself.', 
        ephemeral: true 
      });
    }
    
    // Check if user is trying to warn a bot
    if (targetUser.bot) {
      return interaction.reply({ 
        content: 'You cannot warn a bot.', 
        ephemeral: true 
      });
    }
    
    // Get the member object
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    // Check if the target user has a higher role than the moderator
    if (targetMember) {
      const moderator = interaction.member;
      
      if (targetMember.roles.highest.position >= moderator.roles.highest.position && interaction.guild.ownerId !== moderator.id) {
        return interaction.reply({ 
          content: 'You cannot warn a member with a higher or equal role.', 
          ephemeral: true 
        });
      }
    }
    
    // Create warning embed for the user
    const warningEmbed = new EmbedBuilder()
      .setColor('#FF9900')
      .setTitle('⚠️ Warning')
      .setDescription(`You have been warned in **${interaction.guild.name}**`)
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Moderator', value: interaction.user.tag }
      )
      .setTimestamp()
      .setFooter({ text: config.footerText });
    
    // Send warning to the user
    try {
      await targetUser.send({ embeds: [warningEmbed] });
    } catch (error) {
      logger.warn(`Could not send DM to ${targetUser.tag}: ${error.message}`);
    }
    
    // Create warning log embed
    const logEmbed = new EmbedBuilder()
      .setColor('#FF9900')
      .setTitle('User Warned')
      .setDescription(`${targetUser.tag} has been warned`)
      .addFields(
        { name: 'User', value: `${targetUser} (${targetUser.id})` },
        { name: 'Reason', value: reason },
        { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})` }
      )
      .setTimestamp()
      .setFooter({ text: config.footerText });
    
    // Log the warning to the mod-logs channel
    const modLogsChannel = interaction.guild.channels.cache.find(
      channel => channel.name === config.channels.modLogs
    );
    
    if (modLogsChannel) {
      await modLogsChannel.send({ embeds: [logEmbed] });
    }
    
    // Reply to the interaction
    if (silent) {
      await interaction.reply({ 
        content: `✅ ${targetUser.tag} has been warned silently for: ${reason}`, 
        ephemeral: true 
      });
    } else {
      // Create public warning message
      const publicEmbed = new EmbedBuilder()
        .setColor('#FF9900')
        .setDescription(`⚠️ ${targetUser} has been warned by ${interaction.user} for: ${reason}`);
      
      await interaction.reply({ embeds: [publicEmbed] });
    }
    
    logger.info(`User ${targetUser.tag} warned by ${interaction.user.tag} for: ${reason}`);
  }
}; 