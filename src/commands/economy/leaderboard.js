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
    .setDescription('View the server\'s leaderboards')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('The leaderboard category to view')
        .setRequired(false)
        .addChoices(
          { name: 'Economy', value: 'economy' },
          { name: 'Mining', value: 'mining' },
          { name: 'Levels', value: 'levels' }
        )),

  async execute(interaction) {
    try {
      // Check if the interaction is still valid before deferring
      if (interaction.replied || interaction.deferred) {
        logger.warn(`Interaction already acknowledged for command: leaderboard`);
        return;
      }
      
      await interaction.deferReply();
      
      const category = interaction.options.getString('category') || 'economy';
      const economy = interaction.client.economy;
      const mining = interaction.client.mining;
      const leveling = interaction.client.leveling;
      
      let embed;
      
      // Create buttons for switching between leaderboard types
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('economy_leaderboard')
            .setLabel('Economy')
            .setStyle(category === 'economy' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('💰'),
          new ButtonBuilder()
            .setCustomId('mining_leaderboard')
            .setLabel('Mining')
            .setStyle(category === 'mining' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('⛏️'),
          new ButtonBuilder()
            .setCustomId('levels_leaderboard')
            .setLabel('Levels')
            .setStyle(category === 'levels' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('🏆')
        );
      
      // Get the appropriate leaderboard based on category
      switch (category) {
        case 'economy':
          if (economy && economy.createLeaderboardEmbed) {
            embed = await economy.createLeaderboardEmbed(interaction.guild);
          } else {
            embed = new EmbedBuilder()
              .setTitle('Economy Leaderboard')
              .setDescription('Economy module is not initialized')
              .setColor(config.embedColor || '#0099ff')
              .setTimestamp();
          }
          break;
        case 'mining':
          if (mining && mining.isInitialized) {
            embed = await this.createMiningLeaderboard(interaction.guild, mining);
          } else {
            embed = new EmbedBuilder()
              .setTitle('Mining Leaderboard')
              .setDescription('Mining module is not initialized')
              .setColor(config.embedColor || '#0099ff')
              .setTimestamp();
          }
          break;
        case 'levels':
          if (leveling && leveling.isInitialized) {
            embed = await leveling.createLeaderboardEmbed(interaction.guild);
          } else {
            embed = new EmbedBuilder()
              .setTitle('Levels Leaderboard')
              .setDescription('Leveling module is not initialized')
              .setColor(config.embedColor || '#0099ff')
              .setTimestamp();
          }
          break;
        default:
          embed = await economy.createLeaderboardEmbed(interaction.guild);
      }
      
      await interaction.editReply({ embeds: [embed], components: [row] });
      
      // Set up collector for button interactions
      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
      
      collector.on('collect', async i => {
        try {
          let newEmbed;
          
          if (i.customId === 'economy_leaderboard') {
            newEmbed = await economy.createLeaderboardEmbed(interaction.guild);
            
            // Update button styles
            row.components.forEach(button => {
              button.setStyle(button.data.custom_id === 'economy_leaderboard' ? ButtonStyle.Primary : ButtonStyle.Secondary);
            });
          } else if (i.customId === 'mining_leaderboard') {
            if (mining && mining.isInitialized) {
              newEmbed = await this.createMiningLeaderboard(interaction.guild, mining);
            } else {
              newEmbed = new EmbedBuilder()
                .setTitle('Mining Leaderboard')
                .setDescription('Mining module is not initialized')
                .setColor(config.embedColor || '#0099ff')
                .setTimestamp();
            }
            
            // Update button styles
            row.components.forEach(button => {
              button.setStyle(button.data.custom_id === 'mining_leaderboard' ? ButtonStyle.Primary : ButtonStyle.Secondary);
            });
          } else if (i.customId === 'levels_leaderboard') {
            if (leveling && leveling.isInitialized) {
              newEmbed = await leveling.createLeaderboardEmbed(interaction.guild);
            } else {
              newEmbed = new EmbedBuilder()
                .setTitle('Levels Leaderboard')
                .setDescription('Leveling module is not initialized')
                .setColor(config.embedColor || '#0099ff')
                .setTimestamp();
            }
            
            // Update button styles
            row.components.forEach(button => {
              button.setStyle(button.data.custom_id === 'levels_leaderboard' ? ButtonStyle.Primary : ButtonStyle.Secondary);
            });
          }
          
          await i.update({ embeds: [newEmbed], components: [row] });
        } catch (error) {
          logger.error(`Error handling button interaction: ${error.message}`);
        }
      });
      
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
      
    } catch (error) {
      logger.error(`Error executing leaderboard command: ${error.message}`);
      if (interaction.deferred) {
        await interaction.editReply({ content: 'An error occurred while fetching the leaderboard.' });
      } else {
        await interaction.reply({ content: 'An error occurred while fetching the leaderboard.', ephemeral: true });
      }
    }
  },
  
  /**
   * Create mining leaderboard embed
   * @param {Guild} guild - Discord guild
   * @param {Object} mining - Mining module
   * @returns {EmbedBuilder} Mining leaderboard embed
   */
  async createMiningLeaderboard(guild, mining) {
    try {
      const db = mining.db;
      
      if (!db || !db.isConnected) {
        return new EmbedBuilder()
          .setTitle('Mining Leaderboard')
          .setDescription('No mining data available')
          .setColor(config.embedColor || '#0099ff')
          .setTimestamp();
      }
      
      // Get top miners by level and XP
      const miners = await db.query(
        'SELECT user_id, level, xp FROM user_mining_data ORDER BY level DESC, xp DESC LIMIT 10'
      );
      
      if (!miners || miners.length === 0) {
        return new EmbedBuilder()
          .setTitle('Mining Leaderboard')
          .setDescription('No miners found in the leaderboard')
          .setColor(config.embedColor || '#0099ff')
          .setTimestamp();
      }
      
      // Format leaderboard entries
      let description = '';
      const medals = ['🥇', '🥈', '🥉'];
      
      for (let i = 0; i < miners.length; i++) {
        const entry = miners[i];
        const user = await guild.members.fetch(entry.user_id).catch(() => null);
        const username = user ? user.user.username : 'Unknown User';
        const rank = i < 3 ? medals[i] : `${i + 1}.`;
        
        description += `${rank} **${username}** - Level ${entry.level} (${entry.xp} XP)\n`;
      }
      
      // Get total resources mined
      const totalResources = await db.query(
        'SELECT SUM(quantity) as total FROM user_mining_inventory'
      );
      
      const totalMined = totalResources[0]?.total || 0;
      
      const embed = new EmbedBuilder()
        .setTitle('⛏️ Mining Leaderboard')
        .setDescription(description)
        .setColor(config.embedColor || '#0099ff')
        .addFields(
          { name: '🧱 Total Resources Mined', value: `${totalMined.toLocaleString()}`, inline: true },
          { name: '👥 Total Miners', value: `${miners.length}`, inline: true }
        )
        .setFooter({ 
          text: `${config.footerText || 'JMF Hosting Bot'} • Updated`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();
      
      return embed;
    } catch (error) {
      logger.error(`Error creating mining leaderboard: ${error.message}`);
      return new EmbedBuilder()
        .setTitle('Mining Leaderboard')
        .setDescription('An error occurred while creating the mining leaderboard')
        .setColor(config.embedColor || '#0099ff')
        .setTimestamp();
    }
  }
}; 