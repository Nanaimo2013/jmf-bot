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
const miningGame = require('../../modules/mining');
const { formatDuration } = require('../../utils/timeUtils');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mine')
    .setDescription('Mine for resources and earn coins')
    .addSubcommand(subcommand =>
      subcommand
        .setName('dig')
        .setDescription('Mine for resources in your current world'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View your mining stats'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('inventory')
        .setDescription('View your mining inventory'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('world')
        .setDescription('Change your mining world')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the world to mine in')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('shop')
        .setDescription('View and purchase mining equipment')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('The category of items to view')
            .setRequired(true)
            .addChoices(
              { name: 'Pickaxes', value: 'pickaxe' },
              { name: 'Pets', value: 'pet' },
              { name: 'Armor', value: 'armor' },
              { name: 'Boosters', value: 'booster' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('buy')
        .setDescription('Purchase mining equipment')
        .addStringOption(option =>
          option
            .setName('item')
            .setDescription('The item to purchase')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('The type of item')
            .setRequired(true)
            .addChoices(
              { name: 'Pickaxe', value: 'pickaxe' },
              { name: 'Pet', value: 'pet' },
              { name: 'Armor', value: 'armor' },
              { name: 'Booster', value: 'booster' }
            ))),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const username = interaction.user.username;
      
      // Initialize user if needed
      if (!miningGame.getUserStats(userId)) {
        miningGame.initializeUser(userId);
      }
      
      switch (subcommand) {
        case 'dig':
          await this.handleMining(interaction, userId);
          break;
        case 'stats':
          await this.handleStats(interaction, userId, username);
          break;
        case 'inventory':
          await this.handleInventory(interaction, userId, username);
          break;
        case 'world':
          await this.handleWorldChange(interaction, userId);
          break;
        case 'shop':
          await this.handleShop(interaction);
          break;
        case 'buy':
          await this.handlePurchase(interaction, userId);
          break;
      }
      
      // Record command usage
      try {
        await this.recordCommandUsage(interaction, 'mine');
      } catch (error) {
        logger.error(`Failed to record command usage in database: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error executing command mine: ${error.message}`);
      
      // Try to respond if the interaction hasn't been replied to
      try {
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply('An error occurred while processing your mining command. Please try again later.');
        } else if (!interaction.replied) {
          await interaction.reply({
            content: 'An error occurred while processing your mining command. Please try again later.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        logger.error(`Error handling interaction: ${replyError.message}`);
      }
    }
  },

  async handleMining(interaction, userId) {
    // Check if user can mine
    const canMine = miningGame.canMine(userId);
    
    if (canMine !== true) {
      // User is on cooldown
      const cooldownEmbed = new EmbedBuilder()
        .setTitle('⏳ Mining Cooldown')
        .setDescription(`You need to wait before mining again.`)
        .setColor('#FFA500')
        .addFields(
          { name: 'Time Remaining', value: formatDuration(canMine), inline: true }
        )
        .setFooter({ text: 'JMF Hosting • Mining System' })
        .setTimestamp();
      
      return interaction.editReply({ embeds: [cooldownEmbed] });
    }
    
    // User can mine, process mining
    try {
      const result = await miningGame.mine(userId);
      
      if (!result) {
        return interaction.editReply('An error occurred while mining. Please try again later.');
      }
      
      // Create the mining result embed
      const miningEmbed = new EmbedBuilder()
        .setTitle('⛏️ Mining Results')
        .setDescription(`You went mining in the ${result.world || 'Unknown'} world.`)
        .setColor('#00AAFF')
        .setFooter({ text: 'JMF Hosting • Mining System' })
        .setTimestamp();
      
      // Add XP and coins fields
      miningEmbed.addFields(
        { name: 'XP Gained', value: `${result.xpGained || 0} XP`, inline: true },
        { name: 'Coins Earned', value: `${result.coinsEarned || 0} coins`, inline: true }
      );
      
      // Add resources found if any
      if (result.resources && Array.isArray(result.resources) && result.resources.length > 0) {
        let resourcesText = '';
        
        for (const resource of result.resources) {
          if (resource && resource.name && resource.amount) {
            resourcesText += `${resource.amount}x ${resource.name}\n`;
          }
        }
        
        if (resourcesText) {
          miningEmbed.addFields({ name: 'Resources Found', value: resourcesText, inline: false });
        }
      } else {
        miningEmbed.addFields({ name: 'Resources Found', value: 'No resources found this time.', inline: false });
      }
      
      // Add level up message if applicable
      if (result.leveledUp) {
        miningEmbed.addFields({ 
          name: '🎉 Level Up!', 
          value: `You are now mining level ${result.newLevel}!`, 
          inline: false 
        });
      }
      
      await interaction.editReply({ embeds: [miningEmbed] });
    } catch (error) {
      logger.error(`Error during mining: ${error.message}`);
      await interaction.editReply('An error occurred while mining. Please try again later.');
    }
  },

  async handleStats(interaction, userId, username) {
    const statsEmbed = await miningGame.createStatsEmbed(userId, username);
    await interaction.editReply({ embeds: [statsEmbed] });
  },

  async handleInventory(interaction, userId, username) {
    const inventoryEmbed = await miningGame.createInventoryEmbed(userId, username);
    await interaction.editReply({ embeds: [inventoryEmbed] });
  },

  async handleWorldChange(interaction, userId) {
    const worldName = interaction.options.getString('name');
    
    try {
      const result = await miningGame.changeWorld(userId, worldName);
      
      if (result.success) {
        const worldChangeEmbed = new EmbedBuilder()
          .setTitle('🌍 World Changed')
          .setDescription(`You are now mining in the ${result.world} world.`)
          .setColor('#00AAFF')
          .addFields(
            { name: 'World Level', value: `${result.level}`, inline: true },
            { name: 'Resources', value: result.resources.join(', '), inline: true }
          )
          .setFooter({ text: 'JMF Hosting • Mining System' })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [worldChangeEmbed] });
      } else {
        await interaction.editReply(result.message || 'Failed to change world. Please try again.');
      }
    } catch (error) {
      logger.error(`Error changing world: ${error.message}`);
      await interaction.editReply('An error occurred while changing worlds. Please try again later.');
    }
  },

  async handleShop(interaction) {
    const category = interaction.options.getString('category');
    
    // This would be implemented based on your shop system
    // For now, just return a placeholder
    const shopEmbed = new EmbedBuilder()
      .setTitle('🛒 Mining Shop')
      .setDescription(`Browse and purchase mining equipment.`)
      .setColor('#00AAFF')
      .addFields(
        { name: 'Category', value: category.charAt(0).toUpperCase() + category.slice(1) + 's', inline: false },
        { name: 'Coming Soon', value: 'The shop system is currently under development.', inline: false }
      )
      .setFooter({ text: 'JMF Hosting • Mining System' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [shopEmbed] });
  },

  async handlePurchase(interaction, userId) {
    const itemName = interaction.options.getString('item');
    const itemType = interaction.options.getString('type');
    
    // This would be implemented based on your purchase system
    // For now, just return a placeholder
    const purchaseEmbed = new EmbedBuilder()
      .setTitle('🛒 Item Purchase')
      .setDescription(`Purchase system is under development.`)
      .setColor('#00AAFF')
      .addFields(
        { name: 'Item', value: itemName, inline: true },
        { name: 'Type', value: itemType.charAt(0).toUpperCase() + itemType.slice(1), inline: true },
        { name: 'Status', value: 'The purchase system is currently under development.', inline: false }
      )
      .setFooter({ text: 'JMF Hosting • Mining System' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [purchaseEmbed] });
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