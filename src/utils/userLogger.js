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
const fs = require('fs/promises');
const path = require('path');
const logger = require('./logger');
const config = require('../../config.json');

class UserLogger {
  constructor() {
    this.userDataPath = path.join(__dirname, '../../data/users');
    this.logsChannelId = config.channels?.logs || null;
    this.joinLeaveChannelId = config.channels?.joinLeave || null;
    this.moderationLogsChannelId = config.channels?.moderationLogs || null;
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.userDataPath, { recursive: true });
      logger.info('User data directory initialized');
    } catch (error) {
      logger.error(`Failed to initialize user data directory: ${error.message}`);
    }
  }

  /**
   * Get the file path for a user's case file
   * @param {string} userId - The user's ID
   * @returns {string} The file path
   */
  getUserFilePath(userId) {
    return path.join(this.userDataPath, `${userId}.json`);
  }

  /**
   * Get a user's case file data
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} The user data
   */
  async getUserData(userId) {
    try {
      const filePath = this.getUserFilePath(userId);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, return default structure
      if (error.code === 'ENOENT') {
        return {
          userId,
          username: null,
          joinedAt: null,
          leftAt: [],
          warnings: [],
          bans: [],
          kicks: [],
          mutes: [],
          notes: [],
          tickets: [],
          roles: [],
          lastSeen: null,
          totalMessages: 0,
          createdAt: new Date().toISOString()
        };
      }
      
      logger.error(`Failed to read user data for ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save a user's case file data
   * @param {string} userId - The user's ID
   * @param {Object} userData - The user data to save
   * @returns {Promise<void>}
   */
  async saveUserData(userId, userData) {
    try {
      const filePath = this.getUserFilePath(userId);
      await fs.writeFile(filePath, JSON.stringify(userData, null, 2), 'utf8');
    } catch (error) {
      logger.error(`Failed to save user data for ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log a user join event
   * @param {Object} member - The GuildMember object
   * @returns {Promise<void>}
   */
  async logJoin(member, client) {
    try {
      // Update user data
      const userData = await this.getUserData(member.id);
      userData.username = member.user.tag;
      userData.joinedAt = new Date().toISOString();
      userData.lastSeen = new Date().toISOString();
      
      // Save current roles if any
      if (member.roles && member.roles.cache.size > 0) {
        userData.roles = Array.from(member.roles.cache.values())
          .filter(role => role.name !== '@everyone')
          .map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor
          }));
      }
      
      await this.saveUserData(member.id, userData);
      
      // Send log to join/leave channel
      if (this.joinLeaveChannelId && client) {
        const channel = await client.channels.fetch(this.joinLeaveChannelId).catch(() => null);
        if (channel) {
          const joinEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Member Joined')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: 'User', value: `${member.user.tag} (${member.id})`, inline: false },
              { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)`, inline: false },
              { name: 'Member Count', value: `${member.guild.memberCount}`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: config.footerText });
          
          await channel.send({ embeds: [joinEmbed] });
        }
      }
      
      logger.info(`User ${member.user.tag} (${member.id}) joined the server`);
    } catch (error) {
      logger.error(`Failed to log join for ${member.id}: ${error.message}`);
    }
  }

  /**
   * Log a user leaving the server
   * @param {GuildMember} member - The member who left
   * @param {Client} client - The Discord client
   * @param {Object} options - Options for logging
   * @param {boolean} options.skipMessage - Whether to skip sending a message
   */
  async logLeave(member, client, options = {}) {
    try {
      // Update user data
      const userData = await this.getUserData(member.id);
      userData.leftAt.push(new Date().toISOString());
      userData.lastSeen = new Date().toISOString();
      
      // Save current roles if any
      if (member.roles && member.roles.cache.size > 0) {
        userData.roles = Array.from(member.roles.cache.values())
          .filter(role => role.name !== '@everyone')
          .map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor
          }));
      }
      
      await this.saveUserData(member.id, userData);
      
      // Send log to join/leave channel if not skipped
      if (!options.skipMessage && this.joinLeaveChannelId && client) {
        const channel = await client.channels.fetch(this.joinLeaveChannelId).catch(() => null);
        if (channel) {
          const leaveEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Member Left')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: 'User', value: `${member.user.tag} (${member.id})`, inline: false },
              { name: 'Joined At', value: userData.joinedAt ? `<t:${Math.floor(new Date(userData.joinedAt).getTime() / 1000)}:F> (<t:${Math.floor(new Date(userData.joinedAt).getTime() / 1000)}:R>)` : 'Unknown', inline: false },
              { name: 'Roles', value: userData.roles.length > 0 ? userData.roles.map(r => `<@&${r.id}>`).join(', ') : 'None', inline: false },
              { name: 'Member Count', value: `${member.guild.memberCount}`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: config.footerText });
          
          await channel.send({ embeds: [leaveEmbed] });
        }
      }
      
      logger.info(`User ${member.user.tag} (${member.id}) left the server`);
    } catch (error) {
      logger.error(`Failed to log leave for ${member.id}: ${error.message}`);
    }
  }

  /**
   * Log a warning
   * @param {Object} user - The User object
   * @param {Object} moderator - The User object of the moderator
   * @param {string} reason - The reason for the warning
   * @returns {Promise<Object>} The warning data
   */
  async logWarning(user, moderator, reason, client) {
    try {
      const userData = await this.getUserData(user.id);
      
      const warning = {
        id: userData.warnings.length + 1,
        reason,
        moderatorId: moderator.id,
        moderatorTag: moderator.tag,
        timestamp: new Date().toISOString()
      };
      
      userData.warnings.push(warning);
      userData.lastSeen = new Date().toISOString();
      
      await this.saveUserData(user.id, userData);
      
      // Send log to moderation logs channel
      if (this.moderationLogsChannelId && client) {
        const channel = await client.channels.fetch(this.moderationLogsChannelId).catch(() => null);
        if (channel) {
          const warnEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`Warning #${warning.id}`)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: false },
              { name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: false },
              { name: 'Reason', value: reason || 'No reason provided', inline: false },
              { name: 'Total Warnings', value: `${userData.warnings.length}`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: config.footerText });
          
          await channel.send({ embeds: [warnEmbed] });
        }
      }
      
      logger.info(`User ${user.tag} (${user.id}) was warned by ${moderator.tag} (${moderator.id}) for: ${reason}`);
      return warning;
    } catch (error) {
      logger.error(`Failed to log warning for ${user.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log a ban
   * @param {Object} user - The User object
   * @param {Object} moderator - The User object of the moderator
   * @param {string} reason - The reason for the ban
   * @param {number} days - The number of days of messages to delete
   * @returns {Promise<Object>} The ban data
   */
  async logBan(user, moderator, reason, days, client) {
    try {
      const userData = await this.getUserData(user.id);
      
      const ban = {
        id: userData.bans.length + 1,
        reason,
        moderatorId: moderator.id,
        moderatorTag: moderator.tag,
        timestamp: new Date().toISOString(),
        days
      };
      
      userData.bans.push(ban);
      userData.lastSeen = new Date().toISOString();
      
      await this.saveUserData(user.id, userData);
      
      // Send log to moderation logs channel
      if (this.moderationLogsChannelId && client) {
        const channel = await client.channels.fetch(this.moderationLogsChannelId).catch(() => null);
        if (channel) {
          const banEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`Ban #${ban.id}`)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: false },
              { name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: false },
              { name: 'Reason', value: reason || 'No reason provided', inline: false },
              { name: 'Message Deletion', value: `${days} days`, inline: false },
              { name: 'Total Bans', value: `${userData.bans.length}`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: config.footerText });
          
          await channel.send({ embeds: [banEmbed] });
        }
      }
      
      logger.info(`User ${user.tag} (${user.id}) was banned by ${moderator.tag} (${moderator.id}) for: ${reason}`);
      return ban;
    } catch (error) {
      logger.error(`Failed to log ban for ${user.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log a kick
   * @param {Object} user - The User object
   * @param {Object} moderator - The User object of the moderator
   * @param {string} reason - The reason for the kick
   * @returns {Promise<Object>} The kick data
   */
  async logKick(user, moderator, reason, client) {
    try {
      const userData = await this.getUserData(user.id);
      
      const kick = {
        id: userData.kicks.length + 1,
        reason,
        moderatorId: moderator.id,
        moderatorTag: moderator.tag,
        timestamp: new Date().toISOString()
      };
      
      userData.kicks.push(kick);
      userData.lastSeen = new Date().toISOString();
      
      await this.saveUserData(user.id, userData);
      
      // Send log to moderation logs channel
      if (this.moderationLogsChannelId && client) {
        const channel = await client.channels.fetch(this.moderationLogsChannelId).catch(() => null);
        if (channel) {
          const kickEmbed = new EmbedBuilder()
            .setColor('#FF7F00')
            .setTitle(`Kick #${kick.id}`)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: false },
              { name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: false },
              { name: 'Reason', value: reason || 'No reason provided', inline: false },
              { name: 'Total Kicks', value: `${userData.kicks.length}`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: config.footerText });
          
          await channel.send({ embeds: [kickEmbed] });
        }
      }
      
      logger.info(`User ${user.tag} (${user.id}) was kicked by ${moderator.tag} (${moderator.id}) for: ${reason}`);
      return kick;
    } catch (error) {
      logger.error(`Failed to log kick for ${user.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log a mute/timeout
   * @param {Object} user - The User object
   * @param {Object} moderator - The User object of the moderator
   * @param {string} reason - The reason for the mute
   * @param {number} duration - The duration in milliseconds
   * @returns {Promise<Object>} The mute data
   */
  async logMute(user, moderator, reason, duration, client) {
    try {
      const userData = await this.getUserData(user.id);
      
      const mute = {
        id: userData.mutes.length + 1,
        reason,
        moderatorId: moderator.id,
        moderatorTag: moderator.tag,
        timestamp: new Date().toISOString(),
        duration,
        expiresAt: new Date(Date.now() + duration).toISOString()
      };
      
      userData.mutes.push(mute);
      userData.lastSeen = new Date().toISOString();
      
      await this.saveUserData(user.id, userData);
      
      // Send log to moderation logs channel
      if (this.moderationLogsChannelId && client) {
        const channel = await client.channels.fetch(this.moderationLogsChannelId).catch(() => null);
        if (channel) {
          const muteEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle(`Timeout #${mute.id}`)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: false },
              { name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: false },
              { name: 'Reason', value: reason || 'No reason provided', inline: false },
              { name: 'Duration', value: this.formatDuration(duration), inline: false },
              { name: 'Expires', value: `<t:${Math.floor(new Date(mute.expiresAt).getTime() / 1000)}:F> (<t:${Math.floor(new Date(mute.expiresAt).getTime() / 1000)}:R>)`, inline: false },
              { name: 'Total Timeouts', value: `${userData.mutes.length}`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: config.footerText });
          
          await channel.send({ embeds: [muteEmbed] });
        }
      }
      
      logger.info(`User ${user.tag} (${user.id}) was timed out by ${moderator.tag} (${moderator.id}) for ${this.formatDuration(duration)}: ${reason}`);
      return mute;
    } catch (error) {
      logger.error(`Failed to log mute for ${user.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log a note about a user
   * @param {Object} user - The User object
   * @param {Object} moderator - The User object of the moderator
   * @param {string} content - The note content
   * @returns {Promise<Object>} The note data
   */
  async logNote(user, moderator, content, client) {
    try {
      const userData = await this.getUserData(user.id);
      
      const note = {
        id: userData.notes.length + 1,
        content,
        moderatorId: moderator.id,
        moderatorTag: moderator.tag,
        timestamp: new Date().toISOString()
      };
      
      userData.notes.push(note);
      
      await this.saveUserData(user.id, userData);
      
      // Send log to moderation logs channel
      if (this.moderationLogsChannelId && client) {
        const channel = await client.channels.fetch(this.moderationLogsChannelId).catch(() => null);
        if (channel) {
          const noteEmbed = new EmbedBuilder()
            .setColor('#00FFFF')
            .setTitle(`User Note #${note.id}`)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: false },
              { name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: false },
              { name: 'Note', value: content, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: config.footerText });
          
          await channel.send({ embeds: [noteEmbed] });
        }
      }
      
      logger.info(`Note added to ${user.tag} (${user.id}) by ${moderator.tag} (${moderator.id}): ${content}`);
      return note;
    } catch (error) {
      logger.error(`Failed to log note for ${user.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log a message
   * @param {Object} message - The Message object
   * @returns {Promise<void>}
   */
  async logMessage(message) {
    if (message.author.bot) return;
    
    try {
      const userData = await this.getUserData(message.author.id);
      userData.totalMessages += 1;
      userData.lastSeen = new Date().toISOString();
      await this.saveUserData(message.author.id, userData);
    } catch (error) {
      logger.error(`Failed to log message for ${message.author.id}: ${error.message}`);
    }
  }

  /**
   * Log a ticket creation
   * @param {Object} user - The User object
   * @param {string} ticketId - The ticket ID
   * @param {string} reason - The reason for the ticket
   * @returns {Promise<void>}
   */
  async logTicket(user, ticketId, reason) {
    try {
      const userData = await this.getUserData(user.id);
      
      const ticket = {
        id: ticketId,
        reason,
        timestamp: new Date().toISOString(),
        status: 'open'
      };
      
      userData.tickets.push(ticket);
      userData.lastSeen = new Date().toISOString();
      
      await this.saveUserData(user.id, userData);
      logger.info(`Ticket ${ticketId} created by ${user.tag} (${user.id}) for: ${reason}`);
    } catch (error) {
      logger.error(`Failed to log ticket for ${user.id}: ${error.message}`);
    }
  }

  /**
   * Update a ticket status
   * @param {string} userId - The user's ID
   * @param {string} ticketId - The ticket ID
   * @param {string} status - The new status
   * @returns {Promise<void>}
   */
  async updateTicketStatus(userId, ticketId, status) {
    try {
      const userData = await this.getUserData(userId);
      
      const ticket = userData.tickets.find(t => t.id === ticketId);
      if (ticket) {
        ticket.status = status;
        ticket.closedAt = status === 'closed' ? new Date().toISOString() : undefined;
        
        await this.saveUserData(userId, userData);
        logger.info(`Ticket ${ticketId} for user ${userId} updated to status: ${status}`);
      }
    } catch (error) {
      logger.error(`Failed to update ticket status for ${userId}: ${error.message}`);
    }
  }

  /**
   * Format a duration in milliseconds to a human-readable string
   * @param {number} ms - The duration in milliseconds
   * @returns {string} The formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  /**
   * Get a user's case file as an embed
   * @param {Object} user - The User object
   * @returns {Promise<Object>} The embed
   */
  async getUserCaseFile(user) {
    try {
      const userData = await this.getUserData(user.id);
      
      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`User Case File: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User ID', value: user.id, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
          { name: 'Joined Server', value: userData.joinedAt ? `<t:${Math.floor(new Date(userData.joinedAt).getTime() / 1000)}:F>` : 'Unknown', inline: true },
          { name: 'Last Seen', value: userData.lastSeen ? `<t:${Math.floor(new Date(userData.lastSeen).getTime() / 1000)}:R>` : 'Unknown', inline: true },
          { name: 'Total Messages', value: userData.totalMessages.toString(), inline: true },
          { name: 'Warnings', value: userData.warnings.length.toString(), inline: true },
          { name: 'Bans', value: userData.bans.length.toString(), inline: true },
          { name: 'Kicks', value: userData.kicks.length.toString(), inline: true },
          { name: 'Timeouts', value: userData.mutes.length.toString(), inline: true },
          { name: 'Notes', value: userData.notes.length.toString(), inline: true },
          { name: 'Tickets', value: userData.tickets.length.toString(), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      // Add recent warnings if any
      if (userData.warnings.length > 0) {
        const recentWarnings = userData.warnings.slice(-3).reverse();
        let warningsText = '';
        
        recentWarnings.forEach(warning => {
          const date = new Date(warning.timestamp);
          warningsText += `**#${warning.id}** - <t:${Math.floor(date.getTime() / 1000)}:F>\n`;
          warningsText += `Reason: ${warning.reason}\n`;
          warningsText += `Moderator: ${warning.moderatorTag}\n\n`;
        });
        
        if (userData.warnings.length > 3) {
          warningsText += `*And ${userData.warnings.length - 3} more...*`;
        }
        
        embed.addFields({ name: 'Recent Warnings', value: warningsText || 'None', inline: false });
      }
      
      // Add recent notes if any
      if (userData.notes.length > 0) {
        const recentNotes = userData.notes.slice(-2).reverse();
        let notesText = '';
        
        recentNotes.forEach(note => {
          const date = new Date(note.timestamp);
          notesText += `**#${note.id}** - <t:${Math.floor(date.getTime() / 1000)}:F>\n`;
          notesText += `${note.content}\n`;
          notesText += `By: ${note.moderatorTag}\n\n`;
        });
        
        if (userData.notes.length > 2) {
          notesText += `*And ${userData.notes.length - 2} more...*`;
        }
        
        embed.addFields({ name: 'Recent Notes', value: notesText || 'None', inline: false });
      }
      
      return embed;
    } catch (error) {
      logger.error(`Failed to get case file for ${user.id}: ${error.message}`);
      throw error;
    }
  }
}

// Export a singleton instance
const userLogger = new UserLogger();
module.exports = userLogger; 