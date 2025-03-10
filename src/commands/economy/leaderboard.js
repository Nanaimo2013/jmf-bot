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
      const leaderboardData = await leveling.getLeaderboard(interaction.guild.id, limit, offset);
      
      // If no data, return message
      if (!leaderboardData || leaderboardData.length === 0) {
        return interaction.editReply('No leaderboard data available yet. Start chatting to earn XP!');
      }
      
      // Get total number of ranked users for pagination
      const totalUsers = await leveling.getTotalRankedUsers(interaction.guild.id);
      const totalPages = Math.ceil(totalUsers / limit);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.guild.name} XP Leaderboard`)
        .setDescription(`Top members ranked by XP - Page ${page}/${totalPages}`)
        .setColor(config.embedColor || '#00AAFF')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: `${config.footerText || 'JMF Hosting'} • Use /level to check your detailed stats` })
        .setTimestamp();
      
      // Add fields for each user
      let leaderboardText = '';
      
      for (let i = 0; i < leaderboardData.length; i++) {
        const userData = leaderboardData[i];
        const rank = offset + i + 1;
        const member = await interaction.guild.members.fetch(userData.userId).catch(() => null);
        const username = member ? member.user.username : 'Unknown User';
        
        // Create medal emojis for top 3
        let rankDisplay = `${rank}.`;
        if (rank === 1) rankDisplay = '🥇';
        else if (rank === 2) rankDisplay = '🥈';
        else if (rank === 3) rankDisplay = '🥉';
        
        leaderboardText += `${rankDisplay} **${username}** - Level ${userData.level} (${userData.totalXP.toLocaleString()} XP)\n`;
      }
      
      embed.setDescription(`Top members ranked by XP - Page ${page}/${totalPages}\n\n${leaderboardText}`);
      
      // Create pagination buttons if needed
      let components = [];
      
      if (totalPages > 1) {
        const row = new ActionRowBuilder();
        
        // First page button
        const firstPageButton = new ButtonBuilder()
          .setCustomId(`leaderboard_first_${interaction.user.id}`)
          .setLabel('First')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1);
        
        // Previous page button
        const prevPageButton = new ButtonBuilder()
          .setCustomId(`leaderboard_prev_${interaction.user.id}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1);
        
        // Page indicator button (non-functional)
        const pageIndicator = new ButtonBuilder()
          .setCustomId(`leaderboard_page_${interaction.user.id}`)
          .setLabel(`Page ${page}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);
        
        // Next page button
        const nextPageButton = new ButtonBuilder()
          .setCustomId(`leaderboard_next_${interaction.user.id}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages);
        
        // Last page button
        const lastPageButton = new ButtonBuilder()
          .setCustomId(`leaderboard_last_${interaction.user.id}`)
          .setLabel('Last')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages);
        
        row.addComponents(firstPageButton, prevPageButton, pageIndicator, nextPageButton, lastPageButton);
        components.push(row);
      }
      
      await interaction.editReply({ 
        embeds: [embed],
        components: components
      });
      
      // Set up collector for pagination buttons
      if (components.length > 0) {
        const filter = i => i.customId.startsWith('leaderboard_') && i.customId.endsWith(interaction.user.id);
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes
        
        collector.on('collect', async i => {
          // Extract the action from the custom ID
          const action = i.customId.split('_')[1];
          let newPage = page;
          
          if (action === 'first') {
            newPage = 1;
          } else if (action === 'prev') {
            newPage = Math.max(1, page - 1);
          } else if (action === 'next') {
            newPage = Math.min(totalPages, page + 1);
          } else if (action === 'last') {
            newPage = totalPages;
          }
          
          if (newPage !== page) {
            // Defer the update
            await i.deferUpdate();
            
            // Execute the command with the new page
            const newInteraction = { ...interaction };
            newInteraction.options = {
              getInteger: (name) => {
                if (name === 'page') return newPage;
                if (name === 'limit') return limit;
                return null;
              }
            };
            
            await this.execute(newInteraction);
          } else {
            await i.deferUpdate();
          }
        });
        
        collector.on('end', () => {
          // Remove buttons when collector expires
          interaction.editReply({ 
            embeds: [embed],
            components: []
          }).catch(() => {});
        });
      }
    } catch (error) {
      logger.error(`Error executing leaderboard command: ${error.message}`);
      await interaction.editReply({ 
        content: 'An error occurred while fetching leaderboard data. Please try again later.',
        ephemeral: true
      });
    }
  }
}; 