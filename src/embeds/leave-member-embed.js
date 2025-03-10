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
 * Creates a leave embed for when a user leaves the server
 * @param {GuildMember} member - The member who left
 * @returns {EmbedBuilder} The leave embed
 */
function createLeaveMemberEmbed(member) {
  const { user, guild } = member;
  
  // Get leave message from config or use default
  const leaveMessage = config.leaveSystem?.message || 
    `**${user.tag}** has left the server.`;
  
  // Create the embed
  const leaveEmbed = new EmbedBuilder()
    .setTitle('👋 Member Left')
    .setDescription(leaveMessage.replace('{user}', user.tag)
      .replace('{server}', guild.name)
      .replace('{memberCount}', guild.memberCount.toString()))
    .setColor(config.leaveSystem?.embedColor || '#FF0000')
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { 
        name: '📊 Member Count', 
        value: `We now have ${guild.memberCount} members`, 
        inline: true 
      }
    );
  
  // Add join date if available
  if (member.joinedAt) {
    const joinDuration = Math.floor((Date.now() - member.joinedAt) / (1000 * 60 * 60 * 24));
    leaveEmbed.addFields({ 
      name: '📅 Member Since', 
      value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D> (${joinDuration} days)`,
      inline: true 
    });
  }
  
  // Add roles if available and configured
  if (config.leaveSystem?.showRoles && member.roles.cache.size > 1) {
    const roles = member.roles.cache
      .filter(role => role.id !== guild.id) // Filter out @everyone role
      .sort((a, b) => b.position - a.position) // Sort by position (highest first)
      .map(role => role.toString())
      .slice(0, 10) // Limit to 10 roles
      .join(', ');
    
    if (roles) {
      leaveEmbed.addFields({ 
        name: '🏷️ Roles', 
        value: roles.length > 1024 ? roles.substring(0, 1021) + '...' : roles,
        inline: false 
      });
    }
  }
  
  // Add footer and timestamp
  leaveEmbed
    .setFooter({ 
      text: config.footerText || 'JMF Hosting | Game Server Solutions',
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTimestamp();
  
  return leaveEmbed;
}

module.exports = { createLeaveMemberEmbed }; 