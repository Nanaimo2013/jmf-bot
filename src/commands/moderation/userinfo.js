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
    .setName('userinfo')
    .setDescription('View detailed information about a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to view information about')
        .setRequired(true))
    .addBooleanOption(option => 
      option.setName('private')
        .setDescription('Whether to show the information privately')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    const isPrivate = interaction.options.getBoolean('private') ?? true;
    await interaction.deferReply({ ephemeral: isPrivate });
    
    try {
      const targetUser = interaction.options.getUser('user');
      
      // Get the target member if they are in the server
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      // Get user case file
      const caseFileEmbed = await userLogger.getUserCaseFile(targetUser);
      
      // Add member-specific information if the user is in the server
      if (targetMember) {
        const joinedTimestamp = targetMember.joinedTimestamp;
        const roles = targetMember.roles.cache
          .filter(role => role.name !== '@everyone')
          .sort((a, b) => b.position - a.position);
        
        caseFileEmbed.addFields(
          { name: 'Nickname', value: targetMember.nickname || 'None', inline: true },
          { name: 'Joined Server', value: `<t:${Math.floor(joinedTimestamp / 1000)}:F> (<t:${Math.floor(joinedTimestamp / 1000)}:R>)`, inline: true },
          { name: 'Boosting Since', value: targetMember.premiumSince ? `<t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:F>` : 'Not boosting', inline: true },
          { name: `Roles [${roles.size}]`, value: roles.size ? roles.map(role => `<@&${role.id}>`).join(', ') : 'None', inline: false }
        );
      }
      
      // Create a second embed for detailed moderation history if the user has any
      const embedsToSend = [caseFileEmbed];
      
      // Get user data for detailed history
      const userData = await userLogger.getUserData(targetUser.id);
      
      // If the user has warnings, create a warnings embed
      if (userData.warnings.length > 0) {
        const warningsEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle(`Warning History: ${targetUser.tag}`)
          .setDescription(`Total Warnings: ${userData.warnings.length}`)
          .setTimestamp()
          .setFooter({ text: config.footerText });
        
        // Add the most recent 10 warnings
        const recentWarnings = userData.warnings.slice(-10).reverse();
        
        recentWarnings.forEach((warning, index) => {
          const date = new Date(warning.timestamp);
          warningsEmbed.addFields({
            name: `Warning #${warning.id} - <t:${Math.floor(date.getTime() / 1000)}:F>`,
            value: `**Reason:** ${warning.reason}\n**Moderator:** ${warning.moderatorTag}`,
            inline: false
          });
        });
        
        if (userData.warnings.length > 10) {
          warningsEmbed.setDescription(`Total Warnings: ${userData.warnings.length} (Showing the 10 most recent)`);
        }
        
        embedsToSend.push(warningsEmbed);
      }
      
      // If the user has notes, create a notes embed
      if (userData.notes.length > 0) {
        const notesEmbed = new EmbedBuilder()
          .setColor('#00FFFF')
          .setTitle(`Staff Notes: ${targetUser.tag}`)
          .setDescription(`Total Notes: ${userData.notes.length}`)
          .setTimestamp()
          .setFooter({ text: config.footerText });
        
        // Add the most recent 10 notes
        const recentNotes = userData.notes.slice(-10).reverse();
        
        recentNotes.forEach((note, index) => {
          const date = new Date(note.timestamp);
          notesEmbed.addFields({
            name: `Note #${note.id} - <t:${Math.floor(date.getTime() / 1000)}:F>`,
            value: `**Content:** ${note.content}\n**Staff:** ${note.moderatorTag}`,
            inline: false
          });
        });
        
        if (userData.notes.length > 10) {
          notesEmbed.setDescription(`Total Notes: ${userData.notes.length} (Showing the 10 most recent)`);
        }
        
        embedsToSend.push(notesEmbed);
      }
      
      await interaction.editReply({ embeds: embedsToSend });
      
    } catch (error) {
      logger.error(`Error in userinfo command: ${error.message}`);
      await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
    }
  }
}; 