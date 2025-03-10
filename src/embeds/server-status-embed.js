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

/**
 * Creates a server status embed for the JMF Hosting Discord server
 * @param {Array} servers - Array of server status objects
 * @returns {EmbedBuilder} The server status embed
 */
function createServerStatusEmbed(servers = []) {
  // Create the embed
  const serverStatusEmbed = new EmbedBuilder()
    .setTitle('🎮 Game Server Status')
    .setColor(config.embedColor || '#00AAFF')
    .setDescription('Current status of JMF Hosting game servers')
    .setFooter({ 
      text: config.footerText || 'JMF Hosting | Game Server Solutions'
    })
    .setTimestamp();
  
  // If no servers, add a placeholder field
  if (!servers || servers.length === 0) {
    serverStatusEmbed.addFields({
      name: 'No Servers Available',
      value: 'No game servers are currently being monitored. This could be due to maintenance or a temporary issue with our status system.',
      inline: false
    });
    
    return serverStatusEmbed;
  }
  
  // Group servers by game type
  const serversByGame = {};
  
  for (const server of servers) {
    if (!serversByGame[server.game]) {
      serversByGame[server.game] = [];
    }
    serversByGame[server.game].push(server);
  }
  
  // Add fields for each game type
  for (const [game, gameServers] of Object.entries(serversByGame)) {
    let serverList = '';
    
    for (const server of gameServers) {
      const statusEmoji = getStatusEmoji(server.status);
      serverList += `${statusEmoji} **${server.name}**`;
      
      if (server.players !== undefined) {
        serverList += ` - ${server.players.current}/${server.players.max} players`;
      }
      
      if (server.location) {
        serverList += ` (${server.location})`;
      }
      
      serverList += '\n';
    }
    
    serverStatusEmbed.addFields({ 
      name: `🎲 ${game}`, 
      value: serverList, 
      inline: false 
    });
  }
  
  // Add uptime information
  serverStatusEmbed.addFields({ 
    name: '📊 System Status', 
    value: 'For detailed system status and planned maintenance, visit our [status page](https://status.jmfhosting.com).', 
    inline: false 
  });
  
  return serverStatusEmbed;
}

/**
 * Get emoji for a server status
 * @param {string} status - The server status
 * @returns {string} The status emoji
 */
function getStatusEmoji(status) {
  switch (status.toLowerCase()) {
    case 'online':
    case 'running':
      return '🟢';
    case 'starting':
    case 'restarting':
      return '🟡';
    case 'offline':
    case 'stopped':
      return '🔴';
    case 'suspended':
      return '⛔';
    default:
      return '⚪';
  }
}

module.exports = { createServerStatusEmbed }; 