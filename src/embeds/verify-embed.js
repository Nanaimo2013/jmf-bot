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
 * Creates an improved verification embed for the JMF Hosting Discord server
 * @returns {EmbedBuilder} The verification embed
 */
function createVerifyEmbed() {
  const verifyEmbed = new EmbedBuilder()
    .setTitle('🔐 Server Verification')
    .setColor(config.verification?.embedColor || '#00FF00')
    .setDescription('**Welcome to the JMF Hosting Discord Server!**\n\nTo access all channels and features, please verify your account by clicking the button below. This helps us maintain a safe and secure community.')
    .addFields(
      { 
        name: '📋 Why Verify?',
        value: '• Access to all server channels and features\n• Participate in community discussions\n• Get support for your game servers\n• Join events and giveaways\n• Stay updated with announcements',
        inline: false 
      },
      { 
        name: '🛡️ Server Rules',
        value: 'By verifying, you agree to follow our server rules. Please review them in <#rules> before proceeding.',
        inline: false 
      },
      { 
        name: '🔍 Having Issues?',
        value: 'If you encounter any problems with verification, please contact a staff member or create a ticket in <#createTicket>.',
        inline: false 
      }
    )
    .setImage('https://i.imgur.com/YourBannerImage.png') // Replace with your actual banner image
    .setFooter({ 
      text: config.footerText || 'JMF Hosting | Game Server Solutions'
    })
    .setTimestamp();

  return verifyEmbed;
}

module.exports = { createVerifyEmbed }; 