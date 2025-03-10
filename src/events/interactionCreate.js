/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Events, Collection, InteractionType, ChannelType, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, ModalBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../../config.json');
const configManager = require('../utils/configManager');

// Command cooldowns
const cooldowns = new Collection();

// Add missing imports for verification and tickets modules
const verification = require('../modules/verification');
const tickets = require('../modules/tickets');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    try {
      // Handle different interaction types
      if (interaction.isChatInputCommand()) {
        // Handle slash commands
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
          logger.warn(`Command not found: ${interaction.commandName}`);
          return;
        }
        
        // Check if command is disabled
        if (command.disabled) {
          return interaction.reply({
            content: '⚠️ This command is currently disabled.',
            ephemeral: true
          });
        }
        
        // Check if command is admin-only
        if (command.adminOnly) {
          // Get admin role IDs from config
          const adminRoles = config.adminRoles || [];
          
          // Check if user has any admin role
          const hasAdminRole = interaction.member.roles.cache.some(role => 
            adminRoles.includes(role.id) || adminRoles.includes(role.name)
          );
          
          // Check if user has administrator permission
          const hasAdminPermission = interaction.member.permissions.has('Administrator');
          
          if (!hasAdminRole && !hasAdminPermission) {
            return interaction.reply({
              content: '⛔ You do not have permission to use this command.',
              ephemeral: true
            });
          }
        }
        
        // Check if command is moderator-only
        if (command.modOnly) {
          // Get moderator role IDs from config
          const modRoles = [...(config.adminRoles || []), ...(config.modRoles || [])];
          
          // Check if user has any moderator role
          const hasModRole = interaction.member.roles.cache.some(role => 
            modRoles.includes(role.id) || modRoles.includes(role.name)
          );
          
          // Check if user has moderator permissions
          const hasModPermission = interaction.member.permissions.has(['KickMembers', 'BanMembers', 'ManageMessages']);
          
          if (!hasModRole && !hasModPermission) {
            return interaction.reply({
              content: '⛔ You do not have permission to use this command.',
              ephemeral: true
            });
          }
        }
        
        // Handle command cooldowns
        if (!cooldowns.has(command.data.name)) {
          cooldowns.set(command.data.name, new Collection());
        }
        
        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;
        
        if (timestamps.has(interaction.user.id)) {
          const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
          
          if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return interaction.reply({
              content: `⏱️ Please wait ${timeLeft.toFixed(1)} more second(s) before using the \`${command.data.name}\` command again.`,
              ephemeral: true
            });
          }
        }
        
        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        
        // Log command usage
        logger.info(`User ${interaction.user.tag} used command: ${interaction.commandName}`);
        
        // Record command usage in database
        if (interaction.client.db) {
          try {
            await interaction.client.db.query(
              'INSERT INTO command_usage (user_id, guild_id, command, channel_id, timestamp) VALUES (?, ?, ?, ?, ?)',
              [
                interaction.user.id,
                interaction.guild ? interaction.guild.id : null,
                interaction.commandName,
                interaction.channel ? interaction.channel.id : null,
                new Date()
              ]
            );
          } catch (error) {
            logger.error(`Failed to record command usage in database: ${error.message}`);
          }
        }
        
        // Execute the command
        try {
          await command.execute(interaction, client);
          logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
        } catch (error) {
          logger.error(`Error executing command ${interaction.commandName}: ${error.message}`);
          
          const errorMessage = config.debug 
            ? `There was an error executing this command: \`${error.message}\``
            : 'There was an error executing this command.';
            
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
              content: `❌ ${errorMessage}`, 
              ephemeral: true 
            });
          } else {
            await interaction.reply({ 
              content: `❌ ${errorMessage}`, 
              ephemeral: true 
            });
          }
          
          // Record error in database
          if (interaction.client.db) {
            try {
              await interaction.client.db.query(
                'INSERT INTO command_errors (user_id, guild_id, command, error_message, stack_trace, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                [
                  interaction.user.id,
                  interaction.guild ? interaction.guild.id : null,
                  interaction.commandName,
                  error.message,
                  error.stack,
                  new Date()
                ]
              );
            } catch (dbError) {
              logger.error(`Failed to record command error in database: ${dbError.message}`);
            }
          }
        }
      } else if (interaction.isButton()) {
        // Handle button interactions
        const { customId } = interaction;
        
        // Log button usage
        logger.info(`User ${interaction.user.tag} clicked button: ${customId}`);
        
        // Record button usage in database
        if (interaction.client.db) {
          try {
            await interaction.client.db.query(
              'INSERT INTO button_usage (user_id, guild_id, button_id, channel_id, timestamp) VALUES (?, ?, ?, ?, ?)',
              [
                interaction.user.id,
                interaction.guild ? interaction.guild.id : null,
                customId,
                interaction.channel ? interaction.channel.id : null,
                new Date()
              ]
            );
          } catch (error) {
            logger.error(`Failed to record button usage in database: ${error.message}`);
          }
        }
        
        // Handle verification button
        if (customId === 'verify') {
          await verification.verifyUser(interaction);
        }
        
        // Handle ticket buttons
        else if (customId === 'create_ticket') {
          await tickets.handleTicketButton(interaction);
        }
        else if (customId === 'close_ticket') {
          await tickets.closeTicket(interaction);
        }
        else if (customId === 'claim_ticket') {
          await tickets.claimTicket(interaction);
        }
        
        // Handle role buttons
        else if (customId.startsWith('role_')) {
          const roleId = customId.replace('role_', '');
          await handleRoleToggle(interaction, roleId);
        }
      } else if (interaction.isSelectMenu()) {
        // Handle select menu interactions
        const { customId } = interaction;
        
        // Log select menu usage
        logger.info(`User ${interaction.user.tag} used select menu: ${customId}`);
        
        // Record select menu usage in database
        if (interaction.client.db) {
          try {
            await interaction.client.db.query(
              'INSERT INTO select_menu_usage (user_id, guild_id, menu_id, selected_values, channel_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
              [
                interaction.user.id,
                interaction.guild ? interaction.guild.id : null,
                customId,
                JSON.stringify(interaction.values),
                interaction.channel ? interaction.channel.id : null,
                new Date()
              ]
            );
          } catch (error) {
            logger.error(`Failed to record select menu usage in database: ${error.message}`);
          }
        }
        
        // Handle role select menu
        if (customId === 'role_select') {
          await handleRoleSelection(interaction);
        }
      } else if (interaction.isModalSubmit()) {
        // Handle modal submissions
        const { customId } = interaction;
        
        // Log modal submission
        logger.info(`User ${interaction.user.tag} submitted modal: ${customId}`);
        
        // Record modal submission in database
        if (interaction.client.db) {
          try {
            const fields = {};
            for (const [key, value] of interaction.fields.fields) {
              fields[key] = value.value;
            }
            
            await interaction.client.db.query(
              'INSERT INTO modal_submissions (user_id, guild_id, modal_id, field_values, channel_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
              [
                interaction.user.id,
                interaction.guild ? interaction.guild.id : null,
                customId,
                JSON.stringify(fields),
                interaction.channel ? interaction.channel.id : null,
                new Date()
              ]
            );
          } catch (error) {
            logger.error(`Failed to record modal submission in database: ${error.message}`);
          }
        }
        
        // Handle ticket creation modal
        if (customId === 'ticket_modal') {
          await tickets.handleTicketModal(interaction);
        }
        
        // Handle feedback modal
        else if (customId === 'feedback_modal') {
          await handleFeedbackSubmission(interaction);
        }
        
        // Welcome and leave message modals
        if (customId === 'welcome_message_modal') {
          await handleWelcomeMessageModal(interaction);
          return;
        }
        
        if (customId === 'leave_message_modal') {
          await handleLeaveMessageModal(interaction);
          return;
        }
        
        // Welcome and leave color modals
        if (customId === 'welcome_color_modal') {
          await handleColorModal(interaction, 'welcome');
          return;
        }
        
        if (customId === 'leave_color_modal') {
          await handleColorModal(interaction, 'leave');
          return;
        }
      } else if (interaction.isStringSelectMenu() || interaction.isButton()) {
        // Handle select menu and button interactions
        const customId = interaction.customId;
        
        // Welcome system configuration
        if (customId === 'welcome_setup_menu') {
          await handleWelcomeSetupMenu(interaction);
          return;
        }
        
        if (customId.startsWith('welcome_channel_')) {
          await handleWelcomeChannelSelect(interaction);
          return;
        }
        
        if (customId.startsWith('leave_channel_')) {
          await handleLeaveChannelSelect(interaction);
          return;
        }
        
        // Welcome and leave embed editor buttons
        if (customId.startsWith('welcome_embed_') || customId.startsWith('leave_embed_')) {
          await handleEmbedEditorButton(interaction);
          return;
        }
        
        if (customId.startsWith('welcome_toggle_') || customId.startsWith('leave_toggle_')) {
          await handleToggleButton(interaction);
          return;
        }
        
        if (customId.startsWith('welcome_test_') || customId.startsWith('leave_test_')) {
          await handleTestEmbedButton(interaction);
          return;
        }
        
        // Leaderboard pagination buttons
        if (customId.startsWith('leaderboard_') && customId.includes('_')) {
          // Extract user ID from the custom ID
          const userId = customId.split('_').pop();
          
          // Only allow the user who ran the command to use the buttons
          if (interaction.user.id === userId) {
            // The actual handling is done in the collector in the leaderboard command
            return;
          } else {
            await interaction.reply({ 
              content: 'These buttons are not for you. Please run the `/leaderboard` command to see your own leaderboard.',
              ephemeral: true 
            });
            return;
          }
        }
      }
    } catch (error) {
      logger.error(`Error handling interaction: ${error.message}`);
    }
  }
};

/**
 * Handle role toggle button interactions
 * @param {ButtonInteraction} interaction - The button interaction
 * @param {string} roleId - The role ID to toggle
 */
async function handleRoleToggle(interaction, roleId) {
  try {
    const role = await interaction.guild.roles.fetch(roleId);
    
    if (!role) {
      return interaction.reply({
        content: '❌ Role not found.',
        ephemeral: true
      });
    }
    
    // Check if role is self-assignable
    const selfRoles = config.selfRoles || [];
    if (!selfRoles.includes(role.id) && !selfRoles.includes(role.name)) {
      return interaction.reply({
        content: '❌ This role cannot be self-assigned.',
        ephemeral: true
      });
    }
    
    // Toggle role
    if (interaction.member.roles.cache.has(role.id)) {
      await interaction.member.roles.remove(role);
      await interaction.reply({
        content: `✅ Removed the ${role.name} role.`,
        ephemeral: true
      });
    } else {
      await interaction.member.roles.add(role);
      await interaction.reply({
        content: `✅ Added the ${role.name} role.`,
        ephemeral: true
      });
    }
  } catch (error) {
    logger.error(`Error handling role toggle: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred while toggling the role.',
      ephemeral: true
    });
  }
}

/**
 * Handle role selection menu interactions
 * @param {SelectMenuInteraction} interaction - The select menu interaction
 */
async function handleRoleSelection(interaction) {
  try {
    const selectedRoleIds = interaction.values;
    const selfRoles = config.selfRoles || [];
    
    // Get all self-assignable roles the user has
    const userSelfRoles = interaction.member.roles.cache.filter(role => 
      selfRoles.includes(role.id) || selfRoles.includes(role.name)
    );
    
    // Remove roles that were deselected
    for (const role of userSelfRoles.values()) {
      if (!selectedRoleIds.includes(role.id)) {
        await interaction.member.roles.remove(role);
      }
    }
    
    // Add newly selected roles
    for (const roleId of selectedRoleIds) {
      const role = await interaction.guild.roles.fetch(roleId);
      
      if (role && (selfRoles.includes(role.id) || selfRoles.includes(role.name))) {
        await interaction.member.roles.add(role);
      }
    }
    
    await interaction.reply({
      content: '✅ Your roles have been updated.',
      ephemeral: true
    });
  } catch (error) {
    logger.error(`Error handling role selection: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred while updating your roles.',
      ephemeral: true
    });
  }
}

/**
 * Handle feedback modal submissions
 * @param {ModalSubmitInteraction} interaction - The modal submit interaction
 */
async function handleFeedbackSubmission(interaction) {
  try {
    const feedbackType = interaction.fields.getTextInputValue('feedback_type');
    const feedbackContent = interaction.fields.getTextInputValue('feedback_content');
    
    // Log feedback
    logger.info(`Feedback received from ${interaction.user.tag}: ${feedbackType} - ${feedbackContent}`);
    
    // Save feedback to database
    if (interaction.client.db) {
      try {
        await interaction.client.db.query(
          'INSERT INTO feedback (user_id, guild_id, feedback_type, content, timestamp) VALUES (?, ?, ?, ?, ?)',
          [
            interaction.user.id,
            interaction.guild ? interaction.guild.id : null,
            feedbackType,
            feedbackContent,
            new Date()
          ]
        );
      } catch (error) {
        logger.error(`Failed to save feedback to database: ${error.message}`);
      }
    }
    
    // Send feedback to feedback channel if configured
    if (config.feedbackChannel) {
      const feedbackChannel = interaction.client.channels.cache.get(config.feedbackChannel);
      
      if (feedbackChannel) {
        await feedbackChannel.send({
          embeds: [{
            title: `New Feedback: ${feedbackType}`,
            description: feedbackContent,
            color: 0x00AAFF,
            author: {
              name: interaction.user.tag,
              icon_url: interaction.user.displayAvatarURL({ dynamic: true })
            },
            timestamp: new Date()
          }]
        });
      }
    }
    
    await interaction.reply({
      content: '✅ Thank you for your feedback! It has been recorded.',
      ephemeral: true
    });
  } catch (error) {
    logger.error(`Error handling feedback submission: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred while submitting your feedback.',
      ephemeral: true
    });
  }
}

/**
 * Handle welcome setup menu selection
 * @param {StringSelectMenuInteraction} interaction - The interaction
 */
async function handleWelcomeSetupMenu(interaction) {
  const selectedValue = interaction.values[0];
  const guild = interaction.guild;
  
  switch (selectedValue) {
    case 'welcome_channel':
      await showChannelSelection(interaction, 'welcome');
      break;
    case 'leave_channel':
      await showChannelSelection(interaction, 'leave');
      break;
    case 'welcome_message':
      await showMessageEditor(interaction, 'welcome');
      break;
    case 'leave_message':
      await showMessageEditor(interaction, 'leave');
      break;
    case 'welcome_embed':
      await showEmbedEditor(interaction, 'welcome');
      break;
    case 'leave_embed':
      await showEmbedEditor(interaction, 'leave');
      break;
  }
}

/**
 * Show channel selection for welcome or leave messages
 * @param {StringSelectMenuInteraction} interaction - The interaction
 * @param {string} type - The type (welcome or leave)
 */
async function showChannelSelection(interaction, type) {
  const guild = interaction.guild;
  
  // Get text channels
  const textChannels = guild.channels.cache
    .filter(channel => channel.type === ChannelType.GuildText)
    .sort((a, b) => a.position - b.position);
  
  if (textChannels.size === 0) {
    await interaction.reply({
      content: 'No text channels found in this server.',
      ephemeral: true
    });
    return;
  }
  
  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`${type === 'welcome' ? 'Welcome' : 'Leave'} Channel Selection`)
    .setDescription(`Select a channel to use for ${type === 'welcome' ? 'welcome' : 'leave'} messages.`)
    .setColor(config.embedColor);
  
  // Create select menu with channels
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${type}_channel_select`)
    .setPlaceholder('Select a channel')
    .setMaxValues(1);
  
  // Add channels to select menu (max 25 options)
  const channelOptions = textChannels
    .first(25)
    .map(channel => ({
      label: channel.name,
      value: channel.id,
      description: `#${channel.name}`,
      emoji: '📝'
    }));
  
  selectMenu.addOptions(channelOptions);
  
  // Add option to use the same channel for both
  if (type === 'welcome') {
    selectMenu.addOptions({
      label: 'Use Join/Leave Channel',
      value: 'use_joinleave',
      description: 'Use the configured join/leave channel',
      emoji: '🔄'
    });
  } else if (type === 'leave') {
    selectMenu.addOptions({
      label: 'Use Join/Leave Channel',
      value: 'use_joinleave',
      description: 'Use the configured join/leave channel',
      emoji: '🔄'
    });
  }
  
  const row = new ActionRowBuilder().addComponents(selectMenu);
  
  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

/**
 * Handle welcome channel selection
 * @param {StringSelectMenuInteraction} interaction - The interaction
 */
async function handleWelcomeChannelSelect(interaction) {
  const selectedValue = interaction.values[0];
  
  // Ensure welcomeSystem exists
  if (!config.welcomeSystem) {
    config.welcomeSystem = { enabled: true };
  }
  
  if (selectedValue === 'use_joinleave') {
    // Use the joinLeave channel
    config.welcomeSystem.channelId = config.channels.joinLeave;
  } else {
    // Use the selected channel
    config.welcomeSystem.channelId = selectedValue;
  }
  
  // Save config
  await configManager.saveConfig();
  
  // Show confirmation
  const channel = interaction.guild.channels.cache.get(config.welcomeSystem.channelId);
  
  const embed = new EmbedBuilder()
    .setTitle('Welcome Channel Updated')
    .setDescription(`Welcome messages will now be sent to ${channel ? `<#${channel.id}>` : 'an invalid channel'}.`)
    .setColor(config.embedColor);
  
  await interaction.update({
    embeds: [embed],
    components: []
  });
}

/**
 * Handle leave channel selection
 * @param {StringSelectMenuInteraction} interaction - The interaction
 */
async function handleLeaveChannelSelect(interaction) {
  const selectedValue = interaction.values[0];
  
  // Ensure leaveSystem exists
  if (!config.leaveSystem) {
    config.leaveSystem = { enabled: true };
  }
  
  if (selectedValue === 'use_joinleave') {
    // Use the joinLeave channel
    config.leaveSystem.channelId = config.channels.joinLeave;
  } else {
    // Use the selected channel
    config.leaveSystem.channelId = selectedValue;
  }
  
  // Save config
  await configManager.saveConfig();
  
  // Show confirmation
  const channel = interaction.guild.channels.cache.get(config.leaveSystem.channelId);
  
  const embed = new EmbedBuilder()
    .setTitle('Leave Channel Updated')
    .setDescription(`Leave messages will now be sent to ${channel ? `<#${channel.id}>` : 'an invalid channel'}.`)
    .setColor(config.embedColor);
  
  await interaction.update({
    embeds: [embed],
    components: []
  });
}

/**
 * Show message editor for welcome or leave messages
 * @param {StringSelectMenuInteraction} interaction - The interaction
 * @param {string} type - The type (welcome or leave)
 */
async function showMessageEditor(interaction, type) {
  // Create modal for editing the message
  const modal = new ModalBuilder()
    .setCustomId(`${type}_message_modal`)
    .setTitle(`Edit ${type === 'welcome' ? 'Welcome' : 'Leave'} Message`);
  
  // Get current message
  const currentMessage = type === 'welcome' 
    ? config.welcomeSystem?.message || 'Welcome to the server, {user}!'
    : config.leaveSystem?.message || '**{user}** has left the server.';
  
  // Create text input
  const messageInput = new TextInputBuilder()
    .setCustomId(`${type}_message_input`)
    .setLabel(`${type === 'welcome' ? 'Welcome' : 'Leave'} Message`)
    .setStyle(TextInputStyle.Paragraph)
    .setValue(currentMessage)
    .setPlaceholder('Enter your message here...')
    .setRequired(true)
    .setMaxLength(2000);
  
  // Add placeholder info
  const placeholderInput = new TextInputBuilder()
    .setCustomId('placeholder_info')
    .setLabel('Available Placeholders')
    .setStyle(TextInputStyle.Paragraph)
    .setValue('{user} - User mention\n{server} - Server name\n{memberCount} - Member count\n{rules} - Rules channel mention')
    .setRequired(false);
  
  // Add to modal
  const messageRow = new ActionRowBuilder().addComponents(messageInput);
  const placeholderRow = new ActionRowBuilder().addComponents(placeholderInput);
  
  modal.addComponents(messageRow, placeholderRow);
  
  await interaction.showModal(modal);
}

/**
 * Show embed editor for welcome or leave embeds
 * @param {StringSelectMenuInteraction} interaction - The interaction
 * @param {string} type - The type (welcome or leave)
 */
async function showEmbedEditor(interaction, type) {
  // Create embed with current settings
  const systemConfig = type === 'welcome' ? config.welcomeSystem : config.leaveSystem;
  
  const embed = new EmbedBuilder()
    .setTitle(`${type === 'welcome' ? 'Welcome' : 'Leave'} Embed Settings`)
    .setDescription(`Configure how the ${type === 'welcome' ? 'welcome' : 'leave'} embed looks.`)
    .setColor(systemConfig?.embedColor || config.embedColor)
    .addFields(
      { 
        name: 'Embed Color', 
        value: systemConfig?.embedColor || config.embedColor || '#00AAFF', 
        inline: true 
      },
      { 
        name: type === 'welcome' ? 'Mention User' : 'Show Roles', 
        value: type === 'welcome' 
          ? systemConfig?.mentionUser ? '✅ Yes' : '❌ No'
          : systemConfig?.showRoles ? '✅ Yes' : '❌ No', 
        inline: true 
      },
      { 
        name: type === 'welcome' ? 'Show Account Age' : 'Show Join Duration', 
        value: type === 'welcome'
          ? systemConfig?.showAccountAge ? '✅ Yes' : '❌ No'
          : systemConfig?.showJoinDuration ? '✅ Yes' : '❌ No',
        inline: true 
      }
    );
  
  // Create buttons for toggling options
  const colorButton = new ButtonBuilder()
    .setCustomId(`${type}_embed_color`)
    .setLabel('Change Color')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🎨');
  
  const toggleButton1 = new ButtonBuilder()
    .setCustomId(`${type}_toggle_${type === 'welcome' ? 'mention' : 'roles'}`)
    .setLabel(type === 'welcome' ? 'Toggle Mention' : 'Toggle Roles')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(type === 'welcome' ? '👤' : '🏷️');
  
  const toggleButton2 = new ButtonBuilder()
    .setCustomId(`${type}_toggle_${type === 'welcome' ? 'account_age' : 'join_duration'}`)
    .setLabel(type === 'welcome' ? 'Toggle Account Age' : 'Toggle Join Duration')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📅');
  
  const testButton = new ButtonBuilder()
    .setCustomId(`${type}_test_embed`)
    .setLabel('Test Embed')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');
  
  const row = new ActionRowBuilder().addComponents(colorButton, toggleButton1, toggleButton2, testButton);
  
  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

/**
 * Handle welcome message modal submission
 * @param {ModalSubmitInteraction} interaction - The interaction
 */
async function handleWelcomeMessageModal(interaction) {
  const message = interaction.fields.getTextInputValue('welcome_message_input');
  
  // Ensure welcomeSystem exists
  if (!config.welcomeSystem) {
    config.welcomeSystem = { enabled: true };
  }
  
  // Update message
  config.welcomeSystem.message = message;
  
  // Save config
  await configManager.saveConfig();
  
  // Show confirmation
  const embed = new EmbedBuilder()
    .setTitle('Welcome Message Updated')
    .setDescription('Your welcome message has been updated.')
    .addFields({ name: 'New Message', value: message })
    .setColor(config.embedColor);
  
  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Handle leave message modal submission
 * @param {ModalSubmitInteraction} interaction - The interaction
 */
async function handleLeaveMessageModal(interaction) {
  const message = interaction.fields.getTextInputValue('leave_message_input');
  
  // Ensure leaveSystem exists
  if (!config.leaveSystem) {
    config.leaveSystem = { enabled: true };
  }
  
  // Update message
  config.leaveSystem.message = message;
  
  // Save config
  await configManager.saveConfig();
  
  // Show confirmation
  const embed = new EmbedBuilder()
    .setTitle('Leave Message Updated')
    .setDescription('Your leave message has been updated.')
    .addFields({ name: 'New Message', value: message })
    .setColor(config.embedColor);
  
  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

/**
 * Handle embed editor button clicks
 * @param {ButtonInteraction} interaction - The interaction
 */
async function handleEmbedEditorButton(interaction) {
  const customId = interaction.customId;
  const type = customId.startsWith('welcome') ? 'welcome' : 'leave';
  
  if (customId.endsWith('_color')) {
    // Show color picker modal
    const modal = new ModalBuilder()
      .setCustomId(`${type}_color_modal`)
      .setTitle(`Change ${type === 'welcome' ? 'Welcome' : 'Leave'} Embed Color`);
    
    // Get current color
    const systemConfig = type === 'welcome' ? config.welcomeSystem : config.leaveSystem;
    const currentColor = systemConfig?.embedColor || config.embedColor || '#00AAFF';
    
    // Create text input
    const colorInput = new TextInputBuilder()
      .setCustomId(`${type}_color_input`)
      .setLabel('Hex Color Code (e.g. #00AAFF)')
      .setStyle(TextInputStyle.Short)
      .setValue(currentColor)
      .setPlaceholder('#00AAFF')
      .setRequired(true)
      .setMaxLength(7);
    
    // Add to modal
    const colorRow = new ActionRowBuilder().addComponents(colorInput);
    modal.addComponents(colorRow);
    
    await interaction.showModal(modal);
  }
}

/**
 * Handle toggle button clicks
 * @param {ButtonInteraction} interaction - The interaction
 */
async function handleToggleButton(interaction) {
  const customId = interaction.customId;
  const type = customId.startsWith('welcome') ? 'welcome' : 'leave';
  
  // Ensure system config exists
  if (type === 'welcome' && !config.welcomeSystem) {
    config.welcomeSystem = { enabled: true };
  } else if (type === 'leave' && !config.leaveSystem) {
    config.leaveSystem = { enabled: true };
  }
  
  const systemConfig = type === 'welcome' ? config.welcomeSystem : config.leaveSystem;
  
  // Handle different toggle options
  if (customId.endsWith('_mention')) {
    // Toggle mention user
    systemConfig.mentionUser = !systemConfig.mentionUser;
  } else if (customId.endsWith('_roles')) {
    // Toggle show roles
    systemConfig.showRoles = !systemConfig.showRoles;
  } else if (customId.endsWith('_account_age')) {
    // Toggle show account age
    systemConfig.showAccountAge = !systemConfig.showAccountAge;
  } else if (customId.endsWith('_join_duration')) {
    // Toggle show join duration
    systemConfig.showJoinDuration = !systemConfig.showJoinDuration;
  }
  
  // Save config
  await configManager.saveConfig();
  
  // Update embed
  await showEmbedEditor(interaction, type);
}

/**
 * Handle test embed button clicks
 * @param {ButtonInteraction} interaction - The interaction
 */
async function handleTestEmbedButton(interaction) {
  const customId = interaction.customId;
  const type = customId.startsWith('welcome') ? 'welcome' : 'leave';
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
 * Handle color modal submission
 * @param {ModalSubmitInteraction} interaction - The interaction
 * @param {string} type - The type (welcome or leave)
 */
async function handleColorModal(interaction, type) {
  const color = interaction.fields.getTextInputValue(`${type}_color_input`);
  
  // Validate color format
  const colorRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!colorRegex.test(color)) {
    await interaction.reply({
      content: 'Invalid color format. Please use a valid hex color code (e.g. #00AAFF).',
      ephemeral: true
    });
    return;
  }
  
  // Ensure system config exists
  if (type === 'welcome' && !config.welcomeSystem) {
    config.welcomeSystem = { enabled: true };
  } else if (type === 'leave' && !config.leaveSystem) {
    config.leaveSystem = { enabled: true };
  }
  
  // Update color
  if (type === 'welcome') {
    config.welcomeSystem.embedColor = color;
  } else {
    config.leaveSystem.embedColor = color;
  }
  
  // Save config
  await configManager.saveConfig();
  
  // Show confirmation
  const embed = new EmbedBuilder()
    .setTitle(`${type === 'welcome' ? 'Welcome' : 'Leave'} Embed Color Updated`)
    .setDescription(`The embed color has been updated to ${color}.`)
    .setColor(color);
  
  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
  
  // Update embed editor
  setTimeout(async () => {
    try {
      const message = await interaction.fetchReply();
      await showEmbedEditor({ update: async (options) => await message.edit(options) }, type);
    } catch (error) {
      logger.error('Error updating embed editor:', error);
    }
  }, 2000);
} 