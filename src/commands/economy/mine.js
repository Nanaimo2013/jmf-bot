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
            .setName('type')
            .setDescription('The type of item to buy')
            .setRequired(true)
            .addChoices(
              { name: 'Pickaxe', value: 'pickaxe' },
              { name: 'Pet', value: 'pet' },
              { name: 'Armor', value: 'armor' },
              { name: 'Booster', value: 'booster' }
            ))
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the item to buy')
            .setRequired(true))),

  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Initialize user data if not exists
    miningGame.initializeUser(userId);

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'dig':
        return this.handleMining(interaction, userId);
      case 'stats':
        return this.handleStats(interaction, userId, username);
      case 'inventory':
        return this.handleInventory(interaction, userId, username);
      case 'world':
        return this.handleWorldChange(interaction, userId);
      case 'shop':
        return this.handleShop(interaction);
      case 'buy':
        return this.handlePurchase(interaction, userId);
      default:
        return interaction.reply({ content: 'Invalid subcommand', ephemeral: true });
    }
  },

  async handleMining(interaction, userId) {
    // Check if user can mine
    const miningStatus = miningGame.canMine(userId);
    if (!miningStatus.canMine) {
      const timeLeft = formatDuration(miningStatus.timeLeft);
      return interaction.reply({
        content: `You must wait ${timeLeft} before mining again.`,
        ephemeral: true
      });
    }

    // Perform mining
    const result = miningGame.mine(userId);

    // Create result embed
    const embed = new EmbedBuilder()
      .setTitle('Mining Results')
      .setColor('#FFD700')
      .setDescription('Here\'s what you found:');

    // Add main resources
    for (const resource of result.resources) {
      const description = resource.isBonus
        ? `${resource.quantity}x ${resource.name} (Bonus!)\nValue: ${resource.value} 🪙\nXP: ${resource.xp}`
        : `${resource.quantity}x ${resource.name}\nValue: ${resource.value} 🪙\nXP: ${resource.xp}`;
      
      embed.addFields({ name: resource.name, value: description, inline: true });
    }

    // Add totals
    embed.addFields(
      { name: 'Total Value', value: `${result.totalValue} 🪙`, inline: true },
      { name: 'Total XP', value: result.totalXp.toString(), inline: true }
    );

    // Add level up message if applicable
    if (result.levelUp) {
      const stats = miningGame.getUserStats(userId);
      embed.addFields({
        name: 'Level Up!',
        value: `Congratulations! You've reached level ${stats.level}!`,
        inline: false
      });
    }

    return interaction.reply({ embeds: [embed] });
  },

  async handleStats(interaction, userId, username) {
    const embed = miningGame.createStatsEmbed(userId, username);
    return interaction.reply({ embeds: [embed] });
  },

  async handleInventory(interaction, userId, username) {
    const embed = miningGame.createInventoryEmbed(userId, username);
    return interaction.reply({ embeds: [embed] });
  },

  async handleWorldChange(interaction, userId) {
    const worldName = interaction.options.getString('name');
    const result = miningGame.changeWorld(userId, worldName);

    if (!result.success) {
      return interaction.reply({
        content: `Failed to change world: ${result.message}`,
        ephemeral: true
      });
    }

    return interaction.reply({
      content: result.message,
      ephemeral: true
    });
  },

  async handleShop(interaction) {
    const category = interaction.options.getString('category');
    const config = require('../../../config.json');
    
    const embed = new EmbedBuilder()
      .setTitle(`Mining Shop - ${category.charAt(0).toUpperCase() + category.slice(1)}s`)
      .setColor('#00ff00');

    let items;
    switch (category) {
      case 'pickaxe':
        items = config.miningGame.pickaxes;
        break;
      case 'pet':
        items = config.miningGame.pets;
        break;
      case 'armor':
        items = config.miningGame.armor;
        break;
      case 'booster':
        items = config.miningGame.boosters;
        break;
      default:
        return interaction.reply({
          content: 'Invalid shop category',
          ephemeral: true
        });
    }

    for (const item of items) {
      let description = `Cost: ${item.cost} 🪙\n`;
      
      if (item.power) description += `Power: ${item.power}\n`;
      if (item.cooldownReduction) description += `Cooldown Reduction: ${item.cooldownReduction}s\n`;
      if (item.bonusChance) description += `Bonus Chance: ${item.bonusChance}%\n`;
      if (item.valueBuff) description += `Value Buff: ${item.valueBuff}%\n`;
      if (item.rareChance) description += `Rare Find Chance: ${item.rareChance}%\n`;
      if (item.xpBoost) description += `XP Boost: ${item.xpBoost}%\n`;
      if (item.allBuff) description += `All Stats Buff: ${item.allBuff}%\n`;
      if (item.duration) description += `Duration: ${item.duration / 3600} hour(s)\n`;
      if (item.description) description += `\n${item.description}`;

      embed.addFields({
        name: item.name,
        value: description,
        inline: true
      });
    }

    return interaction.reply({ embeds: [embed] });
  },

  async handlePurchase(interaction, userId) {
    const itemType = interaction.options.getString('type');
    const itemName = interaction.options.getString('name');

    const result = miningGame.purchaseItem(userId, itemType, itemName);

    if (!result.success) {
      return interaction.reply({
        content: `Failed to purchase item: ${result.message}`,
        ephemeral: true
      });
    }

    return interaction.reply({
      content: result.message,
      ephemeral: true
    });
  }
}; 