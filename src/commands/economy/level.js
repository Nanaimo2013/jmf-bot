/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../../config.json');
const leveling = require('../../modules/leveling');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your level and XP progress')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to check (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get the target user (defaults to the command user)
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return interaction.editReply({ content: 'That user is not in this server.', ephemeral: true });
      }
      
      // Get user's level data
      const userData = await leveling.getUserData(targetUser.id, interaction.guild.id);
      
      // If no data, create default data
      if (!userData) {
        logger.warn(`No level data found for user ${targetUser.id} in guild ${interaction.guild.id}`);
        return interaction.editReply({ 
          content: `No level data found for ${targetUser.username}. They need to send messages to earn XP.`,
          ephemeral: true
        });
      }
      
      // Ensure userData has all required properties
      const safeUserData = {
        xp: userData.xp || 0,
        level: userData.level || 0,
        totalXP: userData.totalXP || userData.xp || 0,
        rank: userData.rank || '?'
      };
      
      // Calculate progress to next level
      const currentXP = safeUserData.xp;
      const currentLevel = safeUserData.level;
      const requiredXP = leveling.calculateRequiredXP(currentLevel);
      const progress = Math.min(Math.floor((currentXP / requiredXP) * 100), 100);
      
      // Create progress bar
      const progressBarLength = 20;
      const filledBlocks = Math.floor((progress / 100) * progressBarLength);
      const emptyBlocks = progressBarLength - filledBlocks;
      const progressBar = `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}`;
      
      // Format numbers with commas
      const formattedCurrentXP = currentXP.toLocaleString();
      const formattedRequiredXP = requiredXP.toLocaleString();
      const formattedTotalXP = safeUserData.totalXP.toLocaleString();
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Level`)
        .setDescription(`Here's ${targetUser.id === interaction.user.id ? 'your' : 'their'} current level and XP progress.`)
        .setColor(config.embedColor || '#00AAFF')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: 'Level', value: `${currentLevel}`, inline: true },
          { name: 'Total XP', value: `${formattedTotalXP}`, inline: true },
          { name: 'Rank', value: `#${safeUserData.rank}`, inline: true },
          { name: 'Progress to Level ' + (currentLevel + 1), value: `${progressBar} ${progress}%\n${formattedCurrentXP} / ${formattedRequiredXP} XP`, inline: false }
        )
        .setFooter({ text: `${config.footerText || 'JMF Hosting'} • Level System` })
        .setTimestamp();
      
      // Add level roles if configured
      if (config.levelSystem?.levelRoles && Object.keys(config.levelSystem.levelRoles).length > 0) {
        const nextRoleLevels = Object.keys(config.levelSystem.levelRoles)
          .map(Number)
          .filter(level => level > currentLevel)
          .sort((a, b) => a - b);
        
        if (nextRoleLevels.length > 0) {
          const nextRoleLevel = nextRoleLevels[0];
          const nextRoleName = config.levelSystem.levelRoles[nextRoleLevel];
          embed.addFields({ 
            name: 'Next Role Reward', 
            value: `Level ${nextRoleLevel}: ${nextRoleName}`, 
            inline: false 
          });
        }
      }
      
      // Add message and voice XP rates if it's the user checking their own level
      if (targetUser.id === interaction.user.id) {
        const messageXP = config.levelSystem?.xpPerMessage || 5;
        const voiceXP = config.levelSystem?.voiceXpPerMinute || 2;
        
        embed.addFields({ 
          name: 'XP Rates', 
          value: `Message: ${messageXP} XP\nVoice: ${voiceXP} XP/min`, 
          inline: false 
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
      // Record command usage
      try {
        await this.recordCommandUsage(interaction, 'level');
      } catch (error) {
        logger.error(`Failed to record command usage in database: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error executing level command: ${error.message}`);
      await interaction.editReply({ 
        content: 'An error occurred while fetching level data. Please try again later.',
        ephemeral: true
      });
    }
  },
  
  /**
   * Record command usage in the database
   * @param {CommandInteraction} interaction - The interaction
   * @param {string} command - The command name
   */
  async recordCommandUsage(interaction, command) {
    try {
      // Try to insert into command_usage table
      try {
        await interaction.client.db.query(
          'INSERT INTO command_usage (user_id, guild_id, command, channel_id, timestamp) VALUES (?, ?, ?, ?, ?)',
          [interaction.user.id, interaction.guild.id, command, interaction.channel.id, new Date()]
        );
      } catch (error) {
        // If the error is about missing command column, try without it
        if (error.message.includes('no column named command')) {
          logger.error(`Database query error: ${error.message}`);
          logger.error(`Query: INSERT INTO command_usage (user_id, guild_id, command, channel_id, timestamp) VALUES (?, ?, ?, ?, ?)`);
          logger.error(`Failed to record command usage in database: ${error.message}`);
          
          // Try to insert without the command column
          await interaction.client.db.query(
            'INSERT INTO command_usage (user_id, guild_id, channel_id, timestamp) VALUES (?, ?, ?, ?)',
            [interaction.user.id, interaction.guild.id, interaction.channel.id, new Date()]
          );
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error(`Error recording command usage: ${error.message}`);
    }
  }
}; 