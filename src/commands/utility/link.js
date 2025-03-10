/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../../config.json');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your Pterodactyl panel account')
    .addSubcommand(subcommand =>
      subcommand
        .setName('account')
        .setDescription('Link your Discord account to your Pterodactyl panel account')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check your account linking status')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unlink')
        .setDescription('Unlink your Discord account from your Pterodactyl panel account')
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Check if database is connected
      if (!interaction.client.db || !interaction.client.db.isConnected) {
        return interaction.reply({
          content: 'Database connection is not available. Please try again later or contact an administrator.',
          ephemeral: true
        });
      }
      
      switch (subcommand) {
        case 'account':
          await this.handleLinkAccount(interaction);
          break;
        case 'status':
          await this.handleLinkStatus(interaction);
          break;
        case 'unlink':
          await this.handleUnlinkAccount(interaction);
          break;
      }
    } catch (error) {
      logger.error(`Error in link command: ${error.message}`);
      await interaction.reply({
        content: '❌ There was an error executing this command.',
        ephemeral: true
      });
    }
  },
  
  /**
   * Handle the link account subcommand
   * @param {CommandInteraction} interaction - The interaction
   */
  async handleLinkAccount(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check if user is already linked
      const existingLink = await interaction.client.db.query(
        'SELECT * FROM account_links WHERE discord_id = ?',
        [interaction.user.id]
      );
      
      if (existingLink && existingLink.length > 0) {
        return interaction.editReply({
          content: 'Your Discord account is already linked to a Pterodactyl panel account. Use `/link status` to check your link status or `/link unlink` to unlink your account.',
          ephemeral: true
        });
      }
      
      // Generate a unique token
      const token = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours
      
      // Store the token in the database - check if created_at column exists
      try {
        await interaction.client.db.query(
          'INSERT INTO account_links (discord_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)',
          [interaction.user.id, token, expiresAt, new Date()]
        );
      } catch (error) {
        // If the error is about missing created_at column, try without it
        if (error.message.includes('no column named created_at')) {
          logger.warn('account_links table missing created_at column, trying without it');
          await interaction.client.db.query(
            'INSERT INTO account_links (discord_id, token, expires_at) VALUES (?, ?, ?)',
            [interaction.user.id, token, expiresAt]
          );
        } else {
          throw error;
        }
      }
      
      // Create the link embed with a more modern and interactive design
      const linkEmbed = new EmbedBuilder()
        .setTitle('🔗 Link Your Pterodactyl Account')
        .setDescription('Connect your Discord account to your JMF Hosting panel for enhanced features and seamless integration.')
        .setColor(config.embedColor || '#00AAFF')
        .setThumbnail('https://cdn.discordapp.com/attachments/1343993728125239404/1343993728125239404/jmf_logo.png') // Replace with your actual logo URL
        .addFields(
          { 
            name: '📋 Your Linking Token',
            value: `\`${token}\`\n*This token will expire in 24 hours*`,
            inline: false 
          },
          { 
            name: '🔄 How to Link Your Account',
            value: 'Follow the steps below to complete the linking process:',
            inline: false 
          }
        )
        .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();

      // Create action row with buttons
      const linkRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Open Panel')
            .setURL('https://panel.jmfhosting.com')
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setCustomId('link_instructions')
            .setLabel('View Instructions')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('start_link_process')
            .setLabel('Start Linking Process')
            .setStyle(ButtonStyle.Primary)
        );

      await interaction.editReply({
        embeds: [linkEmbed],
        components: [linkRow],
        ephemeral: true
      });
      
      // Record command usage
      try {
        await this.recordCommandUsage(interaction, 'link');
      } catch (error) {
        logger.error(`Failed to record command usage in database: ${error.message}`);
      }
      
    } catch (error) {
      logger.error(`Error generating link token: ${error.message}`);
      await interaction.editReply({
        content: 'An error occurred while generating your link token: ' + error.message,
        ephemeral: true
      });
    }
  },
  
  /**
   * Handle the link status subcommand
   * @param {CommandInteraction} interaction - The interaction
   */
  async handleLinkStatus(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check if user is linked
      const linkData = await interaction.client.db.query(
        'SELECT * FROM account_links WHERE discord_id = ?',
        [interaction.user.id]
      );
      
      if (!linkData || linkData.length === 0) {
        const notLinkedEmbed = new EmbedBuilder()
          .setTitle('❌ Account Not Linked')
          .setDescription('Your Discord account is not linked to any Pterodactyl panel account.')
          .setColor('#FF5555')
          .addFields(
            { 
              name: 'How to Link Your Account',
              value: 'Use `/link account` to link your Discord account to your Pterodactyl panel account.',
              inline: false 
            }
          )
          .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();
          
        const linkRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('start_link_process')
              .setLabel('Link Account')
              .setStyle(ButtonStyle.Primary)
          );
          
        return interaction.editReply({
          embeds: [notLinkedEmbed],
          components: [linkRow],
          ephemeral: true
        });
      }
      
      const linkInfo = linkData[0];
      const isVerified = linkInfo.verified === 1;
      
      const statusEmbed = new EmbedBuilder()
        .setTitle(isVerified ? '✅ Account Linked' : '⏳ Account Linking in Progress')
        .setDescription(isVerified 
          ? 'Your Discord account is linked to your Pterodactyl panel account.'
          : 'Your account linking process has been started but is not yet complete.'
        )
        .setColor(isVerified ? '#55FF55' : '#FFAA00')
        .addFields(
          { 
            name: 'Discord Account',
            value: `<@${interaction.user.id}>`,
            inline: true 
          }
        )
        .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
        
      if (isVerified) {
        statusEmbed.addFields(
          { 
            name: 'Pterodactyl Username',
            value: linkInfo.pterodactyl_username || 'Unknown',
            inline: true 
          },
          { 
            name: 'Linked On',
            value: linkInfo.linked_at ? new Date(linkInfo.linked_at).toLocaleString() : 'Unknown',
            inline: true 
          }
        );
        
        const unlinkRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('unlink_account')
              .setLabel('Unlink Account')
              .setStyle(ButtonStyle.Danger)
          );
          
        return interaction.editReply({
          embeds: [statusEmbed],
          components: [unlinkRow],
          ephemeral: true
        });
      } else {
        // Not verified yet
        statusEmbed.addFields(
          { 
            name: 'Token',
            value: `\`${linkInfo.token}\``,
            inline: true 
          },
          { 
            name: 'Expires',
            value: linkInfo.expires_at ? new Date(linkInfo.expires_at).toLocaleString() : 'Unknown',
            inline: true 
          }
        );
        
        const linkRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Open Panel')
              .setURL('https://panel.jmfhosting.com')
              .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
              .setCustomId('cancel_link')
              .setLabel('Cancel Linking')
              .setStyle(ButtonStyle.Danger)
          );
          
        return interaction.editReply({
          embeds: [statusEmbed],
          components: [linkRow],
          ephemeral: true
        });
      }
    } catch (error) {
      logger.error(`Error checking link status: ${error.message}`);
      await interaction.editReply({
        content: 'An error occurred while checking your link status: ' + error.message,
        ephemeral: true
      });
    }
  },
  
  /**
   * Handle the unlink account subcommand
   * @param {CommandInteraction} interaction - The interaction
   */
  async handleUnlinkAccount(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check if user is linked
      const linkData = await interaction.client.db.query(
        'SELECT * FROM account_links WHERE discord_id = ?',
        [interaction.user.id]
      );
      
      if (!linkData || linkData.length === 0) {
        return interaction.editReply({
          content: 'Your Discord account is not linked to any Pterodactyl panel account.',
          ephemeral: true
        });
      }
      
      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setTitle('⚠️ Unlink Account Confirmation')
        .setDescription('Are you sure you want to unlink your Discord account from your Pterodactyl panel account? This action cannot be undone.')
        .setColor('#FFAA00')
        .addFields(
          { 
            name: 'Discord Account',
            value: `<@${interaction.user.id}>`,
            inline: true 
          },
          { 
            name: 'Pterodactyl Username',
            value: linkData[0].pterodactyl_username || 'Unknown',
            inline: true 
          }
        )
        .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
        
      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_unlink')
            .setLabel('Confirm Unlink')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_unlink')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );
        
      await interaction.editReply({
        embeds: [confirmEmbed],
        components: [confirmRow],
        ephemeral: true
      });
    } catch (error) {
      logger.error(`Error unlinking account: ${error.message}`);
      await interaction.editReply({
        content: 'An error occurred while unlinking your account: ' + error.message,
        ephemeral: true
      });
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
  }
}; 