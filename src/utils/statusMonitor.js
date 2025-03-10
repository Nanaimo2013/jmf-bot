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
const logger = require('./logger');
const config = require('../../config.json');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const os = require('os');

class StatusMonitor {
  constructor() {
    this.botStartTime = Date.now();
    this.lastPanelCheck = null;
    this.panelStatus = {
      online: false,
      lastChecked: null,
      responseTime: null,
      error: null
    };
    this.statusChannelId = config.channels?.status || null;
    this.botStatusMessageId = null;
    this.panelStatusMessageId = null;
  }

  /**
   * Initialize the status monitor
   * @param {Object} client - The Discord.js client
   */
  async init(client) {
    this.client = client;
    
    // Start monitoring
    this.startMonitoring();
    
    logger.info('Status monitor initialized');
  }

  /**
   * Start the monitoring process
   */
  startMonitoring() {
    // Update bot status every 5 minutes
    setInterval(() => this.updateBotStatus(), 5 * 60 * 1000);
    
    // Check panel status every 2 minutes
    setInterval(() => this.checkPanelStatus(), 2 * 60 * 1000);
    
    // Initial updates
    this.updateBotStatus();
    this.checkPanelStatus();
  }

  /**
   * Update the bot status embed
   */
  async updateBotStatus() {
    if (!this.statusChannelId || !this.client) return;
    
    try {
      const statusChannel = await this.client.channels.fetch(this.statusChannelId).catch(() => null);
      
      if (!statusChannel) {
        logger.warn('Status channel not found');
        return;
      }
      
      // Calculate uptime
      const uptime = this.getUptime();
      
      // Get system info
      const memoryUsage = process.memoryUsage();
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };
      
      // Create bot status embed
      const botStatusEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('JMF Bot Status')
        .setDescription('✅ The bot is currently online and operational.')
        .addFields(
          { name: 'Uptime', value: uptime, inline: true },
          { name: 'Memory Usage', value: `${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB`, inline: true },
          { name: 'System Memory', value: `${Math.round(systemMemory.used / 1024 / 1024 / 1024 * 100) / 100} GB / ${Math.round(systemMemory.total / 1024 / 1024 / 1024 * 100) / 100} GB`, inline: true },
          { name: 'Ping', value: `${this.client.ws.ping}ms`, inline: true },
          { name: 'Node.js Version', value: process.version, inline: true },
          { name: 'Discord.js Version', value: require('discord.js').version, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Last updated: ${new Date().toLocaleString()}` });
      
      // Try to find existing status message
      if (!this.botStatusMessageId) {
        const messages = await statusChannel.messages.fetch({ limit: 20 });
        const botMessages = messages.filter(msg => 
          msg.author.id === this.client.user.id && 
          msg.embeds.length > 0 && 
          msg.embeds[0].title === 'JMF Bot Status'
        );
        
        if (botMessages.size > 0) {
          this.botStatusMessageId = botMessages.first().id;
        }
      }
      
      if (this.botStatusMessageId) {
        // Update existing message
        try {
          const statusMessage = await statusChannel.messages.fetch(this.botStatusMessageId);
          await statusMessage.edit({ embeds: [botStatusEmbed] });
        } catch (error) {
          // If message not found, reset ID and send new message
          this.botStatusMessageId = null;
          const newMessage = await statusChannel.send({ embeds: [botStatusEmbed] });
          this.botStatusMessageId = newMessage.id;
        }
      } else {
        // Send new message
        const newMessage = await statusChannel.send({ embeds: [botStatusEmbed] });
        this.botStatusMessageId = newMessage.id;
      }
      
    } catch (error) {
      logger.error(`Error updating bot status: ${error.message}`);
    }
  }

  /**
   * Check the panel status
   */
  async checkPanelStatus() {
    if (!process.env.PTERODACTYL_API_URL) {
      this.panelStatus = {
        online: false,
        lastChecked: new Date(),
        responseTime: null,
        error: 'Panel URL not configured'
      };
      
      await this.updatePanelStatus();
      return;
    }
    
    try {
      const startTime = Date.now();
      
      // Try to fetch the panel API
      const response = await fetch(`${process.env.PTERODACTYL_API_URL}/api`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.panelStatus = {
        online: response.ok,
        lastChecked: new Date(),
        responseTime,
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      };
      
    } catch (error) {
      this.panelStatus = {
        online: false,
        lastChecked: new Date(),
        responseTime: null,
        error: error.message
      };
    }
    
    await this.updatePanelStatus();
  }

  /**
   * Update the panel status embed
   */
  async updatePanelStatus() {
    if (!this.statusChannelId || !this.client) return;
    
    try {
      const statusChannel = await this.client.channels.fetch(this.statusChannelId).catch(() => null);
      
      if (!statusChannel) {
        logger.warn('Status channel not found');
        return;
      }
      
      // Create panel status embed
      const panelStatusEmbed = new EmbedBuilder()
        .setColor(this.panelStatus.online ? '#00FF00' : '#FF0000')
        .setTitle('JMF Panel Status')
        .setDescription(this.panelStatus.online 
          ? '✅ The panel is currently online and operational.' 
          : '❌ The panel is currently offline or experiencing issues.')
        .addFields(
          { name: 'Status', value: this.panelStatus.online ? 'Online' : 'Offline', inline: true },
          { name: 'Response Time', value: this.panelStatus.responseTime ? `${this.panelStatus.responseTime}ms` : 'N/A', inline: true },
          { name: 'Last Checked', value: this.panelStatus.lastChecked ? `<t:${Math.floor(this.panelStatus.lastChecked.getTime() / 1000)}:R>` : 'Never', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Last updated: ${new Date().toLocaleString()}` });
      
      // Add error if there is one
      if (this.panelStatus.error) {
        panelStatusEmbed.addFields({ name: 'Error', value: this.panelStatus.error, inline: false });
      }
      
      // Try to find existing status message
      if (!this.panelStatusMessageId) {
        const messages = await statusChannel.messages.fetch({ limit: 20 });
        const panelMessages = messages.filter(msg => 
          msg.author.id === this.client.user.id && 
          msg.embeds.length > 0 && 
          msg.embeds[0].title === 'JMF Panel Status'
        );
        
        if (panelMessages.size > 0) {
          this.panelStatusMessageId = panelMessages.first().id;
        }
      }
      
      if (this.panelStatusMessageId) {
        // Update existing message
        try {
          const statusMessage = await statusChannel.messages.fetch(this.panelStatusMessageId);
          await statusMessage.edit({ embeds: [panelStatusEmbed] });
        } catch (error) {
          // If message not found, reset ID and send new message
          this.panelStatusMessageId = null;
          const newMessage = await statusChannel.send({ embeds: [panelStatusEmbed] });
          this.panelStatusMessageId = newMessage.id;
        }
      } else {
        // Send new message
        const newMessage = await statusChannel.send({ embeds: [panelStatusEmbed] });
        this.panelStatusMessageId = newMessage.id;
      }
      
    } catch (error) {
      logger.error(`Error updating panel status: ${error.message}`);
    }
  }

  /**
   * Get formatted uptime string
   * @returns {string} Formatted uptime
   */
  getUptime() {
    const uptime = Date.now() - this.botStartTime;
    
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    const parts = [];
    
    if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
    if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
    
    return parts.join(', ');
  }
}

// Export a singleton instance
const statusMonitor = new StatusMonitor();
module.exports = statusMonitor; 