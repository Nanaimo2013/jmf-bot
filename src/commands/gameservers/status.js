/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check the status of a game server')
    .addStringOption(option => 
      option.setName('server')
        .setDescription('The server to check (leave empty for all servers)')
        .setRequired(false)
        .setAutocomplete(true)),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const serverId = interaction.options.getString('server');
      
      if (serverId) {
        // Check status of a specific server
        await this.checkServerStatus(interaction, serverId);
      } else {
        // Check status of all servers
        await this.checkAllServers(interaction);
      }
    } catch (error) {
      logger.error(`Error in status command: ${error.message}`);
      await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
    }
  },
  
  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused();
      const servers = await this.fetchAllServers();
      
      if (!servers || !servers.data) {
        return interaction.respond([]);
      }
      
      const filtered = servers.data
        .filter(server => 
          server.attributes.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
          server.attributes.identifier.toLowerCase().includes(focusedValue.toLowerCase())
        )
        .slice(0, 25)
        .map(server => ({
          name: server.attributes.name,
          value: server.attributes.id
        }));
      
      await interaction.respond(filtered);
    } catch (error) {
      logger.error(`Error in status autocomplete: ${error.message}`);
      await interaction.respond([]);
    }
  },
  
  async checkServerStatus(interaction, serverId) {
    // Fetch server details
    const server = await this.fetchServer(serverId);
    
    if (!server) {
      return interaction.editReply({ content: '❌ Server not found or API error occurred.' });
    }
    
    // Fetch server utilization
    const utilization = await this.fetchServerUtilization(serverId);
    
    // Create status embed
    const statusEmbed = new EmbedBuilder()
      .setColor(this.getStatusColor(server.attributes.status))
      .setTitle(`${server.attributes.name} Status`)
      .setDescription(server.attributes.description || 'No description available')
      .addFields(
        { name: 'Status', value: `${this.getStatusEmoji(server.attributes.status)} ${server.attributes.status}`, inline: true },
        { name: 'Node', value: server.attributes.node || 'Unknown', inline: true },
        { name: 'Memory', value: `${utilization?.attributes?.resources?.memory_bytes ? Math.round(utilization.attributes.resources.memory_bytes / 1024 / 1024) : 0} MB / ${server.attributes.limits.memory} MB`, inline: true },
        { name: 'CPU', value: `${utilization?.attributes?.resources?.cpu_absolute ? utilization.attributes.resources.cpu_absolute.toFixed(2) : 0}% / ${server.attributes.limits.cpu}%`, inline: true },
        { name: 'Disk', value: `${utilization?.attributes?.resources?.disk_bytes ? Math.round(utilization.attributes.resources.disk_bytes / 1024 / 1024) : 0} MB / ${server.attributes.limits.disk} MB`, inline: true },
        { name: 'Address', value: server.attributes.relationships?.allocations?.data?.[0]?.attributes?.ip_alias || server.attributes.relationships?.allocations?.data?.[0]?.attributes?.ip || 'Unknown', inline: true },
        { name: 'Port', value: server.attributes.relationships?.allocations?.data?.[0]?.attributes?.port?.toString() || 'Unknown', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: config.footerText });
    
    // Add player count if available
    if (server.attributes.relationships?.allocations?.data?.[0]?.attributes?.current_state === 'running') {
      const players = server.attributes.relationships?.allocations?.data?.[0]?.attributes?.current_state?.players || 0;
      const maxPlayers = server.attributes.relationships?.allocations?.data?.[0]?.attributes?.current_state?.maxPlayers || 0;
      
      statusEmbed.addFields({ name: 'Players', value: `${players}/${maxPlayers}`, inline: true });
    }
    
    await interaction.editReply({ embeds: [statusEmbed] });
  },
  
  async checkAllServers(interaction) {
    // Fetch all servers
    const servers = await this.fetchAllServers();
    
    if (!servers || !servers.data) {
      return interaction.editReply({ content: '❌ No servers found or API error occurred.' });
    }
    
    // Group servers by game type
    const gameTypes = {};
    
    servers.data.forEach(server => {
      const gameType = this.determineGameType(server.attributes.description);
      if (!gameTypes[gameType]) {
        gameTypes[gameType] = [];
      }
      gameTypes[gameType].push(server);
    });
    
    // Create status embed
    const statusEmbed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('JMF Hosting Game Servers Status')
      .setDescription('Current status of all game servers. Use `/status [server]` to see detailed information about a specific server.')
      .setTimestamp()
      .setFooter({ text: config.footerText });
    
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
    
    await interaction.editReply({ embeds: [statusEmbed] });
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
      return data;
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
   * Get a color representing server status
   * @param {string} status - The server status
   * @returns {string} The status color
   */
  getStatusColor(status) {
    switch (status) {
      case 'running':
        return '#00FF00';
      case 'starting':
        return '#FFFF00';
      case 'stopping':
        return '#FFA500';
      case 'offline':
      default:
        return '#FF0000';
    }
  }
}; 