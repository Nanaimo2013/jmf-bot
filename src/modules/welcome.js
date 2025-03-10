/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const logger = require('../utils/logger');

/**
 * Welcome module for handling new member joins and leaves
 */
module.exports = {
  name: 'welcome',
  
  /**
   * Initialize the welcome module
   * @param {Client} client - The Discord.js client
   */
  init(client) {
    logger.info('Welcome module initialized');
    
    // NOTE: This module is currently disabled to prevent duplicate welcome/leave messages.
    // The welcome and leave messages are now handled by the guildMemberAdd and guildMemberRemove events.
    
    // Uncomment the code below to re-enable this module if needed
    /*
    // Handle new member joins
    client.on('guildMemberAdd', async (member) => {
      try {
        await this.handleNewMember(member);
      } catch (error) {
        logger.error(`Error handling new member: ${error.message}`);
      }
    });

    // Handle member leaves
    client.on('guildMemberRemove', async (member) => {
      try {
        await this.handleMemberLeave(member);
      } catch (error) {
        logger.error(`Error handling member leave: ${error.message}`);
      }
    });
    */

    // Keep ban handling active as it's not duplicated elsewhere
    client.on('guildBanAdd', async (ban) => {
      try {
        await this.handleMemberBan(ban);
      } catch (error) {
        logger.error(`Error handling member ban: ${error.message}`);
      }
    });
  },

  /**
   * Handle a new member joining
   * @param {GuildMember} member - The member that joined
   */
  async handleNewMember(member) {
    // Check if member is a bot
    if (member.user.bot) {
      const botRole = member.guild.roles.cache.find(role => role.name === config.roles.bot);
      if (botRole) {
        await member.roles.add(botRole);
        logger.debug(`Assigned Bot role to new bot: ${member.user.tag}`);
      }
      return;
    }

    // Assign the unverified role
    const unverifiedRole = member.guild.roles.cache.find(role => role.name === config.roles.unverified);
    if (unverifiedRole) {
      await member.roles.add(unverifiedRole);
      logger.debug(`Assigned Unverified role to new member: ${member.user.tag}`);
    } else {
      logger.warn(`Unverified role not found for guild: ${member.guild.name}`);
    }
    
    // Send welcome messages
    await this.sendWelcomeMessages(member);
    
    // Log the join in the join/leave channel
    const joinLeaveChannel = member.guild.channels.cache.find(
      channel => channel.name === config.channels.joinLeave && channel.type === ChannelType.GuildText
    );

    if (joinLeaveChannel) {
      const joinEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setAuthor({ name: 'Member Joined', iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`${member.toString()} joined the server`)
        .addFields(
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Member Count', value: member.guild.memberCount.toString(), inline: true },
          { name: 'Account Age', value: this.getAccountAge(member.user.createdTimestamp), inline: true }
        )
        .setTimestamp();

      await joinLeaveChannel.send({ embeds: [joinEmbed] });
    }

    // Check for raid protection
    await this.checkRaidProtection(member);
  },

  /**
   * Send welcome messages to the welcome channel and DM
   * @param {GuildMember} member - The new member
   */
  async sendWelcomeMessages(member) {
    // Send welcome message to the welcome channel
    const welcomeChannel = member.guild.channels.cache.find(
      channel => channel.name === config.channels.welcome && channel.type === ChannelType.GuildText
    );
    
    if (welcomeChannel) {
      const welcomeEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`Welcome to JMF Hosting!`)
        .setDescription(config.welcomeMessage?.replace('{user}', member.toString()) || `Welcome ${member.toString()} to JMF Hosting!`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '📜 Rules', value: 'Please read our server rules to ensure a positive experience for everyone.' },
          { name: '✅ Verification', value: 'React to the message in the verification channel to gain access to the server.' },
          { name: '🎮 Game Servers', value: 'We offer hosting for Minecraft, Rust, ARK, and more!' },
          { name: '🎫 Support', value: 'Need help? Create a ticket in our support channel!' },
          { name: '🎯 Getting Started', value: 'Check out our tutorials and guides to get started with our services.' }
        )
        .setImage('https://i.imgur.com/XaFYhoO.png')
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      await welcomeChannel.send({ embeds: [welcomeEmbed] });
      logger.debug(`Sent welcome message for new member: ${member.user.tag}`);
    }

    // Send DM to new member
    try {
      const verificationChannel = member.guild.channels.cache.find(
        channel => channel.name === config.channels.verification
      );
      const rulesChannel = member.guild.channels.cache.find(
        channel => channel.name === 'rules'
      );
      const ticketChannel = member.guild.channels.cache.find(
        channel => channel.name === config.channels.createTicket
      );

      const dmEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('Welcome to JMF Hosting!')
        .setDescription([
          `Hi ${member.user.username}! Welcome to the JMF Hosting Discord server.`,
          '',
          '**To get started:**',
          `1️⃣ Read our rules in ${rulesChannel ? rulesChannel.toString() : '#rules'}`,
          `2️⃣ Verify yourself in ${verificationChannel ? verificationChannel.toString() : '#verification'}`,
          '3️⃣ Check out our services and special offers',
          '4️⃣ Join our community events and giveaways',
          '',
          'Need help? Our support team is available 24/7!',
          `Simply create a ticket in ${ticketChannel ? ticketChannel.toString() : '#create-ticket'}`
        ].join('\n'))
        .addFields(
          { name: '🌟 Premium Features', value: 'Check out our premium tiers for exclusive benefits!' },
          { name: '🎮 Game Servers', value: 'We support a wide range of popular games with high-performance servers.' },
          { name: '💎 New Member Offer', value: 'Use code `WELCOME` for 10% off your first month!' }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      await member.send({ embeds: [dmEmbed] });
      logger.debug(`Sent welcome DM to new member: ${member.user.tag}`);
    } catch (error) {
      logger.warn(`Could not send DM to new member: ${member.user.tag}. Error: ${error.message}`);
    }
  },

  /**
   * Handle a member leaving
   * @param {GuildMember} member - The member that left
   */
  async handleMemberLeave(member) {
    const joinLeaveChannel = member.guild.channels.cache.find(
      channel => channel.name === config.channels.joinLeave && channel.type === ChannelType.GuildText
    );

    if (joinLeaveChannel) {
      const roles = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => role.name)
        .join(', ');

      const leaveEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setAuthor({ name: 'Member Left', iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`${member.user.tag} left the server`)
        .addFields(
          { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
          { name: 'Member Count', value: member.guild.memberCount.toString(), inline: true },
          { name: 'Roles', value: roles || 'None', inline: false }
        )
        .setTimestamp();

      await joinLeaveChannel.send({ embeds: [leaveEmbed] });
    }
  },

  /**
   * Handle a member being banned
   * @param {GuildBan} ban - The ban information
   */
  async handleMemberBan(ban) {
    const modLogsChannel = ban.guild.channels.cache.find(
      channel => channel.name === config.channels.moderationLogs
    );

    if (modLogsChannel) {
      const banEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setAuthor({ name: 'Member Banned', iconURL: ban.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`${ban.user.tag} was banned from the server`)
        .addFields(
          { name: 'Reason', value: ban.reason || 'No reason provided' }
        )
        .setTimestamp();

      await modLogsChannel.send({ embeds: [banEmbed] });
    }
  },

  /**
   * Get formatted account age string
   * @param {number} timestamp - Account creation timestamp
   * @returns {string} Formatted age string
   */
  getAccountAge(timestamp) {
    const age = Date.now() - timestamp;
    const days = Math.floor(age / (1000 * 60 * 60 * 24));
    return `${days} days old`;
  },

  /**
   * Check for potential raid based on join patterns
   * @param {GuildMember} member - The new member
   */
  async checkRaidProtection(member) {
    const RAID_THRESHOLD = 10; // Number of joins within time window to trigger alert
    const TIME_WINDOW = 60000; // Time window in milliseconds (1 minute)
    
    const recentJoins = member.guild.members.cache
      .filter(m => (Date.now() - m.joinedTimestamp) < TIME_WINDOW)
      .size;

    if (recentJoins >= RAID_THRESHOLD) {
      const modLogsChannel = member.guild.channels.cache.find(
        channel => channel.name === config.channels.moderationLogs
      );

      if (modLogsChannel) {
        const alertEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('⚠️ Potential Raid Detected')
          .setDescription(`${recentJoins} members joined in the last minute`)
          .setTimestamp();

        await modLogsChannel.send({ 
          content: `<@&${member.guild.roles.cache.find(r => r.name === config.roles.moderator)?.id}>`,
          embeds: [alertEmbed]
        });
      }
    }
  }
};