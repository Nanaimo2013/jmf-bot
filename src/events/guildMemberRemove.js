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

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(member, client) {
    try {
      // Log the leave event
      await userLogger.logLeave(member, client);
      
      // Send leave message if enabled
      if (config.leaveSystem && config.leaveSystem.enabled) {
        const leaveChannelName = config.leaveSystem.channelName || 'welcome';
        const leaveChannel = member.guild.channels.cache.find(
          channel => channel.name === leaveChannelName && channel.type === 0
        );
        
        if (leaveChannel) {
          // Create leave embed
          const leaveEmbed = new EmbedBuilder()
            .setTitle('Member Left')
            .setDescription(config.leaveSystem.message
              ? config.leaveSystem.message.replace('{user}', member.user.tag)
              : `**${member.user.tag}** has left the server.`)
            .setColor(config.leaveSystem.embedColor || '#FF0000')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ 
              text: `Members: ${member.guild.memberCount}`, 
              iconURL: member.guild.iconURL({ dynamic: true }) 
            });
            
          // Add join date if available
          if (member.joinedAt) {
            const joinDuration = Math.floor((Date.now() - member.joinedAt) / (1000 * 60 * 60 * 24));
            leaveEmbed.addFields({ 
              name: 'Member Since', 
              value: `${member.joinedAt.toDateString()} (${joinDuration} days)` 
            });
          }
          
          await leaveChannel.send({ embeds: [leaveEmbed] });
        }
      }
      
      // Update member count channels if enabled
      if (config.memberCountChannels && config.memberCountChannels.enabled) {
        await updateMemberCountChannels(member.guild);
      }
      
      // Record leave in database
      if (client.db) {
        try {
          await client.db.query(
            'INSERT INTO member_events (user_id, guild_id, event_type, timestamp) VALUES (?, ?, ?, ?)',
            [member.id, member.guild.id, 'leave', new Date()]
          );
          
          // Update user status in database
          await client.db.query(
            'UPDATE users SET is_member = 0, left_at = ? WHERE user_id = ? AND guild_id = ?',
            [new Date(), member.id, member.guild.id]
          );
        } catch (error) {
          logger.error(`Failed to record leave event in database: ${error.message}`);
        }
      }
      
      // Check if this was a kick or ban
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
          if (client.db) {
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
            if (client.db) {
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
      
    } catch (error) {
      logger.error(`Error in guildMemberRemove event: ${error.message}`);
    }
  }
};

/**
 * Update member count channels
 * @param {Guild} guild - The Discord guild
 */
async function updateMemberCountChannels(guild) {
  try {
    const config = require('../../config.json');
    
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