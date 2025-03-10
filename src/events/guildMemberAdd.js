/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../../config.json');
const economy = require('../modules/economy');
const mining = require('../modules/mining');
const { createWelcomeMemberEmbed } = require('../embeds/welcome-member-embed');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    try {
      const { guild, user } = member;
      
      // Log member join
      logger.info(`User ${user.tag} joined guild: ${guild.name}`);
      
      // Record in database if connected
      if (client.db && client.db.isConnected) {
        try {
          // Insert or update user in users table
          await client.db.query(
            'INSERT INTO users (user_id, username, discriminator, avatar, created_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username), discriminator = VALUES(discriminator), avatar = VALUES(avatar), last_seen = NOW()',
            [user.id, user.username, user.discriminator || '0', user.avatar, new Date(user.createdTimestamp)]
          );
          
          // Insert into guild_members table
          await client.db.query(
            'INSERT INTO guild_members (guild_id, user_id, joined_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE joined_at = VALUES(joined_at)',
            [guild.id, user.id, new Date()]
          );
          
          // Record join event
          await client.db.query(
            'INSERT INTO member_events (user_id, guild_id, event_type, timestamp) VALUES (?, ?, ?, ?)',
            [user.id, guild.id, 'join', new Date()]
          );
          
          // Update bot statistics
          await client.db.query(
            'UPDATE bot_statistics SET users_joined = users_joined + 1 WHERE id = (SELECT MAX(id) FROM bot_statistics)'
          );
        } catch (error) {
          logger.error(`Failed to record member join in database: ${error.message}`);
        }
      }
      
      // Handle role assignment based on configuration
      await handleRoleAssignment(member);
      
      // Send welcome message if configured
      await sendWelcomeMessage(member);
      
      // Initialize user in economy and mining systems
      try {
        // Initialize economy for the user
        if (economy.isInitialized) {
          await economy.ensureUser(member.id, guild.id);
        }
        
        // Initialize mining for the user
        if (mining.isInitialized) {
          await mining.ensureUser(member.id, guild.id);
        }
      } catch (error) {
        logger.error(`Failed to initialize user systems: ${error.message}`);
      }
      
      // Send welcome DM if configured
      if (config.sendWelcomeDM) {
        try {
          const welcomeDM = new EmbedBuilder()
            .setTitle(`Welcome to ${guild.name}!`)
            .setDescription(config.welcomeDMMessage || `Thanks for joining our server! We're glad to have you here.`)
            .setColor(config.embedColor || '#00AAFF')
            .setTimestamp();
          
          await member.send({ embeds: [welcomeDM] });
        } catch (error) {
          logger.warn(`Could not send welcome DM to ${member.user.tag}: ${error.message}`);
        }
      }
      
      // Update member count channels if enabled
      if (config.memberCountChannels && config.memberCountChannels.enabled) {
        try {
          await updateMemberCountChannels(guild);
        } catch (error) {
          logger.error(`Error updating member count channels: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Error in guildMemberAdd event: ${error.message}`);
    }
  }
};

/**
 * Handle role assignment for new members
 * @param {GuildMember} member - The member who joined
 */
async function handleRoleAssignment(member) {
  const { guild } = member;
  
  try {
    // Assign unverified role if verification is enabled
    if (config.verification?.enabled) {
      const unverifiedRole = guild.roles.cache.find(
        role => role.name === (config.verification.unverifiedRole || 'Unverified')
      );
      
      if (unverifiedRole) {
        try {
          await member.roles.add(unverifiedRole);
          logger.info(`Assigned unverified role to ${member.user.tag} in ${guild.name}`);
        } catch (error) {
          logger.error(`Failed to assign unverified role to ${member.user.tag}: ${error.message}`);
        }
      } else {
        logger.warn(`Unverified role not found in guild: ${guild.name}`);
      }
    }
    
    // Auto-role assignment if enabled
    if (config.autoRole && config.autoRole.enabled) {
      try {
        // Get roles to assign
        const roleNames = Array.isArray(config.autoRole.roles) 
          ? config.autoRole.roles 
          : [config.autoRole.roles];
        
        // Assign each role
        for (const roleName of roleNames) {
          const role = guild.roles.cache.find(r => 
            r.name === roleName || r.id === roleName
          );
          
          if (role) {
            try {
              await member.roles.add(role);
              logger.info(`Auto-assigned role ${roleName} to new member ${member.user.tag}`);
            } catch (error) {
              logger.error(`Failed to assign role ${roleName} to ${member.user.tag}: ${error.message}`);
            }
          } else {
            logger.warn(`Auto-role ${roleName} not found in guild: ${guild.name}`);
          }
        }
      } catch (error) {
        logger.error(`Error in auto-role assignment: ${error.message}`);
      }
    }
    
    // Assign member role if configured and verification is not enabled
    if (config.memberRole && !config.verification?.enabled) {
      const memberRole = guild.roles.cache.find(r => 
        r.name === config.memberRole || r.id === config.memberRole
      );
      
      if (memberRole) {
        try {
          await member.roles.add(memberRole);
          logger.info(`Assigned member role to ${member.user.tag} in ${guild.name}`);
        } catch (error) {
          logger.error(`Failed to assign member role to ${member.user.tag}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error in role assignment: ${error.message}`);
  }
}

/**
 * Send welcome message for new members
 * @param {GuildMember} member - The member who joined
 */
async function sendWelcomeMessage(member) {
  const { guild } = member;
  
  try {
    // Check if welcome system is enabled
    if (config.welcomeSystem?.enabled) {
      // Get welcome channel - prioritize channel ID over channel name
      let welcomeChannel;
      
      // First try to get the channel by ID from welcomeSystem.channelId
      if (config.welcomeSystem.channelId) {
        welcomeChannel = guild.channels.cache.get(config.welcomeSystem.channelId);
      }
      
      // If not found, try the channels.joinLeave ID
      if (!welcomeChannel && config.channels?.joinLeave) {
        welcomeChannel = guild.channels.cache.get(config.channels.joinLeave);
      }
      
      // If not found, try the channels.welcome ID
      if (!welcomeChannel && config.channels?.welcome) {
        welcomeChannel = guild.channels.cache.get(config.channels.welcome);
      }
      
      // If still not found, try by name
      if (!welcomeChannel) {
        const welcomeChannelName = config.welcomeSystem.channelName || 'welcome';
        welcomeChannel = guild.channels.cache.find(
          channel => channel.name === welcomeChannelName || 
                    channel.name.includes(welcomeChannelName)
        );
      }
      
      if (welcomeChannel) {
        // Create welcome embed
        const welcomeEmbed = createWelcomeMemberEmbed(member);
        
        // Send welcome message
        await welcomeChannel.send({ 
          content: config.welcomeSystem.mentionUser ? `<@${member.id}>` : null,
          embeds: [welcomeEmbed] 
        });
        
        logger.info(`Sent welcome message for ${member.user.tag} in ${guild.name}`);
      } else {
        logger.warn(`Welcome channel not found in guild: ${guild.name}`);
      }
    }
    
    // Send verification instructions if enabled
    if (config.verification?.enabled && config.verification?.instructionsChannel) {
      const instructionsChannel = guild.channels.cache.find(
        channel => channel.name === config.verification.instructionsChannel || 
                  channel.id === config.verification.instructionsChannel
      );
      
      if (instructionsChannel) {
        try {
          const verificationEmbed = new EmbedBuilder()
            .setTitle('Verification Required')
            .setDescription(`Welcome ${member}! To access the rest of the server, please verify yourself by going to the verification channel and clicking the verify button.`)
            .setColor(config.verification.embedColor || '#00FF00')
            .setTimestamp();
          
          await instructionsChannel.send({ content: `${member}`, embeds: [verificationEmbed] });
        } catch (error) {
          logger.error(`Failed to send verification instructions: ${error.message}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error sending welcome message: ${error.message}`);
  }
}

/**
 * Update member count channels
 * @param {Guild} guild - The Discord guild
 */
async function updateMemberCountChannels(guild) {
  try {
    const totalMembersChannel = guild.channels.cache.get(config.memberCountChannels?.totalChannel);
    const humanMembersChannel = guild.channels.cache.get(config.memberCountChannels?.humanChannel);
    const botMembersChannel = guild.channels.cache.get(config.memberCountChannels?.botChannel);
    
    const totalMembers = guild.memberCount;
    const botMembers = guild.members.cache.filter(member => member.user.bot).size;
    const humanMembers = totalMembers - botMembers;
    
    if (totalMembersChannel) {
      await totalMembersChannel.setName(`Total Members: ${totalMembers}`);
    }
    
    if (humanMembersChannel) {
      await humanMembersChannel.setName(`Human Members: ${humanMembers}`);
    }
    
    if (botMembersChannel) {
      await botMembersChannel.setName(`Bot Members: ${botMembers}`);
    }
    
    logger.info(`Updated member count channels for guild: ${guild.name}`);
  } catch (error) {
    logger.error(`Failed to update member count channels: ${error.message}`);
  }
}