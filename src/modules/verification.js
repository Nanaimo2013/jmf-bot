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
const logger = require('../utils/logger');
const config = require('../../config.json');
const { createVerifyEmbed } = require('../embeds/verify-embed');

class VerificationSystem {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the verification system
   * @param {Client} client - Discord client
   */
  init(client) {
    this.client = client;
    this.isInitialized = true;
    logger.info('Verification system initialized');
  }

  /**
   * Create verification message in channel
   * @param {TextChannel} channel - Discord text channel
   */
  async createVerificationMessage(channel) {
    try {
      // Create verification embed
      const embed = createVerifyEmbed();

      // Create verification button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('verify')
            .setLabel(config.verification?.buttonText || 'Verify')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✅')
        );

      // Send verification message
      await channel.send({ embeds: [embed], components: [row] });
      logger.info(`Verification message created in channel: ${channel.name}`);
    } catch (error) {
      logger.error(`Error creating verification message: ${error.message}`);
    }
  }

  /**
   * Verify a user
   * @param {ButtonInteraction} interaction - Button interaction
   */
  async verifyUser(interaction) {
    try {
      // Defer reply to prevent timeout
      await interaction.deferReply({ ephemeral: true });

      const { member, guild } = interaction;

      // Check if user is already verified
      const verifiedRole = guild.roles.cache.find(
        role => role.name === (config.verification?.verifiedRole || 'Member')
      );

      const unverifiedRole = guild.roles.cache.find(
        role => role.name === (config.verification?.unverifiedRole || 'Unverified')
      );

      if (!verifiedRole) {
        logger.error(`Verified role not found in guild: ${guild.name}`);
        return interaction.editReply({ content: 'Verification failed: Verified role not found. Please contact an administrator.', ephemeral: true });
      }

      if (member.roles.cache.has(verifiedRole.id)) {
        return interaction.editReply({ content: 'You are already verified!', ephemeral: true });
      }

      // Add verified role
      await member.roles.add(verifiedRole);
      logger.info(`User ${member.user.tag} verified in guild: ${guild.name}`);

      // Remove unverified role if it exists
      if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
        await member.roles.remove(unverifiedRole);
      }

      // Record verification in database
      if (interaction.client.db && interaction.client.db.isConnected) {
        try {
          await interaction.client.db.query(
            'INSERT INTO verifications (user_id, guild_id, timestamp) VALUES (?, ?, ?)',
            [member.id, guild.id, new Date()]
          );
        } catch (error) {
          logger.error(`Failed to record verification in database: ${error.message}`);
        }
      }

      // Send welcome message if configured
      if (config.verification?.sendWelcomeMessage && config.verification?.welcomeChannel) {
        const welcomeChannel = guild.channels.cache.find(
          channel => channel.name === config.verification.welcomeChannel || channel.id === config.verification.welcomeChannel
        );

        if (welcomeChannel) {
          const welcomeEmbed = new EmbedBuilder()
            .setTitle('New Member')
            .setDescription(`Welcome to the server, ${member}! Thanks for verifying.`)
            .setColor('#00FF00')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

          await welcomeChannel.send({ embeds: [welcomeEmbed] });
        }
      }

      // Send verification success message
      return interaction.editReply({ 
        content: config.verification?.successMessage || 'You have been successfully verified! You now have access to the server.', 
        ephemeral: true 
      });
    } catch (error) {
      logger.error(`Error verifying user: ${error.message}`);
      return interaction.editReply({ 
        content: 'An error occurred during verification. Please try again or contact an administrator.', 
        ephemeral: true 
      });
    }
  }
}

module.exports = new VerificationSystem();