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
const moment = require('moment');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Displays information about the Discord server'),
  
  async execute(interaction) {
    const { guild } = interaction;
    
    // Get guild information
    const owner = await guild.fetchOwner();
    const createdAt = moment(guild.createdAt).format('MMMM Do YYYY, h:mm:ss a');
    const createdDuration = moment(guild.createdAt).fromNow();
    
    // Get member counts
    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter(member => member.user.bot).size;
    const humanCount = totalMembers - botCount;
    const onlineCount = guild.members.cache.filter(member => member.presence?.status === 'online').size;
    
    // Get channel counts
    const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size;
    const categoryChannels = guild.channels.cache.filter(channel => channel.type === 4).size;
    
    // Get role count
    const roleCount = guild.roles.cache.size - 1; // Subtract @everyone role
    
    // Get boost information
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount;
    
    // Create embed
    const serverEmbed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`${guild.name} Server Information`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: '📋 Server ID', value: guild.id, inline: true },
        { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
        { name: '🌍 Region', value: guild.preferredLocale, inline: true },
        { name: '📆 Created', value: `${createdAt}\n(${createdDuration})`, inline: false },
        { 
          name: '👥 Members', 
          value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}\nOnline: ${onlineCount}`, 
          inline: true 
        },
        { 
          name: '💬 Channels', 
          value: `Total: ${textChannels + voiceChannels + categoryChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}`, 
          inline: true 
        },
        { name: '🏷️ Roles', value: `${roleCount}`, inline: true },
        { 
          name: '🚀 Boost Status', 
          value: `Level: ${boostLevel}\nBoosts: ${boostCount}`, 
          inline: true 
        }
      )
      .setImage(guild.bannerURL({ size: 1024 }) || null)
      .setTimestamp()
      .setFooter({ text: config.footerText });
    
    // Send the embed
    await interaction.reply({ embeds: [serverEmbed] });
  },
}; 