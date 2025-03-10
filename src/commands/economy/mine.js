/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../../config.json');
const miningGame = require('../../modules/mining');
const { formatDuration } = require('../../utils/timeUtils');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mine')
    .setDescription('Mine resources or manage your mining operations')
    .addSubcommand(subcommand =>
      subcommand
        .setName('dig')
        .setDescription('Mine for resources'))
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
        .setDescription('Visit the mining shop'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('sell')
        .setDescription('Sell your mined resources')),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      const subcommand = interaction.options.getSubcommand();
      const mining = interaction.client.mining;
      const economy = interaction.client.economy;
      
      if (!mining || !mining.isInitialized) {
        return interaction.editReply('The mining module is not initialized. Please try again later.');
      }
      
      switch (subcommand) {
        case 'dig':
          await this.handleMine(interaction, mining);
          break;
        case 'stats':
          await this.handleStats(interaction, mining);
          break;
        case 'inventory':
          await this.handleInventory(interaction, mining);
          break;
        case 'world':
          await this.handleWorldChange(interaction, mining.getUserStats(interaction.user.id).userId);
          break;
        case 'shop':
          await this.handleShop(interaction, mining);
          break;
        case 'sell':
          await this.handleSell(interaction, mining, economy);
          break;
        default:
          await this.handleStats(interaction, mining);
      }
      
      // Record command usage
      try {
        await this.recordCommandUsage(interaction, 'mine');
      } catch (error) {
        logger.error(`Failed to record command usage in database: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error executing mine command: ${error.message}`);
      if (interaction.deferred) {
        await interaction.editReply({ content: 'An error occurred while processing your mining command.' });
      } else {
        await interaction.reply({ content: 'An error occurred while processing your mining command.', ephemeral: true });
      }
    }
  },
  
  /**
   * Handle the mine dig subcommand
   * @param {CommandInteraction} interaction - The interaction
   * @param {Object} mining - The mining module
   */
  async handleMine(interaction, mining) {
    try {
      const userId = interaction.user.id;
      
      // Check if user can mine
      const cooldownInfo = mining.canMine(userId);
      
      if (!cooldownInfo.canMine) {
        const embed = new EmbedBuilder()
          .setTitle('⏳ Mining Cooldown')
          .setDescription(`You need to wait before mining again.\nCooldown remaining: **${cooldownInfo.remainingTime}**`)
          .setColor('#FF9900')
          .setFooter({ text: 'Upgrade your pickaxe to reduce cooldown time!' })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
      }
      
      // Perform mining
      const result = await mining.mine(userId);
      
      if (!result.success) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Mining Failed')
          .setDescription(result.message || 'An error occurred while mining.')
          .setColor('#FF0000')
          .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
      }
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('⛏️ Mining Successful!')
        .setDescription(`You mined **${result.quantity}x ${result.resource}**!${result.bonusXp ? `\n\n**BONUS:** +${result.bonusXp} XP` : ''}`)
        .setColor('#00FF00')
        .addFields(
          { name: '🧱 Resource', value: result.resource, inline: true },
          { name: '📦 Quantity', value: result.quantity.toString(), inline: true },
          { name: '✨ XP Gained', value: result.xp.toString(), inline: true }
        )
        .setFooter({ text: `Cooldown: ${mining.getCooldownTime(userId)} seconds` })
        .setTimestamp();
      
      // Add level up message if applicable
      if (result.levelUp) {
        embed.addFields({
          name: '🎉 LEVEL UP!',
          value: `You are now level **${result.newLevel}**!`
        });
      }
      
      // Create buttons for quick actions
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('mine_again')
            .setLabel('Mine Again')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⛏️'),
          new ButtonBuilder()
            .setCustomId('view_inventory')
            .setLabel('Inventory')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎒'),
          new ButtonBuilder()
            .setCustomId('sell_resources')
            .setLabel('Sell Resources')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💰')
        );
      
      await interaction.editReply({ embeds: [embed], components: [row] });
      
      // Set up collector for button interactions
      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
      
      collector.on('collect', async i => {
        try {
          if (i.customId === 'mine_again') {
            await i.deferUpdate();
            await this.handleMine(interaction, mining);
          } else if (i.customId === 'view_inventory') {
            await i.deferUpdate();
            await this.handleInventory(interaction, mining);
          } else if (i.customId === 'sell_resources') {
            await i.deferUpdate();
            await this.handleSell(interaction, mining, interaction.client.economy);
          }
        } catch (error) {
          logger.error(`Error handling button interaction: ${error.message}`);
        }
      });
      
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
      
    } catch (error) {
      logger.error(`Error handling mine command: ${error.message}`);
      await interaction.editReply('An error occurred while mining. Please try again later.');
    }
  },
  
  /**
   * Handle the mine stats subcommand
   * @param {CommandInteraction} interaction - The interaction
   * @param {Object} mining - The mining module
   */
  async handleStats(interaction, mining) {
    try {
      const userId = interaction.user.id;
      const stats = mining.getUserStats(userId);
      
      if (!stats) {
        return interaction.editReply('You have not started mining yet. Use `/mine dig` to start mining!');
      }
      
      // Create stats embed
      const embed = mining.createStatsEmbed(userId, interaction.user.username);
      
      // Create buttons for quick actions
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('mine_now')
            .setLabel('Mine Now')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⛏️'),
          new ButtonBuilder()
            .setCustomId('view_inventory')
            .setLabel('Inventory')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎒'),
          new ButtonBuilder()
            .setCustomId('visit_shop')
            .setLabel('Shop')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🛒')
        );
      
      await interaction.editReply({ embeds: [embed], components: [row] });
      
      // Set up collector for button interactions
      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
      
      collector.on('collect', async i => {
        try {
          if (i.customId === 'mine_now') {
            await i.deferUpdate();
            await this.handleMine(interaction, mining);
          } else if (i.customId === 'view_inventory') {
            await i.deferUpdate();
            await this.handleInventory(interaction, mining);
          } else if (i.customId === 'visit_shop') {
            await i.deferUpdate();
            await this.handleShop(interaction, mining);
          }
        } catch (error) {
          logger.error(`Error handling button interaction: ${error.message}`);
        }
      });
      
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
      
    } catch (error) {
      logger.error(`Error handling stats command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching your mining stats. Please try again later.');
    }
  },
  
  /**
   * Handle the mine inventory subcommand
   * @param {CommandInteraction} interaction - The interaction
   * @param {Object} mining - The mining module
   */
  async handleInventory(interaction, mining) {
    try {
      const userId = interaction.user.id;
      const inventory = mining.getUserInventory(userId);
      
      if (!inventory || Object.keys(inventory).length === 0) {
        return interaction.editReply('Your mining inventory is empty. Use `/mine dig` to start mining!');
      }
      
      // Create inventory embed
      const embed = mining.createInventoryEmbed(userId, interaction.user.username);
      
      // Create buttons for quick actions
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('mine_now')
            .setLabel('Mine Now')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⛏️'),
          new ButtonBuilder()
            .setCustomId('view_stats')
            .setLabel('Stats')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊'),
          new ButtonBuilder()
            .setCustomId('sell_resources')
            .setLabel('Sell Resources')
            .setStyle(ButtonStyle.Success)
            .setEmoji('💰')
        );
      
      await interaction.editReply({ embeds: [embed], components: [row] });
      
      // Set up collector for button interactions
      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
      
      collector.on('collect', async i => {
        try {
          if (i.customId === 'mine_now') {
            await i.deferUpdate();
            await this.handleMine(interaction, mining);
          } else if (i.customId === 'view_stats') {
            await i.deferUpdate();
            await this.handleStats(interaction, mining);
          } else if (i.customId === 'sell_resources') {
            await i.deferUpdate();
            await this.handleSell(interaction, mining, interaction.client.economy);
          }
        } catch (error) {
          logger.error(`Error handling button interaction: ${error.message}`);
        }
      });
      
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
      
    } catch (error) {
      logger.error(`Error handling inventory command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching your mining inventory. Please try again later.');
    }
  },
  
  /**
   * Handle the mine shop subcommand
   * @param {CommandInteraction} interaction - The interaction
   * @param {Object} mining - The mining module
   */
  async handleShop(interaction, mining) {
    try {
      const userId = interaction.user.id;
      const stats = mining.getUserStats(userId);
      
      if (!stats) {
        return interaction.editReply('You have not started mining yet. Use `/mine dig` to start mining!');
      }
      
      // Get shop items
      const shopItems = mining.getShopItems();
      
      // Create shop embed
      const embed = new EmbedBuilder()
        .setTitle('🛒 Mining Shop')
        .setDescription('Upgrade your mining equipment and unlock new worlds!')
        .setColor(config.embedColor || '#0099ff')
        .setFooter({ text: `Your balance: ${interaction.client.economy.getBalance(userId)} coins` })
        .setTimestamp();
      
      // Add shop categories
      const pickaxes = shopItems.filter(item => item.type === 'pickaxe');
      const worlds = shopItems.filter(item => item.type === 'world');
      
      if (pickaxes.length > 0) {
        let pickaxeText = '';
        pickaxes.forEach(item => {
          const owned = stats.pickaxe === item.id;
          const canAfford = interaction.client.economy.getBalance(userId) >= item.price;
          const status = owned ? '✅ Owned' : canAfford ? '💰 Available' : '❌ Can\'t afford';
          
          pickaxeText += `**${item.name}** - ${item.price.toLocaleString()} coins\n`;
          pickaxeText += `${item.description}\n`;
          pickaxeText += `${status}\n\n`;
        });
        
        embed.addFields({ name: '⛏️ Pickaxes', value: pickaxeText || 'No pickaxes available' });
      }
      
      if (worlds.length > 0) {
        let worldText = '';
        worlds.forEach(item => {
          const owned = stats.unlockedWorlds?.includes(item.id);
          const canAfford = interaction.client.economy.getBalance(userId) >= item.price;
          const status = owned ? '✅ Unlocked' : canAfford ? '💰 Available' : '❌ Can\'t afford';
          
          worldText += `**${item.name}** - ${item.price.toLocaleString()} coins\n`;
          worldText += `${item.description}\n`;
          worldText += `${status}\n\n`;
        });
        
        embed.addFields({ name: '🌍 Worlds', value: worldText || 'No worlds available' });
      }
      
      // Create select menu for purchasing items
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_purchase')
        .setPlaceholder('Select an item to purchase')
        .setMinValues(1)
        .setMaxValues(1);
      
      // Add options for all available items
      shopItems.forEach(item => {
        const owned = item.type === 'pickaxe' ? stats.pickaxe === item.id : stats.unlockedWorlds?.includes(item.id);
        const canAfford = interaction.client.economy.getBalance(userId) >= item.price;
        
        if (!owned && canAfford) {
          selectMenu.addOptions({
            label: item.name,
            value: `${item.type}_${item.id}`,
            description: `${item.price.toLocaleString()} coins`,
            emoji: item.type === 'pickaxe' ? '⛏️' : '🌍'
          });
        }
      });
      
      // Create buttons for quick actions
      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('mine_now')
            .setLabel('Mine Now')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⛏️'),
          new ButtonBuilder()
            .setCustomId('view_inventory')
            .setLabel('Inventory')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎒'),
          new ButtonBuilder()
            .setCustomId('view_stats')
            .setLabel('Stats')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊')
        );
      
      // Only add select menu if there are purchasable items
      const components = [buttonRow];
      if (selectMenu.options.length > 0) {
        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        components.unshift(selectRow);
      }
      
      await interaction.editReply({ embeds: [embed], components });
      
      // Set up collector for interactions
      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
      
      collector.on('collect', async i => {
        try {
          if (i.customId === 'shop_purchase') {
            await i.deferUpdate();
            
            const [itemType, itemId] = i.values[0].split('_');
            const result = await mining.purchaseItem(userId, itemType, itemId);
            
            if (result.success) {
              const successEmbed = new EmbedBuilder()
                .setTitle('✅ Purchase Successful')
                .setDescription(`You have purchased **${result.itemName}** for ${result.price.toLocaleString()} coins!`)
                .setColor('#00FF00')
                .setTimestamp();
              
              await interaction.editReply({ embeds: [successEmbed], components: [buttonRow] });
              
              // Wait 3 seconds and show the shop again
              setTimeout(async () => {
                await this.handleShop(interaction, mining);
              }, 3000);
            } else {
              const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Purchase Failed')
                .setDescription(result.message || 'An error occurred during purchase.')
                .setColor('#FF0000')
                .setTimestamp();
              
              await interaction.editReply({ embeds: [errorEmbed], components: [buttonRow] });
              
              // Wait 3 seconds and show the shop again
              setTimeout(async () => {
                await this.handleShop(interaction, mining);
              }, 3000);
            }
          } else if (i.customId === 'mine_now') {
            await i.deferUpdate();
            await this.handleMine(interaction, mining);
          } else if (i.customId === 'view_inventory') {
            await i.deferUpdate();
            await this.handleInventory(interaction, mining);
          } else if (i.customId === 'view_stats') {
            await i.deferUpdate();
            await this.handleStats(interaction, mining);
          }
        } catch (error) {
          logger.error(`Error handling shop interaction: ${error.message}`);
        }
      });
      
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
      
    } catch (error) {
      logger.error(`Error handling shop command: ${error.message}`);
      await interaction.editReply('An error occurred while accessing the mining shop. Please try again later.');
    }
  },
  
  /**
   * Handle the mine sell subcommand
   * @param {CommandInteraction} interaction - The interaction
   * @param {Object} mining - The mining module
   * @param {Object} economy - The economy module
   */
  async handleSell(interaction, mining, economy) {
    try {
      const userId = interaction.user.id;
      const inventory = mining.getUserInventory(userId);
      
      if (!inventory || Object.keys(inventory).length === 0) {
        return interaction.editReply('Your mining inventory is empty. Use `/mine dig` to start mining!');
      }
      
      // Get resource prices
      const resourcePrices = mining.getResourcePrices();
      
      // Create sell embed
      const embed = new EmbedBuilder()
        .setTitle('💰 Sell Resources')
        .setDescription('Select resources to sell from your inventory')
        .setColor(config.embedColor || '#0099ff')
        .setFooter({ text: `Your balance: ${economy.getBalance(userId)} coins` })
        .setTimestamp();
      
      // Add inventory items with prices
      let inventoryText = '';
      let totalValue = 0;
      
      Object.entries(inventory).forEach(([resourceId, quantity]) => {
        const resourceInfo = mining.getResourceInfo(resourceId);
        const price = resourcePrices[resourceId] || 0;
        const value = price * quantity;
        totalValue += value;
        
        inventoryText += `**${resourceInfo?.name || resourceId}** x${quantity} - ${price} coins each (${value.toLocaleString()} total)\n`;
      });
      
      embed.addFields(
        { name: '📦 Your Resources', value: inventoryText || 'No resources in inventory' },
        { name: '💵 Total Value', value: `${totalValue.toLocaleString()} coins`, inline: true }
      );
      
      // Create select menu for selling items
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('sell_resource')
        .setPlaceholder('Select a resource to sell')
        .setMinValues(1)
        .setMaxValues(1);
      
      // Add options for all resources in inventory
      Object.entries(inventory).forEach(([resourceId, quantity]) => {
        const resourceInfo = mining.getResourceInfo(resourceId);
        const price = resourcePrices[resourceId] || 0;
        
        selectMenu.addOptions({
          label: `${resourceInfo?.name || resourceId} (${quantity})`,
          value: resourceId,
          description: `${price} coins each (${(price * quantity).toLocaleString()} total)`,
          emoji: '💎'
        });
      });
      
      // Add "Sell All" option
      selectMenu.addOptions({
        label: 'Sell All Resources',
        value: 'sell_all',
        description: `Sell everything for ${totalValue.toLocaleString()} coins`,
        emoji: '💰'
      });
      
      // Create buttons for quick actions
      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('mine_now')
            .setLabel('Mine Now')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⛏️'),
          new ButtonBuilder()
            .setCustomId('view_inventory')
            .setLabel('Inventory')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎒'),
          new ButtonBuilder()
            .setCustomId('view_stats')
            .setLabel('Stats')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊')
        );
      
      const selectRow = new ActionRowBuilder().addComponents(selectMenu);
      
      await interaction.editReply({ embeds: [embed], components: [selectRow, buttonRow] });
      
      // Set up collector for interactions
      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
      
      collector.on('collect', async i => {
        try {
          if (i.customId === 'sell_resource') {
            await i.deferUpdate();
            
            const resourceId = i.values[0];
            let result;
            
            if (resourceId === 'sell_all') {
              result = await mining.sellAllResources(userId);
            } else {
              result = await mining.sellResource(userId, resourceId);
            }
            
            if (result.success) {
              const successEmbed = new EmbedBuilder()
                .setTitle('✅ Sale Successful')
                .setDescription(`You sold ${result.quantity} ${result.resourceName || 'resources'} for ${result.amount.toLocaleString()} coins!`)
                .setColor('#00FF00')
                .setTimestamp();
              
              await interaction.editReply({ embeds: [successEmbed], components: [buttonRow] });
              
              // Wait 3 seconds and show the sell screen again if there are still resources
              setTimeout(async () => {
                const updatedInventory = mining.getUserInventory(userId);
                if (updatedInventory && Object.keys(updatedInventory).length > 0) {
                  await this.handleSell(interaction, mining, economy);
                } else {
                  await this.handleStats(interaction, mining);
                }
              }, 3000);
            } else {
              const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Sale Failed')
                .setDescription(result.message || 'An error occurred during the sale.')
                .setColor('#FF0000')
                .setTimestamp();
              
              await interaction.editReply({ embeds: [errorEmbed], components: [buttonRow] });
              
              // Wait 3 seconds and show the sell screen again
              setTimeout(async () => {
                await this.handleSell(interaction, mining, economy);
              }, 3000);
            }
          } else if (i.customId === 'mine_now') {
            await i.deferUpdate();
            await this.handleMine(interaction, mining);
          } else if (i.customId === 'view_inventory') {
            await i.deferUpdate();
            await this.handleInventory(interaction, mining);
          } else if (i.customId === 'view_stats') {
            await i.deferUpdate();
            await this.handleStats(interaction, mining);
          }
        } catch (error) {
          logger.error(`Error handling sell interaction: ${error.message}`);
        }
      });
      
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
      
    } catch (error) {
      logger.error(`Error handling sell command: ${error.message}`);
      await interaction.editReply('An error occurred while accessing the sell menu. Please try again later.');
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
  }
}; 