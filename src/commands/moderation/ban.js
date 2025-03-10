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
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for banning the user')
        .setRequired(false))
    .addIntegerOption(option => 
      option.setName('delete_days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7))
    .addBooleanOption(option => 
      option.setName('silent')
        .setDescription('Whether to silently ban the user (don\'t send them a DM)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const deleteDays = interaction.options.getInteger('delete_days') || 1;
      const silent = interaction.options.getBoolean('silent') || false;
      
      // Check if the user is trying to ban themselves
      if (targetUser.id === interaction.user.id) {
        return interaction.editReply({ content: '❌ You cannot ban yourself.' });
      }
      
      // Check if the user is trying to ban a bot
      if (targetUser.bot) {
        return interaction.editReply({ content: '❌ You cannot ban a bot using this command.' });
      }
      
      // Get the target member if they are in the server
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      // If the member is in the server, perform additional checks
      if (targetMember) {
        // Check if the bot can ban the target
        if (!targetMember.bannable) {
          return interaction.editReply({ content: '❌ I cannot ban this user. They may have higher permissions than me.' });
        }
        
        // Check if the user has a higher role than the target
        const executorMember = await interaction.guild.members.fetch(interaction.user.id);
        if (targetMember.roles.highest.position >= executorMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
          return interaction.editReply({ content: '❌ You cannot ban this user as they have the same or higher role than you.' });
        }
      }
      
      // Create ban embed to send to the user
      const banEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`You have been banned from ${interaction.guild.name}`)
        .setDescription(`**Reason:** ${reason}`)
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      // Send DM to the user if not silent and they are in the server
      if (!silent && targetMember) {
        try {
          await targetUser.send({ embeds: [banEmbed] });
        } catch (error) {
          logger.warn(`Could not send DM to ${targetUser.tag} (${targetUser.id}): ${error.message}`);
        }
      }
      
      // Ban the user
      await interaction.guild.members.ban(targetUser, { 
        reason: reason,
        deleteMessageSeconds: deleteDays * 86400 // Convert days to seconds
      });
      
      // Log the ban
      await userLogger.logBan(targetUser, interaction.user, reason, deleteDays, interaction.client);
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('User Banned')
        .setDescription(`✅ **${targetUser.tag}** has been banned from the server.`)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Message Deletion', value: `${deleteDays} day${deleteDays === 1 ? '' : 's'}`, inline: true },
          { name: 'Silent', value: silent ? 'Yes' : 'No', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      await interaction.editReply({ embeds: [successEmbed] });
      
    } catch (error) {
      logger.error(`Error in ban command: ${error.message}`);
      await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
    }
  }
}; 