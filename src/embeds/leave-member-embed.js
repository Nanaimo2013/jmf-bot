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
 * Create a leave embed for a member who left
 * @param {GuildMember} member - The member who left
 * @returns {EmbedBuilder} The leave embed
 */
function createLeaveMemberEmbed(member) {
  const { guild, user } = member;
  
  // Get configuration
  const leaveConfig = config.leaveSystem || {};
  const embedColor = leaveConfig.embedColor || config.embedColor || '#FF0000';
  
  // Create leave message
  let leaveMessage = leaveConfig.message || 
    `**{user}** has left the server. We hope to see them again soon!`;
  
  // Replace placeholders
  leaveMessage = leaveMessage
    .replace('{user}', user.tag)
    .replace('{server}', guild.name)
    .replace('{memberCount}', guild.memberCount);
  
  // Create the embed
  const leaveEmbed = new EmbedBuilder()
    .setTitle('👋 Member Left')
    .setDescription(leaveMessage)
    .setColor(embedColor)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { 
        name: '👤 User', 
        value: `${user.tag} (${user.id})`, 
        inline: true 
      },
      { 
        name: '👥 Member Count', 
        value: `${guild.memberCount}`, 
        inline: true 
      }
    );
  
  // Add join date if available
  if (member.joinedTimestamp) {
    const joinDuration = Date.now() - member.joinedTimestamp;
    const days = Math.floor(joinDuration / (1000 * 60 * 60 * 24));
    const hours = Math.floor((joinDuration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((joinDuration % (1000 * 60 * 60)) / (1000 * 60));
    
    leaveEmbed.addFields({ 
      name: '📅 Member Since', 
      value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R> (${days}d ${hours}h ${minutes}m)`, 
      inline: false 
    });
  }
  
  // Add roles if configured
  if (leaveConfig.showRoles && member.roles.cache.size > 1) {
    const roles = member.roles.cache
      .filter(role => role.id !== guild.id) // Filter out @everyone role
      .sort((a, b) => b.position - a.position) // Sort by position (highest first)
      .map(role => `<@&${role.id}>`)
      .join(', ');
    
    if (roles) {
      leaveEmbed.addFields({ 
        name: '🏷️ Roles', 
        value: roles, 
        inline: false 
      });
    }
  }
  
  // Add footer
  leaveEmbed.setFooter({ 
    text: config.footerText || 'JMF Hosting | Game Server Solutions',
    iconURL: guild.iconURL({ dynamic: true })
  });
  
  leaveEmbed.setTimestamp();
  
  return leaveEmbed;
}

module.exports = { createLeaveMemberEmbed }; 