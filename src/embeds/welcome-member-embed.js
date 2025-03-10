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
 * Creates a welcome embed for when a user joins the server
 * @param {GuildMember} member - The member who joined
 * @returns {EmbedBuilder} The welcome embed
 */
function createWelcomeMemberEmbed(member) {
  const { user, guild } = member;
  
  // Get welcome message from config or use default
  const welcomeMessage = config.welcomeSystem?.message || 
    `Welcome to the server, ${member}! We're glad to have you here.`;
  
  // Create the embed
  const welcomeEmbed = new EmbedBuilder()
    .setTitle('👋 New Member Joined')
    .setDescription(welcomeMessage.replace('{user}', member.toString())
      .replace('{server}', guild.name)
      .replace('{memberCount}', guild.memberCount.toString()))
    .setColor(config.welcomeSystem?.embedColor || config.embedColor || '#00FF00')
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { 
        name: '📊 Member Count', 
        value: `You are our ${guild.memberCount}${getNumberSuffix(guild.memberCount)} member!`, 
        inline: true 
      },
      { 
        name: '📅 Account Created', 
        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, 
        inline: true 
      }
    );
  
  // Add server rules mention if configured
  if (config.channels?.rules) {
    welcomeEmbed.addFields({
      name: '📜 Server Rules',
      value: `Please read our rules in <#${config.channels.rules}> to ensure a great experience for everyone.`,
      inline: false
    });
  }
  
  // Add verification mention if enabled
  if (config.verification?.enabled && config.channels?.verification) {
    welcomeEmbed.addFields({
      name: '🔐 Verification',
      value: `Please verify yourself in <#${config.channels.verification}> to access all channels.`,
      inline: false
    });
  }
  
  // Add footer and timestamp
  welcomeEmbed
    .setFooter({ 
      text: config.footerText || 'JMF Hosting | Game Server Solutions',
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTimestamp();
  
  return welcomeEmbed;
}

/**
 * Get the suffix for a number (1st, 2nd, 3rd, etc.)
 * @param {number} n - The number
 * @returns {string} The suffix
 */
function getNumberSuffix(n) {
  if (n >= 11 && n <= 13) return 'th';
  
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

module.exports = { createWelcomeMemberEmbed }; 