/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks the bot\'s latency and API response time'),
  
  async execute(interaction) {
    // Initial response
    const sent = await interaction.reply({ 
      content: 'Pinging...', 
      fetchReply: true 
    });
    
    // Calculate latencies
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    // Create embed
    const pingEmbed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Roundtrip Latency', value: `${roundtripLatency}ms`, inline: true },
        { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: config.footerText });
    
    // Edit the reply with the embed
    await interaction.editReply({ 
      content: null, 
      embeds: [pingEmbed] 
    });
  },
}; 