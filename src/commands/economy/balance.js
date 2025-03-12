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
const config = require('../../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance or another user\'s balance')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to check balance for (defaults to yourself)')
        .setRequired(false)),

  async execute(interaction) {
    try {
      // Check if the interaction is still valid before deferring
      if (interaction.replied || interaction.deferred) {
        logger.warn(`Interaction already acknowledged for command: balance`);
        return;
      }
      
      await interaction.deferReply();
      
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const economy = interaction.client.economy;
      
      // Check if economy module exists and is initialized
      if (!economy) {
        logger.error('Economy module not found or not initialized');
        return await interaction.editReply('Economy system is currently unavailable. Please try again later.');
      }
      
      // Get user's balance
      const balance = economy.getBalance ? economy.getBalance(targetUser.id) : 0;
      
      // Get user's mining stats if available
      let miningStats = null;
      const mining = interaction.client.mining;
      if (mining && mining.isInitialized && mining.getUserStats) {
        miningStats = mining.getUserStats(targetUser.id);
      }
      
      // Get user's transaction history
      let transactions = [];
      if (economy.getRecentTransactions) {
        transactions = await economy.getRecentTransactions(targetUser.id, 5);
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Economy Profile`)
        .setColor(config.embedColor || '#0099ff')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '💰 Balance', value: `${balance.toLocaleString()} coins`, inline: true },
          { name: '🏆 Rank', value: await economy.getUserRank(targetUser.id), inline: true }
        )
        .setFooter({ 
          text: `${config.footerText || 'JMF Hosting Bot'} • User ID: ${targetUser.id}`,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();
      
      // Add mining stats if available
      if (miningStats) {
        embed.addFields(
          { name: '⛏️ Mining Level', value: `Level ${miningStats.level}`, inline: true },
          { name: '✨ Mining XP', value: `${miningStats.xp}/${mining.calculateLevelUpXp(miningStats.level)}`, inline: true },
          { name: '🌍 Current World', value: miningStats.currentWorld || 'Overworld', inline: true }
        );
      }
      
      // Add transaction history if available
      if (transactions && transactions.length > 0) {
        const transactionList = transactions.map(t => {
          const amount = t.amount > 0 ? `+${t.amount}` : t.amount;
          const emoji = t.amount > 0 ? '📈' : '📉';
          return `${emoji} **${amount}** coins - ${t.reason} <t:${Math.floor(new Date(t.timestamp).getTime() / 1000)}:R>`;
        }).join('\n');
        
        embed.addFields({ name: '📊 Recent Transactions', value: transactionList });
      } else {
        embed.addFields({ name: '📊 Recent Transactions', value: 'No recent transactions' });
      }
      
      // Create buttons for additional actions
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('inventory_view')
            .setLabel('View Inventory')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎒'),
          new ButtonBuilder()
            .setCustomId('market_view')
            .setLabel('Market')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🛒'),
          new ButtonBuilder()
            .setCustomId('leaderboard_view')
            .setLabel('Leaderboard')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🏆')
        );
      
      await interaction.editReply({ embeds: [embed], components: [row] });
      
      // Set up collector for button interactions
      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
      
      collector.on('collect', async i => {
        try {
          if (i.customId === 'inventory_view') {
            const inventoryEmbed = mining.createInventoryEmbed(targetUser.id, targetUser.username);
            await i.update({ embeds: [inventoryEmbed], components: [row] });
          } else if (i.customId === 'market_view') {
            const marketEmbed = economy.createMarketEmbed();
            await i.update({ embeds: [marketEmbed], components: [row] });
          } else if (i.customId === 'leaderboard_view') {
            const leaderboardEmbed = await economy.createLeaderboardEmbed(interaction.guild);
            await i.update({ embeds: [leaderboardEmbed], components: [row] });
          }
        } catch (error) {
          logger.error(`Error handling button interaction: ${error.message}`);
        }
      });
      
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
      
    } catch (error) {
      logger.error(`Error executing balance command: ${error.message}`);
      if (interaction.deferred) {
        await interaction.editReply({ content: 'An error occurred while fetching the balance information.' });
      } else {
        await interaction.reply({ content: 'An error occurred while fetching the balance information.', ephemeral: true });
      }
    }
  }
}; 