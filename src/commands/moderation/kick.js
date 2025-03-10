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
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for kicking the user')
        .setRequired(false))
    .addBooleanOption(option => 
      option.setName('silent')
        .setDescription('Whether to silently kick the user (don\'t send them a DM)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const silent = interaction.options.getBoolean('silent') || false;
      
      // Check if the user is trying to kick themselves
      if (targetUser.id === interaction.user.id) {
        return interaction.editReply({ content: '❌ You cannot kick yourself.' });
      }
      
      // Check if the user is trying to kick a bot
      if (targetUser.bot) {
        return interaction.editReply({ content: '❌ You cannot kick a bot using this command.' });
      }
      
      // Get the target member
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      // Check if the member exists
      if (!targetMember) {
        return interaction.editReply({ content: '❌ This user is not in the server.' });
      }
      
      // Check if the bot can kick the target
      if (!targetMember.kickable) {
        return interaction.editReply({ content: '❌ I cannot kick this user. They may have higher permissions than me.' });
      }
      
      // Check if the user has a higher role than the target
      const executorMember = await interaction.guild.members.fetch(interaction.user.id);
      if (targetMember.roles.highest.position >= executorMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.editReply({ content: '❌ You cannot kick this user as they have the same or higher role than you.' });
      }
      
      // Create kick embed to send to the user
      const kickEmbed = new EmbedBuilder()
        .setColor('#FF7F00')
        .setTitle(`You have been kicked from ${interaction.guild.name}`)
        .setDescription(`**Reason:** ${reason}`)
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      // Send DM to the user if not silent
      if (!silent) {
        try {
          await targetUser.send({ embeds: [kickEmbed] });
        } catch (error) {
          logger.warn(`Could not send DM to ${targetUser.tag} (${targetUser.id}): ${error.message}`);
        }
      }
      
      // Kick the user
      await targetMember.kick(reason);
      
      // Log the kick
      await userLogger.logKick(targetUser, interaction.user, reason, interaction.client);
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor('#FF7F00')
        .setTitle('User Kicked')
        .setDescription(`✅ **${targetUser.tag}** has been kicked from the server.`)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Silent', value: silent ? 'Yes' : 'No', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      await interaction.editReply({ embeds: [successEmbed] });
      
    } catch (error) {
      logger.error(`Error in kick command: ${error.message}`);
      await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
    }
  }
}; 