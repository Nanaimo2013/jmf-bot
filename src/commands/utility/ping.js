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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks the bot\'s latency and API response time'),
  
  async execute(interaction) {
    // Get managers from global object
    const { logger, database, bot } = global.managers;
    
    try {
      // Initial response
      const sent = await interaction.reply({ 
        content: 'Pinging...', 
        fetchReply: true 
      });
      
      // Calculate latencies
      const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.round(interaction.client.ws.ping);
      
      // Get database status
      const dbStatus = await database.getStatus();
      const dbLatency = dbStatus.latency || 'N/A';
      
      // Get config from bot manager
      const config = bot.getConfigManager().getConfig();
      
      // Create embed
      const pingEmbed = new EmbedBuilder()
        .setColor(config.embedColor || '#0099ff')
        .setTitle('🏓 Pong!')
        .addFields(
          { name: 'Roundtrip Latency', value: `${roundtripLatency}ms`, inline: true },
          { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
          { name: 'Database Latency', value: `${dbLatency}ms`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText || 'JMF Hosting Bot' });
      
      // Edit the reply with the embed
      await interaction.editReply({ 
        content: null, 
        embeds: [pingEmbed] 
      });
      
      // Log the ping
      logger.debug('commands', `Ping command executed by ${interaction.user.tag} (${interaction.user.id}): ${roundtripLatency}ms roundtrip, ${apiLatency}ms API, ${dbLatency}ms DB`);
    } catch (error) {
      // Log error
      logger.error('commands', `Error in ping command: ${error.message}`, error.stack);
      
      return interaction.editReply({
        content: `❌ An error occurred: ${error.message}`,
        embeds: []
      });
    }
  },
}; 