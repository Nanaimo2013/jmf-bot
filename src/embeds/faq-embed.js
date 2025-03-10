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
 * Creates a detailed FAQ embed for the JMF Hosting Discord server
 * @returns {EmbedBuilder} The FAQ embed
 */
function createFAQEmbed() {
  const faqEmbed = new EmbedBuilder()
    .setTitle('❓ JMF Hosting | Frequently Asked Questions')
    .setColor('#00AAFF')
    .setDescription('Welcome to JMF Hosting! Here are answers to our most commonly asked questions:')
    .addFields(
      { 
        name: '🔹 What game servers do you offer?',
        value: 'We provide hosting for Minecraft, ARK, Rust, Valheim, CS:GO, Garry\'s Mod, and many more popular games. Check our website for a complete list of supported games and pricing.',
        inline: false 
      },
      { 
        name: '🔹 How do I purchase a server?',
        value: 'Visit our website at jmfhosting.com, select your game, choose a plan that fits your needs, and follow the checkout process. After payment, your server will be set up automatically within minutes.',
        inline: false 
      },
      { 
        name: '🔹 What payment methods do you accept?',
        value: 'We accept credit/debit cards, PayPal, and various cryptocurrencies. All payments are processed securely through our payment gateway.',
        inline: false 
      },
      { 
        name: '🔹 How do I access my server control panel?',
        value: 'After purchasing, you\'ll receive login details for our custom control panel. Log in at panel.jmfhosting.com to manage your server, change settings, install mods, and more.',
        inline: false 
      },
      { 
        name: '🔹 Do you offer refunds?',
        value: 'We offer a 24-hour money-back guarantee if you\'re not satisfied with our service. After this period, we handle refund requests on a case-by-case basis according to our Terms of Service.',
        inline: false 
      },
      { 
        name: '🔹 How do I get support for my server?',
        value: 'Create a support ticket in the <#TICKET_CHANNEL_ID> channel. Our support team is available 24/7 to assist with any issues. Please provide your server ID and a detailed description of your problem.',
        inline: false 
      },
      { 
        name: '🔹 Can I upgrade my server later?',
        value: 'Yes! You can upgrade your server at any time through our control panel. The price difference will be prorated based on your remaining subscription time.',
        inline: false 
      },
      { 
        name: '🔹 How do I install mods or plugins?',
        value: 'Our control panel makes it easy to install mods with just a few clicks. We support popular mod platforms like CurseForge, Bukkit, and Steam Workshop depending on your game.',
        inline: false 
      },
      { 
        name: '🔹 What are your server specifications?',
        value: 'All our servers run on high-performance hardware with NVMe SSDs, modern CPUs, and ample RAM. We use enterprise-grade networking to ensure minimal latency and maximum uptime.',
        inline: false 
      },
      { 
        name: '🔹 Do you offer custom solutions?',
        value: 'Yes! If you need a custom server setup, dedicated resources, or special configurations, please contact our sales team through a ticket for a personalized quote.',
        inline: false 
      }
    )
    .addFields({
      name: '📞 Need More Help?',
      value: 'If your question isn\'t answered here, please create a support ticket in <#TICKET_CHANNEL_ID> or email us at support@jmfhosting.com',
      inline: false
    })
    .setFooter({ 
      text: 'JMF Hosting | Game Server Solutions', 
      iconURL: 'https://i.imgur.com/YourLogoHere.png' // Replace with your actual logo URL
    })
    .setTimestamp();

  return faqEmbed;
}

module.exports = { createFAQEmbed }; 