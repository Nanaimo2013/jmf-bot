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
 * Creates an announcement embed for the JMF Hosting Discord server
 * @param {string} type - The type of announcement (announcement, update, maintenance, game)
 * @returns {EmbedBuilder} The announcement embed
 */
function createAnnouncementEmbed(type = 'announcement') {
  let title, color, description, fields;
  
  // Set default values based on announcement type
  switch (type) {
    case 'update':
      title = '🚀 Service Update';
      color = '#00FF00';
      description = 'We\'re excited to announce the following updates to our services:';
      fields = [
        { 
          name: '✨ New Features',
          value: '• Feature 1: Description of the new feature\n• Feature 2: Description of the new feature\n• Feature 3: Description of the new feature',
          inline: false 
        },
        { 
          name: '🔧 Improvements',
          value: '• Improvement 1: Description of the improvement\n• Improvement 2: Description of the improvement',
          inline: false 
        },
        { 
          name: '🐛 Bug Fixes',
          value: '• Fixed an issue where...\n• Resolved a problem with...\n• Addressed performance issues in...',
          inline: false 
        },
        { 
          name: '📅 Effective Date',
          value: 'These changes are now live on all our servers.',
          inline: false 
        }
      ];
      break;
      
    case 'maintenance':
      title = '🔧 Scheduled Maintenance';
      color = '#FFA500';
      description = 'We will be performing scheduled maintenance on our services. Please be aware of the following details:';
      fields = [
        { 
          name: '📅 Date & Time',
          value: '• Start: [DATE] at [TIME] UTC\n• End: [DATE] at [TIME] UTC\n• Duration: Approximately [X] hours',
          inline: false 
        },
        { 
          name: '🔍 Affected Services',
          value: '• [Service 1]\n• [Service 2]\n• [Service 3]',
          inline: false 
        },
        { 
          name: '📝 Maintenance Details',
          value: 'During this maintenance window, we will be [brief description of maintenance activities]. This is necessary to [reason for maintenance].',
          inline: false 
        },
        { 
          name: '⚠️ Expected Impact',
          value: 'During the maintenance period, you may experience [description of potential service disruptions]. We recommend [any recommended actions for users].',
          inline: false 
        },
        { 
          name: '📢 Updates',
          value: 'We will post updates in <#status> and on our [status page](https://status.jmfhosting.com).',
          inline: false 
        }
      ];
      break;
      
    case 'game':
      title = '🎮 Game Server Update';
      color = '#9B59B6';
      description = 'Important information about our game server offerings:';
      fields = [
        { 
          name: '🆕 New Game Support',
          value: 'We\'re excited to announce that we now support [Game Name]! Check out our website for pricing and features.',
          inline: false 
        },
        { 
          name: '🔄 Game Version Updates',
          value: '• [Game 1]: Updated to version X.Y.Z\n• [Game 2]: Updated to version A.B.C\n• [Game 3]: Updated to version M.N.O',
          inline: false 
        },
        { 
          name: '🛠️ Mod Support',
          value: 'We\'ve added support for the following popular mods:\n• [Mod 1]\n• [Mod 2]\n• [Mod 3]',
          inline: false 
        },
        { 
          name: '💰 Special Promotion',
          value: 'For a limited time, use code **GAMEON** for 20% off your first month on any new game server!',
          inline: false 
        }
      ];
      break;
      
    case 'announcement':
    default:
      title = '📢 Important Announcement';
      color = config.embedColor || '#00AAFF';
      description = 'We have an important announcement to share with our community:';
      fields = [
        { 
          name: '📝 Announcement Details',
          value: 'Details of the announcement go here. This can be multiple lines long and include important information that you want to share with your community.',
          inline: false 
        },
        { 
          name: '🔍 What This Means For You',
          value: 'Explanation of how this announcement affects users and what actions they may need to take.',
          inline: false 
        },
        { 
          name: '📅 Timeline',
          value: 'Information about when changes will take effect or important dates related to this announcement.',
          inline: false 
        },
        { 
          name: '❓ Questions?',
          value: 'If you have any questions about this announcement, please create a ticket in <#createTicket> and our team will be happy to assist you.',
          inline: false 
        }
      ];
      break;
  }
  
  // Create the embed
  const announcementEmbed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setDescription(description)
    .addFields(fields)
    .setFooter({ 
      text: config.footerText || 'JMF Hosting | Game Server Solutions'
    })
    .setTimestamp();

  return announcementEmbed;
}

module.exports = { createAnnouncementEmbed }; 