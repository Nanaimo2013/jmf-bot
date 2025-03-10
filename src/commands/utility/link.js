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
        'INSERT INTO account_links (discord_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)',
        [interaction.user.id, token, expiresAt, new Date()]
      );
      
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
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📖'),
          new ButtonBuilder()
            .setCustomId('link_verify')
            .setLabel('Verify Link')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
        );

      await interaction.editReply({
        embeds: [linkEmbed],
        components: [linkRow],
        ephemeral: true
      });
      
      // Create a collector for button interactions
      const filter = i => i.user.id === interaction.user.id && 
                          (i.customId === 'link_instructions' || i.customId === 'link_verify');
      
      const collector = interaction.channel.createMessageComponentCollector({ 
        filter, 
        time: 900000 // 15 minutes
      });
      
      collector.on('collect', async i => {
        if (i.customId === 'link_instructions') {
          // Show detailed instructions
          const instructionsEmbed = new EmbedBuilder()
            .setTitle('📝 Account Linking Instructions')
            .setColor(config.embedColor || '#00AAFF')
            .setDescription('Follow these steps to link your Discord account to your Pterodactyl panel account:')
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
                name: '5️⃣ Enter Your Token',
                value: `In the API key description field, enter your linking token: \`${token}\``,
                inline: false 
              },
              { 
                name: '6️⃣ Verify the Link',
                value: 'Return to Discord and click the "Verify Link" button to complete the process.',
                inline: false 
              }
            )
            .setImage('https://cdn.discordapp.com/attachments/1343993728125239404/1343993728125239404/panel_instructions.png') // Replace with actual instruction image
            .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() });
          
          await i.reply({ 
            embeds: [instructionsEmbed], 
            ephemeral: true 
          });
        } else if (i.customId === 'link_verify') {
          await i.deferReply({ ephemeral: true });
          
          try {
            // Check if the account has been linked
            const linkedAccount = await interaction.client.db.query(
              'SELECT * FROM account_links WHERE discord_id = ? AND panel_id IS NOT NULL',
              [interaction.user.id]
            );
            
            if (linkedAccount && linkedAccount.length > 0) {
              // Account has been linked successfully
              const successEmbed = new EmbedBuilder()
                .setTitle('✅ Account Linked Successfully')
                .setDescription('Your Discord account has been successfully linked to your Pterodactyl panel account.')
                .setColor('#00FF00')
                .addFields(
                  { 
                    name: 'Panel Username',
                    value: linkedAccount[0].pterodactyl_username || 'Unknown',
                    inline: true 
                  },
                  { 
                    name: 'Linked At',
                    value: new Date(linkedAccount[0].linked_at).toLocaleString(),
                    inline: true 
                  }
                )
                .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();
              
              await i.editReply({
                embeds: [successEmbed],
                components: [],
                ephemeral: true
              });
              
              // End the collector
              collector.stop();
            } else {
              // Account has not been linked yet
              await i.editReply({
                content: 'Your account has not been linked yet. Please follow the instructions to link your account.',
                ephemeral: true
              });
            }
          } catch (error) {
            logger.error(`Error verifying account link: ${error.message}`);
            await i.editReply({
              content: 'An error occurred while verifying your account link. Please try again later.',
              ephemeral: true
            });
          }
        }
      });
      
      collector.on('end', collected => {
        // Do nothing when the collector ends
      });
    } catch (error) {
      logger.error(`Error generating link token: ${error.message}`);
      await interaction.editReply({
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
        const notLinkedEmbed = new EmbedBuilder()
          .setTitle('❌ Account Not Linked')
          .setDescription('Your Discord account is not linked to any Pterodactyl panel account.')
          .setColor('#FF0000')
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
              .setLabel('Start Linking Process')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🔗')
          );
        
        await interaction.editReply({
          embeds: [notLinkedEmbed],
          components: [linkRow],
          ephemeral: true
        });
        
        // Create a collector for button interactions
        const filter = i => i.user.id === interaction.user.id && i.customId === 'start_link_process';
        const collector = interaction.channel.createMessageComponentCollector({ 
          filter, 
          time: 300000 // 5 minutes
        });
        
        collector.on('collect', async i => {
          await i.deferUpdate();
          await this.handleLinkAccount(interaction);
          collector.stop();
        });
        
        return;
      }
      
      const account = linkedAccount[0];
      
      // Create the status embed
      const statusEmbed = new EmbedBuilder()
        .setTitle('🔗 Account Link Status')
        .setDescription('Your Discord account is linked to the following Pterodactyl panel account:')
        .setColor('#00FF00')
        .addFields(
          { 
            name: 'Panel Username',
            value: account.pterodactyl_username || 'Unknown',
            inline: true 
          },
          { 
            name: 'Panel ID',
            value: account.panel_id || 'Unknown',
            inline: true 
          },
          { 
            name: 'Linked Since',
            value: new Date(account.linked_at).toLocaleString(),
            inline: true 
          },
          {
            name: 'Account Benefits',
            value: '• Access to server management via Discord\n• Automatic role synchronization\n• Quick server status checks\n• Priority support access',
            inline: false
          }
        )
        .setThumbnail('https://cdn.discordapp.com/attachments/1343993728125239404/1343993728125239404/jmf_logo.png') // Replace with your actual logo URL
        .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
      
      // Create action row with buttons
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Open Panel')
            .setURL('https://panel.jmfhosting.com')
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setCustomId('unlink_account')
            .setLabel('Unlink Account')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔓')
        );
      
      await interaction.editReply({
        embeds: [statusEmbed],
        components: [actionRow],
        ephemeral: true
      });
      
      // Create a collector for button interactions
      const filter = i => i.user.id === interaction.user.id && i.customId === 'unlink_account';
      const collector = interaction.channel.createMessageComponentCollector({ 
        filter, 
        time: 300000 // 5 minutes
      });
      
      collector.on('collect', async i => {
        await i.deferUpdate();
        await this.handleUnlinkAccount(interaction);
        collector.stop();
      });
    } catch (error) {
      logger.error(`Error checking link status: ${error.message}`);
      await interaction.editReply({
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
        'SELECT * FROM account_links WHERE discord_id = ? AND panel_id IS NOT NULL',
        [interaction.user.id]
      );
      
      if (!linkedAccount || linkedAccount.length === 0) {
        const notLinkedEmbed = new EmbedBuilder()
          .setTitle('❌ Account Not Linked')
          .setDescription('Your Discord account is not linked to any Pterodactyl panel account.')
          .setColor('#FF0000')
          .addFields(
            { 
              name: 'How to Link Your Account',
              value: 'Use `/link account` to link your Discord account to your Pterodactyl panel account.',
              inline: false 
            }
          )
          .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
          .setTimestamp();
        
        return interaction.editReply({
          embeds: [notLinkedEmbed],
          ephemeral: true
        });
      }
      
      // Create confirmation embed
      const confirmationEmbed = new EmbedBuilder()
        .setTitle('⚠️ Confirm Account Unlink')
        .setDescription('Are you sure you want to unlink your Discord account from your Pterodactyl panel account?')
        .setColor('#FFA500')
        .addFields(
          { 
            name: 'Panel Username',
            value: linkedAccount[0].pterodactyl_username || 'Unknown',
            inline: true 
          },
          { 
            name: 'Linked Since',
            value: new Date(linkedAccount[0].linked_at).toLocaleString(),
            inline: true 
          },
          {
            name: 'What You Will Lose',
            value: '• Discord-based server management\n• Automatic role synchronization\n• Quick server status checks\n• Priority support access',
            inline: false
          }
        )
        .setFooter({ text: 'This action cannot be undone automatically. You will need to link your account again if needed.', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
      
      // Create confirmation buttons
      const confirmationRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_unlink')
            .setLabel('Confirm Unlink')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚠️'),
          new ButtonBuilder()
            .setCustomId('cancel_unlink')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('✖️')
        );
      
      const response = await interaction.editReply({
        embeds: [confirmationEmbed],
        components: [confirmationRow],
        ephemeral: true
      });
      
      // Create a collector for button interactions
      const filter = i => i.user.id === interaction.user.id && 
                          (i.customId === 'confirm_unlink' || i.customId === 'cancel_unlink');
      
      const collector = interaction.channel.createMessageComponentCollector({ 
        filter, 
        time: 60000 // 1 minute
      });
      
      collector.on('collect', async i => {
        if (i.customId === 'confirm_unlink') {
          await i.deferUpdate();
          
          try {
            // Delete the link from the database
            await interaction.client.db.query(
              'DELETE FROM account_links WHERE discord_id = ?',
              [interaction.user.id]
            );
            
            const unlinkSuccessEmbed = new EmbedBuilder()
              .setTitle('✅ Account Unlinked')
              .setDescription('Your Discord account has been successfully unlinked from your Pterodactyl panel account.')
              .setColor('#00FF00')
              .addFields(
                { 
                  name: 'Re-link Your Account',
                  value: 'If you want to link your account again in the future, use `/link account`.',
                  inline: false 
                }
              )
              .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
              .setTimestamp();
            
            await interaction.editReply({
              embeds: [unlinkSuccessEmbed],
              components: [],
              ephemeral: true
            });
          } catch (error) {
            logger.error(`Error unlinking account: ${error.message}`);
            await interaction.editReply({
              content: `An error occurred while unlinking your account: ${error.message}`,
              components: [],
              ephemeral: true
            });
          }
        } else if (i.customId === 'cancel_unlink') {
          await i.deferUpdate();
          
          const cancelEmbed = new EmbedBuilder()
            .setTitle('❌ Unlink Cancelled')
            .setDescription('Your account will remain linked to your Pterodactyl panel account.')
            .setColor('#00FF00')
            .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
          
          await interaction.editReply({
            embeds: [cancelEmbed],
            components: [],
            ephemeral: true
          });
        }
        
        collector.stop();
      });
      
      collector.on('end', collected => {
        if (collected.size === 0) {
          // Timeout - no response
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏱️ Confirmation Timeout')
            .setDescription('The unlink confirmation has timed out. Your account remains linked.')
            .setColor('#FFA500')
            .setFooter({ text: 'JMF Hosting • Account Linking System', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
          
          interaction.editReply({
            embeds: [timeoutEmbed],
            components: [],
            ephemeral: true
          }).catch(err => logger.error(`Error updating timeout message: ${err.message}`));
        }
      });
    } catch (error) {
      logger.error(`Error unlinking account: ${error.message}`);
      await interaction.editReply({
        content: `An error occurred while unlinking your account: ${error.message}`,
        ephemeral: true
      });
    }
  }
}; 