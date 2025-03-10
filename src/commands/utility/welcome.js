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
    .setDescription('Configure the welcome and leave system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configure welcome and leave system settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Test the welcome and leave messages')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('The type of message to test')
            .setRequired(true)
            .addChoices(
              { name: 'Welcome', value: 'welcome' },
              { name: 'Leave', value: 'leave' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Toggle the welcome or leave system on/off')
        .addStringOption(option =>
          option
            .setName('system')
            .setDescription('The system to toggle')
            .setRequired(true)
            .addChoices(
              { name: 'Welcome System', value: 'welcome' },
              { name: 'Leave System', value: 'leave' }
            )
        )
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Whether the system should be enabled')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'setup':
        await handleSetup(interaction);
        break;
      case 'test':
        await handleTest(interaction);
        break;
      case 'toggle':
        await handleToggle(interaction);
        break;
    }
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