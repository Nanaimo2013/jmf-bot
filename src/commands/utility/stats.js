/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createServerStatsEmbed } = require('../../embeds/server-stats-embed');
const config = require('../../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Display JMF Hosting statistics')
    .addBooleanOption(option =>
      option.setName('ephemeral')
        .setDescription('Whether to show the stats only to you (default: false)')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('detailed')
        .setDescription('Whether to show detailed statistics (requires permission)')
        .setRequired(false)),

  async execute(interaction) {
    try {
      const ephemeral = interaction.options.getBoolean('ephemeral') || false;
      const detailed = interaction.options.getBoolean('detailed') || false;
      
      await interaction.deferReply({ ephemeral });
      
      // Check if user has permission for detailed stats
      const hasDetailedPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                                   (config.roles?.statsAccessRole && interaction.member.roles.cache.has(config.roles.statsAccessRole));
      
      const isAuthorized = detailed ? hasDetailedPermission : true;
      
      // Gather statistics
      const stats = await this.gatherStatistics(interaction, isAuthorized);
      
      // Create the embed
      const { embed, components } = createServerStatsEmbed({
        ...stats,
        guild: interaction.guild,
        isAuthorized
      });
      
      const message = await interaction.editReply({ 
        embeds: [embed], 
        components: components 
      });
      
      // Set up collector for refresh button
      if (!ephemeral) {
        const filter = i => i.customId === 'refresh_stats' && i.user.id === interaction.user.id;
        const collector = message.createMessageComponentCollector({ filter, time: 600000 }); // 10 minutes
        
        collector.on('collect', async i => {
          try {
            await i.deferUpdate();
            
            // Gather fresh statistics
            const updatedStats = await this.gatherStatistics(interaction, isAuthorized);
            
            // Create updated embed
            const { embed: updatedEmbed } = createServerStatsEmbed({
              ...updatedStats,
              guild: interaction.guild,
              isAuthorized
            });
            
            await i.editReply({ embeds: [updatedEmbed], components });
          } catch (error) {
            logger.error(`Error refreshing stats: ${error.message}`);
          }
        });
        
        collector.on('end', () => {
          // Remove buttons when collector ends
          interaction.editReply({ components: [] }).catch(() => {});
        });
      }
      
    } catch (error) {
      logger.error(`Error executing stats command: ${error.message}`);
      if (interaction.deferred) {
        await interaction.editReply({ content: 'An error occurred while fetching statistics.' });
      } else {
        await interaction.reply({ content: 'An error occurred while fetching statistics.', ephemeral: true });
      }
    }
  },
  
  /**
   * Gather statistics from various sources
   * @param {CommandInteraction} interaction - The interaction
   * @param {boolean} isAuthorized - Whether the user is authorized for detailed stats
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