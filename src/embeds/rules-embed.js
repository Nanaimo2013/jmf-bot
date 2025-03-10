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

/**
 * Creates a detailed rules embed for the JMF Hosting Discord server
 * @returns {EmbedBuilder} The rules embed
 */
function createRulesEmbed() {
  const rulesEmbed = new EmbedBuilder()
    .setTitle('📜 JMF Hosting | Server Rules')
    .setColor('#00AAFF')
    .setDescription('Welcome to the JMF Hosting community! To ensure a positive experience for everyone, please follow these rules:')
    .addFields(
      { 
        name: '1️⃣ Respect All Members', 
        value: '• Treat everyone with respect and courtesy\n• No harassment, hate speech, or discrimination\n• Be mindful of cultural differences and personal boundaries\n• Respect the staff and their decisions', 
        inline: false 
      },
      { 
        name: '2️⃣ Appropriate Content Only', 
        value: '• No NSFW or explicit content\n• No gore, violence, or disturbing imagery\n• No political or religious discussions\n• Keep conversations family-friendly', 
        inline: false 
      },
      { 
        name: '3️⃣ No Spamming or Flooding', 
        value: '• Don\'t send repeated messages\n• Avoid excessive emoji use\n• Don\'t abuse mentions (@everyone, @here)\n• Use appropriate channels for your messages', 
        inline: false 
      },
      { 
        name: '4️⃣ No Advertising', 
        value: '• No unsolicited advertising of other services\n• No self-promotion without permission\n• No DM advertising to members\n• Partnership requests should go through staff', 
        inline: false 
      },
      { 
        name: '5️⃣ Voice Chat Etiquette', 
        value: '• No voice changers or earrape\n• Don\'t disrupt others in voice channels\n• No channel hopping\n• Mute your mic when not speaking for extended periods', 
        inline: false 
      },
      { 
        name: '6️⃣ Account & Server Security', 
        value: '• No sharing of personal information\n• No phishing links or malware\n• Report suspicious activity to staff\n• Don\'t share account credentials', 
        inline: false 
      },
      { 
        name: '7️⃣ Support Guidelines', 
        value: '• Use the ticket system for support\n• Be patient with support staff\n• Provide clear information about your issue\n• Follow staff instructions during troubleshooting', 
        inline: false 
      },
      { 
        name: '8️⃣ Gaming & Services', 
        value: '• No cheating or exploiting in our services\n• Report bugs through proper channels\n• Don\'t abuse server resources\n• Follow specific rules for each game server', 
        inline: false 
      }
    )
    .addFields({
      name: '⚠️ Rule Enforcement',
      value: 'Violations may result in warnings, temporary mutes, kicks, or bans depending on severity and frequency. Staff have final say in all moderation decisions.',
      inline: false
    })
    .setFooter({ 
      text: 'JMF Hosting | Game Server Solutions', 
      iconURL: 'https://i.imgur.com/YourLogoHere.png' // Replace with your actual logo URL
    })
    .setTimestamp();

  return rulesEmbed;
}

module.exports = { createRulesEmbed }; 