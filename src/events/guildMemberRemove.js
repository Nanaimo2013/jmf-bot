/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const userLogger = require('../utils/userLogger');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const { createLeaveMemberEmbed } = require('../embeds/leave-member-embed');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(member, client) {
    try {
      const { guild, user } = member;
      
      // Log the leave event
      logger.info(`User ${user.tag} left guild: ${guild.name}`);
      await userLogger.logLeave(member, client);
      
      // Send leave message if enabled
      await sendLeaveMessage(member);
      
      // Update member count channels if enabled
      if (config.memberCountChannels && config.memberCountChannels.enabled) {
        await updateMemberCountChannels(member.guild);
      }
      
      // Record leave in database
      if (client.db && client.db.isConnected) {
        try {
          // Record leave event
          await client.db.query(
            'INSERT INTO member_events (user_id, guild_id, event_type, timestamp) VALUES (?, ?, ?, ?)',
            [member.id, member.guild.id, 'leave', new Date()]
          );
          
          // Update user status in database
          await client.db.query(
            'UPDATE guild_members SET is_member = 0, left_at = ? WHERE guild_id = ? AND user_id = ?',
            [new Date(), member.guild.id, member.id]
          );
          
          // Update bot statistics
          await client.db.query(
            'UPDATE bot_statistics SET users_left = users_left + 1 WHERE id = (SELECT MAX(id) FROM bot_statistics)'
          );
        } catch (error) {
          logger.error(`Failed to record leave event in database: ${error.message}`);
        }
      }
      
      // Check if this was a kick or ban
      await checkModAction(member, client);
      
    } catch (error) {
      logger.error(`Error in guildMemberRemove event: ${error.message}`);
    }
  }
};

/**
 * Send leave message for members who left
 * @param {GuildMember} member - The member who left
 */
async function sendLeaveMessage(member) {
  const { guild } = member;
  
  try {
    // Check if leave system is enabled
    if (config.leaveSystem && config.leaveSystem.enabled) {
      // Get leave channel - prioritize channel ID over channel name
      let leaveChannel;
      
      // First try to get the channel by ID from leaveSystem.channelId
      if (config.leaveSystem.channelId) {
        leaveChannel = guild.channels.cache.get(config.leaveSystem.channelId);
      }
      
      // If not found, try the channels.leave ID
      if (!leaveChannel && config.channels?.leave) {
        leaveChannel = guild.channels.cache.get(config.channels.leave);
      }
      
      // If not found, try the channels.joinLeave ID
      if (!leaveChannel && config.channels?.joinLeave) {
        leaveChannel = guild.channels.cache.get(config.channels.joinLeave);
      }
      
      // If still not found, try by name
      if (!leaveChannel) {
        const leaveChannelName = config.leaveSystem.channelName || 'join-leave';
        leaveChannel = guild.channels.cache.find(
          channel => channel.name === leaveChannelName || 
                    channel.name.includes(leaveChannelName)
        );
      }
      
      if (leaveChannel) {
        // Create leave embed
        const leaveEmbed = createLeaveMemberEmbed(member);
        
        // Send leave message
        await leaveChannel.send({ embeds: [leaveEmbed] });
        logger.info(`Sent leave message for ${member.user.tag} in ${guild.name}`);
      } else {
        logger.warn(`Leave channel not found in guild: ${guild.name}`);
      }
    }
  } catch (error) {
    logger.error(`Error sending leave message: ${error.message}`);
  }
}

/**
 * Check if the member was kicked or banned
 * @param {GuildMember} member - The member who left
 * @param {Client} client - The Discord client
 */
async function checkModAction(member, client) {
  try {
    const auditLogs = await member.guild.fetchAuditLogs({
      limit: 1,
      type: 20 // MEMBER_KICK
    });
    
    const kickLog = auditLogs.entries.first();
    
    // If the user was kicked and it happened in the last 5 seconds
    if (kickLog && kickLog.target.id === member.id && 
        (Date.now() - kickLog.createdTimestamp) < 5000) {
      
      logger.info(`User ${member.user.tag} was kicked by ${kickLog.executor.tag}`);
      
      // Record kick in database
      if (client.db && client.db.isConnected) {
        try {
          await client.db.query(
            'INSERT INTO moderation_actions (user_id, guild_id, action_type, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [member.id, member.guild.id, 'kick', kickLog.executor.id, kickLog.reason || 'No reason provided', new Date()]
          );
        } catch (error) {
          logger.error(`Failed to record kick in database: ${error.message}`);
        }
      }
    } else {
      // Check if it was a ban
      const banLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: 22 // MEMBER_BAN_ADD
      });
      
      const banLog = banLogs.entries.first();
      
      // If the user was banned and it happened in the last 5 seconds
      if (banLog && banLog.target.id === member.id && 
          (Date.now() - banLog.createdTimestamp) < 5000) {
        
        logger.info(`User ${member.user.tag} was banned by ${banLog.executor.tag}`);
        
        // Record ban in database
        if (client.db && client.db.isConnected) {
          try {
            await client.db.query(
              'INSERT INTO moderation_actions (user_id, guild_id, action_type, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
              [member.id, member.guild.id, 'ban', banLog.executor.id, banLog.reason || 'No reason provided', new Date()]
            );
          } catch (error) {
            logger.error(`Failed to record ban in database: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error checking audit logs: ${error.message}`);
  }
}

/**
 * Update member count channels
 * @param {Guild} guild - The Discord guild
 */
async function updateMemberCountChannels(guild) {
  try {
    if (!config.memberCountChannels || !config.memberCountChannels.enabled) return;
    
    // Total members channel
    if (config.memberCountChannels.totalChannel) {
      const totalChannel = guild.channels.cache.find(
        c => c.id === config.memberCountChannels.totalChannel
      );
      
      if (totalChannel) {
        await totalChannel.setName(`Total Members: ${guild.memberCount}`);
      }
    }
    
    // Human members channel
    if (config.memberCountChannels.humanChannel) {
      const humanChannel = guild.channels.cache.find(
        c => c.id === config.memberCountChannels.humanChannel
      );
      
      if (humanChannel) {
        const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
        await humanChannel.setName(`Members: ${humanCount}`);
      }
    }
    
    // Bot members channel
    if (config.memberCountChannels.botChannel) {
      const botChannel = guild.channels.cache.find(
        c => c.id === config.memberCountChannels.botChannel
      );
      
      if (botChannel) {
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        await botChannel.setName(`Bots: ${botCount}`);
      }
    }
  } catch (error) {
    logger.error(`Error updating member count channels: ${error.message}`);
  }
} 