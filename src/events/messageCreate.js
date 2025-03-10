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
const config = require('../../config.json');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const levelSystem = require('../modules/leveling');
const economy = require('../modules/economy');
const miningGame = require('../modules/mining');
const aiUtils = require('../utils/aiUtils');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    try {
      // Ignore messages from bots
      if (message.author.bot) return;
      
      // Log the message for user activity tracking
      await userLogger.logMessage(message);
      
      // Process XP for level system if enabled
      if (config.levelSystem && config.levelSystem.enabled) {
        await levelSystem.processMessage(message);
      }
      
      // Auto-moderation if enabled
      if (config.autoMod && config.autoMod.enabled) {
        await handleAutoMod(message, client);
      }
      
      // AI chat response if enabled and message is in AI chat channel
      if (config.aiChat && config.aiChat.enabled && 
          message.channel.id === config.aiChat.channelId &&
          aiUtils.isAIEnabled()) {
        await handleAIChat(message, client);
      }
      
      // Custom commands and prefix commands
      if (message.content.startsWith(config.prefix || '!')) {
        await handlePrefixCommand(message, client);
      }
      
      // Handle message keywords/triggers
      await handleKeywordTriggers(message, client);
      
      // Record message in database
      if (client.db && client.db.isConnected) {
        try {
          await client.db.query(
            'INSERT INTO messages (message_id, user_id, guild_id, channel_id, content_length, has_attachments, has_embeds, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              message.id,
              message.author.id,
              message.guild ? message.guild.id : null,
              message.channel.id,
              message.content.length,
              message.attachments.size > 0 ? 1 : 0,
              message.embeds.length > 0 ? 1 : 0,
              new Date(message.createdTimestamp)
            ]
          );
        } catch (error) {
          logger.error(`Failed to record message in database: ${error.message}`);
        }
      }
      
    } catch (error) {
      logger.error(`Error in messageCreate event: ${error.message}`);
    }
  }
};

/**
 * Handle auto-moderation for messages
 * @param {Message} message - The Discord message
 * @param {Client} client - The Discord client
 */
async function handleAutoMod(message, client) {
  try {
    // Skip moderation for admins and moderators
    if (message.member && (
      message.member.permissions.has('Administrator') ||
      message.member.permissions.has('ModerateMembers')
    )) {
      return;
    }
    
    const autoModConfig = config.autoMod;
    let violations = [];
    let deleteMessage = false;
    let timeoutUser = false;
    let timeoutDuration = 0;
    
    // Store original message content for logging
    const originalContent = message.content;
    
    // Check for excessive mentions
    if (autoModConfig.maxMentions && message.mentions.users.size > autoModConfig.maxMentions) {
      violations.push(`Excessive mentions: ${message.mentions.users.size}/${autoModConfig.maxMentions}`);
      deleteMessage = true;
      
      // Apply timeout for excessive mentions if configured
      if (autoModConfig.timeoutForExcessiveMentions) {
        timeoutUser = true;
        timeoutDuration = autoModConfig.timeoutDuration || 300000; // Default 5 minutes
      }
    }
    
    // Check for excessive emojis
    if (autoModConfig.maxEmojis) {
      const emojiRegex = /<a?:.+?:\d+>|[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}]/gu;
      const emojiCount = (message.content.match(emojiRegex) || []).length;
      
      if (emojiCount > autoModConfig.maxEmojis) {
        violations.push(`Excessive emojis: ${emojiCount}/${autoModConfig.maxEmojis}`);
        
        if (autoModConfig.deleteExcessiveEmojis) {
          deleteMessage = true;
        }
      }
    }
    
    // Check for excessive caps
    if (autoModConfig.maxCaps && message.content.length > 10) {
      const capsRegex = /[A-Z]/g;
      const capsCount = (message.content.match(capsRegex) || []).length;
      const capsPercentage = (capsCount / message.content.length) * 100;
      
      if (capsPercentage > autoModConfig.maxCaps) {
        violations.push(`Excessive caps: ${capsPercentage.toFixed(1)}%/${autoModConfig.maxCaps}%`);
        
        if (autoModConfig.deleteExcessiveCaps) {
          deleteMessage = true;
        }
      }
    }
    
    // Check for invite links
    if (autoModConfig.inviteFilter) {
      const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;
      const invites = message.content.match(inviteRegex);
      
      if (invites) {
        // Check if it's an allowed invite
        let hasDisallowedInvite = false;
        
        if (autoModConfig.allowedInvites && autoModConfig.allowedInvites.length > 0) {
          for (const invite of invites) {
            const isAllowed = autoModConfig.allowedInvites.some(allowedInvite => 
              invite.toLowerCase().includes(allowedInvite.toLowerCase())
            );
            
            if (!isAllowed) {
              hasDisallowedInvite = true;
              break;
            }
          }
        } else {
          hasDisallowedInvite = true;
        }
        
        if (hasDisallowedInvite) {
          violations.push('Discord invite link');
          deleteMessage = true;
          
          // Apply timeout for invite links if configured
          if (autoModConfig.timeoutForInvites) {
            timeoutUser = true;
            timeoutDuration = autoModConfig.timeoutDuration || 300000; // Default 5 minutes
          }
        }
      }
    }
    
    // Check for links
    if (autoModConfig.linkFilter) {
      const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
      const links = message.content.match(linkRegex);
      
      if (links) {
        // Check if it's an allowed link
        let hasDisallowedLink = false;
        
        if (autoModConfig.allowedLinks && autoModConfig.allowedLinks.length > 0) {
          for (const link of links) {
            const isAllowed = autoModConfig.allowedLinks.some(allowedLink => 
              link.toLowerCase().includes(allowedLink.toLowerCase())
            );
            
            if (!isAllowed) {
              hasDisallowedLink = true;
              break;
            }
          }
        } else {
          hasDisallowedLink = true;
        }
        
        if (hasDisallowedLink) {
          violations.push('Disallowed link');
          deleteMessage = true;
        }
      }
    }
    
    // Check for banned words
    if (autoModConfig.bannedWords && autoModConfig.bannedWords.length > 0) {
      const lowerContent = message.content.toLowerCase();
      
      for (const word of autoModConfig.bannedWords) {
        if (lowerContent.includes(word.toLowerCase())) {
          violations.push('Banned word/phrase');
          deleteMessage = true;
          
          // Apply timeout for banned words if configured
          if (autoModConfig.timeoutForBannedWords) {
            timeoutUser = true;
            timeoutDuration = autoModConfig.timeoutDuration || 300000; // Default 5 minutes
          }
          
          break;
        }
      }
    }
    
    // Check for spam (repeated characters)
    if (autoModConfig.antiSpam) {
      const repeatedCharsRegex = /(.)\1{7,}/g;
      if (repeatedCharsRegex.test(message.content)) {
        violations.push('Excessive repeated characters (spam)');
        deleteMessage = true;
      }
    }
    
    // Check for message length
    if (autoModConfig.maxMessageLength && message.content.length > autoModConfig.maxMessageLength) {
      violations.push(`Message too long: ${message.content.length}/${autoModConfig.maxMessageLength} characters`);
      
      if (autoModConfig.deleteLongMessages) {
        deleteMessage = true;
      }
    }
    
    // Check for newlines
    if (autoModConfig.maxNewlines) {
      const newlineCount = (message.content.match(/\n/g) || []).length;
      
      if (newlineCount > autoModConfig.maxNewlines) {
        violations.push(`Excessive newlines: ${newlineCount}/${autoModConfig.maxNewlines}`);
        
        if (autoModConfig.deleteExcessiveNewlines) {
          deleteMessage = true;
        }
      }
    }
    
    // Take action if violations found
    if (violations.length > 0) {
      // Log the violation
      logger.warn(`AutoMod: ${message.author.tag} violated rules in #${message.channel.name}: ${violations.join(', ')}`);
      
      // Delete message if needed
      if (deleteMessage) {
        try {
          await message.delete();
        } catch (error) {
          logger.error(`Failed to delete message: ${error.message}`);
        }
      }
      
      // Apply timeout if needed
      if (timeoutUser && message.member && message.member.moderatable) {
        try {
          await message.member.timeout(timeoutDuration, 'AutoMod: ' + violations.join(', '));
          logger.warn(`AutoMod: Applied timeout to ${message.author.tag} for ${timeoutDuration/1000} seconds`);
        } catch (error) {
          logger.error(`Failed to timeout user: ${error.message}`);
        }
      }
      
      // Send warning to user
      try {
        const warningEmbed = new EmbedBuilder()
          .setTitle('⚠️ AutoMod Warning')
          .setDescription(`Your message in ${message.guild.name} was flagged for the following reason(s):\n\n${violations.map(v => `• ${v}`).join('\n')}`)
          .setColor('#FF9900')
          .setTimestamp();
          
        if (timeoutUser) {
          warningEmbed.addFields({
            name: '🔇 Timeout Applied',
            value: `You have been timed out for ${timeoutDuration/1000/60} minutes.`
          });
        }
        
        await message.author.send({ embeds: [warningEmbed] });
      } catch (error) {
        logger.warn(`Could not send warning DM to ${message.author.tag}: ${error.message}`);
      }
      
      // Log to mod log channel if configured
      if (autoModConfig.logChannel) {
        const logChannel = client.channels.cache.get(autoModConfig.logChannel);
        
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('🛡️ AutoMod Action')
            .setDescription(`**User:** ${message.author.tag} (${message.author.id})\n**Channel:** <#${message.channel.id}>\n**Action:** ${deleteMessage ? 'Message Deleted' : 'Warning'}${timeoutUser ? ' + Timeout' : ''}\n**Violations:** ${violations.join(', ')}`)
            .setColor('#FF9900')
            .setTimestamp();
            
          if (originalContent) {
            logEmbed.addFields({ 
              name: 'Message Content', 
              value: originalContent.length > 1024 ? originalContent.substring(0, 1021) + '...' : originalContent 
            });
          }
          
          if (timeoutUser) {
            logEmbed.addFields({
              name: 'Timeout Duration',
              value: `${timeoutDuration/1000/60} minutes`
            });
          }
          
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
      
      // Record in database
      if (client.db) {
        try {
          await client.db.query(
            'INSERT INTO automod_actions (user_id, guild_id, channel_id, message_id, violations, action, message_content, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              message.author.id,
              message.guild.id,
              message.channel.id,
              message.id,
              violations.join(', '),
              timeoutUser ? 'timeout' : (deleteMessage ? 'delete' : 'warn'),
              originalContent,
              new Date()
            ]
          );
        } catch (error) {
          logger.error(`Failed to record automod action in database: ${error.message}`);
        }
      }
      
      // Check for repeat offenders
      if (client.db && autoModConfig.escalateRepeatOffenders) {
        try {
          // Get recent violations in the last hour
          const recentViolations = await client.db.query(
            'SELECT COUNT(*) as count FROM automod_actions WHERE user_id = ? AND guild_id = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
            [message.author.id, message.guild.id]
          );
          
          const violationCount = recentViolations[0]?.count || 0;
          
          // Escalate if threshold exceeded
          if (violationCount >= autoModConfig.repeatOffenderThreshold) {
            // Apply longer timeout
            if (message.member && message.member.moderatable) {
              const escalatedDuration = autoModConfig.escalatedTimeoutDuration || 3600000; // Default 1 hour
              await message.member.timeout(escalatedDuration, 'AutoMod: Repeat offender');
              
              // Log escalation
              logger.warn(`AutoMod: Escalated action against repeat offender ${message.author.tag} (${violationCount} violations in the last hour)`);
              
              // Notify moderators
              if (autoModConfig.logChannel) {
                const logChannel = client.channels.cache.get(autoModConfig.logChannel);
                
                if (logChannel) {
                  const escalationEmbed = new EmbedBuilder()
                    .setTitle('⚠️ AutoMod Escalation')
                    .setDescription(`**Repeat Offender:** ${message.author.tag} (${message.author.id})\n**Violations:** ${violationCount} in the last hour\n**Action:** Extended timeout (${escalatedDuration/1000/60} minutes)`)
                    .setColor('#FF0000')
                    .setTimestamp();
                    
                  await logChannel.send({ 
                    content: autoModConfig.pingModRole ? `<@&${autoModConfig.modRoleId}>` : null,
                    embeds: [escalationEmbed] 
                  });
                }
              }
            }
          }
        } catch (error) {
          logger.error(`Failed to check for repeat offenders: ${error.message}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error in automod handler: ${error.message}`);
  }
}

/**
 * Handle AI chat functionality
 * @param {Message} message - The Discord message
 * @param {Client} client - The Discord client
 */
async function handleAIChat(message, client) {
  try {
    // Set typing indicator
    await message.channel.sendTyping();
    
    // Record the interaction in database
    if (client.db) {
      try {
        await client.db.query(
          'INSERT INTO ai_chat_messages (user_id, guild_id, channel_id, message_id, user_message, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
          [
            message.author.id,
            message.guild ? message.guild.id : null,
            message.channel.id,
            message.id,
            message.content,
            new Date()
          ]
        );
      } catch (error) {
        logger.error(`Failed to record AI chat message in database: ${error.message}`);
      }
    }
    
    // Get conversation history if available
    let history = [];
    if (client.db) {
      try {
        const result = await client.db.query(
          'SELECT user_message, ai_response FROM ai_chat_messages WHERE channel_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT 5',
          [message.channel.id, message.author.id]
        );
        
        if (result && result.length > 0) {
          history = result.map(row => ({
            role: 'user',
            content: row.user_message
          })).concat(result.map(row => ({
            role: 'assistant',
            content: row.ai_response
          }))).filter(item => item.content); // Filter out empty messages
        }
      } catch (error) {
        logger.error(`Failed to retrieve conversation history: ${error.message}`);
      }
    }
    
    // Generate AI response
    const response = await aiUtils.generateAIResponse(
      message.content,
      message.author.id,
      message.author.username,
      history
    );
    
    setTimeout(async () => {
      const reply = await message.reply(response);
      
      // Record the AI response in database
      if (client.db) {
        try {
          await client.db.query(
            'UPDATE ai_chat_messages SET ai_response = ?, response_message_id = ? WHERE message_id = ?',
            [response, reply.id, message.id]
          );
        } catch (error) {
          logger.error(`Failed to record AI response in database: ${error.message}`);
        }
      }
    }, 1500); // Simulate thinking time
  } catch (error) {
    logger.error(`Error in AI chat handler: ${error.message}`);
  }
}

/**
 * Handle prefix commands
 * @param {Message} message - The Discord message
 * @param {Client} client - The Discord client
 */
async function handlePrefixCommand(message, client) {
  try {
    const prefix = config.prefix || '!';
    
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Check if command exists in the legacy commands
    if (!client.legacyCommands || !client.legacyCommands.has(commandName)) {
      return;
    }
    
    const command = client.legacyCommands.get(commandName);
    
    // Log command usage
    logger.info(`User ${message.author.tag} used legacy command: ${prefix}${commandName}`);
    
    // Record command usage in database
    if (client.db) {
      try {
        await client.db.query(
          'INSERT INTO legacy_command_usage (user_id, guild_id, command, channel_id, timestamp) VALUES (?, ?, ?, ?, ?)',
          [
            message.author.id,
            message.guild ? message.guild.id : null,
            commandName,
            message.channel.id,
            new Date()
          ]
        );
      } catch (error) {
        logger.error(`Failed to record legacy command usage in database: ${error.message}`);
      }
    }
    
    // Execute the command
    try {
      await command.execute(message, args, client);
    } catch (error) {
      logger.error(`Error executing legacy command ${commandName}: ${error.message}`);
      await message.reply('There was an error executing that command.');
      
      // Record error in database
      if (client.db) {
        try {
          await client.db.query(
            'INSERT INTO legacy_command_errors (user_id, guild_id, command, error_message, timestamp) VALUES (?, ?, ?, ?, ?)',
            [
              message.author.id,
              message.guild ? message.guild.id : null,
              commandName,
              error.message,
              new Date()
            ]
          );
        } catch (dbError) {
          logger.error(`Failed to record legacy command error in database: ${dbError.message}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error in prefix command handler: ${error.message}`);
  }
}

/**
 * Handle keyword triggers in messages
 * @param {Message} message - The Discord message
 * @param {Client} client - The Discord client
 */
async function handleKeywordTriggers(message, client) {
  try {
    if (!config.keywordTriggers || !Array.isArray(config.keywordTriggers)) {
      return;
    }
    
    const lowerContent = message.content.toLowerCase();
    
    for (const trigger of config.keywordTriggers) {
      if (!trigger.keyword || !trigger.response) continue;
      
      // Check if message contains the keyword
      if (lowerContent.includes(trigger.keyword.toLowerCase())) {
        // Check channel restrictions
        if (trigger.channels && trigger.channels.length > 0) {
          if (!trigger.channels.includes(message.channel.id) && 
              !trigger.channels.includes(message.channel.name)) {
            continue;
          }
        }
        
        // Check role restrictions
        if (trigger.requiredRoles && trigger.requiredRoles.length > 0 && message.member) {
          const hasRequiredRole = message.member.roles.cache.some(role => 
            trigger.requiredRoles.includes(role.id) || trigger.requiredRoles.includes(role.name)
          );
          
          if (!hasRequiredRole) {
            continue;
          }
        }
        
        // Send the response
        if (trigger.replyToUser) {
          await message.reply(trigger.response);
        } else {
          await message.channel.send(trigger.response);
        }
        
        // Record trigger in database
        if (client.db) {
          try {
            await client.db.query(
              'INSERT INTO keyword_triggers (user_id, guild_id, channel_id, message_id, keyword, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
              [
                message.author.id,
                message.guild ? message.guild.id : null,
                message.channel.id,
                message.id,
                trigger.keyword,
                new Date()
              ]
            );
          } catch (error) {
            logger.error(`Failed to record keyword trigger in database: ${error.message}`);
          }
        }
        
        // Only trigger once if configured that way
        if (trigger.triggerOnce) {
          break;
        }
      }
    }
  } catch (error) {
    logger.error(`Error in keyword trigger handler: ${error.message}`);
  }
} 