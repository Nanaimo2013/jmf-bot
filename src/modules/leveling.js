/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EmbedBuilder } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../../config.json');
const database = require('../utils/database');

class LevelingSystem {
  constructor() {
    this.userDataPath = path.join(process.cwd(), 'data', 'users');
    this.messageCooldowns = new Map();
    this.voiceTimeTracking = new Map();
    this.db = null;
    this.client = null;
    this.isInitialized = false;
    
    // Add locks for synchronization
    this.userLocks = new Map();
    this.lockTimeout = 10000; // 10 seconds timeout for locks
    
    // Cache for user data to reduce database calls
    this.userDataCache = new Map();
    this.cacheTTL = 60000; // 1 minute cache TTL
    
    // Track recent level ups to prevent duplicate messages
    this.recentLevelUps = new Map();
    
    // Track message counts for XP rewards
    this.messageCounter = new Map();
    
    // Track voice time in minutes for XP rewards
    this.voiceTimeCounter = new Map();
    
    // Configure how often to reward XP
    this.messageRewardFrequency = config.levelSystem?.messageRewardFrequency || 5; // Every 5th message
    this.voiceRewardFrequency = config.levelSystem?.voiceRewardFrequency || 10; // Every 10 minutes
    
    this.init();
  }

  /**
   * Initialize the leveling system
   */
  async init() {
    try {
      await fs.mkdir(this.userDataPath, { recursive: true });
      logger.info('Leveling system initialized');
    } catch (error) {
      logger.error(`Error initializing leveling system: ${error.message}`);
    }
  }

  /**
   * Initialize with client and database
   * @param {Client} client - Discord client
   * @param {Object} db - Database connection
   */
  async initWithClient(client, db) {
    try {
      this.client = client;
      this.db = db;
      
      // Set up voice XP processing interval
      setInterval(() => this.processVoiceXP(), 60000); // Every minute
      
      // Set up cleanup intervals
      setInterval(() => this.cleanupExpiredLocks(), 60000); // Every minute
      setInterval(() => this.cleanupCounters(), 3600000); // Every hour
      
      // Load data from database if available
      if (this.db && this.db.isConnected) {
        await this.migrateFileDataToDatabase();
        logger.info('Leveling system initialized with database');
      }
      
      this.isInitialized = true;
    } catch (error) {
      logger.error(`Error initializing leveling system with client: ${error.message}`);
    }
  }

  /**
   * Migrate file-based data to database
   */
  async migrateFileDataToDatabase() {
    try {
      if (!this.db || !this.db.isConnected) return;
      
      // Check if we have files to migrate
      const files = await fs.readdir(this.userDataPath).catch(() => []);
      
      if (files.length === 0) return;
      
      logger.info(`Migrating ${files.length} user level files to database...`);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const userId = file.replace('.json', '');
        const filePath = path.join(this.userDataPath, file);
        
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const userData = JSON.parse(data);
          
          // For each guild in the user data
          for (const [guildId, guildData] of Object.entries(userData)) {
            await this.db.query(`
              INSERT INTO user_levels 
              (user_id, guild_id, level, xp, last_message_timestamp, last_voice_timestamp, total_messages, total_voice_minutes) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE 
              level = VALUES(level),
              xp = VALUES(xp),
              last_message_timestamp = VALUES(last_message_timestamp),
              last_voice_timestamp = VALUES(last_voice_timestamp),
              total_messages = VALUES(total_messages),
              total_voice_minutes = VALUES(total_voice_minutes)
            `, [
              userId,
              guildId,
              guildData.level || 1,
              guildData.xp || 0,
              guildData.lastMessageTimestamp ? new Date(guildData.lastMessageTimestamp) : null,
              guildData.lastVoiceTimestamp ? new Date(guildData.lastVoiceTimestamp) : null,
              guildData.totalMessages || 0,
              guildData.totalVoiceMinutes || 0
            ]);
          }
          
          // Rename the file to indicate it's been migrated
          await fs.rename(filePath, `${filePath}.migrated`);
        } catch (error) {
          logger.error(`Error migrating user ${userId} level data: ${error.message}`);
        }
      }
      
      logger.info('Level data migration completed');
    } catch (error) {
      logger.error(`Error migrating level data to database: ${error.message}`);
    }
  }

  /**
   * Handle message for XP
   * @param {Message} message - Discord message
   */
  async handleMessage(message) {
    try {
      if (!config.levelSystem || !config.levelSystem.enabled) return;
      
      const { author, guild, channel } = message;
      
      // Ignore DMs
      if (!guild) return;
      
      const userId = author.id;
      const guildId = guild.id;
      
      // Check cooldown
      const cooldownKey = `${userId}-${guildId}`;
      const now = Date.now();
      const cooldownTime = config.levelSystem.xpCooldown * 1000 || 60000;
      const lastMessageTime = this.messageCooldowns.get(cooldownKey) || 0;
      
      if (now - lastMessageTime < cooldownTime) return;
      
      // Set cooldown
      this.messageCooldowns.set(cooldownKey, now);
      
      // Increment message counter
      const counterKey = `msg-${userId}-${guildId}`;
      const currentCount = this.messageCounter.get(counterKey) || 0;
      const newCount = currentCount + 1;
      this.messageCounter.set(counterKey, newCount);
      
      // Update total messages count
      await this.updateUserStat(userId, guildId, 'total_messages', 1, true);
      
      // Log message count progress
      logger.debug(`User ${author.tag} message count: ${newCount}/${this.messageRewardFrequency}`);
      
      // Only give XP every Nth message
      if (newCount % this.messageRewardFrequency === 0) {
        // Get base XP amount
        const baseXp = config.levelSystem.xpPerMessage || 3;
        
        // Apply multipliers
        let xpMultiplier = 1;
        
        // Check for premium roles
        if (config.levelSystem.xpMultipliers) {
          for (const [role, multiplier] of Object.entries(config.levelSystem.xpMultipliers)) {
            if (message.member.roles.cache.some(r => r.name === role || r.id === role)) {
              xpMultiplier = Math.max(xpMultiplier, multiplier);
            }
          }
        }
        
        const xpToAdd = Math.floor(baseXp * xpMultiplier);
        
        // Add XP
        await this.addXP(author, xpToAdd, guild, channel);
        
        logger.info(`Awarded ${xpToAdd} XP to ${author.tag} for message activity (message #${newCount})`);
      }
    } catch (error) {
      logger.error(`Error handling message for XP: ${error.message}`);
    }
  }

  /**
   * Handle voice state update for XP tracking
   * @param {VoiceState} oldState - Old voice state
   * @param {VoiceState} newState - New voice state
   */
  handleVoiceStateUpdate(oldState, newState) {
    try {
      if (!config.levelSystem || !config.levelSystem.enabled) return;
      
      const userId = newState.id;
      const guildId = newState.guild.id;
      const key = `${userId}-${guildId}`;
      
      // User joined a voice channel
      if (!oldState.channelId && newState.channelId) {
        this.voiceTimeTracking.set(key, {
          joinTime: Date.now(),
          channelId: newState.channelId
        });
      }
      // User left a voice channel
      else if (oldState.channelId && !newState.channelId) {
        const state = this.voiceTimeTracking.get(key);
        if (state) {
          const duration = (Date.now() - state.joinTime) / 60000; // minutes
          this.voiceTimeTracking.delete(key);
          
          // Update total voice minutes
          this.updateUserStat(userId, guildId, 'total_voice_minutes', Math.floor(duration), true)
            .catch(err => logger.error(`Error updating voice minutes: ${err.message}`));
        }
      }
      // User switched channels
      else if (oldState.channelId !== newState.channelId) {
        const state = this.voiceTimeTracking.get(key);
        if (state) {
          const duration = (Date.now() - state.joinTime) / 60000; // minutes
          
          // Update total voice minutes
          this.updateUserStat(userId, guildId, 'total_voice_minutes', Math.floor(duration), true)
            .catch(err => logger.error(`Error updating voice minutes: ${err.message}`));
          
          // Reset join time for new channel
          this.voiceTimeTracking.set(key, {
            joinTime: Date.now(),
            channelId: newState.channelId
          });
        } else {
          this.voiceTimeTracking.set(key, {
            joinTime: Date.now(),
            channelId: newState.channelId
          });
        }
      }
    } catch (error) {
      logger.error(`Error handling voice state update: ${error.message}`);
    }
  }

  /**
   * Process XP for users in voice channels
   */
  async processVoiceXP() {
    try {
      if (!config.levelSystem || !config.levelSystem.enabled || !this.client) return;
      
      const now = Date.now();
      const xpPerMinute = config.levelSystem.voiceXpPerMinute || 1;
      
      for (const [key, state] of this.voiceTimeTracking.entries()) {
        const [userId, guildId] = key.split('-');
        
        // Skip if user has been in voice for less than a minute
        if (now - state.joinTime < 60000) continue;
        
        // Get guild and member
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) continue;
        
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) continue;
        
        // Check if user is still in the voice channel
        if (!member.voice.channelId) {
          this.voiceTimeTracking.delete(key);
          continue;
        }
        
        // Check if user is alone in channel
        const channel = guild.channels.cache.get(member.voice.channelId);
        if (!channel) continue;
        
        // Skip if user is alone or only with bots
        const membersInChannel = channel.members.filter(m => !m.user.bot);
        if (membersInChannel.size <= 1) continue;
        
        // Skip if user is muted or deafened
        if (member.voice.mute || member.voice.deaf) continue;
        
        // Increment voice time counter (in minutes)
        const counterKey = `voice-${userId}-${guildId}`;
        const currentMinutes = this.voiceTimeCounter.get(counterKey) || 0;
        const newMinutes = currentMinutes + 1;
        this.voiceTimeCounter.set(counterKey, newMinutes);
        
        // Update total voice minutes
        await this.updateUserStat(userId, guildId, 'total_voice_minutes', 1, true);
        
        // Update last voice timestamp
        await this.updateUserStat(userId, guildId, 'last_voice_timestamp', new Date());
        
        // Log voice time progress
        logger.debug(`User ${member.user.tag} voice time: ${newMinutes}/${this.voiceRewardFrequency} minutes`);
        
        // Only give XP every Nth minute
        if (newMinutes % this.voiceRewardFrequency === 0) {
          // Apply multipliers
          let xpMultiplier = 1;
          
          // Check for premium roles
          if (config.levelSystem.xpMultipliers) {
            for (const [role, multiplier] of Object.entries(config.levelSystem.xpMultipliers)) {
              if (member.roles.cache.some(r => r.name === role || r.id === role)) {
                xpMultiplier = Math.max(xpMultiplier, multiplier);
              }
            }
          }
          
          // Calculate XP for the full time period
          const xpToAdd = Math.floor(xpPerMinute * this.voiceRewardFrequency * xpMultiplier);
          
          // Add XP
          await this.addXP(member.user, xpToAdd, guild);
          
          logger.info(`Awarded ${xpToAdd} XP to ${member.user.tag} for voice activity (${this.voiceRewardFrequency} minutes)`);
        }
      }
    } catch (error) {
      logger.error(`Error processing voice XP: ${error.message}`);
    }
  }

  /**
   * Add XP to a user
   * @param {User} user - Discord user
   * @param {number} amount - Amount of XP to add
   * @param {Guild} guild - Discord guild
   * @param {TextChannel} channel - Discord channel (optional)
   */
  async addXP(user, amount, guild, channel = null) {
    try {
      const userId = user.id;
      const guildId = guild.id;
      
      // Check if user is already being processed (has a lock)
      const lockKey = `${userId}-${guildId}`;
      if (this.userLocks.has(lockKey)) {
        logger.debug(`Skipping XP add for ${user.tag} - already being processed`);
        return;
      }
      
      // Set a lock for this user
      this.userLocks.set(lockKey, Date.now());
      
      try {
        // Get current user data
        const userData = await this.getUserData(userId, guildId);
        const oldLevel = userData.level;
        
        // Add XP
        userData.xp += amount;
        
        // Check for level up
        while (userData.xp >= this.calculateRequiredXP(userData.level)) {
          userData.xp -= this.calculateRequiredXP(userData.level);
          userData.level++;
        }
        
        // Update last message timestamp
        userData.lastMessageTimestamp = new Date();
        
        // Save user data
        await this.saveUserData(userId, guildId, userData);
        
        // Handle level up
        if (userData.level > oldLevel) {
          await this.handleLevelUp(user, oldLevel, userData.level, guild, channel);
        }
      } finally {
        // Release the lock
        this.userLocks.delete(lockKey);
      }
    } catch (error) {
      logger.error(`Error adding XP: ${error.message}`);
      
      // Make sure to release the lock in case of error
      const lockKey = `${userId}-${guildId}`;
      this.userLocks.delete(lockKey);
    }
  }

  /**
   * Update a specific user stat
   * @param {string} userId - User ID
   * @param {string} guildId - Guild ID
   * @param {string} stat - Stat to update
   * @param {any} value - New value
   * @param {boolean} increment - Whether to increment or set
   */
  async updateUserStat(userId, guildId, stat, value, increment = false) {
    try {
      if (this.db && this.db.isConnected) {
        if (increment) {
          await this.db.query(`
            UPDATE user_levels 
            SET ${stat} = ${stat} + ? 
            WHERE user_id = ? AND guild_id = ?
          `, [value, userId, guildId]);
        } else {
          await this.db.query(`
            UPDATE user_levels 
            SET ${stat} = ? 
            WHERE user_id = ? AND guild_id = ?
          `, [value, userId, guildId]);
        }
      } else {
        // Fallback to file-based storage
        const userData = await this.getUserData(userId, guildId);
        
        // Convert database column names to camelCase for file storage
        const statMap = {
          'total_messages': 'totalMessages',
          'total_voice_minutes': 'totalVoiceMinutes',
          'last_message_timestamp': 'lastMessageTimestamp',
          'last_voice_timestamp': 'lastVoiceTimestamp'
        };
        
        const jsKey = statMap[stat] || stat;
        
        if (increment) {
          userData[jsKey] = (userData[jsKey] || 0) + value;
        } else {
          userData[jsKey] = value;
        }
        
        await this.saveUserData(userId, guildId, userData);
      }
    } catch (error) {
      logger.error(`Error updating user stat: ${error.message}`);
    }
  }

  /**
   * Handle level up
   * @param {User} user - Discord user
   * @param {number} oldLevel - Old level
   * @param {number} newLevel - New level
   * @param {Guild} guild - Discord guild
   * @param {TextChannel} channel - Discord channel (optional)
   */
  async handleLevelUp(user, oldLevel, newLevel, guild, channel = null) {
    try {
      // Assign level roles
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (member) {
        await this.assignLevelRoles(member, newLevel);
      }
      
      // Send level up message
      const levelUpMessage = config.levelSystem.levelUpMessage || 'Congratulations {user}! You\'ve reached level {level}!';
      const formattedMessage = levelUpMessage
        .replace('{user}', `<@${user.id}>`)
        .replace('{level}', newLevel);
      
      // Create a unique key for this level up event to prevent duplicate messages
      const levelUpKey = `${user.id}-${guild.id}-${newLevel}`;
      
      // Check if we've already sent a message for this level up in the last minute
      const recentLevelUps = this.recentLevelUps || new Map();
      const now = Date.now();
      const lastLevelUpTime = recentLevelUps.get(levelUpKey) || 0;
      
      // Only send the message if it hasn't been sent in the last minute
      if (now - lastLevelUpTime > 60000) {
        // Determine where to send the message
        if (config.levelSystem.levelUpChannel) {
          const levelUpChannel = guild.channels.cache.find(
            c => c.name === config.levelSystem.levelUpChannel || c.id === config.levelSystem.levelUpChannel
          );
          
          if (levelUpChannel) {
            await levelUpChannel.send(formattedMessage);
          } else if (channel) {
            await channel.send(formattedMessage);
          }
        } else if (channel) {
          await channel.send(formattedMessage);
        }
        
        // Record that we sent this level up message
        recentLevelUps.set(levelUpKey, now);
        this.recentLevelUps = recentLevelUps;
        
        // Clean up old entries from the map (older than 5 minutes)
        for (const [key, time] of recentLevelUps.entries()) {
          if (now - time > 300000) { // 5 minutes
            recentLevelUps.delete(key);
          }
        }
      }
      
      // Log level up
      logger.info(`User ${user.tag} leveled up from ${oldLevel} to ${newLevel} in ${guild.name}`);
      
      // Record level up in database
      if (this.db && this.db.isConnected) {
        try {
          await this.db.query(`
            INSERT INTO level_ups (user_id, guild_id, old_level, new_level, timestamp)
            VALUES (?, ?, ?, ?, NOW())
          `, [user.id, guild.id, oldLevel, newLevel]);
        } catch (error) {
          logger.error(`Failed to record level up in database: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Error handling level up: ${error.message}`);
    }
  }

  /**
   * Assign level roles
   * @param {GuildMember} member - Discord guild member
   * @param {number} level - Current level
   */
  async assignLevelRoles(member, level) {
    try {
      if (!config.levelSystem.levelRoles) return;
      
      // Get level roles from config
      const levelRoles = config.levelSystem.levelRoles;
      
      // Get level roles from database if available
      let dbLevelRoles = [];
      if (this.db && this.db.isConnected) {
        try {
          dbLevelRoles = await this.db.query(`
            SELECT level, role_id 
            FROM level_rewards 
            WHERE guild_id = ? AND reward_type = 'role'
            ORDER BY level ASC
          `, [member.guild.id]);
        } catch (error) {
          logger.error(`Failed to get level roles from database: ${error.message}`);
        }
      }
      
      // Combine config and database roles
      const allLevelRoles = { ...levelRoles };
      
      // Add database roles
      for (const dbRole of dbLevelRoles) {
        allLevelRoles[dbRole.level] = dbRole.role_id;
      }
      
      // Sort levels in descending order
      const sortedLevels = Object.keys(allLevelRoles)
        .map(l => parseInt(l))
        .sort((a, b) => b - a);
      
      // Find the highest level role the member qualifies for
      let highestQualifiedLevel = null;
      for (const lvl of sortedLevels) {
        if (level >= lvl) {
          highestQualifiedLevel = lvl;
          break;
        }
      }
      
      if (highestQualifiedLevel === null) return;
      
      // Get the role
      const roleNameOrId = allLevelRoles[highestQualifiedLevel];
      const role = member.guild.roles.cache.find(r => r.name === roleNameOrId || r.id === roleNameOrId);
      
      if (!role) {
        logger.warn(`Level role "${roleNameOrId}" not found in guild ${member.guild.name}`);
        return;
      }
      
      // Remove all level roles
      for (const lvl of sortedLevels) {
        const roleNameOrId = allLevelRoles[lvl];
        const roleToRemove = member.guild.roles.cache.find(r => r.name === roleNameOrId || r.id === roleNameOrId);
        
        if (roleToRemove && member.roles.cache.has(roleToRemove.id)) {
          await member.roles.remove(roleToRemove);
        }
      }
      
      // Add the highest qualified role
      await member.roles.add(role);
      logger.info(`Assigned level role ${role.name} to ${member.user.tag} for level ${highestQualifiedLevel}`);
    } catch (error) {
      logger.error(`Error assigning level roles: ${error.message}`);
    }
  }

  /**
   * Calculate level from XP
   * @param {number} xp - Total XP
   * @returns {number} - Level
   */
  calculateLevel(xp) {
    let level = 1;
    let xpRequired = this.calculateRequiredXP(level);
    
    while (xp >= xpRequired) {
      xp -= xpRequired;
      level++;
      xpRequired = this.calculateRequiredXP(level);
    }
    
    return level;
  }

  /**
   * Calculate XP required for a level
   * @param {number} level - Level
   * @returns {number} - XP required
   */
  calculateRequiredXP(level) {
    // Parse the level formula from config
    const formula = config.levelSystem.levelFormula || '100 * (level ^ 1.5)';
    return Math.floor(eval(formula.replace('level', level)));
  }

  /**
   * Get user data
   * @param {string} userId - User ID
   * @param {string} guildId - Guild ID
   * @returns {Object} - User data
   */
  async getUserData(userId, guildId) {
    try {
      // Check cache first
      const cacheKey = `${userId}-${guildId}`;
      const cachedData = this.userDataCache.get(cacheKey);
      
      if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheTTL) {
        return cachedData.data;
      }
      
      // Try to get from database first
      if (this.db && this.db.isConnected) {
        const results = await this.db.query(`
          SELECT * FROM user_levels WHERE user_id = ? AND guild_id = ?
        `, [userId, guildId]);
        
        if (results && results.length > 0) {
          const dbData = results[0];
          const userData = {
            level: dbData.level || 1,
            xp: dbData.xp || 0,
            lastMessageTimestamp: dbData.last_message_timestamp,
            lastVoiceTimestamp: dbData.last_voice_timestamp,
            totalMessages: dbData.total_messages || 0,
            totalVoiceMinutes: dbData.total_voice_minutes || 0
          };
          
          // Cache the data
          this.userDataCache.set(cacheKey, {
            data: userData,
            timestamp: Date.now()
          });
          
          return userData;
        }
        
        // If not found, create a new record
        await this.db.query(`
          INSERT INTO user_levels 
          (user_id, guild_id, level, xp, total_messages, total_voice_minutes) 
          VALUES (?, ?, 1, 0, 0, 0)
        `, [userId, guildId]);
        
        const newUserData = {
          level: 1,
          xp: 0,
          lastMessageTimestamp: null,
          lastVoiceTimestamp: null,
          totalMessages: 0,
          totalVoiceMinutes: 0
        };
        
        // Cache the data
        this.userDataCache.set(cacheKey, {
          data: newUserData,
          timestamp: Date.now()
        });
        
        return newUserData;
      }
      
      // Fallback to file-based storage
      const filePath = path.join(this.userDataPath, `${userId}.json`);
      
      try {
        const data = await fs.readFile(filePath, 'utf8');
        const userData = JSON.parse(data);
        
        if (!userData[guildId]) {
          userData[guildId] = {
            level: 1,
            xp: 0,
            lastMessageTimestamp: null,
            lastVoiceTimestamp: null,
            totalMessages: 0,
            totalVoiceMinutes: 0
          };
          
          await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
        }
        
        // Cache the data
        this.userDataCache.set(cacheKey, {
          data: userData[guildId],
          timestamp: Date.now()
        });
        
        return userData[guildId];
      } catch (error) {
        // Create new user data
        const userData = {
          [guildId]: {
            level: 1,
            xp: 0,
            lastMessageTimestamp: null,
            lastVoiceTimestamp: null,
            totalMessages: 0,
            totalVoiceMinutes: 0
          }
        };
        
        await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
        return userData[guildId];
      }
    } catch (error) {
      logger.error(`Error getting user data: ${error.message}`);
      return {
        level: 1,
        xp: 0,
        lastMessageTimestamp: null,
        lastVoiceTimestamp: null,
        totalMessages: 0,
        totalVoiceMinutes: 0
      };
    }
  }

  /**
   * Save user data
   * @param {string} userId - User ID
   * @param {string} guildId - Guild ID
   * @param {Object} userData - User data
   */
  async saveUserData(userId, guildId, userData) {
    try {
      // Update cache
      const cacheKey = `${userId}-${guildId}`;
      this.userDataCache.set(cacheKey, {
        data: userData,
        timestamp: Date.now()
      });
      
      // Save to database if available
      if (this.db && this.db.isConnected) {
        await this.db.query(`
          UPDATE user_levels 
          SET level = ?, xp = ?, last_message_timestamp = ?, last_voice_timestamp = ?, 
              total_messages = ?, total_voice_minutes = ?
          WHERE user_id = ? AND guild_id = ?
        `, [
          userData.level,
          userData.xp,
          userData.lastMessageTimestamp,
          userData.lastVoiceTimestamp,
          userData.totalMessages,
          userData.totalVoiceMinutes,
          userId,
          guildId
        ]);
        
        return;
      }
      
      // Fallback to file-based storage
      const filePath = path.join(this.userDataPath, `${userId}.json`);
      
      try {
        const data = await fs.readFile(filePath, 'utf8');
        const allUserData = JSON.parse(data);
        
        allUserData[guildId] = userData;
        
        await fs.writeFile(filePath, JSON.stringify(allUserData, null, 2));
      } catch (error) {
        // Create new file
        const allUserData = {
          [guildId]: userData
        };
        
        await fs.writeFile(filePath, JSON.stringify(allUserData, null, 2));
      }
    } catch (error) {
      logger.error(`Error saving user data: ${error.message}`);
    }
  }

  /**
   * Get leaderboard
   * @param {string} guildId - Guild ID
   * @param {number} limit - Limit
   * @returns {Array} - Leaderboard
   */
  async getLeaderboard(guildId, limit = 10) {
    try {
      // Get from database if available
      if (this.db && this.db.isConnected) {
        const results = await this.db.query(`
          SELECT user_id, level, xp, total_messages, total_voice_minutes 
          FROM user_levels 
          WHERE guild_id = ? 
          ORDER BY level DESC, xp DESC 
          LIMIT ?
        `, [guildId, limit]);
        
        return results;
      }
      
      // Fallback to file-based storage
      const files = await fs.readdir(this.userDataPath);
      const leaderboard = [];
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const userId = file.replace('.json', '');
        const filePath = path.join(this.userDataPath, file);
        
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const userData = JSON.parse(data);
          
          if (userData[guildId]) {
            leaderboard.push({
              user_id: userId,
              level: userData[guildId].level,
              xp: userData[guildId].xp,
              total_messages: userData[guildId].totalMessages || 0,
              total_voice_minutes: userData[guildId].totalVoiceMinutes || 0
            });
          }
        } catch (error) {
          logger.error(`Error reading user data file: ${error.message}`);
        }
      }
      
      // Sort and limit
      return leaderboard
        .sort((a, b) => {
          if (a.level !== b.level) return b.level - a.level;
          return b.xp - a.xp;
        })
        .slice(0, limit);
    } catch (error) {
      logger.error(`Error getting leaderboard: ${error.message}`);
      return [];
    }
  }

  /**
   * Create leaderboard embed
   * @param {Guild} guild - Discord guild
   * @param {number} limit - Limit
   * @returns {EmbedBuilder} - Leaderboard embed
   */
  async createLeaderboardEmbed(guild, limit = 10) {
    try {
      const leaderboard = await this.getLeaderboard(guild.id, limit);
      
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Leaderboard`)
        .setColor('#00FF00')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTimestamp();
      
      if (leaderboard.length === 0) {
        embed.setDescription('No data available yet.');
        return embed;
      }
      
      let description = '';
      
      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const user = await this.client.users.fetch(entry.user_id).catch(() => null);
        const username = user ? user.tag : entry.user_id;
        
        description += `**${i + 1}.** ${username}\n`;
        description += `Level: ${entry.level} | XP: ${entry.xp}/${this.calculateRequiredXP(entry.level)}\n`;
        description += `Messages: ${entry.total_messages} | Voice: ${entry.total_voice_minutes} minutes\n\n`;
      }
      
      embed.setDescription(description);
      
      return embed;
    } catch (error) {
      logger.error(`Error creating leaderboard embed: ${error.message}`);
      
      return new EmbedBuilder()
        .setTitle('Leaderboard Error')
        .setDescription('An error occurred while creating the leaderboard.')
        .setColor('#FF0000');
    }
  }

  /**
   * Process a message for XP
   * @param {Message} message - Discord message
   */
  async processMessage(message) {
    await this.handleMessage(message);
  }

  /**
   * Get the total number of ranked users in a guild
   * @param {string} guildId - The guild ID
   * @returns {Promise<number>} - The total number of ranked users
   */
  async getTotalRankedUsers(guildId) {
    try {
      if (this.db && this.db.isConnected) {
        // Use database
        const result = await this.db.query(
          'SELECT COUNT(*) as count FROM user_levels WHERE guild_id = ? AND level > 0',
          [guildId]
        );
        
        return result[0]?.count || 0;
      } else {
        // Use file system
        const userFiles = await fs.readdir(this.userDataPath).catch(() => []);
        
        // Filter files for this guild and count them
        let count = 0;
        for (const file of userFiles) {
          if (!file.endsWith('.json')) continue;
          
          const userId = file.replace('.json', '');
          const userData = await this.getUserData(userId, guildId);
          
          if (userData && userData.level > 0) {
            count++;
          }
        }
        
        return count;
      }
    } catch (error) {
      logger.error(`Error getting total ranked users: ${error.message}`);
      return 0;
    }
  }

  /**
   * Clean up expired locks
   * This should be called periodically to prevent deadlocks
   */
  cleanupExpiredLocks() {
    const now = Date.now();
    for (const [key, timestamp] of this.userLocks.entries()) {
      if (now - timestamp > this.lockTimeout) {
        logger.warn(`Removing expired lock for ${key}`);
        this.userLocks.delete(key);
      }
    }
  }
}

module.exports = new LevelingSystem(); 