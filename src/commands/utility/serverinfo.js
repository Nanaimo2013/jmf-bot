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
const logger = require('../../utils/logger');
const config = require('../../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display information about the server'),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const { guild } = interaction;
      
      // Fetch more guild data
      await guild.fetch();
      
      // Get guild features in a readable format
      const features = guild.features.map(feature => 
        feature.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
      );
      
      // Get member counts
      const totalMembers = guild.memberCount;
      const botCount = guild.members.cache.filter(member => member.user.bot).size;
      const humanCount = totalMembers - botCount;
      
      // Get channel counts
      const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
      const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size;
      const forumChannels = guild.channels.cache.filter(c => c.type === 15).size;
      const totalChannels = guild.channels.cache.size;
      
      // Get role count
      const roleCount = guild.roles.cache.size - 1; // Subtract @everyone
      
      // Get emoji counts
      const regularEmojis = guild.emojis.cache.filter(emoji => !emoji.animated).size;
      const animatedEmojis = guild.emojis.cache.filter(emoji => emoji.animated).size;
      const totalEmojis = regularEmojis + animatedEmojis;
      
      // Get boost status
      const boostLevel = guild.premiumTier;
      const boostCount = guild.premiumSubscriptionCount;
      
      // Create server info embed
      const serverInfoEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`${guild.name} Server Information`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
        .addFields(
          { name: 'Server ID', value: guild.id, inline: true },
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false },
          { name: 'Members', value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}`, inline: true },
          { name: 'Channels', value: `Total: ${totalChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}\nForums: ${forumChannels}`, inline: true },
          { name: 'Roles', value: `${roleCount}`, inline: true },
          { name: 'Emojis', value: `Total: ${totalEmojis}\nRegular: ${regularEmojis}\nAnimated: ${animatedEmojis}`, inline: true },
          { name: 'Boost Status', value: `Level: ${boostLevel}\nBoosts: ${boostCount}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: config.footerText });
      
      // Add server banner if available
      if (guild.banner) {
        serverInfoEmbed.setImage(guild.bannerURL({ size: 1024 }));
      }
      
      // Add server features if available
      if (features.length > 0) {
        serverInfoEmbed.addFields({ name: 'Features', value: features.join(', '), inline: false });
      }
      
      // Add server description if available
      if (guild.description) {
        serverInfoEmbed.setDescription(guild.description);
      }
      
      await interaction.editReply({ embeds: [serverInfoEmbed] });
      
    } catch (error) {
      logger.error(`Error in serverinfo command: ${error.message}`);
      await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
    }
  }
}; 