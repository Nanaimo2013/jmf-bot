/**
 * JMF Hosting Discord Bot - Verification Module
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This module handles user verification in the server.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Module = require('./base.module');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class VerificationModule extends Module {
  /**
   * Create a new verification module
   */
  constructor() {
    super({
      name: 'verification',
      description: 'Handles user verification in the server',
      enabled: true,
      dependencies: ['database']
    });
    
    // Track verified users
    this.verifiedUsers = new Set();
    this.listeners = new Map();
  }

  /**
   * Initialize the verification module
   * @param {Client} client - The Discord.js client
   * @returns {Promise<boolean>}
   */
  async initialize(client) {
    try {
      await super.initialize(client);
      
      // Load verified users from database
      if (this.database && this.database.isConnected) {
        await this.loadVerifiedUsers();
        this.logger.info(this.name, 'Verification data loaded from database');
      } else {
        this.logger.warn(this.name, 'Database not available, verification data will not be persistent');
      }
      
      return true;
    } catch (error) {
      this.handleError('initialize', error);
      return false;
    }
  }
  
  /**
   * Start the verification module
   * @returns {Promise<boolean>}
   */
  async start() {
    try {
      await super.start();
      
      // Register button handler
      this.client.on('interactionCreate', this.handleInteraction.bind(this));
      
      return true;
    } catch (error) {
      this.handleError('start', error);
      return false;
    }
  }
  
  /**
   * Stop the verification module
   * @returns {Promise<boolean>}
   */
  async stop() {
    try {
      // Remove event listeners
      this.client.removeListener('interactionCreate', this.handleInteraction.bind(this));
      
      await super.stop();
      return true;
    } catch (error) {
      this.handleError('stop', error);
      return false;
    }
  }

  /**
   * Handle interactions
   * @param {Interaction} interaction - The interaction
   * @returns {Promise<void>}
   */
  async handleInteraction(interaction) {
    try {
      if (!interaction.isButton()) return;
      
      if (interaction.customId === 'verify') {
        await this.handleVerifyButton(interaction);
      }
    } catch (error) {
      this.handleError('handleInteraction', error);
    }
  }

  /**
   * Load verified users from database
   * @returns {Promise<void>}
   */
  async loadVerifiedUsers() {
    try {
      if (!this.database || !this.database.isConnected) {
        throw new Error('Database not available');
      }
      
      const results = await this.database.query('SELECT user_id FROM verifications');
      
      for (const row of results) {
        this.verifiedUsers.add(row.user_id);
      }
      
      this.logger.debug(this.name, `Loaded ${this.verifiedUsers.size} verified users from database`);
    } catch (error) {
      this.handleError('loadVerifiedUsers', error);
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
      const config = this.moduleConfig;
      
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
      
      // Send message
      await channel.send({ embeds: [embed], components: [row] });
      
      this.logger.info(this.name, `Created verification message in channel ${channel.name}`);
    } catch (error) {
      this.handleError('createVerificationMessage', error);
    }
  }

  /**
   * Handle verify button click
   * @param {ButtonInteraction} interaction - The button interaction
   * @returns {Promise<void>}
   */
  async handleVerifyButton(interaction) {
    try {
      // Defer reply to prevent interaction timeout
      await interaction.deferReply({ ephemeral: true });
      
      const { user, member, guild } = interaction;
      
      // Check if user is already verified
      if (this.isUserVerified(user.id)) {
        await interaction.editReply({ content: 'You are already verified!' });
        return;
      }
      
      // Verify the user
      const result = await this.verifyUser(member, 'button');
      
      if (result.success) {
        await interaction.editReply({ content: 'You have been verified! Welcome to the server.' });
      } else {
        await interaction.editReply({ content: `Verification failed: ${result.message}` });
      }
    } catch (error) {
      this.handleError('handleVerifyButton', error);
      
      // Try to respond to the interaction if possible
      try {
        if (interaction.deferred) {
          await interaction.editReply({ content: 'An error occurred during verification. Please try again later.' });
        } else {
          await interaction.reply({ content: 'An error occurred during verification. Please try again later.', ephemeral: true });
        }
      } catch (replyError) {
        this.logger.error(this.name, `Failed to reply to interaction: ${replyError.message}`);
      }
    }
  }

  /**
   * Check if a user is verified
   * @param {string} userId - The user ID
   * @returns {boolean} - Whether the user is verified
   */
  isUserVerified(userId) {
    return this.verifiedUsers.has(userId);
  }

  /**
   * Verify a user
   * @param {GuildMember} member - The guild member
   * @param {string} verifier - What verified the user (button, command, etc.)
   * @returns {Promise<Object>} - Result of verification
   */
  async verifyUser(member, verifier = 'unknown') {
    try {
      const { user, guild } = member;
      const config = this.moduleConfig;
      
      // Add to verified users set
      this.verifiedUsers.add(user.id);
      
      // Add to database
      if (this.database && this.database.isConnected) {
        await this.database.query(
          'INSERT INTO verifications (user_id, guild_id, verified_at, verified_by) VALUES (?, ?, NOW(), ?)',
          [user.id, guild.id, verifier]
        );
      }
      
      // Assign roles if configured
      if (config.autoAssignRoles) {
        // Add verified role
        if (config.verifiedRoleId) {
          const verifiedRole = await guild.roles.fetch(config.verifiedRoleId).catch(() => null);
          if (verifiedRole) {
            await member.roles.add(verifiedRole);
          }
        }
        
        // Remove unverified role
        if (config.unverifiedRoleId) {
          const unverifiedRole = await guild.roles.fetch(config.unverifiedRoleId).catch(() => null);
          if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
            await member.roles.remove(unverifiedRole);
          }
        }
      }
      
      // Log verification
      if (config.logVerifications) {
        this.logger.info(this.name, `User ${user.tag} (${user.id}) verified via ${verifier}`);
        
        // Emit verification event for other modules
        this.emit('userVerified', { user, guild, verifier });
      }
      
      return { success: true };
    } catch (error) {
      this.handleError('verifyUser', error);
      return { success: false, message: error.message };
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
        verifiedUsers: this.verifiedUsers.size
      }
    };
  }
}

module.exports = VerificationModule;