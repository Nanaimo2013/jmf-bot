/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Events, Collection, InteractionType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../../config.json');

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