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
 * Creates a welcome embed for the JMF Hosting Discord server
 * @returns {EmbedBuilder} The welcome embed
 */
function createWelcomeEmbed() {
  const welcomeEmbed = new EmbedBuilder()
    .setTitle('🎮 Welcome to JMF Hosting! 🎮')
    .setColor(config.embedColor || '#00AAFF')
    .setDescription('**Premium Game Server Hosting Solutions**\n\nWelcome to the official JMF Hosting Discord server! We provide high-performance, reliable game server hosting with 24/7 support.\n\nPlease take a moment to read our server rules in <#rules> and verify yourself in <#verification> to gain access to the rest of the server.')
    .addFields(
      { 
        name: '🔹 About Us',
        value: 'JMF Hosting is dedicated to providing premium game server hosting solutions with exceptional performance, reliability, and customer support. Our team of experienced gamers and server administrators is committed to delivering the best possible hosting experience.',
        inline: false 
      },
      { 
        name: '🔹 Our Services',
        value: '• Game Server Hosting\n• Web Hosting\n• VPS Solutions\n• DDoS Protection\n• Custom Server Configurations\n• 24/7 Technical Support',
        inline: false 
      },
      { 
        name: '🔹 Getting Started',
        value: '1. Read the <#rules>\n2. Verify yourself in <#verification>\n3. Check out our available services\n4. Create a ticket in <#createTicket> if you need assistance',
        inline: false 
      },
      { 
        name: '🔹 Useful Links',
        value: '• [Website](https://jmfhosting.com)\n• [Control Panel](https://panel.jmfhosting.com)\n• [Knowledge Base](https://help.jmfhosting.com)\n• [Status Page](https://status.jmfhosting.com)',
        inline: false 
      }
    )
    .setFooter({ 
      text: config.footerText || 'JMF Hosting | Game Server Solutions'
    })
    .setTimestamp();

  return welcomeEmbed;
}

module.exports = { createWelcomeEmbed }; 