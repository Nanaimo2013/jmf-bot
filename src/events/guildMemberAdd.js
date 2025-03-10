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
          
          // Update bot statistics
          await client.db.query(
            'UPDATE bot_statistics SET users_joined = users_joined + 1 WHERE id = (SELECT MAX(id) FROM bot_statistics)'
          );
        } catch (error) {
          logger.error(`Failed to record member join in database: ${error.message}`);
        }
      }
      
      // Assign unverified role if verification is enabled
      if (config.verification?.enabled) {
        const unverifiedRole = guild.roles.cache.find(
          role => role.name === (config.verification.unverifiedRole || 'Unverified')
        );
        
        if (unverifiedRole) {
          try {
            await member.roles.add(unverifiedRole);
            logger.info(`Assigned unverified role to ${user.tag} in ${guild.name}`);
          } catch (error) {
            logger.error(`Failed to assign unverified role to ${user.tag}: ${error.message}`);
          }
        }
      }
      
      // Send welcome message if configured
      if (config.welcomeChannel) {
        const welcomeChannel = guild.channels.cache.find(
          channel => channel.name === config.welcomeChannel || channel.id === config.welcomeChannel
        );
        
        if (welcomeChannel) {
          try {
            const welcomeEmbed = new EmbedBuilder()
              .setTitle('New Member')
              .setDescription(`Welcome to the server, ${member}! We're glad to have you here.`)
              .setColor(config.embedColor || '#00FF00')
              .setThumbnail(user.displayAvatarURL({ dynamic: true }))
              .addFields(
                { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
              )
              .setTimestamp()
              .setFooter({ text: config.footerText || guild.name });
            
            await welcomeChannel.send({ embeds: [welcomeEmbed] });
          } catch (error) {
            logger.error(`Failed to send welcome message: ${error.message}`);
          }
        }
      }
      
      // Send verification instructions if enabled
      if (config.verification?.enabled && config.verification?.instructionsChannel) {
        const instructionsChannel = guild.channels.cache.find(
          channel => channel.name === config.verification.instructionsChannel || channel.id === config.verification.instructionsChannel
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
            .setColor(config.embedColor || '#00FF00')
            .setTimestamp();
          
          await member.send({ embeds: [welcomeDM] });
        } catch (error) {
          logger.warn(`Could not send welcome DM to ${member.user.tag}: ${error.message}`);
        }
      }
      
      // Auto-role assignment if enabled
      if (config.autoRole && config.autoRole.enabled) {
        try {
          const roleNames = Array.isArray(config.autoRole.roles) 
            ? config.autoRole.roles 
            : [config.autoRole.roles];
          
          for (const roleName of roleNames) {
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (role) {
              try {
                await member.roles.add(role);
                logger.info(`Auto-assigned role ${roleName} to new member ${user.tag}`);
              } catch (error) {
                logger.error(`Failed to assign role ${roleName} to ${user.tag}: ${error.message}`);
              }
            }
          }
        } catch (error) {
          logger.error(`Error in auto-role assignment: ${error.message}`);
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