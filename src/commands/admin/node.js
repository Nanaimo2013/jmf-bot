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
const fs = require('fs/promises');
const path = require('path');

class NodeStatusManager {
  constructor(managers) {
    this.managers = managers;
    this.nodesChannelId = null;
    this.nodeStatusMessageId = null;
    this.updateInterval = null;
    this.client = null;
    
    // Get config from bot manager
    const config = this.managers.bot.getConfigManager().getConfig();
    this.nodesChannelId = config.channels?.nodes || null;
  }
  
  /**
   * Initialize the node status manager
   * @param {Object} client - The Discord.js client
   */
  async init(client) {
    this.client = client;
    
    // Start automatic updates
    this.startAutoUpdates();
    
    this.managers.logger.info('system', 'Node status manager initialized');
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
      this.managers.logger.info('system', 'Node status auto-updates stopped');
    }
  }
  
  /**
   * Update a node's status
   * @param {Object} interaction - The interaction object
   * @param {string} nodeId - The node ID
   * @param {string} status - The node status
   * @param {string} location - The node location
   * @param {string} reason - The reason for the status
   * @param {string} description - The node description
   */
  async updateNode(interaction, nodeId, status, location, reason, description) {
    // Load current nodes data
    const nodes = await this.loadNodesData();
    
    // Update or add node
    nodes[nodeId] = {
      id: nodeId,
      status,
      location,
      reason: reason || '',
      description: description || '',
      lastUpdated: new Date().toISOString(),
      updatedBy: interaction.user.tag
    };
    
    // Save nodes data
    await this.saveNodesData(nodes);
    
    // Refresh the node embed
    await this.refreshNodeEmbed(true);
    
    // Log the update
    this.managers.logger.info('commands', `Node ${nodeId} updated by ${interaction.user.tag} (${interaction.user.id}): status=${status}, location=${location}`);
    
    return nodes[nodeId];
  }
  
  /**
   * Remove a node
   * @param {Object} interaction - The interaction object
   * @param {string} nodeId - The node ID
   */
  async removeNode(interaction, nodeId) {
    // Load current nodes data
    const nodes = await this.loadNodesData();
    
    // Check if node exists
    if (!nodes[nodeId]) {
      return false;
    }
    
    // Remove node
    delete nodes[nodeId];
    
    // Save nodes data
    await this.saveNodesData(nodes);
    
    // Refresh the node embed
    await this.refreshNodeEmbed(true);
    
    // Log the removal
    this.managers.logger.info('commands', `Node ${nodeId} removed by ${interaction.user.tag} (${interaction.user.id})`);
    
    return true;
  }
  
  /**
   * Refresh the node status embed
   * @param {boolean} force - Force refresh even if no changes
   */
  async refreshNodeEmbed(force = false) {
    if (!this.client || !this.nodesChannelId) {
      return;
    }
    
    try {
      // Get the nodes channel
      const channel = await this.client.channels.fetch(this.nodesChannelId).catch(() => null);
      
      if (!channel) {
        return;
      }
      
      // Load nodes data
      const nodes = await this.loadNodesData();
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('JMF Hosting Node Status')
        .setDescription('Current status of all hosting nodes')
        .setColor('#0099ff')
        .setTimestamp()
        .setFooter({ text: 'Last updated' });
      
      // Add fields for each node
      const nodeIds = Object.keys(nodes).sort();
      
      if (nodeIds.length === 0) {
        embed.addFields({ name: 'No Nodes', value: 'No nodes have been added yet.' });
      } else {
        for (const nodeId of nodeIds) {
          const node = nodes[nodeId];
          const statusEmoji = this.getStatusEmoji(node.status);
          const lastUpdated = new Date(node.lastUpdated).toLocaleString();
          
          let fieldValue = `**Status:** ${statusEmoji} ${node.status}\n`;
          fieldValue += `**Location:** ${node.location}\n`;
          
          if (node.reason) {
            fieldValue += `**Reason:** ${node.reason}\n`;
          }
          
          if (node.description) {
            fieldValue += `**Description:** ${node.description}\n`;
          }
          
          fieldValue += `**Last Updated:** ${lastUpdated}\n`;
          fieldValue += `**Updated By:** ${node.updatedBy}`;
          
          embed.addFields({ name: `Node ${node.id}`, value: fieldValue });
        }
      }
      
      // Find existing message or send new one
      if (this.nodeStatusMessageId) {
        try {
          const message = await channel.messages.fetch(this.nodeStatusMessageId);
          await message.edit({ embeds: [embed] });
        } catch (error) {
          // Message not found, send new one
          const message = await channel.send({ embeds: [embed] });
          this.nodeStatusMessageId = message.id;
        }
      } else {
        // Send new message
        const message = await channel.send({ embeds: [embed] });
        this.nodeStatusMessageId = message.id;
      }
    } catch (error) {
      this.managers.logger.error('system', `Error refreshing node embed: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Load nodes data from file
   * @returns {Object} The nodes data
   */
  async loadNodesData() {
    try {
      // Get data directory from database manager
      const dataDir = this.managers.database.getConfig('dataDirectory') || path.join(process.cwd(), 'data');
      const nodesFile = path.join(dataDir, 'nodes.json');
      
      // Check if file exists
      try {
        await fs.access(nodesFile);
      } catch (error) {
        // File doesn't exist, return empty object
        return {};
      }
      
      // Read and parse file
      const data = await fs.readFile(nodesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.managers.logger.error('system', `Error loading nodes data: ${error.message}`, error.stack);
      return {};
    }
  }
  
  /**
   * Save nodes data to file
   * @param {Object} nodes - The nodes data
   */
  async saveNodesData(nodes) {
    try {
      // Get data directory from database manager
      const dataDir = this.managers.database.getConfig('dataDirectory') || path.join(process.cwd(), 'data');
      const nodesFile = path.join(dataDir, 'nodes.json');
      
      // Ensure directory exists
      await fs.mkdir(dataDir, { recursive: true });
      
      // Write file
      await fs.writeFile(nodesFile, JSON.stringify(nodes, null, 2), 'utf8');
    } catch (error) {
      this.managers.logger.error('system', `Error saving nodes data: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Get emoji for node status
   * @param {string} status - The node status
   * @returns {string} The status emoji
   */
  getStatusEmoji(status) {
    switch (status.toLowerCase()) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'maintenance':
        return '🟠';
      case 'issues':
        return '🟡';
      case 'planned':
        return '🔵';
      default:
        return '⚪';
    }
  }
  
  /**
   * Get color for node status
   * @param {string} status - The node status
   * @returns {string} The status color
   */
  getStatusColor(status) {
    switch (status.toLowerCase()) {
      case 'online':
        return '#00ff00';
      case 'offline':
        return '#ff0000';
      case 'maintenance':
        return '#ff9900';
      case 'issues':
        return '#ffff00';
      case 'planned':
        return '#0099ff';
      default:
        return '#ffffff';
    }
  }
}

// Create the command
module.exports = {
  data: new SlashCommandBuilder()
    .setName('node')
    .setDescription('Manage hosting nodes')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update a node\'s status')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('The node ID')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('The node status')
            .setRequired(true)
            .addChoices(
              { name: 'Online', value: 'online' },
              { name: 'Offline', value: 'offline' },
              { name: 'Maintenance', value: 'maintenance' },
              { name: 'Issues', value: 'issues' },
              { name: 'Planned', value: 'planned' }
            )
        )
        .addStringOption(option =>
          option
            .setName('location')
            .setDescription('The node location')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('The reason for the status')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('The node description')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all nodes')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('refresh')
        .setDescription('Refresh the node status embed')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a node')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('The node ID')
            .setRequired(true)
        )
    ),
    
  nodeStatusManager: null,
  
  async execute(interaction) {
    // Get managers from global object
    const { logger, database, bot } = global.managers;
    
    try {
      // Initialize node status manager if not already initialized
      if (!this.nodeStatusManager) {
        this.nodeStatusManager = new NodeStatusManager(global.managers);
        await this.nodeStatusManager.init(interaction.client);
      }
      
      const subcommand = interaction.options.getSubcommand();
      
      // Handle subcommands
      if (subcommand === 'update') {
        await this.handleUpdateNode(interaction);
      } else if (subcommand === 'list') {
        await this.handleListNodes(interaction);
      } else if (subcommand === 'refresh') {
        await this.handleRefreshNodeEmbed(interaction);
      } else if (subcommand === 'remove') {
        await this.handleRemoveNode(interaction);
      }
    } catch (error) {
      logger.error('commands', `Error in node command: ${error.message}`, error.stack);
      
      return interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
        ephemeral: true
      });
    }
  },
  
  /**
   * Handle the update node subcommand
   * @param {Object} interaction - The interaction object
   */
  async handleUpdateNode(interaction) {
    const nodeId = interaction.options.getString('id');
    const status = interaction.options.getString('status');
    const location = interaction.options.getString('location');
    const reason = interaction.options.getString('reason');
    const description = interaction.options.getString('description');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const node = await this.nodeStatusManager.updateNode(
        interaction,
        nodeId,
        status,
        location,
        reason,
        description
      );
      
      return interaction.editReply({
        content: `✅ Node ${nodeId} has been updated with status: ${status}`,
        ephemeral: true
      });
    } catch (error) {
      global.managers.logger.error('commands', `Error updating node: ${error.message}`, error.stack);
      
      return interaction.editReply({
        content: `❌ An error occurred while updating the node: ${error.message}`,
        ephemeral: true
      });
    }
  },
  
  /**
   * Handle the list nodes subcommand
   * @param {Object} interaction - The interaction object
   */
  async handleListNodes(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const nodes = await this.nodeStatusManager.loadNodesData();
      const nodeIds = Object.keys(nodes);
      
      if (nodeIds.length === 0) {
        return interaction.editReply({
          content: 'No nodes have been added yet.',
          ephemeral: true
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('JMF Hosting Nodes')
        .setDescription(`Total nodes: ${nodeIds.length}`)
        .setColor('#0099ff')
        .setTimestamp();
      
      for (const nodeId of nodeIds) {
        const node = nodes[nodeId];
        const statusEmoji = this.nodeStatusManager.getStatusEmoji(node.status);
        
        embed.addFields({
          name: `Node ${node.id}`,
          value: `**Status:** ${statusEmoji} ${node.status}\n**Location:** ${node.location}`
        });
      }
      
      return interaction.editReply({
        embeds: [embed],
        ephemeral: true
      });
    } catch (error) {
      global.managers.logger.error('commands', `Error listing nodes: ${error.message}`, error.stack);
      
      return interaction.editReply({
        content: `❌ An error occurred while listing nodes: ${error.message}`,
        ephemeral: true
      });
    }
  },
  
  /**
   * Handle the refresh node embed subcommand
   * @param {Object} interaction - The interaction object
   */
  async handleRefreshNodeEmbed(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await this.nodeStatusManager.refreshNodeEmbed(true);
      
      return interaction.editReply({
        content: '✅ Node status embed has been refreshed.',
        ephemeral: true
      });
    } catch (error) {
      global.managers.logger.error('commands', `Error refreshing node embed: ${error.message}`, error.stack);
      
      return interaction.editReply({
        content: `❌ An error occurred while refreshing the node embed: ${error.message}`,
        ephemeral: true
      });
    }
  },
  
  /**
   * Handle the remove node subcommand
   * @param {Object} interaction - The interaction object
   */
  async handleRemoveNode(interaction) {
    const nodeId = interaction.options.getString('id');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const success = await this.nodeStatusManager.removeNode(interaction, nodeId);
      
      if (!success) {
        return interaction.editReply({
          content: `❌ Node ${nodeId} not found.`,
          ephemeral: true
        });
      }
      
      return interaction.editReply({
        content: `✅ Node ${nodeId} has been removed.`,
        ephemeral: true
      });
    } catch (error) {
      global.managers.logger.error('commands', `Error removing node: ${error.message}`, error.stack);
      
      return interaction.editReply({
        content: `❌ An error occurred while removing the node: ${error.message}`,
        ephemeral: true
      });
    }
  }
}; 