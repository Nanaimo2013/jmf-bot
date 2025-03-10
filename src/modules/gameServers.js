/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const logger = require('../utils/logger');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/**
 * Game server integration module for JMF Hosting
 */
module.exports = {
  name: 'gameServers',
  
  /**
   * Initialize the game server module
   * @param {Client} client - The Discord.js client
   */
  init(client) {
    logger.info('Game server module initialized');
    
    // Set up interval to update server status
    setInterval(() => {
      this.updateServerStatus(client);
    }, config.gameServers.updateInterval * 1000);
    
    // Handle button interactions for game servers
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      
      // Handle server actions
      if (interaction.customId.startsWith('server_')) {
        const [, action, serverId] = interaction.customId.split('_');
        
        switch (action) {
          case 'start':
            await this.startServer(interaction, serverId);
            break;
          case 'stop':
            await this.stopServer(interaction, serverId);
            break;
          case 'restart':
            await this.restartServer(interaction, serverId);
            break;
          case 'details':
            await this.showServerDetails(interaction, serverId);
            break;
        }
      }
    });
  },
  
  /**
   * Update the server status in the designated channel
   * @param {Client} client - The Discord.js client
   */
  async updateServerStatus(client) {
    try {
      // Get all servers from Pterodactyl
      const servers = await this.fetchAllServers();
      
      if (!servers || !servers.data) {
        logger.error('Failed to fetch servers from Pterodactyl API');
        return;
      }
      
      // Find the status channel in all guilds
      client.guilds.cache.forEach(async (guild) => {
        const statusChannel = guild.channels.cache.find(
          channel => channel.name === config.gameServers.statusChannel && channel.type === 0
        );
        
        if (!statusChannel) return;
        
        try {
          // Clear existing messages
          const messages = await statusChannel.messages.fetch({ limit: 10 });
          if (messages.size > 0) {
            await statusChannel.bulkDelete(messages);
          }
          
          // Create server status embed
          const statusEmbed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle('JMF Hosting Game Servers Status')
            .setDescription('Current status of all game servers. Click the buttons to manage servers.')
            .setTimestamp()
            .setFooter({ text: config.footerText });
          
          // Group servers by game type
          const gameTypes = {};
          
          servers.data.forEach(server => {
            const gameType = this.determineGameType(server.attributes.description);
            if (!gameTypes[gameType]) {
              gameTypes[gameType] = [];
            }
            gameTypes[gameType].push(server);
          });
          
          // Add fields for each game type
          for (const [gameType, gameServers] of Object.entries(gameTypes)) {
            let serverList = '';
            
            gameServers.forEach(server => {
              const status = server.attributes.status;
              const statusEmoji = this.getStatusEmoji(status);
              const playerCount = server.attributes.relationships?.allocations?.data?.[0]?.attributes?.current_state === 'running' 
                ? `(${server.attributes.relationships?.allocations?.data?.[0]?.attributes?.current_state?.players || 0}/${server.attributes.relationships?.allocations?.data?.[0]?.attributes?.current_state?.maxPlayers || 0})` 
                : '';
              
              serverList += `${statusEmoji} **${server.attributes.name}** ${playerCount}\n`;
            });
            
            statusEmbed.addFields({ name: `${gameType} Servers`, value: serverList || 'No servers available', inline: false });
          }
          
          // Send the status embed
          const message = await statusChannel.send({ embeds: [statusEmbed] });
          
          // Create server control buttons for each server
          for (const server of servers.data) {
            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`server_details_${server.attributes.id}`)
                  .setLabel(`${server.attributes.name} Details`)
                  .setStyle(ButtonStyle.Primary)
              );
            
            await statusChannel.send({ components: [row] });
          }
          
          logger.info(`Updated server status in guild: ${guild.name}`);
        } catch (error) {
          logger.error(`Error updating server status in guild ${guild.name}: ${error.message}`);
        }
      });
    } catch (error) {
      logger.error(`Error in updateServerStatus: ${error.message}`);
    }
  },
  
  /**
   * Start a game server
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} serverId - The server ID
   */
  async startServer(interaction, serverId) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check if user has permission
      if (!this.hasServerPermission(interaction.member)) {
        await interaction.editReply({ content: 'You do not have permission to start servers.' });
        return;
      }
      
      // Send start signal to Pterodactyl
      const response = await fetch(`${process.env.PTERODACTYL_API_URL}/servers/${serverId}/power`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ signal: 'start' })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || 'Unknown error'}`);
      }
      
      // Get server details
      const server = await this.fetchServer(serverId);
      
      // Send confirmation
      await interaction.editReply({ content: `✅ Started server: ${server.attributes.name}` });
      logger.info(`User ${interaction.user.tag} started server ${server.attributes.name}`);
      
      // Update server status
      setTimeout(() => {
        this.updateServerStatus(interaction.client);
      }, 5000);
    } catch (error) {
      logger.error(`Error starting server: ${error.message}`);
      await interaction.editReply({ content: `❌ Error starting server: ${error.message}` });
    }
  },
  
  /**
   * Stop a game server
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} serverId - The server ID
   */
  async stopServer(interaction, serverId) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check if user has permission
      if (!this.hasServerPermission(interaction.member)) {
        await interaction.editReply({ content: 'You do not have permission to stop servers.' });
        return;
      }
      
      // Send stop signal to Pterodactyl
      const response = await fetch(`${process.env.PTERODACTYL_API_URL}/servers/${serverId}/power`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ signal: 'stop' })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || 'Unknown error'}`);
      }
      
      // Get server details
      const server = await this.fetchServer(serverId);
      
      // Send confirmation
      await interaction.editReply({ content: `✅ Stopped server: ${server.attributes.name}` });
      logger.info(`User ${interaction.user.tag} stopped server ${server.attributes.name}`);
      
      // Update server status
      setTimeout(() => {
        this.updateServerStatus(interaction.client);
      }, 5000);
    } catch (error) {
      logger.error(`Error stopping server: ${error.message}`);
      await interaction.editReply({ content: `❌ Error stopping server: ${error.message}` });
    }
  },
  
  /**
   * Restart a game server
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} serverId - The server ID
   */
  async restartServer(interaction, serverId) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check if user has permission
      if (!this.hasServerPermission(interaction.member)) {
        await interaction.editReply({ content: 'You do not have permission to restart servers.' });
        return;
      }
      
      // Send restart signal to Pterodactyl
      const response = await fetch(`${process.env.PTERODACTYL_API_URL}/servers/${serverId}/power`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ signal: 'restart' })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || 'Unknown error'}`);
      }
      
      // Get server details
      const server = await this.fetchServer(serverId);
      
      // Send confirmation
      await interaction.editReply({ content: `✅ Restarted server: ${server.attributes.name}` });
      logger.info(`User ${interaction.user.tag} restarted server ${server.attributes.name}`);
      
      // Update server status
      setTimeout(() => {
        this.updateServerStatus(interaction.client);
      }, 5000);
    } catch (error) {
      logger.error(`Error restarting server: ${error.message}`);
      await interaction.editReply({ content: `❌ Error restarting server: ${error.message}` });
    }
  },
  
  /**
   * Show detailed information about a server
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} serverId - The server ID
   */
  async showServerDetails(interaction, serverId) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Get server details
      const server = await this.fetchServer(serverId);
      
      if (!server) {
        await interaction.editReply({ content: 'Server not found.' });
        return;
      }
      
      // Get server utilization
      const utilization = await this.fetchServerUtilization(serverId);
      
      // Create server details embed
      const detailsEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`${server.attributes.name} Details`)
        .setDescription(server.attributes.description || 'No description available')
        .addFields(
          { name: 'Status', value: this.getStatusEmoji(server.attributes.status) + ' ' + server.attributes.status, inline: true },
          { name: 'Node', value: server.attributes.node || 'Unknown', inline: true },
          { name: 'Memory', value: `${utilization?.attributes?.resources?.memory_bytes ? Math.round(utilization.attributes.resources.memory_bytes / 1024 / 1024) : 0} MB / ${server.attributes.limits.memory} MB`, inline: true },
          { name: 'CPU', value: `${utilization?.attributes?.resources?.cpu_absolute ? utilization.attributes.resources.cpu_absolute.toFixed(2) : 0}% / ${server.attributes.limits.cpu}%`, inline: true },
          { name: 'Disk', value: `${utilization?.attributes?.resources?.disk_bytes ? Math.round(utilization.attributes.resources.disk_bytes / 1024 / 1024) : 0} MB / ${server.attributes.limits.disk} MB`, inline: true },
          { name: 'Created', value: new Date(server.attributes.created_at).toLocaleString(), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      // Create server control buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`server_start_${serverId}`)
            .setLabel('Start')
            .setStyle(ButtonStyle.Success)
            .setDisabled(server.attributes.status === 'running'),
          new ButtonBuilder()
            .setCustomId(`server_restart_${serverId}`)
            .setLabel('Restart')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(server.attributes.status !== 'running'),
          new ButtonBuilder()
            .setCustomId(`server_stop_${serverId}`)
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(server.attributes.status !== 'running')
        );
      
      // Send the details
      await interaction.editReply({ embeds: [detailsEmbed], components: [row] });
    } catch (error) {
      logger.error(`Error showing server details: ${error.message}`);
      await interaction.editReply({ content: `❌ Error fetching server details: ${error.message}` });
    }
  },
  
  /**
   * Fetch all servers from Pterodactyl
   * @returns {Promise<Object>} The servers response
   */
  async fetchAllServers() {
    try {
      const response = await fetch(`${process.env.PTERODACTYL_API_URL}/servers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || 'Unknown error'}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error(`Error fetching servers: ${error.message}`);
      return null;
    }
  },
  
  /**
   * Fetch a specific server from Pterodactyl
   * @param {string} serverId - The server ID
   * @returns {Promise<Object>} The server data
   */
  async fetchServer(serverId) {
    try {
      const response = await fetch(`${process.env.PTERODACTYL_API_URL}/servers/${serverId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      return data.attributes;
    } catch (error) {
      logger.error(`Error fetching server ${serverId}: ${error.message}`);
      return null;
    }
  },
  
  /**
   * Fetch server utilization from Pterodactyl
   * @param {string} serverId - The server ID
   * @returns {Promise<Object>} The utilization data
   */
  async fetchServerUtilization(serverId) {
    try {
      const response = await fetch(`${process.env.PTERODACTYL_API_URL}/servers/${serverId}/resources`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.PTERODACTYL_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message || 'Unknown error'}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error(`Error fetching server utilization for ${serverId}: ${error.message}`);
      return null;
    }
  },
  
  /**
   * Determine the game type from server description
   * @param {string} description - The server description
   * @returns {string} The game type
   */
  determineGameType(description) {
    if (!description) return 'Other';
    
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('minecraft')) return 'Minecraft';
    if (lowerDesc.includes('rust')) return 'Rust';
    if (lowerDesc.includes('zomboid') || lowerDesc.includes('project zomboid')) return 'Project Zomboid';
    if (lowerDesc.includes('ark')) return 'ARK';
    if (lowerDesc.includes('valheim')) return 'Valheim';
    if (lowerDesc.includes('terraria')) return 'Terraria';
    
    return 'Other';
  },
  
  /**
   * Get an emoji representing server status
   * @param {string} status - The server status
   * @returns {string} The status emoji
   */
  getStatusEmoji(status) {
    switch (status) {
      case 'running':
        return '🟢';
      case 'starting':
        return '🟡';
      case 'stopping':
        return '🟠';
      case 'offline':
      default:
        return '🔴';
    }
  },
  
  /**
   * Check if a member has permission to manage servers
   * @param {GuildMember} member - The guild member
   * @returns {boolean} Whether the member has permission
   */
  hasServerPermission(member) {
    // Allow server management for staff roles
    return member.roles.cache.some(role => 
      role.name === config.roles.owner || 
      role.name === config.roles.admin || 
      role.name === config.roles.moderator ||
      role.name === config.roles.support ||
      role.name === config.roles.developer
    );
  },
  
  /**
   * Get server statistics
   * @returns {Object} Server statistics
   */
  async getServerStats() {
    try {
      // Fetch all servers
      const servers = await this.fetchAllServers();
      
      if (!servers || !Array.isArray(servers)) {
        return {
          total: 0,
          active: 0,
          suspended: 0,
          cpuUsage: 0,
          ramUsage: 0
        };
      }
      
      // Calculate statistics
      const total = servers.length;
      const active = servers.filter(server => server.attributes.status === 'running').length;
      const suspended = servers.filter(server => server.attributes.status === 'suspended').length;
      
      // Calculate average resource usage
      let totalCpuUsage = 0;
      let totalRamUsage = 0;
      let serversWithStats = 0;
      
      for (const server of servers) {
        try {
          const utilization = await this.fetchServerUtilization(server.attributes.id);
          if (utilization) {
            totalCpuUsage += utilization.attributes.resources.cpu_absolute || 0;
            totalRamUsage += utilization.attributes.resources.memory_bytes || 0;
            serversWithStats++;
          }
        } catch (error) {
          // Skip servers with errors
          logger.debug(`Error fetching utilization for server ${server.attributes.id}: ${error.message}`);
        }
      }
      
      const cpuUsage = serversWithStats > 0 ? Math.round(totalCpuUsage / serversWithStats) : 0;
      const ramUsage = serversWithStats > 0 ? Math.round(totalRamUsage / serversWithStats) : 0;
      
      return {
        total,
        active,
        suspended,
        cpuUsage,
        ramUsage,
        gameTypes: this.countServersByGameType(servers)
      };
    } catch (error) {
      logger.error(`Error getting server statistics: ${error.message}`);
      return {
        total: 0,
        active: 0,
        suspended: 0,
        cpuUsage: 0,
        ramUsage: 0
      };
    }
  },
  
  /**
   * Get node statistics
   * @returns {Object} Node statistics
   */
  async getNodeStats() {
    try {
      // This would normally fetch from the Pterodactyl API
      // For now, we'll return placeholder data
      
      // In a real implementation, you would:
      // 1. Fetch all nodes from the API
      // 2. Calculate statistics based on the response
      
      return {
        total: config.gameServers?.nodes?.length || 3,
        online: config.gameServers?.nodes?.filter(n => n.online)?.length || 2,
        offline: config.gameServers?.nodes?.filter(n => !n.online)?.length || 1,
        averageLoad: 45,
        totalStorage: '2.5 TB'
      };
    } catch (error) {
      logger.error(`Error getting node statistics: ${error.message}`);
      return {
        total: 0,
        online: 0,
        offline: 0,
        averageLoad: 0,
        totalStorage: '0 GB'
      };
    }
  },
  
  /**
   * Count servers by game type
   * @param {Array} servers - Array of server objects
   * @returns {Object} Counts by game type
   */
  countServersByGameType(servers) {
    const counts = {};
    
    if (!servers || !Array.isArray(servers)) {
      return counts;
    }
    
    servers.forEach(server => {
      const gameType = this.determineGameType(server.attributes.description || '');
      counts[gameType] = (counts[gameType] || 0) + 1;
    });
    
    return counts;
  }
}; 