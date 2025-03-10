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
const config = require('../../config.json');
const fs = require('fs/promises');
const path = require('path');

/**
 * Creates a node status embed for the JMF Hosting Discord server
 * @returns {EmbedBuilder} The node status embed
 */
async function createNodeStatusEmbed() {
  // Load nodes data
  const nodes = await loadNodesData();
  
  // Create the embed
  const nodeStatusEmbed = new EmbedBuilder()
    .setTitle('🖥️ JMF Hosting Node Status')
    .setColor(config.embedColor || '#00AAFF')
    .setDescription('Current status of all hosting nodes')
    .setFooter({ 
      text: config.footerText || 'JMF Hosting | Game Server Solutions'
    })
    .setTimestamp();
  
  // If no nodes, add a placeholder field
  if (Object.keys(nodes).length === 0) {
    nodeStatusEmbed.addFields({
      name: 'No Nodes Configured',
      value: 'No nodes have been added to the status system yet. Use the `/node update` command to add nodes.',
      inline: false
    });
    
    return nodeStatusEmbed;
  }
  
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
      const statusEmoji = getStatusEmoji(node.status);
      nodeList += `${statusEmoji} **${node.id}**: ${node.status.charAt(0).toUpperCase() + node.status.slice(1)}`;
      
      if (node.reason) {
        nodeList += ` - ${node.reason}`;
      }
      
      nodeList += '\n';
    }
    
    nodeStatusEmbed.addFields({ 
      name: `📍 ${location}`, 
      value: nodeList, 
      inline: false 
    });
  }
  
  return nodeStatusEmbed;
}

/**
 * Load nodes data from file
 * @returns {Promise<Object>} The nodes data
 */
async function loadNodesData() {
  try {
    const dataDir = path.join(__dirname, '../../data');
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
    console.error(`Error loading nodes data: ${error.message}`);
    return {};
  }
}

/**
 * Get emoji for a node status
 * @param {string} status - The node status
 * @returns {string} The status emoji
 */
function getStatusEmoji(status) {
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

module.exports = { createNodeStatusEmbed }; 