/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const BotBaseModule = require('../managers/bot/modules/base.module');

class VerificationModule extends BotBaseModule {
  /**
   * Create a new verification module
   * @param {BotManager} manager - The bot manager instance
   */
  constructor(manager) {
    super(manager, {
      name: 'verification',
      version: '1.1.0',
      description: 'Handles user verification in the server',
      defaultConfig: {
        enabled: true,
        verifiedRoleId: null,
        unverifiedRoleId: null,
        buttonText: 'Verify',
        buttonEmoji: '✅',
        logVerifications: true,
        autoAssignRoles: true,
        welcomeMessage: true,
        verificationChannelId: null
      }
    });
    
    // Track verified users
    this.verifiedUsers = new Set();
  }

  /**
   * Initialize the verification module
   * @param {Object} [config] - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    
    // Register button handler
    this.registerButton('verify', this.handleVerifyButton.bind(this));
    
    // Load verified users from database
    await this.loadVerifiedUsers();
    
    this.log('info', 'Verification module initialized');
  }

  /**
   * Load verified users from database
   * @returns {Promise<void>}
   */
  async loadVerifiedUsers() {
    try {
      const database = await this.getDatabase();
      if (!database) return;
      
      const results = await database.query('SELECT user_id FROM verifications');
      
      for (const row of results) {
        this.verifiedUsers.add(row.user_id);
      }
      
      this.log('debug', `Loaded ${this.verifiedUsers.size} verified users from database`);
    } catch (error) {
      this.log('error', `Failed to load verified users: ${error.message}`, error.stack);
    }
  }

  /**
   * Create verification message in channel
   * @param {TextChannel} channel - Discord text channel
   * @returns {Promise<void>}
   */
  async createVerificationMessage(channel) {
    try {
      // Get config
      const config = this.getConfig();
      
      // Create verification embed
      const embed = new EmbedBuilder()
        .setTitle('Server Verification')
        .setDescription('Click the button below to verify yourself and gain access to the server.')
        .setColor('#0099ff')
        .setTimestamp();
      
      // Create verification button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('verify')
            .setLabel(config.buttonText || 'Verify')
            .setStyle(ButtonStyle.Primary)
            .setEmoji(config.buttonEmoji || '✅')
        );
      
      // Send verification message
      await channel.send({ embeds: [embed], components: [row] });
      
      // Update config with channel ID
      const configManager = this.manager.getConfigManager();
      const botConfig = configManager.getConfig();
      
      if (!botConfig.verification) {
        botConfig.verification = {};
      }
      
      botConfig.verification.verificationChannelId = channel.id;
      await configManager.saveConfig();
      
      this.log('info', `Verification message created in channel: ${channel.name} (${channel.id})`);
    } catch (error) {
      this.log('error', `Error creating verification message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle verify button interaction
   * @param {ButtonInteraction} interaction - Button interaction
   * @returns {Promise<void>}
   */
  async handleVerifyButton(interaction) {
    try {
      // Defer reply to prevent timeout
      await interaction.deferReply({ ephemeral: true });
      
      const { member, guild } = interaction;
      
      // Get config
      const config = this.getConfig();
      
      // Check if verification is enabled
      if (!config.enabled) {
        return interaction.editReply({
          content: '❌ Verification is currently disabled.',
          ephemeral: true
        });
      }
      
      // Get verified role
      const verifiedRoleId = config.verifiedRoleId;
      if (!verifiedRoleId) {
        this.log('error', `Verified role ID not set in guild: ${guild.name} (${guild.id})`);
        return interaction.editReply({
          content: '❌ Verification failed: Verified role not configured. Please contact an administrator.',
          ephemeral: true
        });
      }
      
      const verifiedRole = await guild.roles.fetch(verifiedRoleId).catch(() => null);
      if (!verifiedRole) {
        this.log('error', `Verified role not found in guild: ${guild.name} (${guild.id})`);
        return interaction.editReply({
          content: '❌ Verification failed: Verified role not found. Please contact an administrator.',
          ephemeral: true
        });
      }
      
      // Check if user is already verified
      if (member.roles.cache.has(verifiedRoleId)) {
        return interaction.editReply({
          content: '✅ You are already verified!',
          ephemeral: true
        });
      }
      
      // Add verified role
      await member.roles.add(verifiedRole);
      
      // Remove unverified role if configured
      const unverifiedRoleId = config.unverifiedRoleId;
      if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
        const unverifiedRole = await guild.roles.fetch(unverifiedRoleId).catch(() => null);
        if (unverifiedRole) {
          await member.roles.remove(unverifiedRole);
        }
      }
      
      // Record verification in database
      try {
        const database = await this.getDatabase();
        if (database) {
          await database.query(
            'INSERT INTO verifications (user_id, guild_id, verified_at) VALUES (?, ?, ?)',
            [member.id, guild.id, new Date().toISOString()]
          );
          
          // Add to verified users set
          this.verifiedUsers.add(member.id);
        }
      } catch (error) {
        this.log('error', `Failed to record verification in database: ${error.message}`, error.stack);
      }
      
      // Log verification
      this.log('info', `User ${member.user.tag} (${member.id}) verified in guild: ${guild.name} (${guild.id})`);
      
      // Send welcome message if enabled
      if (config.welcomeMessage) {
        try {
          await member.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Welcome to ${guild.name}!`)
                .setDescription('Thank you for verifying! You now have access to the server.')
                .setColor('#00ff00')
                .setTimestamp()
            ]
          });
        } catch (error) {
          this.log('debug', `Could not send welcome DM to ${member.user.tag}: ${error.message}`);
        }
      }
      
      // Send success message
      return interaction.editReply({
        content: '✅ You have been successfully verified! You now have access to the server.',
        ephemeral: true
      });
    } catch (error) {
      this.log('error', `Error verifying user: ${error.message}`, error.stack);
      
      return interaction.editReply({
        content: `❌ An error occurred during verification: ${error.message}`,
        ephemeral: true
      });
    }
  }

  /**
   * Check if a user is verified
   * @param {string} userId - User ID to check
   * @returns {boolean} Whether the user is verified
   */
  isUserVerified(userId) {
    return this.verifiedUsers.has(userId);
  }

  /**
   * Manually verify a user
   * @param {GuildMember} member - Guild member to verify
   * @param {User} verifier - User who verified the member
   * @returns {Promise<boolean>} Whether verification was successful
   */
  async verifyUser(member, verifier) {
    try {
      // Get config
      const config = this.getConfig();
      
      // Check if verification is enabled
      if (!config.enabled) {
        return false;
      }
      
      // Get verified role
      const verifiedRoleId = config.verifiedRoleId;
      if (!verifiedRoleId) {
        this.log('error', `Verified role ID not set in guild: ${member.guild.name} (${member.guild.id})`);
        return false;
      }
      
      const verifiedRole = await member.guild.roles.fetch(verifiedRoleId).catch(() => null);
      if (!verifiedRole) {
        this.log('error', `Verified role not found in guild: ${member.guild.name} (${member.guild.id})`);
        return false;
      }
      
      // Check if user is already verified
      if (member.roles.cache.has(verifiedRoleId)) {
        return true;
      }
      
      // Add verified role
      await member.roles.add(verifiedRole);
      
      // Remove unverified role if configured
      const unverifiedRoleId = config.unverifiedRoleId;
      if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
        const unverifiedRole = await member.guild.roles.fetch(unverifiedRoleId).catch(() => null);
        if (unverifiedRole) {
          await member.roles.remove(unverifiedRole);
        }
      }
      
      // Record verification in database
      try {
        const database = await this.getDatabase();
        if (database) {
          await database.query(
            'INSERT INTO verifications (user_id, guild_id, verified_by, verified_at) VALUES (?, ?, ?, ?)',
            [member.id, member.guild.id, verifier?.id || null, new Date().toISOString()]
          );
          
          // Add to verified users set
          this.verifiedUsers.add(member.id);
        }
      } catch (error) {
        this.log('error', `Failed to record verification in database: ${error.message}`, error.stack);
      }
      
      // Log verification
      this.log('info', `User ${member.user.tag} (${member.id}) manually verified by ${verifier?.tag || 'system'} in guild: ${member.guild.name} (${member.guild.id})`);
      
      return true;
    } catch (error) {
      this.log('error', `Error manually verifying user: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Shutdown the verification module
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.log('info', 'Verification module shutting down');
    await super.shutdown();
  }
}

module.exports = VerificationModule;