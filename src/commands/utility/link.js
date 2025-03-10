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
      return interaction.reply({
        content: 'An error occurred while executing this command.',
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
      
      // Store the token in the database
      await interaction.client.db.query(
        'INSERT INTO account_links (discord_id, discord_username, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
        [interaction.user.id, interaction.user.tag, token, expiresAt, new Date()]
      );
      
      // Create the link embed
      const linkEmbed = new EmbedBuilder()
        .setTitle('Link Your Pterodactyl Account')
        .setDescription('Follow these steps to link your Discord account to your Pterodactyl panel account:')
        .setColor(config.embedColor || '#00AAFF')
        .addFields(
          { 
            name: '1️⃣ Log in to the Panel',
            value: `Go to [panel.jmfhosting.com](https://panel.jmfhosting.com) and log in to your account.`,
            inline: false 
          },
          { 
            name: '2️⃣ Navigate to Account Settings',
            value: 'Click on your username in the top-right corner and select "Account" from the dropdown menu.',
            inline: false 
          },
          { 
            name: '3️⃣ Go to API Credentials',
            value: 'In the account settings, click on the "API Credentials" tab.',
            inline: false 
          },
          { 
            name: '4️⃣ Create API Key',
            value: 'Create a new API key with the description "Discord Link" and copy the API key.',
            inline: false 
          },
          { 
            name: '5️⃣ Use the Link Button Below',
            value: 'Click the "Link Account" button below and enter your API key when prompted.',
            inline: false 
          },
          { 
            name: '🔑 Your Linking Token',
            value: `\`${token}\`\n\nThis token will expire in 24 hours. Keep it private!`,
            inline: false 
          }
        )
        .setFooter({ 
          text: 'This message is only visible to you for security reasons.'
        })
        .setTimestamp();
      
      // Create the link button
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Link Account')
            .setURL(`https://panel.jmfhosting.com/account/api?token=${token}`)
            .setStyle(ButtonStyle.Link)
        );
      
      return interaction.editReply({
        embeds: [linkEmbed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      logger.error(`Error in link account: ${error.message}`);
      return interaction.editReply({
        content: `An error occurred while generating your link token: ${error.message}`,
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
      const linkedAccount = await interaction.client.db.query(
        'SELECT * FROM account_links WHERE discord_id = ? AND panel_id IS NOT NULL',
        [interaction.user.id]
      );
      
      if (!linkedAccount || linkedAccount.length === 0) {
        return interaction.editReply({
          content: 'Your Discord account is not linked to any Pterodactyl panel account. Use `/link account` to link your account.',
          ephemeral: true
        });
      }
      
      const account = linkedAccount[0];
      
      // Create the status embed
      const statusEmbed = new EmbedBuilder()
        .setTitle('Account Link Status')
        .setDescription('Your Discord account is successfully linked to your Pterodactyl panel account.')
        .setColor('#00FF00')
        .addFields(
          { 
            name: 'Panel Username',
            value: account.panel_username || 'Unknown',
            inline: true 
          },
          { 
            name: 'Linked Since',
            value: new Date(account.linked_at).toLocaleString(),
            inline: true 
          }
        )
        .setFooter({ 
          text: 'Use "/link unlink" to unlink your account if needed.'
        })
        .setTimestamp();
      
      return interaction.editReply({
        embeds: [statusEmbed],
        ephemeral: true
      });
    } catch (error) {
      logger.error(`Error in link status: ${error.message}`);
      return interaction.editReply({
        content: `An error occurred while checking your link status: ${error.message}`,
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
      const linkedAccount = await interaction.client.db.query(
        'SELECT * FROM account_links WHERE discord_id = ?',
        [interaction.user.id]
      );
      
      if (!linkedAccount || linkedAccount.length === 0) {
        return interaction.editReply({
          content: 'Your Discord account is not linked to any Pterodactyl panel account.',
          ephemeral: true
        });
      }
      
      // Delete the link
      await interaction.client.db.query(
        'DELETE FROM account_links WHERE discord_id = ?',
        [interaction.user.id]
      );
      
      return interaction.editReply({
        content: 'Your Discord account has been successfully unlinked from your Pterodactyl panel account.',
        ephemeral: true
      });
    } catch (error) {
      logger.error(`Error in unlink account: ${error.message}`);
      return interaction.editReply({
        content: `An error occurred while unlinking your account: ${error.message}`,
        ephemeral: true
      });
    }
  }
}; 