/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../../config.json');
const fs = require('fs/promises');
const path = require('path');

class NodeStatusManager {
  constructor() {
    this.nodesChannelId = config.channels?.nodes || null;
    this.nodeStatusMessageId = null;
    this.updateInterval = null;
    this.client = null;
  }
  
  /**
   * Initialize the node status manager
   * @param {Object} client - The Discord.js client
   */
  async init(client) {
    this.client = client;
    
    // Start automatic updates
    this.startAutoUpdates();
    
    logger.info('Node status manager initialized');
  }
  
  /**
   * Start automatic updates of the node status embed
   */
  startAutoUpdates() {
    // Update node status every 10 seconds
    this.updateInterval = setInterval(() => this.refreshNodeEmbed(), 10 * 1000);
    
    // Initial update
    this.refreshNodeEmbed();
  }
  
  /**
   * Stop automatic updates
   */
  stopAutoUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * Update a node's status
   * @param {Object} interaction - The interaction object
   * @param {string} nodeId - The node ID
   * @param {string} status - The node status
   * @param {string} location - The node location
   * @param {string} reason - The reason for the status
   * @param {string} description - Additional description
   * @returns {Promise<Object>} The updated node data
   */
  async updateNode(interaction, nodeId, status, location, reason, description) {
    // Validate reason for non-online status
    if (status !== 'online' && !reason) {
      throw new Error('A reason is required for maintenance, offline, or degraded status.');
    }
    
    // Load existing nodes data
    const nodes = await this.loadNodesData();
    
    // Update or add the node
    nodes[nodeId] = {
      id: nodeId,
      status,
      location,
      reason,
      description,
      lastUpdated: new Date().toISOString(),
      updatedBy: {
        id: interaction.user.id,
        tag: interaction.user.tag
      }
    };
    
    // Save the updated nodes data
    await this.saveNodesData(nodes);
    
    // Refresh the node status embed
    await this.refreshNodeEmbed();
    
    return nodes[nodeId];
  }
  
  /**
   * Remove a node from the status list
   * @param {Object} interaction - The interaction object
   * @param {string} nodeId - The node ID to remove
   * @returns {Promise<boolean>} Whether the node was removed
   */
  async removeNode(interaction, nodeId) {
    // Load existing nodes data
    const nodes = await this.loadNodesData();
    
    // Check if the node exists
    if (!nodes[nodeId]) {
      return false;
    }
    
    // Remove the node
    delete nodes[nodeId];
    
    // Save the updated nodes data
    await this.saveNodesData(nodes);
    
    // Refresh the node status embed
    await this.refreshNodeEmbed();
    
    return true;
  }
  
  /**
   * Refresh the node status embed in the nodes channel
   * @param {boolean} force - Whether to force a refresh even if no changes
   * @returns {Promise<void>}
   */
  async refreshNodeEmbed(force = false) {
    if (!this.nodesChannelId || !this.client) return;
    
    try {
      const nodesChannel = await this.client.channels.fetch(this.nodesChannelId).catch(() => null);
      
      if (!nodesChannel) {
        logger.warn('Nodes channel not found');
        return;
      }
      
      // Load nodes data
      const nodes = await this.loadNodesData();
      
      if (Object.keys(nodes).length === 0) {
        return;
      }
      
      // Create node status embed
      const nodeStatusEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('JMF Hosting Node Status')
        .setDescription('Current status of all hosting nodes')
        .setTimestamp()
        .setFooter({ text: `Last updated: ${new Date().toLocaleString()}` });
      
      // Sort nodes by ID
      const sortedNodes = Object.values(nodes).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      
      // Group nodes by location
      const nodesByLocation = {};
      
      for (const node of sortedNodes) {
        if (!nodesByLocation[node.location]) {
          nodesByLocation[node.location] = [];
        }
        nodesByLocation[node.location].push(node);
      }
      
      // Add fields for each location
      for (const [location, locationNodes] of Object.entries(nodesByLocation)) {
        let nodeList = '';
        
        for (const node of locationNodes) {
          const statusEmoji = this.getStatusEmoji(node.status);
          nodeList += `${statusEmoji} **${node.id}**: ${node.status.charAt(0).toUpperCase() + node.status.slice(1)}`;
          
          if (node.reason) {
            nodeList += ` - ${node.reason}`;
          }
          
          nodeList += '\n';
        }
        
        nodeStatusEmbed.addFields({ name: `📍 ${location}`, value: nodeList, inline: false });
      }
      
      // Try to find existing status message
      if (!this.nodeStatusMessageId) {
        const messages = await nodesChannel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(msg => 
          msg.author.id === this.client.user.id && 
          msg.embeds.length > 0 && 
          msg.embeds[0].title === 'JMF Hosting Node Status'
        );
        
        if (botMessages.size > 0) {
          this.nodeStatusMessageId = botMessages.first().id;
        }
      }
      
      if (this.nodeStatusMessageId) {
        // Update existing message
        try {
          const statusMessage = await nodesChannel.messages.fetch(this.nodeStatusMessageId);
          await statusMessage.edit({ embeds: [nodeStatusEmbed] });
        } catch (error) {
          // If message not found, reset ID and send new message
          logger.warn(`Node status message not found, creating new one: ${error.message}`);
          this.nodeStatusMessageId = null;
          const newMessage = await nodesChannel.send({ embeds: [nodeStatusEmbed] });
          this.nodeStatusMessageId = newMessage.id;
        }
      } else {
        // Send new message
        const newMessage = await nodesChannel.send({ embeds: [nodeStatusEmbed] });
        this.nodeStatusMessageId = newMessage.id;
      }
      
    } catch (error) {
      logger.error(`Error refreshing node embed: ${error.message}`);
    }
  }
  
  /**
   * Load nodes data from file
   * @returns {Promise<Object>} The nodes data
   */
  async loadNodesData() {
    try {
      const dataDir = path.join(__dirname, '../../../data');
      const filePath = path.join(dataDir, 'nodes.json');
      
      // Create data directory if it doesn't exist
      await fs.mkdir(dataDir, { recursive: true });
      
      try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        // If file doesn't exist or is invalid, return empty object
        if (error.code === 'ENOENT' || error instanceof SyntaxError) {
          return {};
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Error loading nodes data: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Save nodes data to file
   * @param {Object} nodes - The nodes data to save
   * @returns {Promise<void>}
   */
  async saveNodesData(nodes) {
    try {
      const dataDir = path.join(__dirname, '../../../data');
      const filePath = path.join(dataDir, 'nodes.json');
      
      // Create data directory if it doesn't exist
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(filePath, JSON.stringify(nodes, null, 2), 'utf8');
    } catch (error) {
      logger.error(`Error saving nodes data: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get emoji for a node status
   * @param {string} status - The node status
   * @returns {string} The status emoji
   */
  getStatusEmoji(status) {
    switch (status) {
      case 'online':
        return '🟢';
      case 'maintenance':
        return '🟡';
      case 'offline':
        return '🔴';
      case 'degraded':
        return '🟠';
      default:
        return '⚪';
    }
  }
  
  /**
   * Get color for a node status
   * @param {string} status - The node status
   * @returns {string} The status color
   */
  getStatusColor(status) {
    switch (status) {
      case 'online':
        return '#00FF00';
      case 'maintenance':
        return '#FFFF00';
      case 'offline':
        return '#FF0000';
      case 'degraded':
        return '#FFA500';
      default:
        return config.embedColor;
    }
  }
}

// Create a singleton instance
const nodeStatusManager = new NodeStatusManager();

// Export the slash command
module.exports = {
  data: new SlashCommandBuilder()
    .setName('node')
    .setDescription('Manage node status information')
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update a node\'s status')
        .addStringOption(option =>
          option.setName('node_id')
            .setDescription('The ID of the node (e.g., node1, node2)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('status')
            .setDescription('The status of the node')
            .setRequired(true)
            .addChoices(
              { name: '🟢 Online', value: 'online' },
              { name: '🟡 Maintenance', value: 'maintenance' },
              { name: '🔴 Offline', value: 'offline' },
              { name: '🟠 Degraded', value: 'degraded' }
            ))
        .addStringOption(option =>
          option.setName('location')
            .setDescription('The location of the node')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('The reason for the status (required for maintenance/offline/degraded)')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Additional description or details about the node')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all nodes and their status'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('refresh')
        .setDescription('Refresh the node status embed in the nodes channel'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a node from the status list')
        .addStringOption(option =>
          option.setName('node_id')
            .setDescription('The ID of the node to remove')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  // Export the manager for initialization
  nodeStatusManager,
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const subcommand = interaction.options.getSubcommand();
      
      switch (subcommand) {
        case 'update':
          await this.handleUpdateNode(interaction);
          break;
        case 'list':
          await this.handleListNodes(interaction);
          break;
        case 'refresh':
          await this.handleRefreshNodeEmbed(interaction);
          break;
        case 'remove':
          await this.handleRemoveNode(interaction);
          break;
      }
    } catch (error) {
      logger.error(`Error in node command: ${error.message}`);
      await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
    }
  },
  
  async handleUpdateNode(interaction) {
    const nodeId = interaction.options.getString('node_id');
    const status = interaction.options.getString('status');
    const location = interaction.options.getString('location');
    const reason = interaction.options.getString('reason') || '';
    const description = interaction.options.getString('description') || '';
    
    try {
      const updatedNode = await nodeStatusManager.updateNode(
        interaction, nodeId, status, location, reason, description
      );
      
      // Create success embed
      const statusEmoji = nodeStatusManager.getStatusEmoji(status);
      const statusColor = nodeStatusManager.getStatusColor(status);
      
      const successEmbed = new EmbedBuilder()
        .setColor(statusColor)
        .setTitle('Node Status Updated')
        .setDescription(`✅ Node **${nodeId}** has been updated.`)
        .addFields(
          { name: 'Node ID', value: nodeId, inline: true },
          { name: 'Status', value: `${statusEmoji} ${status.charAt(0).toUpperCase() + status.slice(1)}`, inline: true },
          { name: 'Location', value: location, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      if (reason) {
        successEmbed.addFields({ name: 'Reason', value: reason, inline: false });
      }
      
      if (description) {
        successEmbed.addFields({ name: 'Description', value: description, inline: false });
      }
      
      await interaction.editReply({ embeds: [successEmbed] });
      
    } catch (error) {
      await interaction.editReply({ content: `❌ Error updating node: ${error.message}` });
    }
  },
  
  async handleListNodes(interaction) {
    try {
      const nodes = await nodeStatusManager.loadNodesData();
      
      if (Object.keys(nodes).length === 0) {
        return interaction.editReply({ content: '❌ No nodes have been added yet.' });
      }
      
      const nodeListEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('Node Status List')
        .setDescription('Current status of all nodes')
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      // Sort nodes by ID
      const sortedNodes = Object.values(nodes).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      
      for (const node of sortedNodes) {
        const statusEmoji = nodeStatusManager.getStatusEmoji(node.status);
        const lastUpdated = new Date(node.lastUpdated);
        
        nodeListEmbed.addFields({
          name: `${statusEmoji} ${node.id} (${node.location})`,
          value: `**Status:** ${node.status.charAt(0).toUpperCase() + node.status.slice(1)}\n` +
                 `**Last Updated:** <t:${Math.floor(lastUpdated.getTime() / 1000)}:R>\n` +
                 `**Updated By:** ${node.updatedBy.tag}\n` +
                 (node.reason ? `**Reason:** ${node.reason}\n` : '') +
                 (node.description ? `**Description:** ${node.description}` : ''),
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [nodeListEmbed] });
      
    } catch (error) {
      await interaction.editReply({ content: `❌ Error listing nodes: ${error.message}` });
    }
  },
  
  async handleRefreshNodeEmbed(interaction) {
    try {
      await nodeStatusManager.refreshNodeEmbed(true);
      await interaction.editReply({ content: '✅ Node status embed has been refreshed in the nodes channel.' });
    } catch (error) {
      await interaction.editReply({ content: `❌ Error refreshing node embed: ${error.message}` });
    }
  },
  
  async handleRemoveNode(interaction) {
    const nodeId = interaction.options.getString('node_id');
    
    try {
      const removed = await nodeStatusManager.removeNode(interaction, nodeId);
      
      if (!removed) {
        return interaction.editReply({ content: `❌ Node **${nodeId}** not found.` });
      }
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('Node Removed')
        .setDescription(`✅ Node **${nodeId}** has been removed from the status list.`)
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      await interaction.editReply({ embeds: [successEmbed] });
      
    } catch (error) {
      await interaction.editReply({ content: `❌ Error removing node: ${error.message}` });
    }
  }
}; 