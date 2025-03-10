/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../../config.json');
const leveling = require('../../modules/leveling');
const Canvas = require('canvas');
const path = require('path');

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
        totalMessages: userData.totalMessages || 0,
        totalVoiceMinutes: userData.totalVoiceMinutes || 0,
        rank: userData.rank || '?'
      };
      
      // Calculate progress to next level
      const currentXP = safeUserData.xp;
      const currentLevel = safeUserData.level;
      const requiredXP = leveling.calculateRequiredXP(currentLevel);
      const progress = Math.min(Math.floor((currentXP / requiredXP) * 100), 100);
      
      // Format numbers with commas
      const formattedCurrentXP = currentXP.toLocaleString();
      const formattedRequiredXP = requiredXP.toLocaleString();
      const formattedTotalXP = safeUserData.totalXP.toLocaleString();
      const formattedTotalMessages = safeUserData.totalMessages.toLocaleString();
      const formattedVoiceMinutes = safeUserData.totalVoiceMinutes.toLocaleString();
      
      // Generate a visual progress bar using Canvas
      const progressBarImage = await this.generateProgressBar(progress, currentXP, requiredXP, currentLevel);
      const attachment = new AttachmentBuilder(progressBarImage, { name: 'progress-bar.png' });
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Level Stats`)
        .setDescription(`Here's ${targetUser.id === interaction.user.id ? 'your' : 'their'} current level and XP progress.`)
        .setColor(config.embedColor || '#00AAFF')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '🏆 Level', value: `${currentLevel}`, inline: true },
          { name: '✨ Total XP', value: `${formattedTotalXP}`, inline: true },
          { name: '📊 Rank', value: `#${safeUserData.rank}`, inline: true },
          { name: '📝 Messages', value: formattedTotalMessages, inline: true },
          { name: '🎙️ Voice Time', value: `${formattedVoiceMinutes} mins`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: `Progress to Level ${currentLevel + 1}`, value: `${progress}% Complete`, inline: false }
        )
        .setImage('attachment://progress-bar.png')
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
            name: '🎭 Next Role Reward', 
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
          name: '⚡ XP Rates', 
          value: `📝 Message: ${messageXP} XP\n🎙️ Voice: ${voiceXP} XP/min`, 
          inline: false 
        });
      }
      
      await interaction.editReply({ embeds: [embed], files: [attachment] });
      
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
   * Generate a visual progress bar using Canvas
   * @param {number} progress - Progress percentage (0-100)
   * @param {number} currentXP - Current XP
   * @param {number} requiredXP - Required XP for next level
   * @param {number} currentLevel - Current level
   * @returns {Buffer} - Canvas buffer
   */
  async generateProgressBar(progress, currentXP, requiredXP, currentLevel) {
    // Create canvas
    const canvas = Canvas.createCanvas(700, 100);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#36393f'; // Discord dark theme background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Progress bar background
    ctx.fillStyle = '#4e5d94'; // Darker shade for background
    ctx.beginPath();
    ctx.roundRect(25, 25, 650, 30, 15);
    ctx.fill();
    
    // Progress bar fill
    const fillWidth = Math.max(Math.floor((progress / 100) * 650), 10); // Minimum width of 10px
    const gradient = ctx.createLinearGradient(25, 0, 675, 0);
    gradient.addColorStop(0, '#5865f2'); // Discord blurple
    gradient.addColorStop(1, '#5e8ef7'); // Lighter blue
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(25, 25, fillWidth, 30, 15);
    ctx.fill();
    
    // Add text
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentXP.toLocaleString()} / ${requiredXP.toLocaleString()} XP (${progress}%)`, canvas.width / 2, 45);
    
    // Add level indicator
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${currentLevel}`, 25, 80);
    
    // Add next level indicator
    ctx.textAlign = 'right';
    ctx.fillText(`Level ${currentLevel + 1}`, 675, 80);
    
    // Return buffer
    return canvas.toBuffer();
  },
  
  /**
   * Record command usage in database
   * @param {Interaction} interaction - Discord interaction
   * @param {string} commandName - Command name
   */
  async recordCommandUsage(interaction, commandName) {
    if (!interaction.client.db || !interaction.client.db.isConnected) return;
    
    try {
      await interaction.client.db.query(`
        INSERT INTO command_usage 
        (user_id, guild_id, command_name, timestamp) 
        VALUES (?, ?, ?, NOW())
      `, [
        interaction.user.id,
        interaction.guild.id,
        commandName
      ]);
    } catch (error) {
      logger.error(`Failed to record command usage: ${error.message}`);
    }
  }
}; 