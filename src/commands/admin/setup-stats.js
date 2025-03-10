/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createServerStatsEmbed } = require('../../embeds/server-stats-embed');
const config = require('../../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-stats')
    .setDescription('Set up a server statistics channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to set up as a statistics channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('detailed')
        .setDescription('Whether to include detailed statistics')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('update_interval')
        .setDescription('How often to update the statistics (in minutes)')
        .setMinValue(5)
        .setMaxValue(60)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      const channel = interaction.options.getChannel('channel');
      const detailed = interaction.options.getBoolean('detailed') || false;
      const updateInterval = interaction.options.getInteger('update_interval') || 15; // Default: 15 minutes
      
      // Check if we have permission to send messages in the channel
      const permissions = channel.permissionsFor(interaction.client.user);
      if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
        return interaction.editReply(`I don't have permission to send messages in ${channel}. Please update my permissions and try again.`);
      }
      
      // Gather statistics
      const stats = await this.gatherStatistics(interaction, detailed);
      
      // Create the embed
      const { embed, components } = createServerStatsEmbed({
        ...stats,
        guild: interaction.guild,
        isAuthorized: detailed
      });
      
      // Send the initial message
      const message = await channel.send({ embeds: [embed], components });
      
      // Store the channel and message ID in the database
      try {
        if (interaction.client.db && interaction.client.db.isConnected) {
          // Check if a stats channel is already set up
          const existingChannel = await interaction.client.db.query(
            'SELECT * FROM guild_settings WHERE guild_id = ? AND setting_key = ?',
            [interaction.guild.id, 'stats_channel_id']
          );
          
          if (existingChannel && existingChannel.length > 0) {
            // Update existing settings
            await interaction.client.db.query(
              'UPDATE guild_settings SET setting_value = ? WHERE guild_id = ? AND setting_key = ?',
              [channel.id, interaction.guild.id, 'stats_channel_id']
            );
            
            await interaction.client.db.query(
              'UPDATE guild_settings SET setting_value = ? WHERE guild_id = ? AND setting_key = ?',
              [message.id, interaction.guild.id, 'stats_message_id']
            );
            
            await interaction.client.db.query(
              'UPDATE guild_settings SET setting_value = ? WHERE guild_id = ? AND setting_key = ?',
              [detailed ? '1' : '0', interaction.guild.id, 'stats_detailed']
            );
            
            await interaction.client.db.query(
              'UPDATE guild_settings SET setting_value = ? WHERE guild_id = ? AND setting_key = ?',
              [updateInterval.toString(), interaction.guild.id, 'stats_update_interval']
            );
          } else {
            // Insert new settings
            await interaction.client.db.query(
              'INSERT INTO guild_settings (guild_id, setting_key, setting_value) VALUES (?, ?, ?)',
              [interaction.guild.id, 'stats_channel_id', channel.id]
            );
            
            await interaction.client.db.query(
              'INSERT INTO guild_settings (guild_id, setting_key, setting_value) VALUES (?, ?, ?)',
              [interaction.guild.id, 'stats_message_id', message.id]
            );
            
            await interaction.client.db.query(
              'INSERT INTO guild_settings (guild_id, setting_key, setting_value) VALUES (?, ?, ?)',
              [interaction.guild.id, 'stats_detailed', detailed ? '1' : '0']
            );
            
            await interaction.client.db.query(
              'INSERT INTO guild_settings (guild_id, setting_key, setting_value) VALUES (?, ?, ?)',
              [interaction.guild.id, 'stats_update_interval', updateInterval.toString()]
            );
          }
        }
      } catch (dbError) {
        logger.error(`Error storing stats channel settings: ${dbError.message}`);
      }
      
      // Set up the update interval
      if (!interaction.client.statsUpdateIntervals) {
        interaction.client.statsUpdateIntervals = new Map();
      }
      
      // Clear any existing interval for this guild
      if (interaction.client.statsUpdateIntervals.has(interaction.guild.id)) {
        clearInterval(interaction.client.statsUpdateIntervals.get(interaction.guild.id));
      }
      
      // Set up new interval
      const intervalId = setInterval(async () => {
        try {
          // Fetch the channel and message
          const statsChannel = await interaction.guild.channels.fetch(channel.id).catch(() => null);
          if (!statsChannel) {
            clearInterval(intervalId);
            return;
          }
          
          const statsMessage = await statsChannel.messages.fetch(message.id).catch(() => null);
          if (!statsMessage) {
            clearInterval(intervalId);
            return;
          }
          
          // Gather fresh statistics
          const updatedStats = await this.gatherStatistics(interaction, detailed);
          
          // Create updated embed
          const { embed: updatedEmbed } = createServerStatsEmbed({
            ...updatedStats,
            guild: interaction.guild,
            isAuthorized: detailed
          });
          
          // Update the message
          await statsMessage.edit({ embeds: [updatedEmbed], components });
          
          logger.debug(`Updated stats for guild ${interaction.guild.id}`);
        } catch (error) {
          logger.error(`Error updating stats: ${error.message}`);
        }
      }, updateInterval * 60 * 1000); // Convert minutes to milliseconds
      
      // Store the interval ID
      interaction.client.statsUpdateIntervals.set(interaction.guild.id, intervalId);
      
      await interaction.editReply(`Server statistics channel has been set up in ${channel}. The statistics will update every ${updateInterval} minutes.`);
      
    } catch (error) {
      logger.error(`Error executing setup-stats command: ${error.message}`);
      if (interaction.deferred) {
        await interaction.editReply({ content: 'An error occurred while setting up the statistics channel.' });
      } else {
        await interaction.reply({ content: 'An error occurred while setting up the statistics channel.', ephemeral: true });
      }
    }
  },
  
  /**
   * Gather statistics from various sources
   * @param {CommandInteraction} interaction - The interaction
   * @param {boolean} isAuthorized - Whether detailed stats are authorized
   * @returns {Object} - Statistics object
   */
  async gatherStatistics(interaction, isAuthorized) {
    const guild = interaction.guild;
    const client = interaction.client;
    
    // Member statistics
    const members = {
      total: guild.memberCount,
      humans: guild.members.cache.filter(member => !member.user.bot).size,
      bots: guild.members.cache.filter(member => member.user.bot).size,
      online: guild.members.cache.filter(member => member.presence?.status === 'online' || member.presence?.status === 'idle' || member.presence?.status === 'dnd').size,
      newToday: guild.members.cache.filter(member => {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        return member.joinedAt > oneDayAgo;
      }).size
    };
    
    // Try to get server statistics from the game servers module
    let servers = {
      total: 0,
      active: 0,
      suspended: 0,
      cpuUsage: 0,
      ramUsage: 0
    };
    
    if (client.gameServers && client.gameServers.isInitialized) {
      try {
        const serverStats = await client.gameServers.getServerStats();
        if (serverStats) {
          servers = {
            total: serverStats.total || 0,
            active: serverStats.active || 0,
            suspended: serverStats.suspended || 0,
            cpuUsage: serverStats.cpuUsage || 0,
            ramUsage: serverStats.ramUsage || 0
          };
        }
      } catch (error) {
        logger.error(`Error fetching server stats: ${error.message}`);
      }
    }
    
    // Try to get node statistics
    let nodes = {
      total: 0,
      online: 0,
      offline: 0,
      averageLoad: 0,
      totalStorage: '0 GB'
    };
    
    if (client.gameServers && client.gameServers.isInitialized) {
      try {
        const nodeStats = await client.gameServers.getNodeStats();
        if (nodeStats) {
          nodes = {
            total: nodeStats.total || 0,
            online: nodeStats.online || 0,
            offline: nodeStats.offline || 0,
            averageLoad: nodeStats.averageLoad || 0,
            totalStorage: nodeStats.totalStorage || '0 GB'
          };
        }
      } catch (error) {
        logger.error(`Error fetching node stats: ${error.message}`);
      }
    }
    
    // Try to get customer statistics
    let customers = {
      total: 0,
      active: 0,
      newThisMonth: 0,
      supportTickets: 0,
      satisfactionRate: 0
    };
    
    // Try to get ticket statistics
    if (client.tickets) {
      try {
        const ticketStats = await client.tickets.getTicketStats();
        if (ticketStats) {
          customers.supportTickets = ticketStats.activeTickets || 0;
        }
      } catch (error) {
        logger.error(`Error fetching ticket stats: ${error.message}`);
      }
    }
    
    // System status
    const system = {
      apiStatus: true,
      databaseStatus: client.db && client.db.isConnected,
      websiteStatus: true,
      gamePanelStatus: client.gameServers && client.gameServers.isInitialized,
      billingStatus: true
    };
    
    // Financial statistics (only if authorized)
    let financial = null;
    if (isAuthorized) {
      financial = {
        monthlyRevenue: 0,
        annualRevenue: 0,
        averageOrder: 0,
        activeSubscriptions: 0,
        renewalRate: 0
      };
      
      // This would be populated from a real financial system
    }
    
    return {
      members,
      servers,
      nodes,
      customers,
      system,
      financial
    };
  }
}; 