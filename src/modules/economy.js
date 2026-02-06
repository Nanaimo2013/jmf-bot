/**
 * JMF Hosting Discord Bot - Economy Module
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This module handles the economy system for the bot, including user balances,
 * transactions, and market functionality.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Module = require('./base.module');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const logger = require('../utils/logger');

class EconomyModule extends Module {
  /**
   * Create a new economy module
   */
  constructor() {
    super({
      name: 'economy',
      description: 'Handles the economy system for the bot',
      enabled: true,
      dependencies: ['database']
    });
    
    this.userDataPath = path.join(process.cwd(), 'data', 'economy');
    this.transactionLocks = new Map();
    this.lockTimeout = 10000; // 10 seconds timeout for locks
    
    // Cache for user data to reduce database calls
    this.userDataCache = new Map();
    this.cacheTTL = 60000; // 1 minute cache TTL
    
    // Track recent transactions to prevent duplicates
    this.recentTransactions = new Map();
    
    // Track daily rewards
    this.dailyRewards = new Map();
    
    // Track work cooldowns
    this.workCooldowns = new Map();
    
    this.userBalances = new Map();
    this.transactions = [];
    this.marketListings = new Map();
  }

  /**
   * Initialize the economy module
   * @param {Client} client - The Discord.js client
   * @returns {Promise<boolean>}
   */
  async initialize(client) {
    try {
      await super.initialize(client);
      
      // Load data from database if available
      if (this.database && this.database.isConnected) {
        await this.loadDataFromDatabase();
        this.logger.info(this.name, 'Economy data loaded from database');
      } else {
        this.logger.warn(this.name, 'Database not available, economy data will not be persistent');
      }
      
      // Get economy config
      const economyConfig = this.configManager.getConfig('economy') || {};
      
      // Set up auto-save interval
      this.autoSaveInterval = setInterval(() => this.saveToDatabase(), 
        economyConfig.autoSaveInterval || 300000); // Default: 5 minutes
      
      return true;
    } catch (error) {
      this.handleError('initialize', error);
      return false;
    }
  }
  
  /**
   * Start the economy module
   * @returns {Promise<boolean>}
   */
  async start() {
    try {
      await super.start();
      
      // Additional startup logic can be added here
      
      return true;
    } catch (error) {
      this.handleError('start', error);
      return false;
    }
  }
  
  /**
   * Stop the economy module
   * @returns {Promise<boolean>}
   */
  async stop() {
    try {
      // Clear intervals
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
      
      // Save data before stopping
      await this.saveToDatabase();
      
      await super.stop();
      return true;
    } catch (error) {
      this.handleError('stop', error);
      return false;
    }
  }

  /**
   * Load economy data from database
   * @returns {Promise<void>}
   */
  async loadDataFromDatabase() {
    try {
      if (!this.database || !this.database.isConnected) {
        throw new Error('Database not available');
      }
      
      // Load user balances
      const balances = await this.database.query('SELECT user_id, balance FROM user_balances');
      balances.forEach(row => {
        this.userBalances.set(row.user_id, row.balance);
      });
      
      // Load market listings
      const listings = await this.database.query('SELECT * FROM market_listings WHERE active = 1');
      listings.forEach(listing => {
        if (!this.marketListings.has(listing.item_type)) {
          this.marketListings.set(listing.item_type, []);
        }
        this.marketListings.get(listing.item_type).push({
          id: listing.id,
          sellerId: listing.seller_id,
          itemType: listing.item_type,
          itemName: listing.item_name,
          quantity: listing.quantity,
          price: listing.price,
          listedAt: new Date(listing.listed_at)
        });
      });
      
      // Load recent transactions
      const recentTransactions = await this.database.query(
        'SELECT * FROM economy_transactions ORDER BY created_at DESC LIMIT 100'
      );
      this.transactions = recentTransactions.map(t => ({
        id: t.id,
        userId: t.user_id,
        amount: t.amount,
        balance: t.amount, // economy_transactions doesn't have balance_after
        reason: t.description,
        timestamp: new Date(t.created_at)
      }));
    } catch (error) {
      this.handleError('loadDataFromDatabase', error);
      throw error;
    }
  }

  /**
   * Save economy data to database
   * @returns {Promise<void>}
   */
  async saveToDatabase() {
    try {
      if (!this.database || !this.database.isConnected) {
        this.logger.warn(this.name, 'Database not available, skipping save');
        return;
      }
      
      // Save user balances
      for (const [userId, balance] of this.userBalances.entries()) {
        await this.database.query(
          'INSERT INTO user_balances (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = ?',
          [userId, balance, balance]
        );
      }
      
      this.logger.debug(this.name, 'Economy data saved to database');
    } catch (error) {
      this.handleError('saveToDatabase', error);
    }
  }

  /**
   * Initialize a user's balance if not exists
   * @param {string} userId - The Discord user ID
   */
  initializeUser(userId) {
    if (!this.userBalances.has(userId)) {
      const economyConfig = this.configManager.getConfig('economy') || {};
      const startingBalance = economyConfig.startingBalance || 100;
      this.userBalances.set(userId, startingBalance);
      
      // Save to database if available
      if (this.database && this.database.isConnected) {
        this.database.query(
          'INSERT INTO user_balances (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = ?',
          [userId, startingBalance, startingBalance]
        ).catch(error => this.handleError('initializeUser', error));
      }
      
      this.logger.debug(this.name, `Initialized user ${userId} with ${startingBalance} coins`);
    }
  }

  /**
   * Get a user's balance
   * @param {string} userId - The Discord user ID
   * @returns {number} - The user's balance
   */
  getBalance(userId) {
    this.initializeUser(userId);
    return this.userBalances.get(userId);
  }

  /**
   * Add coins to a user's balance
   * @param {string} userId - The Discord user ID
   * @param {number} amount - The amount to add
   * @param {string} reason - The reason for adding coins
   * @returns {Promise<Object>} - Result object with success status and new balance
   */
  async addCoins(userId, amount, reason = 'Unknown') {
    try {
      if (amount <= 0) {
        return { success: false, message: 'Amount must be positive' };
      }
      
      this.initializeUser(userId);
      
      const oldBalance = this.userBalances.get(userId);
      const newBalance = oldBalance + amount;
      
      this.userBalances.set(userId, newBalance);
      
      // Record transaction
      const transaction = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        userId,
        amount,
        balance: newBalance,
        reason,
        timestamp: new Date()
      };
      
      this.transactions.unshift(transaction);
      
      // Trim transactions array to prevent memory issues
      if (this.transactions.length > 1000) {
        this.transactions = this.transactions.slice(0, 1000);
      }
      
      // Save transaction to database if available
      if (this.database && this.database.isConnected) {
        await this.database.query(
          'INSERT INTO economy_transactions (user_id, transaction_type, amount, description, created_at) VALUES (?, ?, ?, ?, ?)',
          [userId, 'add', amount, reason, transaction.timestamp]
        );
        
        // Update user balance in database
        await this.database.query(
          'UPDATE user_balances SET balance = ? WHERE user_id = ?',
          [newBalance, userId]
        );
      }
      
      this.logger.debug(this.name, `Added ${amount} coins to user ${userId} for reason: ${reason}`);
      
      return {
        success: true,
        oldBalance,
        newBalance,
        amount,
        transaction
      };
    } catch (error) {
      this.handleError('addCoins', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Remove coins from a user's balance
   * @param {string} userId - The Discord user ID
   * @param {number} amount - Amount to remove
   * @param {string} reason - Reason for transaction
   * @returns {Object} - {success: boolean, balance: number, message: string}
   */
  async removeCoins(userId, amount, reason = 'Unknown') {
    this.initializeUser(userId);
    
    const oldBalance = this.userBalances.get(userId);
    
    if (oldBalance < amount) {
      return {
        success: false,
        balance: oldBalance,
        message: 'Insufficient funds'
      };
    }
    
    const newBalance = oldBalance - amount;
    this.userBalances.set(userId, newBalance);
    
    // Record transaction
    const transaction = {
      userId,
      type: 'remove',
      amount,
      oldBalance,
      newBalance,
      reason,
      timestamp: new Date()
    };
    
    this.transactions.push(transaction);
    
    // Save to database if available
    if (this.database && this.database.isConnected) {
      try {
        await this.database.query(
          'UPDATE user_balances SET balance = ? WHERE user_id = ?',
          [newBalance, userId]
        );
        
        await this.database.query(
          'INSERT INTO economy_transactions (user_id, transaction_type, amount, description, created_at) VALUES (?, ?, ?, ?, ?)',
          [userId, 'remove', amount, reason, new Date()]
        );
      } catch (error) {
        this.handleError('removeCoins', error);
      }
    }
    
    return {
      success: true,
      balance: newBalance,
      message: 'Transaction successful'
    };
  }

  /**
   * Transfer coins between users
   * @param {string} fromUserId - Sender's Discord user ID
   * @param {string} toUserId - Recipient's Discord user ID
   * @param {number} amount - Amount to transfer
   * @returns {Object} - Result of transfer
   */
  async transferCoins(fromUserId, toUserId, amount) {
    if (fromUserId === toUserId) {
      return {
        success: false,
        message: 'Cannot transfer to yourself'
      };
    }
    
    if (amount <= 0) {
      return {
        success: false,
        message: 'Amount must be positive'
      };
    }
    
    // Apply transfer fee if configured
    const fee = config.economy.transferFee ? Math.ceil(amount * config.economy.transferFee) : 0;
    const totalDeduction = amount + fee;
    
    // Check if sender has enough funds
    this.initializeUser(fromUserId);
    const senderBalance = this.userBalances.get(fromUserId);
    
    if (senderBalance < totalDeduction) {
      return {
        success: false,
        message: `Insufficient funds. You need ${totalDeduction} coins (including ${fee} fee)`
      };
    }
    
    // Initialize recipient
    this.initializeUser(toUserId);
    
    // Perform transfer
    const removeResult = await this.removeCoins(fromUserId, totalDeduction, `Transfer to user ${toUserId}`);
    if (!removeResult.success) {
      return removeResult;
    }
    
    await this.addCoins(toUserId, amount, `Transfer from user ${fromUserId}`);
    
    // Save transfer record to database if available
    if (this.database && this.database.isConnected) {
      try {
        await this.database.query(
          'INSERT INTO transfers (from_user_id, to_user_id, amount, fee) VALUES (?, ?, ?, ?)',
          [fromUserId, toUserId, amount, fee]
        );
      } catch (error) {
        this.handleError('transferCoins', error);
      }
    }
    
    return {
      success: true,
      message: `Successfully transferred ${amount} coins to <@${toUserId}>`,
      fee
    };
  }

  /**
   * Create a market listing
   * @param {string} sellerId - Seller's Discord user ID
   * @param {string} itemType - Type of item (resource, pickaxe, etc.)
   * @param {string} itemName - Name of the item
   * @param {number} quantity - Quantity to sell
   * @param {number} price - Price per item
   * @returns {Object} - Result of listing creation
   */
  async createListing(sellerId, itemType, itemName, quantity, price) {
    if (quantity <= 0 || price <= 0) {
      return {
        success: false,
        message: 'Quantity and price must be positive'
      };
    }
    
    // Create listing object
    const listing = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      sellerId,
      itemType,
      itemName,
      quantity,
      price,
      listedAt: new Date()
    };
    
    // Add to listings
    if (!this.marketListings.has(itemType)) {
      this.marketListings.set(itemType, []);
    }
    this.marketListings.get(itemType).push(listing);
    
    // Save to database if available
    if (this.database && this.database.isConnected) {
      try {
        await this.database.query(
          'INSERT INTO market_listings (id, seller_id, item_type, item_name, quantity, price, listed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [listing.id, sellerId, itemType, itemName, quantity, price, listing.listedAt]
        );
      } catch (error) {
        this.handleError('createListing', error);
      }
    }
    
    return {
      success: true,
      message: `Listed ${quantity}x ${itemName} for ${price} coins each`,
      listingId: listing.id
    };
  }

  /**
   * Purchase an item from the market
   * @param {string} buyerId - Buyer's Discord user ID
   * @param {string} listingId - ID of the listing
   * @param {number} quantity - Quantity to buy
   * @returns {Object} - Result of purchase
   */
  async purchaseListing(buyerId, listingId, quantity) {
    // Find the listing
    let listing = null;
    let listingType = null;
    
    for (const [type, listings] of this.marketListings.entries()) {
      const found = listings.find(l => l.id === listingId);
      if (found) {
        listing = found;
        listingType = type;
        break;
      }
    }
    
    if (!listing) {
      return {
        success: false,
        message: 'Listing not found'
      };
    }
    
    // Check if buyer is not the seller
    if (buyerId === listing.sellerId) {
      return {
        success: false,
        message: 'Cannot buy your own listing'
      };
    }
    
    // Check if quantity is valid
    if (quantity <= 0 || quantity > listing.quantity) {
      return {
        success: false,
        message: `Invalid quantity. Available: ${listing.quantity}`
      };
    }
    
    // Calculate total price
    const totalPrice = quantity * listing.price;
    
    // Check if buyer has enough funds
    this.initializeUser(buyerId);
    const buyerBalance = this.userBalances.get(buyerId);
    
    if (buyerBalance < totalPrice) {
      return {
        success: false,
        message: `Insufficient funds. You need ${totalPrice} coins`
      };
    }
    
    // Process payment
    const removeResult = await this.removeCoins(buyerId, totalPrice, `Purchase ${quantity}x ${listing.itemName}`);
    if (!removeResult.success) {
      return removeResult;
    }
    
    // Add payment to seller
    await this.addCoins(listing.sellerId, totalPrice, `Sale of ${quantity}x ${listing.itemName}`);
    
    // Update listing quantity
    listing.quantity -= quantity;
    
    // Remove listing if quantity is 0
    if (listing.quantity === 0) {
      this.marketListings.set(
        listingType,
        this.marketListings.get(listingType).filter(l => l.id !== listingId)
      );
      
      // Update database if available
      if (this.database && this.database.isConnected) {
        try {
          await this.database.query(
            'UPDATE market_listings SET active = 0 WHERE id = ?',
            [listingId]
          );
        } catch (error) {
          this.handleError('purchaseListing', error);
        }
      }
    } else {
      // Update listing in database if available
      if (this.database && this.database.isConnected) {
        try {
          await this.database.query(
            'UPDATE market_listings SET quantity = ? WHERE id = ?',
            [listing.quantity, listingId]
          );
        } catch (error) {
          this.handleError('purchaseListing', error);
        }
      }
    }
    
    // Record transaction in database
    if (this.database && this.database.isConnected) {
      try {
        await this.database.query(
          'INSERT INTO market_transactions (listing_id, buyer_id, seller_id, item_type, item_name, quantity, price_per_unit, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [listingId, buyerId, listing.sellerId, listingType, listing.itemName, quantity, listing.price, totalPrice]
        );
      } catch (error) {
        this.handleError('purchaseListing', error);
      }
    }
    
    return {
      success: true,
      message: `Successfully purchased ${quantity}x ${listing.itemName} for ${totalPrice} coins`,
      itemType: listingType,
      itemName: listing.itemName,
      quantity,
      totalPrice
    };
  }

  /**
   * Get market listings by type
   * @param {string} itemType - Type of item to filter by (optional)
   * @returns {Array} - Array of listings
   */
  getListings(itemType = null) {
    if (itemType) {
      return this.marketListings.has(itemType) ? this.marketListings.get(itemType) : [];
    }
    
    // Return all listings
    const allListings = [];
    for (const listings of this.marketListings.values()) {
      allListings.push(...listings);
    }
    
    return allListings;
  }

  /**
   * Get user's listings
   * @param {string} userId - The Discord user ID
   * @returns {Array} - Array of user's listings
   */
  getUserListings(userId) {
    const userListings = [];
    
    for (const listings of this.marketListings.values()) {
      const filtered = listings.filter(listing => listing.sellerId === userId);
      userListings.push(...filtered);
    }
    
    return userListings;
  }

  /**
   * Cancel a market listing
   * @param {string} userId - The Discord user ID
   * @param {string} listingId - ID of the listing
   * @returns {Object} - Result of cancellation
   */
  async cancelListing(userId, listingId) {
    // Find the listing
    let listing = null;
    let listingType = null;
    
    for (const [type, listings] of this.marketListings.entries()) {
      const found = listings.find(l => l.id === listingId);
      if (found) {
        listing = found;
        listingType = type;
        break;
      }
    }
    
    if (!listing) {
      return {
        success: false,
        message: 'Listing not found'
      };
    }
    
    // Check if user is the seller
    if (userId !== listing.sellerId) {
      return {
        success: false,
        message: 'You can only cancel your own listings'
      };
    }
    
    // Remove listing
    this.marketListings.set(
      listingType,
      this.marketListings.get(listingType).filter(l => l.id !== listingId)
    );
    
    // Update database if available
    if (this.database && this.database.isConnected) {
      try {
        await this.database.query(
          'UPDATE market_listings SET active = 0 WHERE id = ?',
          [listingId]
        );
      } catch (error) {
        this.handleError('cancelListing', error);
      }
    }
    
    return {
      success: true,
      message: `Cancelled listing for ${listing.quantity}x ${listing.itemName}`,
      itemType: listingType,
      itemName: listing.itemName,
      quantity: listing.quantity
    };
  }

  /**
   * Create a balance embed for a user
   * @param {string} userId - The Discord user ID
   * @param {string} username - The Discord username
   * @returns {EmbedBuilder} - Embed with balance info
   */
  createBalanceEmbed(userId, username) {
    const balance = this.getBalance(userId);
    
    const embed = new EmbedBuilder()
      .setTitle(`${username}'s Balance`)
      .setColor('#FFD700')
      .setDescription(`${config.economy.currencySymbol} **${balance}** ${config.economy.currencyName}`);
    
    return embed;
  }

  /**
   * Create a market listings embed
   * @param {string} itemType - Type of item to filter by (optional)
   * @returns {EmbedBuilder} - Embed with market listings
   */
  createMarketEmbed(itemType = null) {
    const listings = this.getListings(itemType);
    
    const embed = new EmbedBuilder()
      .setTitle('Market Listings')
      .setColor('#00BFFF')
      .setDescription(itemType ? `Showing listings for: ${itemType}` : 'Showing all listings');
    
    if (listings.length === 0) {
      embed.addFields({ name: 'No Listings', value: 'There are no items listed on the market.' });
      return embed;
    }
    
    // Group listings by item name
    const groupedListings = {};
    
    for (const listing of listings) {
      const key = `${listing.itemType}:${listing.itemName}`;
      
      if (!groupedListings[key]) {
        groupedListings[key] = {
          itemType: listing.itemType,
          itemName: listing.itemName,
          listings: []
        };
      }
      
      groupedListings[key].listings.push(listing);
    }
    
    // Add fields for each item
    for (const group of Object.values(groupedListings)) {
      let value = '';
      
      for (const listing of group.listings) {
        value += `ID: \`${listing.id}\`\n`;
        value += `Quantity: ${listing.quantity}\n`;
        value += `Price: ${listing.price} ${config.economy.currencySymbol} each\n`;
        value += `Seller: <@${listing.sellerId}>\n\n`;
      }
      
      embed.addFields({
        name: `${group.itemName} (${group.itemType})`,
        value: value.trim(),
        inline: false
      });
    }
    
    return embed;
  }

  /**
   * Get recent transactions for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of transactions to return
   * @returns {Array} Array of recent transactions
   */
  async getRecentTransactions(userId, limit = 5) {
    try {
      if (!this.database || !this.database.isConnected) {
        return [];
      }
      
      const transactions = await this.database.query(
        'SELECT * FROM economy_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit]
      );
      
      return transactions.map(t => ({
        id: t.id,
        userId: t.user_id,
        amount: t.amount,
        reason: t.description,
        timestamp: new Date(t.created_at)
      }));
    } catch (error) {
      this.handleError('getRecentTransactions', error);
      return [];
    }
  }

  /**
   * Get user's rank in the economy leaderboard
   * @param {string} userId - User ID
   * @returns {string} User's rank
   */
  async getUserRank(userId) {
    try {
      if (!this.database || !this.database.isConnected) {
        return 'Unknown';
      }
      
      const leaderboard = await this.database.query(
        'SELECT user_id, balance FROM user_balances ORDER BY balance DESC'
      );
      
      const userIndex = leaderboard.findIndex(entry => entry.user_id === userId);
      
      if (userIndex === -1) {
        return 'Unranked';
      }
      
      return `#${userIndex + 1}`;
    } catch (error) {
      this.handleError('getUserRank', error);
      return 'Unknown';
    }
  }

  /**
   * Create a leaderboard embed
   * @param {Guild} guild - Discord guild
   * @returns {EmbedBuilder} Leaderboard embed
   */
  async createLeaderboardEmbed(guild) {
    try {
      if (!this.database || !this.database.isConnected) {
        const embed = new EmbedBuilder()
          .setTitle('Economy Leaderboard')
          .setDescription('No leaderboard data available')
          .setColor(config.embedColor || '#0099ff')
          .setTimestamp();
        return embed;
      }
      
      const leaderboard = await this.database.query(
        'SELECT user_id, balance FROM user_balances ORDER BY balance DESC LIMIT 10'
      );
      
      if (!leaderboard || leaderboard.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('Economy Leaderboard')
          .setDescription('No users found in the leaderboard')
          .setColor(config.embedColor || '#0099ff')
          .setTimestamp();
        return embed;
      }
      
      // Get total economy value
      const totalEconomy = await this.database.query(
        'SELECT SUM(balance) as total FROM user_balances'
      );
      
      const totalValue = totalEconomy[0]?.total || 0;
      
      // Format leaderboard entries
      let description = '';
      const medals = ['🥇', '🥈', '🥉'];
      
      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const user = await guild.members.fetch(entry.user_id).catch(() => null);
        const username = user ? user.user.username : 'Unknown User';
        const rank = i < 3 ? medals[i] : `${i + 1}.`;
        
        description += `${rank} **${username}** - ${entry.balance.toLocaleString()} coins\n`;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('💰 Economy Leaderboard')
        .setDescription(description)
        .setColor(config.embedColor || '#0099ff')
        .addFields(
          { name: '💵 Total Economy Value', value: `${totalValue.toLocaleString()} coins`, inline: true },
          { name: '👥 Total Users', value: `${leaderboard.length}`, inline: true }
        )
        .setFooter({ 
          text: `${config.footerText || 'JMF Hosting Bot'} • Updated`,
          iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();
      
      return embed;
    } catch (error) {
      this.handleError('createLeaderboardEmbed', error);
      const embed = new EmbedBuilder()
        .setTitle('Economy Leaderboard')
        .setDescription('An error occurred while creating the leaderboard')
        .setColor(config.embedColor || '#0099ff')
        .setTimestamp();
      return embed;
    }
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
        userCount: this.userBalances.size,
        transactionCount: this.transactions.length,
        marketListingsCount: Array.from(this.marketListings.values()).reduce((acc, curr) => acc + curr.length, 0)
      }
    };
  }
}

module.exports = EconomyModule; 