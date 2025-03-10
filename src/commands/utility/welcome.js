/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');
const config = require('../../../config.json');
const configManager = require('../../utils/configManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Manage welcome messages and settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Test the welcome message')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to test the welcome message for (defaults to you)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('channel')
        .setDescription('Set the welcome channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to send welcome messages to')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Toggle welcome messages on or off')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Whether welcome messages should be enabled')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('message')
        .setDescription('Set the welcome message')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('The welcome message to use')
            .setRequired(true))),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      switch (subcommand) {
        case 'test':
          await this.handleWelcomeTest(interaction);
          break;
        case 'channel':
          await this.handleSetChannel(interaction);
          break;
        case 'toggle':
          await this.handleToggle(interaction);
          break;
        case 'message':
          await this.handleSetMessage(interaction);
          break;
      }
    } catch (error) {
      logger.error(`Error in welcome command: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while executing this command.',
        ephemeral: true
      });
    }
  },

  async handleWelcomeTest(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the target user (defaults to the command user)
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return interaction.editReply({ content: 'That user is not in this server.', ephemeral: true });
      }
      
      // Get welcome settings from config or database
      const welcomeSettings = config.welcomeSystem || {};
      const welcomeEnabled = welcomeSettings.enabled !== false;
      const welcomeMessage = welcomeSettings.message || 'Welcome to {server}, {user}!';
      
      if (!welcomeEnabled) {
        return interaction.editReply({ content: 'Welcome messages are currently disabled.', ephemeral: true });
      }
      
      // Create the welcome embed
      const welcomeEmbed = this.createWelcomeEmbed(member, welcomeMessage);
      
      // Create welcome buttons
      const welcomeButtons = this.createWelcomeButtons();
      
      await interaction.editReply({
        content: 'Here\'s a preview of the welcome message:',
        embeds: [welcomeEmbed],
        components: [welcomeButtons]
      });
    } catch (error) {
      logger.error(`Error testing welcome message: ${error.message}`);
      await interaction.editReply({ content: 'An error occurred while testing the welcome message.', ephemeral: true });
    }
  },

  async handleSetChannel(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const channel = interaction.options.getChannel('channel');
      
      // Check if the channel is a text channel
      if (channel.type !== 0) { // 0 is GUILD_TEXT
        return interaction.editReply({ content: 'Please select a text channel.', ephemeral: true });
      }
      
      // Update the welcome channel in the database or config
      // This is a placeholder - implement your own logic to save the channel
      
      await interaction.editReply({ content: `Welcome channel set to ${channel}.`, ephemeral: true });
    } catch (error) {
      logger.error(`Error setting welcome channel: ${error.message}`);
      await interaction.editReply({ content: 'An error occurred while setting the welcome channel.', ephemeral: true });
    }
  },

  async handleToggle(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const enabled = interaction.options.getBoolean('enabled');
      
      // Update the welcome enabled setting in the database or config
      // This is a placeholder - implement your own logic to save the setting
      
      await interaction.editReply({ content: `Welcome messages ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
    } catch (error) {
      logger.error(`Error toggling welcome messages: ${error.message}`);
      await interaction.editReply({ content: 'An error occurred while toggling welcome messages.', ephemeral: true });
    }
  },

  async handleSetMessage(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const message = interaction.options.getString('message');
      
      // Update the welcome message in the database or config
      // This is a placeholder - implement your own logic to save the message
      
      await interaction.editReply({ content: `Welcome message set to: ${message}`, ephemeral: true });
    } catch (error) {
      logger.error(`Error setting welcome message: ${error.message}`);
      await interaction.editReply({ content: 'An error occurred while setting the welcome message.', ephemeral: true });
    }
  },

  createWelcomeEmbed(member, welcomeMessage) {
    // Replace placeholders in the welcome message
    const formattedMessage = welcomeMessage
      .replace(/{user}/g, member.toString())
      .replace(/{username}/g, member.user.username)
      .replace(/{server}/g, member.guild.name)
      .replace(/{membercount}/g, member.guild.memberCount.toLocaleString());
    
    // Create the welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`Welcome to ${member.guild.name}!`)
      .setDescription(formattedMessage)
      .setColor(config.embedColor || '#00AAFF')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Member Count', value: member.guild.memberCount.toLocaleString(), inline: true }
      )
      .setImage('https://cdn.discordapp.com/attachments/1343993728125239404/1343993728125239404/welcome_banner.png') // Replace with your actual welcome banner
      .setFooter({ text: `ID: ${member.id}`, iconURL: member.guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    return welcomeEmbed;
  },

  createWelcomeButtons() {
    // Create buttons for the welcome message
    const welcomeButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Rules')
          .setStyle(ButtonStyle.Primary)
          .setCustomId('welcome_rules')
          .setEmoji('📜'),
        new ButtonBuilder()
          .setLabel('Roles')
          .setStyle(ButtonStyle.Success)
          .setCustomId('welcome_roles')
          .setEmoji('🏷️'),
        new ButtonBuilder()
          .setLabel('Website')
          .setStyle(ButtonStyle.Link)
          .setURL('https://jmfhosting.com')
          .setEmoji('🌐'),
        new ButtonBuilder()
          .setLabel('Discord')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.gg/jmfhosting')
          .setEmoji('🔗')
      );
    
    return welcomeButtons;
  }
};

/**
 * Handle the setup subcommand
 * @param {CommandInteraction} interaction - The interaction
 */
async function handleSetup(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('Welcome System Configuration')
    .setDescription('Configure your server\'s welcome and leave system. Select an option below to get started.')
    .setColor(config.embedColor)
    .addFields(
      { 
        name: 'Welcome System', 
        value: `Status: ${config.welcomeSystem?.enabled ? '✅ Enabled' : '❌ Disabled'}\nChannel: ${getChannelMention(interaction.guild, config.welcomeSystem?.channelId || config.channels?.welcome || config.channels?.joinLeave)}`, 
        inline: true 
      },
      { 
        name: 'Leave System', 
        value: `Status: ${config.leaveSystem?.enabled ? '✅ Enabled' : '❌ Disabled'}\nChannel: ${getChannelMention(interaction.guild, config.leaveSystem?.channelId || config.channels?.leave || config.channels?.joinLeave)}`, 
        inline: true 
      }
    )
    .setFooter({ text: 'Use the select menu below to configure different aspects of the welcome system' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('welcome_setup_menu')
    .setPlaceholder('Select an option to configure')
    .addOptions([
      {
        label: 'Welcome Channel',
        description: 'Set the channel for welcome messages',
        value: 'welcome_channel',
        emoji: '📣'
      },
      {
        label: 'Leave Channel',
        description: 'Set the channel for leave messages',
        value: 'leave_channel',
        emoji: '👋'
      },
      {
        label: 'Welcome Message',
        description: 'Customize the welcome message',
        value: 'welcome_message',
        emoji: '✉️'
      },
      {
        label: 'Leave Message',
        description: 'Customize the leave message',
        value: 'leave_message',
        emoji: '📝'
      },
      {
        label: 'Welcome Embed',
        description: 'Customize the welcome embed appearance',
        value: 'welcome_embed',
        emoji: '🎨'
      },
      {
        label: 'Leave Embed',
        description: 'Customize the leave embed appearance',
        value: 'leave_embed',
        emoji: '🖌️'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true
  });
}

/**
 * Handle the test subcommand
 * @param {CommandInteraction} interaction - The interaction
 */
async function handleTest(interaction) {
  const type = interaction.options.getString('type');
  const member = interaction.member;
  
  if (type === 'welcome') {
    // Import the welcome embed creator
    const { createWelcomeMemberEmbed } = require('../../embeds/welcome-member-embed');
    const welcomeEmbed = createWelcomeMemberEmbed(member);
    
    await interaction.reply({
      content: config.welcomeSystem?.mentionUser ? `<@${member.id}>` : null,
      embeds: [welcomeEmbed],
      ephemeral: true
    });
  } else if (type === 'leave') {
    // Import the leave embed creator
    const { createLeaveMemberEmbed } = require('../../embeds/leave-member-embed');
    const leaveEmbed = createLeaveMemberEmbed(member);
    
    await interaction.reply({
      embeds: [leaveEmbed],
      ephemeral: true
    });
  }
}

/**
 * Handle the toggle subcommand
 * @param {CommandInteraction} interaction - The interaction
 */
async function handleToggle(interaction) {
  const system = interaction.options.getString('system');
  const enabled = interaction.options.getBoolean('enabled');
  
  if (system === 'welcome') {
    // Ensure welcomeSystem exists
    if (!config.welcomeSystem) {
      config.welcomeSystem = {};
    }
    
    config.welcomeSystem.enabled = enabled;
    
    await saveConfig();
    
    await interaction.reply({
      content: `Welcome system has been ${enabled ? 'enabled' : 'disabled'}.`,
      ephemeral: true
    });
  } else if (system === 'leave') {
    // Ensure leaveSystem exists
    if (!config.leaveSystem) {
      config.leaveSystem = {};
    }
    
    config.leaveSystem.enabled = enabled;
    
    await saveConfig();
    
    await interaction.reply({
      content: `Leave system has been ${enabled ? 'enabled' : 'disabled'}.`,
      ephemeral: true
    });
  }
}

/**
 * Get a channel mention string
 * @param {Guild} guild - The guild
 * @param {string} channelId - The channel ID
 * @returns {string} The channel mention or "Not set"
 */
function getChannelMention(guild, channelId) {
  if (!channelId) return 'Not set';
  
  const channel = guild.channels.cache.get(channelId);
  return channel ? `<#${channel.id}>` : 'Invalid channel';
}

/**
 * Save the config to file
 */
async function saveConfig() {
  try {
    return await configManager.saveConfig();
  } catch (error) {
    logger.error('Error saving config:', error);
    return false;
  }
} 