/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../../config.json');
const leveling = require('../../modules/leveling');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server\'s XP leaderboard')
    .addIntegerOption(option => 
      option
        .setName('page')
        .setDescription('The page of the leaderboard to view')
        .setRequired(false)
        .setMinValue(1)
    )
    .addIntegerOption(option => 
      option
        .setName('limit')
        .setDescription('Number of users to show per page (default: 10)')
        .setRequired(false)
        .setMinValue(5)
        .setMaxValue(25)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get options
      const page = interaction.options.getInteger('page') || 1;
      const limit = interaction.options.getInteger('limit') || 10;
      
      // Calculate offset
      const offset = (page - 1) * limit;
      
      // Get leaderboard data
      let leaderboardData;
      try {
        leaderboardData = await leveling.getLeaderboard(interaction.guild.id, limit, offset);
      } catch (error) {
        logger.error(`Error fetching leaderboard data: ${error.message}`);
        return interaction.editReply('An error occurred while fetching leaderboard data. Please try again later.');
      }
      
      // If no data, return message
      if (!leaderboardData || leaderboardData.length === 0) {
        return interaction.editReply('No leaderboard data available yet. Start chatting to earn XP!');
      }
      
      // Get total number of ranked users for pagination
      let totalUsers;
      try {
        totalUsers = await leveling.getTotalRankedUsers(interaction.guild.id);
      } catch (error) {
        logger.error(`Error fetching total ranked users: ${error.message}`);
        totalUsers = leaderboardData.length; // Fallback to current page count
      }
      
      const totalPages = Math.ceil(totalUsers / limit);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`🏆 XP Leaderboard - ${interaction.guild.name}`)
        .setDescription(`Showing the top XP earners in the server.\nPage ${page} of ${totalPages}`)
        .setColor(config.embedColor || '#00AAFF')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `${config.footerText || 'JMF Hosting'} • Use the buttons to navigate` })
        .setTimestamp();
      
      // Add leaderboard entries
      let leaderboardText = '';
      
      for (let i = 0; i < leaderboardData.length; i++) {
        const entry = leaderboardData[i];
        if (!entry) continue; // Skip if entry is undefined
        
        const rank = offset + i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        
        // Format the entry with proper spacing
        const username = entry.username || 'Unknown User';
        const level = entry.level || 0;
        const xp = entry.xp || 0;
        
        leaderboardText += `${medal} **${username}** • Level ${level} • ${xp.toLocaleString()} XP\n`;
      }
      
      // If no entries were added, show a message
      if (!leaderboardText) {
        leaderboardText = 'No data available for this page.';
      }
      
      embed.setDescription(`Showing the top XP earners in the server.\nPage ${page} of ${totalPages}\n\n${leaderboardText}`);
      
      // Create pagination buttons
      const paginationRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`leaderboard_first_${interaction.id}`)
            .setLabel('First')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId(`leaderboard_prev_${interaction.id}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId(`leaderboard_next_${interaction.id}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages),
          new ButtonBuilder()
            .setCustomId(`leaderboard_last_${interaction.id}`)
            .setLabel('Last')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages)
        );
      
      // Send the embed with pagination buttons
      const message = await interaction.editReply({
        embeds: [embed],
        components: [paginationRow]
      });
      
      // Create a collector for button interactions
      const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith(`leaderboard_`),
        time: 300000 // 5 minutes
      });
      
      collector.on('collect', async i => {
        try {
          // Extract the action from the custom ID
          const [, action, interactionId] = i.customId.split('_');
          
          // Verify this is for the correct interaction
          if (interactionId !== interaction.id) return;
          
          // Calculate the new page based on the button clicked
          let newPage = page;
          
          switch (action) {
            case 'first':
              newPage = 1;
              break;
            case 'prev':
              newPage = Math.max(1, page - 1);
              break;
            case 'next':
              newPage = Math.min(totalPages, page + 1);
              break;
            case 'last':
              newPage = totalPages;
              break;
          }
          
          // If the page hasn't changed, do nothing
          if (newPage === page) {
            await i.deferUpdate();
            return;
          }
          
          // Acknowledge the interaction
          await i.deferUpdate();
          
          // Execute the command with the new page
          const newInteraction = {
            ...interaction,
            options: {
              getInteger: (name) => {
                if (name === 'page') return newPage;
                if (name === 'limit') return limit;
                return null;
              }
            }
          };
          
          await this.execute(newInteraction);
          
          // Stop the collector since we're creating a new one
          collector.stop();
        } catch (error) {
          logger.error(`Error handling leaderboard pagination: ${error.message}`);
          
          // Try to respond to the interaction if it hasn't been acknowledged
          try {
            if (!i.deferred && !i.replied) {
              await i.reply({
                content: 'An error occurred while navigating the leaderboard. Please try again.',
                ephemeral: true
              });
            }
          } catch (replyError) {
            logger.error(`Error replying to interaction: ${replyError.message}`);
          }
        }
      });
      
      collector.on('end', collected => {
        // Remove buttons when collector ends if the message still exists
        try {
          if (message) {
            interaction.editReply({
              embeds: [embed],
              components: []
            }).catch(err => {
              // Ignore errors from editing old messages
              logger.debug(`Could not remove buttons: ${err.message}`);
            });
          }
        } catch (error) {
          logger.debug(`Error removing buttons: ${error.message}`);
        }
      });
      
      // Record command usage
      try {
        await this.recordCommandUsage(interaction, 'leaderboard');
      } catch (error) {
        logger.error(`Failed to record command usage in database: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error executing leaderboard command: ${error.message}`);
      
      // Try to respond if the interaction hasn't been replied to
      try {
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply('An error occurred while fetching leaderboard data. Please try again later.');
        } else if (!interaction.replied) {
          await interaction.reply({
            content: 'An error occurred while fetching leaderboard data. Please try again later.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        logger.error(`Error handling interaction: ${replyError.message}`);
      }
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