/**
 * JMF Hosting Discord Bot - Mining Module
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This module handles the mining game functionality for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Module = require('./base.module');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const database = require('../utils/database');
const economy = require('./economy');

class MiningModule extends Module {
  /**
   * Create a new mining module
   */
  constructor() {
    super({
      name: 'mining',
      description: 'Handles the mining game functionality for the bot',
      enabled: true,
      dependencies: ['database', 'economy']
    });
    
    this.userCooldowns = new Map();
    this.userInventories = new Map();
    this.userStats = new Map();
  }

  /**
   * Initialize the mining module
   * @param {Client} client - The Discord.js client
   * @returns {Promise<boolean>}
   */
  async initialize(client) {
    try {
      await super.initialize(client);
      
      // Get mining config
      const miningConfig = this.configManager.getConfig('mining') || {};
      
      // Load data from database if available
      if (this.database && this.database.isConnected) {
        await this.loadDataFromDatabase();
        this.logger.info(this.name, 'Mining game data loaded from database');
      } else {
        this.logger.warn(this.name, 'Database not available, mining data will not be persistent');
      }
      
      // Set up auto-save interval
      this.autoSaveInterval = setInterval(() => this.saveAllData(), 
        miningConfig.autoSaveInterval || 300000); // Default: 5 minutes
      
      return true;
    } catch (error) {
      this.handleError('initialize', error);
      return false;
    }
  }
  
  /**
   * Start the mining module
   * @returns {Promise<boolean>}
   */
  async start() {
    try {
      await super.start();
      
      // Get economy module reference
      this.economy = this.client.economy;
      
      if (!this.economy) {
        this.logger.warn(this.name, 'Economy module not found, some features may not work properly');
      }
      
      return true;
    } catch (error) {
      this.handleError('start', error);
      return false;
    }
  }
  
  /**
   * Stop the mining module
   * @returns {Promise<boolean>}
   */
  async stop() {
    try {
      // Clear intervals
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
      
      // Save all data before stopping
      await this.saveAllData();
      
      await super.stop();
      return true;
    } catch (error) {
      this.handleError('stop', error);
      return false;
    }
  }

  /**
   * Load mining data from database
   * @returns {Promise<void>}
   */
  async loadDataFromDatabase() {
    try {
      if (!this.database || !this.database.isConnected) {
        throw new Error('Database not available');
      }
      
      // Load user mining stats
      const stats = await this.database.query('SELECT * FROM user_mining_data');
      stats.forEach(row => {
        this.userStats.set(row.user_id, {
          level: row.level,
          xp: row.xp,
          coins: 0, // Will be loaded from economy module
          currentWorld: row.current_world,
          pickaxe: row.pickaxe,
          pet: row.pet,
          armor: row.armor,
          activeBooster: row.active_booster,
          boosterExpiry: row.booster_expiry,
          unlockedWorlds: row.unlocked_worlds ? row.unlocked_worlds.split(',') : ['overworld']
        });
      });
      
      // Load user inventories
      const inventories = await this.database.query('SELECT * FROM user_mining_inventory');
      
      // Group by user_id
      const userItems = {};
      inventories.forEach(row => {
        if (!userItems[row.user_id]) {
          userItems[row.user_id] = {};
        }
        
        userItems[row.user_id][row.resource_id] = row.quantity;
      });
      
      // Set user inventories
      Object.entries(userItems).forEach(([userId, inventory]) => {
        this.userInventories.set(userId, inventory);
      });
      
      this.logger.debug(this.name, `Loaded mining data for ${stats.length} users`);
    } catch (error) {
      this.handleError('loadDataFromDatabase', error);
      throw error;
    }
  }

  /**
   * Save all mining data to database
   * @returns {Promise<void>}
   */
  async saveAllData() {
    try {
      if (!this.database || !this.database.isConnected) {
        this.logger.warn(this.name, 'Database not available, skipping save');
        return;
      }
      
      // Save all user stats
      for (const [userId, stats] of this.userStats.entries()) {
        await this.saveToDatabase(userId);
      }
      
      this.logger.debug(this.name, 'All mining data saved to database');
    } catch (error) {
      this.handleError('saveAllData', error);
    }
  }

  /**
   * Save a user's mining data to database
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  async saveToDatabase(userId) {
    try {
      if (!this.database || !this.database.isConnected) {
        return;
      }
      
      const stats = this.userStats.get(userId);
      if (!stats) return;
      
      // Save user stats
      await this.database.query(
        `INSERT INTO user_mining_data 
        (user_id, level, xp, current_world, pickaxe, pet, armor, active_booster, booster_expiry, unlocked_worlds) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
        level = ?, xp = ?, current_world = ?, pickaxe = ?, pet = ?, armor = ?, 
        active_booster = ?, booster_expiry = ?, unlocked_worlds = ?`,
        [
          userId, 
          stats.level, 
          stats.xp, 
          stats.currentWorld, 
          stats.pickaxe, 
          stats.pet, 
          stats.armor, 
          stats.activeBooster, 
          stats.boosterExpiry,
          stats.unlockedWorlds ? stats.unlockedWorlds.join(',') : 'overworld',
          stats.level, 
          stats.xp, 
          stats.currentWorld, 
          stats.pickaxe, 
          stats.pet, 
          stats.armor, 
          stats.activeBooster, 
          stats.boosterExpiry,
          stats.unlockedWorlds ? stats.unlockedWorlds.join(',') : 'overworld'
        ]
      );
      
      // Save user inventory
      const inventory = this.userInventories.get(userId);
      if (inventory) {
        // Delete existing inventory
        await this.database.query('DELETE FROM user_mining_inventory WHERE user_id = ?', [userId]);
        
        // Insert new inventory items
        for (const [resourceId, quantity] of Object.entries(inventory)) {
          if (quantity > 0) {
            await this.database.query(
              'INSERT INTO user_mining_inventory (user_id, resource_id, quantity) VALUES (?, ?, ?)',
              [userId, resourceId, quantity]
            );
          }
        }
      }
    } catch (error) {
      this.handleError('saveToDatabase', error);
    }
  }

  /**
   * Initialize a user's mining data if not exists
   * @param {string} userId - The user ID
   * @returns {Object} - The user's mining stats
   */
  initializeUser(userId) {
    if (!this.userStats.has(userId)) {
      const defaultStats = {
        level: 1,
        xp: 0,
        coins: 0,
        currentWorld: 'overworld',
        pickaxe: 'wooden_pickaxe',
        pet: null,
        armor: null,
        activeBooster: null,
        boosterExpiry: null,
        unlockedWorlds: ['overworld']
      };
      
      this.userStats.set(userId, defaultStats);
      
      // Initialize inventory
      if (!this.userInventories.has(userId)) {
        this.userInventories.set(userId, {});
      }
      
      // Save to database
      this.saveToDatabase(userId).catch(error => this.handleError('initializeUser', error));
      
      this.logger.debug(this.name, `Initialized mining data for user ${userId}`);
      
      return defaultStats;
    }
    
    return this.userStats.get(userId);
  }

  /**
   * Check if user can mine (cooldown and world level requirements)
   * @param {string} userId - The Discord user ID
   * @returns {Object} - {canMine: boolean, timeLeft: number}
   */
  canMine(userId) {
    const now = Date.now();
    const lastMine = this.userCooldowns.get(userId) || 0;
    const cooldown = config.miningGame.cooldown * 1000; // Convert to milliseconds
    
    // Apply cooldown reductions from equipment
    const stats = this.userStats.get(userId);
    let totalCooldownReduction = 0;

    // Pickaxe cooldown reduction
    const pickaxe = config.miningGame.pickaxes.find(p => p.name === stats.pickaxe);
    if (pickaxe) {
      totalCooldownReduction += pickaxe.cooldownReduction;
    }

    // Pet cooldown reduction
    if (stats.pet) {
      const pet = config.miningGame.pets.find(p => p.name === stats.pet);
      if (pet && pet.cooldownReduction) {
        totalCooldownReduction += pet.cooldownReduction;
      }
    }

    // Armor cooldown reduction
    if (stats.armor) {
      const armor = config.miningGame.armor.find(a => a.name === stats.armor);
      if (armor && armor.cooldownReduction) {
        totalCooldownReduction += armor.cooldownReduction;
      }
    }

    // Active booster cooldown reduction
    if (stats.activeBooster && stats.boosterExpiry > now) {
      const booster = config.miningGame.boosters.find(b => b.name === stats.activeBooster);
      if (booster && booster.cooldownReduction) {
        totalCooldownReduction += booster.cooldownReduction;
      }
    }

    // Apply cooldown reduction (minimum 1 second)
    const adjustedCooldown = Math.max(1000, cooldown - (totalCooldownReduction * 1000));
    const timeLeft = lastMine + adjustedCooldown - now;

    return {
      canMine: timeLeft <= 0,
      timeLeft: Math.max(0, timeLeft)
    };
  }

  /**
   * Calculate mining rewards with all buffs applied
   * @param {string} userId - The Discord user ID
   * @returns {Object} - The mining results
   */
  async mine(userId) {
    const stats = this.userStats.get(userId);
    const currentWorld = config.miningGame.worlds.find(w => w.name === stats.currentWorld);
    const now = Date.now();

    // Initialize buffs
    let bonusChance = 0;
    let valueBuff = 0;
    let rareChance = 0;
    let xpBoost = 0;

    // Apply pickaxe power
    const pickaxe = config.miningGame.pickaxes.find(p => p.name === stats.pickaxe);
    const basePower = pickaxe ? pickaxe.power : 1;

    // Apply pet buffs
    if (stats.pet) {
      const pet = config.miningGame.pets.find(p => p.name === stats.pet);
      if (pet) {
        bonusChance += pet.bonusChance || 0;
        valueBuff += pet.valueBuff || 0;
        rareChance += pet.rareChance || 0;
        if (pet.allBuff) {
          bonusChance += pet.allBuff;
          valueBuff += pet.allBuff;
          rareChance += pet.allBuff;
          xpBoost += pet.allBuff;
        }
      }
    }

    // Apply armor buffs
    if (stats.armor) {
      const armor = config.miningGame.armor.find(a => a.name === stats.armor);
      if (armor) {
        valueBuff += armor.valueBuff || 0;
        xpBoost += armor.xpBoost || 0;
        if (armor.allBuff) {
          bonusChance += armor.allBuff;
          valueBuff += armor.allBuff;
          rareChance += armor.allBuff;
          xpBoost += armor.allBuff;
        }
      }
    }

    // Apply active booster buffs
    if (stats.activeBooster && stats.boosterExpiry > now) {
      const booster = config.miningGame.boosters.find(b => b.name === stats.activeBooster);
      if (booster) {
        valueBuff += booster.valueBuff || 0;
        xpBoost += booster.xpBoost || 0;
        rareChance += booster.rareChance || 0;
        if (booster.allBuff) {
          bonusChance += booster.allBuff;
          valueBuff += booster.allBuff;
          rareChance += booster.allBuff;
          xpBoost += booster.allBuff;
        }
      }
    }

    // Calculate mining result
    const resources = [];
    const totalChance = currentWorld.resources.reduce((sum, r) => sum + r.chance, 0);
    
    // Main resource roll
    const roll = Math.random() * totalChance;
    let cumulative = 0;
    
    for (const resource of currentWorld.resources) {
      cumulative += resource.chance + (rareChance / 100 * resource.chance);
      if (roll <= cumulative) {
        const quantity = Math.floor(Math.random() * basePower) + 1;
        const value = Math.floor(resource.value * (1 + valueBuff / 100));
        const xp = Math.floor(resource.xp * (1 + xpBoost / 100));
        
        resources.push({
          name: resource.name,
          quantity,
          value: value * quantity,
          xp: xp * quantity
        });
        break;
      }
    }

    // Bonus resource roll (if applicable)
    if (Math.random() * 100 < bonusChance) {
      const bonusRoll = Math.random() * totalChance;
      cumulative = 0;
      
      for (const resource of currentWorld.resources) {
        cumulative += resource.chance;
        if (bonusRoll <= cumulative) {
          const quantity = 1;
          const value = Math.floor(resource.value * (1 + valueBuff / 100));
          const xp = Math.floor(resource.xp * (1 + xpBoost / 100));
          
          resources.push({
            name: resource.name,
            quantity,
            value: value * quantity,
            xp: xp * quantity,
            isBonus: true
          });
          break;
        }
      }
    }

    // Update user cooldown
    this.userCooldowns.set(userId, now);

    // Update user inventory and stats
    const inventory = this.userInventories.get(userId);
    let totalValue = 0;
    let totalXp = 0;

    for (const resource of resources) {
      inventory[resource.name] = (inventory[resource.name] || 0) + resource.quantity;
      totalValue += resource.value;
      totalXp += resource.xp;
    }

    // Update user stats
    stats.coins += totalValue;
    stats.xp += totalXp;

    // Check for level up
    const levelUpXp = this.calculateLevelUpXp(stats.level);
    const didLevelUp = stats.xp >= levelUpXp;
    
    if (didLevelUp) {
      stats.level += 1;
      stats.xp -= levelUpXp;
    }
    
    // Record mining action in database
    if (this.database && this.database.isConnected) {
      try {
        // Log the mining action
        await this.database.query(`
          INSERT INTO mining_actions 
          (user_id, action_type, details, timestamp) 
          VALUES (?, 'mine', ?, NOW())
        `, [
          userId, 
          JSON.stringify({
            world: stats.currentWorld,
            resources: resources.map(r => ({ name: r.name, quantity: r.quantity })),
            totalValue,
            totalXp,
            levelUp: didLevelUp
          })
        ]);
        
        // Save updated user data
        await this.saveToDatabase(userId);
      } catch (error) {
        this.handleError('mine', error);
      }
    }

    return {
      resources,
      totalValue,
      totalXp,
      levelUp: didLevelUp
    };
  }

  /**
   * Calculate XP needed for next level
   * @param {number} level - Current level
   * @returns {number} - XP needed for next level
   */
  calculateLevelUpXp(level) {
    // Parse the level formula from config
    const formula = config.levelSystem.levelFormula;
    return Math.floor(eval(formula.replace('level', level)));
  }

  /**
   * Get user's mining stats and equipment
   * @param {string} userId - The Discord user ID
   * @returns {Object} - User's mining stats
   */
  getUserStats(userId) {
    return this.userStats.get(userId);
  }

  /**
   * Get user's inventory
   * @param {string} userId - The Discord user ID
   * @returns {Object} - User's inventory
   */
  getUserInventory(userId) {
    return this.userInventories.get(userId);
  }

  /**
   * Purchase equipment (pickaxe, pet, armor, or booster)
   * @param {string} userId - The Discord user ID
   * @param {string} itemType - Type of item (pickaxe, pet, armor, booster)
   * @param {string} itemName - Name of the item to purchase
   * @returns {Object} - Result of purchase attempt
   */
  async purchaseItem(userId, itemType, itemName) {
    const stats = this.userStats.get(userId);
    const inventory = this.userInventories.get(userId);
    
    let item;
    switch (itemType.toLowerCase()) {
      case 'pickaxe':
        item = config.miningGame.pickaxes.find(p => p.name === itemName);
        break;
      case 'pet':
        item = config.miningGame.pets.find(p => p.name === itemName);
        break;
      case 'armor':
        item = config.miningGame.armor.find(a => a.name === itemName);
        break;
      case 'booster':
        item = config.miningGame.boosters.find(b => b.name === itemName);
        break;
      default:
        return { success: false, message: 'Invalid item type' };
    }

    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    if (stats.coins < item.cost) {
      return { success: false, message: 'Insufficient coins' };
    }

    // Handle purchase based on item type
    stats.coins -= item.cost;

    switch (itemType.toLowerCase()) {
      case 'pickaxe':
        if (!inventory.pickaxes.includes(item.name)) {
          inventory.pickaxes.push(item.name);
        }
        stats.pickaxe = item.name;
        break;
      case 'pet':
        if (!inventory.pets.includes(item.name)) {
          inventory.pets.push(item.name);
        }
        stats.pet = item.name;
        break;
      case 'armor':
        if (!inventory.armor.includes(item.name)) {
          inventory.armor.push(item.name);
        }
        stats.armor = item.name;
        break;
      case 'booster':
        inventory.boosters.push(item.name);
        stats.activeBooster = item.name;
        stats.boosterExpiry = Date.now() + (item.duration * 1000);
        break;
    }
    
    // Record purchase in database
    if (this.database && this.database.isConnected) {
      try {
        await this.database.query(`
          INSERT INTO mining_actions 
          (user_id, action_type, details, timestamp) 
          VALUES (?, 'purchase', ?, NOW())
        `, [
          userId, 
          JSON.stringify({
            itemType,
            itemName,
            cost: item.cost
          })
        ]);
        
        // Save updated user data
        await this.saveToDatabase(userId);
      } catch (error) {
        this.handleError('purchaseItem', error);
      }
    }

    return { success: true, message: `Successfully purchased ${item.name}` };
  }

  /**
   * Change mining world
   * @param {string} userId - The Discord user ID
   * @param {string} worldName - Name of the world to change to
   * @returns {Object} - Result of world change attempt
   */
  async changeWorld(userId, worldName) {
    const stats = this.userStats.get(userId);
    const world = config.miningGame.worlds.find(w => w.name === worldName);

    if (!world) {
      return { success: false, message: 'World not found' };
    }

    if (stats.level < world.level) {
      return { success: false, message: `Required level: ${world.level}` };
    }

    if (stats.coins < world.unlockCost) {
      return { success: false, message: `Required coins: ${world.unlockCost}` };
    }

    if (world.unlockCost > 0) {
      stats.coins -= world.unlockCost;
    }

    stats.currentWorld = world.name;
    
    // Record world change in database
    if (this.database && this.database.isConnected) {
      try {
        await this.database.query(`
          INSERT INTO mining_actions 
          (user_id, action_type, details, timestamp) 
          VALUES (?, 'world_change', ?, NOW())
        `, [
          userId, 
          JSON.stringify({
            worldName,
            unlockCost: world.unlockCost
          })
        ]);
        
        // Save updated user data
        await this.saveToDatabase(userId);
      } catch (error) {
        this.handleError('changeWorld', error);
      }
    }
    
    return { success: true, message: `Changed to ${world.name}` };
  }

  /**
   * Create a mining stats embed
   * @param {string} userId - The Discord user ID
   * @param {string} username - The Discord username
   * @returns {EmbedBuilder} - Embed with mining stats
   */
  createStatsEmbed(userId, username) {
    const stats = this.getUserStats(userId);
    const inventory = this.getUserInventory(userId);
    
    const embed = new EmbedBuilder()
      .setTitle(`${username}'s Mining Stats`)
      .setColor('#00ff00')
      .addFields(
        { name: 'Level', value: stats.level.toString(), inline: true },
        { name: 'XP', value: `${stats.xp}/${this.calculateLevelUpXp(stats.level)}`, inline: true },
        { name: 'Coins', value: stats.coins.toString(), inline: true },
        { name: 'Current World', value: stats.currentWorld, inline: true },
        { name: 'Pickaxe', value: stats.pickaxe, inline: true },
        { name: 'Pet', value: stats.pet || 'None', inline: true },
        { name: 'Armor', value: stats.armor || 'None', inline: true }
      );

    if (stats.activeBooster && stats.boosterExpiry > Date.now()) {
      const timeLeft = Math.ceil((stats.boosterExpiry - Date.now()) / 1000 / 60);
      embed.addFields({ name: 'Active Booster', value: `${stats.activeBooster} (${timeLeft}m left)`, inline: true });
    }

    return embed;
  }

  /**
   * Create an inventory embed
   * @param {string} userId - The Discord user ID
   * @param {string} username - The Discord username
   * @returns {EmbedBuilder} - Embed with inventory contents
   */
  createInventoryEmbed(userId, username) {
    const inventory = this.getUserInventory(userId);
    
    const embed = new EmbedBuilder()
      .setTitle(`${username}'s Mining Inventory`)
      .setColor('#0099ff');

    // Resources
    const resourcesList = Object.entries(inventory)
      .map(([name, quantity]) => `${name}: ${quantity}`)
      .join('\n');
    if (resourcesList) {
      embed.addFields({ name: 'Resources', value: resourcesList, inline: false });
    }

    // Equipment
    if (inventory.pickaxes.length > 0) {
      embed.addFields({ name: 'Pickaxes', value: inventory.pickaxes.join('\n'), inline: true });
    }
    if (inventory.pets.length > 0) {
      embed.addFields({ name: 'Pets', value: inventory.pets.join('\n'), inline: true });
    }
    if (inventory.armor.length > 0) {
      embed.addFields({ name: 'Armor', value: inventory.armor.join('\n'), inline: true });
    }
    if (inventory.boosters.length > 0) {
      embed.addFields({ name: 'Boosters', value: inventory.boosters.join('\n'), inline: true });
    }

    return embed;
  }

  /**
   * Get the module's status
   * @returns {Object} - Module status
   */
  getStatus() {
    const baseStatus = super.getStatus();
    
    return {
      ...baseStatus,
      metrics: {
        activeMiners: this.userStats.size,
        activeCooldowns: this.userCooldowns.size,
        totalInventoryItems: Array.from(this.userInventories.values())
          .reduce((acc, inv) => acc + Object.keys(inv).length, 0)
      }
    };
  }
}

module.exports = MiningModule;