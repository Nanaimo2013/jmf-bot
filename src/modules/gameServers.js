/**
 * JMF Hosting Discord Bot - Game Servers Module
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This module handles game server integration for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Module = require('./base.module');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class GameServersModule extends Module {
  /**
   * Create a new game servers module
   */
  constructor() {
    super({
      name: 'gameServers',
      description: 'Handles game server integration for the bot',
      enabled: true,
      dependencies: []
    });
    
    this.updateInterval = null;
    this.listeners = new Map();
    this.servers = [];
    this.enabled = true;
    
    // Helper method to check if module is enabled
    this.isEnabled = () => this.enabled;
  }

  /**
   * Initialize the game servers module
   * @param {Client} client - The Discord.js client
   * @returns {Promise<boolean>}
   */
  async initialize(client) {
    try {
      await super.initialize(client);
      
      // Get game servers config
      this.moduleConfig = this.configManager.getConfig('gameServers') || {};
      
      // Get API configuration from environment variables
      this.apiUrl = process.env.PTERODACTYL_API_URL;
      this.apiKey = process.env.PTERODACTYL_API_KEY;
      this.adminApiKey = process.env.PTERODACTYL_ADMIN_API_KEY || this.apiKey;
      
      // Validate required configuration
      if (!this.apiUrl || !this.apiKey) {
        this.logger.warn('Game servers API URL and API key not configured, module will be disabled');
        this.enabled = false;
        return;
      }
      
      // Normalize API URL
      this.apiUrl = this.apiUrl.replace(/\/+$/, '').replace(/\/api\/application$/, '');
      this.apiUrl = `${this.apiUrl}/api/application`;
      
      // Ensure API key is properly formatted
      this.apiKey = this.apiKey.trim();
      this.adminApiKey = this.adminApiKey.trim();
      
      // Get other configuration
      this.panelUrl = this.moduleConfig.panelUrl;
      this.statusChannel = this.moduleConfig.statusChannel;
      this.serverManagerRole = this.moduleConfig.serverManagerRole;
      this.updateInterval = this.moduleConfig.updateInterval || 60;
      
      // Log API configuration for debugging
      console.log('Game Servers API Configuration:', {
        url: this.apiUrl,
        keyLength: this.apiKey ? this.apiKey.length : 0,
        adminKeyLength: this.adminApiKey ? this.adminApiKey.length : 0
      });
      
      // Test API connection
      await this.testApiConnection();
      
      // Initialize servers array
      this.servers = [];
      
      // Fetch initial server data
      await this.fetchAllServers();
      
      return true;
    } catch (error) {
      this.handleError('initialize', error);
      return false;
    }
  }
  
  async testApiConnection() {
    try {
      const headers = {
        'Authorization': `Bearer ${this.adminApiKey.trim()}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json'
      };
      
      console.log('Testing API connection...');
      console.log('Request URL:', `${this.apiUrl}/servers`);
      console.log('Request headers:', {
        ...headers,
        'Authorization': headers.Authorization.replace(this.adminApiKey, '***')
      });
      
      const response = await fetch(`${this.apiUrl}/servers`, { headers });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
        throw new Error(`API connection test failed: ${response.status} ${response.statusText}`);
      }
      
      console.log('API connection test successful');
    } catch (error) {
      console.error('API connection test failed:', error);
      throw error;
    }
  }
  
  /**
   * Start the game servers module
   * @returns {Promise<boolean>}
   */
  async start() {
    try {
      await super.start();
      
      if (!this.isEnabled()) {
        this.logger.info('Game servers module is disabled, skipping start');
        return true;
      }
      
      // Register event listeners
      this._registerEventListeners();
      
      // Set up interval to update server status
      const updateInterval = this.moduleConfig.updateInterval || 60; // Default: 60 seconds
      this.updateInterval = setInterval(() => {
        this.updateServerStatus();
      }, updateInterval * 1000);
      
      this.logger.info(this.name, `Server status updates scheduled every ${updateInterval} seconds`);
      
      return true;
    } catch (error) {
      this.handleError('start', error);
      return false;
    }
  }
  
  /**
   * Stop the game servers module
   * @returns {Promise<boolean>}
   */
  async stop() {
    try {
      // Clear update interval
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      // Remove event listeners
      for (const [event, listener] of this.listeners.entries()) {
        this.client.removeListener(event, listener);
      }
      this.listeners.clear();
      
      await super.stop();
      return true;
    } catch (error) {
      this.handleError('stop', error);
      return false;
    }
  }
  
  /**
   * Register event listeners
   * @private
   */
  _registerEventListeners() {
    // Handle button interactions for game servers
    const onInteractionCreate = this._onInteractionCreate.bind(this);
    this.client.on('interactionCreate', onInteractionCreate);
    this.listeners.set('interactionCreate', onInteractionCreate);
  }
  
  /**
   * Handle interaction create event
   * @param {Interaction} interaction - The interaction
   * @private
   */
  async _onInteractionCreate(interaction) {
    try {
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
    } catch (error) {
      this.handleError('_onInteractionCreate', error);
    }
  }
  
  /**
   * Update the server status in the designated channel
   */
  async updateServerStatus() {
    try {
      // Get all servers from Pterodactyl
      const servers = await this.fetchAllServers();
      
      if (!servers || !servers.data) {
        this.logger.error(this.name, 'Failed to fetch servers from Pterodactyl API');
        return;
      }
      
      // Store servers for later use
      this.servers = servers.data;
      
      // Find the status channel in all guilds
      this.client.guilds.cache.forEach(async (guild) => {
        const statusChannel = guild.channels.cache.find(
          channel => channel.name === this.moduleConfig.statusChannel && channel.type === 0
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
            .setColor(this.config.embedColor || '#0099ff')
            .setTitle('JMF Hosting Game Servers Status')
            .setDescription('Current status of all game servers. Click the buttons to manage servers.')
            .setTimestamp()
            .setFooter({ text: this.config.footerText || 'JMF Hosting' });
          
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
          for (const [gameType, typeServers] of Object.entries(gameTypes)) {
            let fieldValue = '';
            
            for (const server of typeServers) {
              const status = server.attributes.status || 'unknown';
              const statusEmoji = this.getStatusEmoji(status);
              
              fieldValue += `${statusEmoji} **${server.attributes.name}**\n`;
              fieldValue += `ID: \`${server.attributes.identifier}\`\n`;
              fieldValue += `Status: ${status}\n\n`;
            }
            
            statusEmbed.addFields({ name: `${gameType} Servers`, value: fieldValue || 'No servers found', inline: false });
          }
          
          // Add server stats
          const stats = await this.getServerStats();
          
          statusEmbed.addFields({ 
            name: 'Server Statistics', 
            value: `Total Servers: ${stats.totalServers}\nOnline: ${stats.onlineServers}\nOffline: ${stats.offlineServers}`,
            inline: true
          });
          
          // Add node stats if available
          try {
            const nodeStats = await this.getNodeStats();
            
            statusEmbed.addFields({ 
              name: 'Node Statistics', 
              value: `Total Nodes: ${nodeStats.totalNodes}\nOnline: ${nodeStats.onlineNodes}\nOffline: ${nodeStats.offlineNodes}`,
              inline: true
            });
          } catch (error) {
            this.handleError('getNodeStats', error);
          }
          
          // Create action buttons
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('refresh_servers')
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄'),
              new ButtonBuilder()
                .setURL(this.moduleConfig.panelUrl || 'https://panel.jmfhosting.net')
                .setLabel('Control Panel')
                .setStyle(ButtonStyle.Link)
            );
          
          // Send status message
          await statusChannel.send({ embeds: [statusEmbed], components: [row] });
          
          this.logger.debug(this.name, `Updated server status in ${guild.name}`);
        } catch (error) {
          this.handleError('updateServerStatus', error);
        }
      });
    } catch (error) {
      this.handleError('updateServerStatus', error);
    }
  }
  
  /**
   * Start a server
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} serverId - The server ID
   */
  async startServer(interaction, serverId) {
    try {
      // Defer reply
      await interaction.deferReply({ ephemeral: true });
      
      // Check permissions
      if (!this.hasServerPermission(interaction.member)) {
        await interaction.editReply({ content: 'You do not have permission to manage servers.' });
        return;
      }
      
      // Get server details
      const server = await this.fetchServer(serverId);
      
      if (!server) {
        await interaction.editReply({ content: 'Server not found.' });
        return;
      }
      
      // Check if server is already running
      if (server.attributes.status === 'running') {
        await interaction.editReply({ content: 'Server is already running.' });
        return;
      }
      
      // Send start signal to Pterodactyl API
      const response = await fetch(`${this.apiUrl}/servers/${serverId}/power`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.adminApiKey.trim()}`,
          'Accept': 'Application/vnd.pterodactyl.v1+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ signal: 'start' })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].detail || errorJson.errors[0].message || errorMessage;
          }
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(`API Error: ${errorMessage} (Status: ${response.status})`);
      }
      
      // Update server status
      setTimeout(() => this.updateServerStatus(), 5000);
      
      await interaction.editReply({ content: `Server ${server.attributes.name} is starting...` });
      
      // Log action
      this.logger.info(this.name, `User ${interaction.user.tag} started server ${server.attributes.name} (${serverId})`);
    } catch (error) {
      this.handleError('startServer', error);
      await interaction.editReply({ content: `Error starting server: ${error.message}` });
    }
  }
  
  /**
   * Stop a server
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} serverId - The server ID
   */
  async stopServer(interaction, serverId) {
    try {
      // Defer reply
      await interaction.deferReply({ ephemeral: true });
      
      // Check permissions
      if (!this.hasServerPermission(interaction.member)) {
        await interaction.editReply({ content: 'You do not have permission to manage servers.' });
        return;
      }
      
      // Get server details
      const server = await this.fetchServer(serverId);
      
      if (!server) {
        await interaction.editReply({ content: 'Server not found.' });
        return;
      }
      
      // Check if server is already stopped
      if (server.attributes.status === 'stopped') {
        await interaction.editReply({ content: 'Server is already stopped.' });
        return;
      }
      
      // Send stop signal to Pterodactyl API
      const response = await fetch(`${this.apiUrl}/servers/${serverId}/power`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.adminApiKey.trim()}`,
          'Accept': 'Application/vnd.pterodactyl.v1+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ signal: 'stop' })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].detail || errorJson.errors[0].message || errorMessage;
          }
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(`API Error: ${errorMessage} (Status: ${response.status})`);
      }
      
      // Update server status
      setTimeout(() => this.updateServerStatus(), 5000);
      
      await interaction.editReply({ content: `Server ${server.attributes.name} is stopping...` });
      
      // Log action
      this.logger.info(this.name, `User ${interaction.user.tag} stopped server ${server.attributes.name} (${serverId})`);
    } catch (error) {
      this.handleError('stopServer', error);
      await interaction.editReply({ content: `Error stopping server: ${error.message}` });
    }
  }
  
  /**
   * Restart a server
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} serverId - The server ID
   */
  async restartServer(interaction, serverId) {
    try {
      // Defer reply
      await interaction.deferReply({ ephemeral: true });
      
      // Check permissions
      if (!this.hasServerPermission(interaction.member)) {
        await interaction.editReply({ content: 'You do not have permission to manage servers.' });
        return;
      }
      
      // Get server details
      const server = await this.fetchServer(serverId);
      
      if (!server) {
        await interaction.editReply({ content: 'Server not found.' });
        return;
      }
      
      // Check if server is running
      if (server.attributes.status !== 'running') {
        await interaction.editReply({ content: 'Server must be running to restart it.' });
        return;
      }
      
      // Send restart signal to Pterodactyl API
      const response = await fetch(`${this.apiUrl}/servers/${serverId}/power`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.adminApiKey.trim()}`,
          'Accept': 'Application/vnd.pterodactyl.v1+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ signal: 'restart' })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].detail || errorJson.errors[0].message || errorMessage;
          }
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(`API Error: ${errorMessage} (Status: ${response.status})`);
      }
      
      // Update server status
      setTimeout(() => this.updateServerStatus(), 5000);
      
      await interaction.editReply({ content: `Server ${server.attributes.name} is restarting...` });
      
      // Log action
      this.logger.info(this.name, `User ${interaction.user.tag} restarted server ${server.attributes.name} (${serverId})`);
    } catch (error) {
      this.handleError('restartServer', error);
      await interaction.editReply({ content: `Error restarting server: ${error.message}` });
    }
  }
  
  /**
   * Show server details
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} serverId - The server ID
   */
  async showServerDetails(interaction, serverId) {
    try {
      // Defer reply
      await interaction.deferReply({ ephemeral: true });
      
      // Get server details
      const server = await this.fetchServer(serverId);
      
      if (!server) {
        await interaction.editReply({ content: 'Server not found.' });
        return;
      }
      
      // Get server utilization
      const utilization = await this.fetchServerUtilization(serverId);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(this.config.embedColor || '#0099ff')
        .setTitle(`Server Details: ${server.attributes.name}`)
        .setDescription(server.attributes.description || 'No description')
        .addFields(
          { name: 'Status', value: server.attributes.status || 'Unknown', inline: true },
          { name: 'ID', value: server.attributes.identifier, inline: true },
          { name: 'Node', value: server.attributes.node || 'Unknown', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: this.config.footerText || 'JMF Hosting' });
      
      // Add utilization data if available
      if (utilization) {
        embed.addFields(
          { name: 'CPU Usage', value: `${utilization.cpu.toFixed(2)}%`, inline: true },
          { name: 'Memory Usage', value: `${Math.round(utilization.memory / 1024 / 1024)} MB`, inline: true },
          { name: 'Disk Usage', value: `${Math.round(utilization.disk / 1024 / 1024)} MB`, inline: true }
        );
      }
      
      // Create action buttons
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
            .setDisabled(server.attributes.status !== 'running'),
          new ButtonBuilder()
            .setURL(`${this.moduleConfig.panelUrl}/server/${server.attributes.identifier}`)
            .setLabel('Control Panel')
            .setStyle(ButtonStyle.Link)
        );
      
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      this.handleError('showServerDetails', error);
      await interaction.editReply({ content: `Error fetching server details: ${error.message}` });
    }
  }
  
  /**
   * Fetch all servers from Pterodactyl API
   * @returns {Promise<Object>} - The servers data
   */
  async fetchAllServers() {
    try {
      const headers = {
        'Authorization': `Bearer ${this.adminApiKey.trim()}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json'
      };
      
      console.log('Making API request to:', `${this.apiUrl}/servers`);
      console.log('Request headers:', {
        ...headers,
        'Authorization': headers.Authorization.replace(this.adminApiKey, '***')
      });
      
      const response = await fetch(`${this.apiUrl}/servers`, { headers });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].detail || errorJson.errors[0].message || errorMessage;
          }
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(`API Error: ${errorMessage} (Status: ${response.status})`);
      }
      
      const data = await response.json();
      
      if (data.object === 'list' && Array.isArray(data.data)) {
        this.servers = data.data.map(server => ({
          id: server.attributes.id,
          identifier: server.attributes.identifier,
          name: server.attributes.name,
          description: server.attributes.description,
          status: server.attributes.status || 'unknown'
        }));
        console.log(`Successfully fetched ${this.servers.length} servers`);
        return data;
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      this.handleError('fetchAllServers', error);
      return null;
    }
  }
  
  /**
   * Fetch a specific server from Pterodactyl API
   * @param {string} serverId - The server ID
   * @returns {Promise<Object>} - The server data
   */
  async fetchServer(serverId) {
    try {
      const response = await fetch(`${this.apiUrl}/servers/${serverId}`, {
        headers: {
          'Authorization': `Bearer ${this.adminApiKey.trim()}`,
          'Accept': 'Application/vnd.pterodactyl.v1+json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].detail || errorJson.errors[0].message || errorMessage;
          }
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(`API Error: ${errorMessage} (Status: ${response.status})`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      this.handleError('fetchServer', error);
      return null;
    }
  }
  
  /**
   * Fetch server utilization from Pterodactyl API
   * @param {string} serverId - The server ID
   * @returns {Promise<Object>} - The utilization data
   */
  async fetchServerUtilization(serverId) {
    try {
      const response = await fetch(`${this.apiUrl}/servers/${serverId}/resources`, {
        headers: {
          'Authorization': `Bearer ${this.adminApiKey.trim()}`,
          'Accept': 'Application/vnd.pterodactyl.v1+json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].detail || errorJson.errors[0].message || errorMessage;
          }
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(`API Error: ${errorMessage} (Status: ${response.status})`);
      }
      
      return await response.json();
    } catch (error) {
      this.handleError('fetchServerUtilization', error);
      return null;
    }
  }
  
  /**
   * Determine game type from server description
   * @param {string} description - The server description
   * @returns {string} - The game type
   */
  determineGameType(description) {
    if (!description) return 'Other';
    
    const gameTypes = {
      'minecraft': ['minecraft', 'mc', 'forge', 'paper', 'spigot', 'bukkit'],
      'ark': ['ark', 'survival evolved'],
      'rust': ['rust'],
      'csgo': ['cs:go', 'csgo', 'counter-strike'],
      'valheim': ['valheim'],
      'terraria': ['terraria']
    };
    
    const lowerDesc = description.toLowerCase();
    
    for (const [type, keywords] of Object.entries(gameTypes)) {
      if (keywords.some(keyword => lowerDesc.includes(keyword))) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }
    
    return 'Other';
  }
  
  /**
   * Get status emoji for server status
   * @param {string} status - The server status
   * @returns {string} - The status emoji
   */
  getStatusEmoji(status) {
    switch (status.toLowerCase()) {
      case 'running':
        return '🟢';
      case 'starting':
        return '🟡';
      case 'stopping':
        return '🟠';
      case 'stopped':
        return '🔴';
      default:
        return '⚪';
    }
  }
  
  /**
   * Check if a member has permission to manage servers
   * @param {GuildMember} member - The guild member
   * @returns {boolean} - Whether the member has permission
   */
  hasServerPermission(member) {
    if (!member) return false;
    
    // Check for admin permission
    if (member.permissions.has('ADMINISTRATOR')) return true;
    
    // Check for specific role
    const serverManagerRole = this.moduleConfig.serverManagerRole;
    if (serverManagerRole && member.roles.cache.has(serverManagerRole)) return true;
    
    return false;
  }
  
  /**
   * Get server statistics
   * @returns {Promise<Object>} - The server statistics
   */
  async getServerStats() {
    try {
      // Use cached servers if available
      const servers = this.servers.length > 0 ? this.servers : (await this.fetchAllServers())?.data || [];
      
      const totalServers = servers.length;
      const onlineServers = servers.filter(server => server.attributes.status === 'running').length;
      const offlineServers = totalServers - onlineServers;
      
      // Count servers by game type
      const gameTypeCounts = this.countServersByGameType(servers);
      
      return {
        totalServers,
        onlineServers,
        offlineServers,
        gameTypeCounts
      };
    } catch (error) {
      this.handleError('getServerStats', error);
      return {
        totalServers: 0,
        onlineServers: 0,
        offlineServers: 0,
        gameTypeCounts: {}
      };
    }
  }
  
  /**
   * Get node statistics
   * @returns {Promise<Object>} - The node statistics
   */
  async getNodeStats() {
    try {
      const response = await fetch(`${this.apiUrl}/nodes`, {
        headers: {
          'Authorization': `Bearer ${this.adminApiKey.trim()}`,
          'Accept': 'Application/vnd.pterodactyl.v1+json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].detail || errorJson.errors[0].message || errorMessage;
          }
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(`API Error: ${errorMessage} (Status: ${response.status})`);
      }
      
      const data = await response.json();
      const nodes = data.data || [];
      
      const totalNodes = nodes.length;
      const onlineNodes = nodes.filter(node => !node.attributes.maintenance_mode).length;
      const offlineNodes = totalNodes - onlineNodes;
      
      return {
        totalNodes,
        onlineNodes,
        offlineNodes,
        nodes: nodes.map(node => ({
          id: node.attributes.id,
          name: node.attributes.name,
          status: node.attributes.maintenance_mode ? 'maintenance' : 'online',
          location: node.attributes.location_id,
          memory: node.attributes.memory,
          disk: node.attributes.disk,
          allocations: node.attributes.allocated_resources?.allocations || 0
        }))
      };
    } catch (error) {
      this.handleError('getNodeStats', error);
      return {
        totalNodes: 'N/A',
        onlineNodes: 'N/A',
        offlineNodes: 'N/A',
        nodes: []
      };
    }
  }
  
  /**
   * Count servers by game type
   * @param {Array} servers - The servers array
   * @returns {Object} - The server counts by game type
   */
  countServersByGameType(servers) {
    const counts = {};
    
    servers.forEach(server => {
      const gameType = this.determineGameType(server.attributes.description);
      counts[gameType] = (counts[gameType] || 0) + 1;
    });
    
    return counts;
  }
  
  /**
   * Get the module's status
   * @returns {Object} - Module status
   */
  getStatus() {
    const baseStatus = super.getStatus();
    
    return {
      ...baseStatus,
      metrics: {
        totalServers: this.servers.length,
        onlineServers: this.servers.filter(server => server?.attributes?.status === 'running').length
      }
    };
  }
}

module.exports = GameServersModule; 