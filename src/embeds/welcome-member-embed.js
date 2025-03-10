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
 * Create a welcome embed for a new member
 * @param {GuildMember} member - The member who joined
 * @returns {EmbedBuilder} The welcome embed
 */
function createWelcomeMemberEmbed(member) {
  const { guild, user } = member;
  
  // Get configuration
  const welcomeConfig = config.welcomeSystem || {};
  const embedColor = welcomeConfig.embedColor || config.embedColor || '#00FF00';
  
  // Get important channels
  const rulesChannel = guild.channels.cache.find(
    channel => channel.name === (config.channels?.rules || '📜︱rules') || 
              channel.id === config.channels?.rules
  );
  
  const generalChannel = guild.channels.cache.find(
    channel => channel.name === (config.channels?.general || '💬︱general') || 
              channel.id === config.channels?.general
  );
  
  const verificationChannel = guild.channels.cache.find(
    channel => channel.name === (config.channels?.verification || '🔐︱verification') || 
              channel.id === config.channels?.verification
  );
  
  // Create welcome message with channel mentions
  let welcomeMessage = welcomeConfig.message || 
    `Welcome to the ${guild.name} Discord server, {user}! We're glad to have you here.`;
  
  // Replace placeholders
  welcomeMessage = welcomeMessage
    .replace('{user}', `<@${user.id}>`)
    .replace('{server}', guild.name)
    .replace('{memberCount}', guild.memberCount)
    .replace('{rules}', rulesChannel ? `<#${rulesChannel.id}>` : 'rules channel')
    .replace('{general}', generalChannel ? `<#${generalChannel.id}>` : 'general channel')
    .replace('{verification}', verificationChannel ? `<#${verificationChannel.id}>` : 'verification channel')
    .replace('{RULES_CHANNEL_ID}', rulesChannel ? rulesChannel.id : '');
  
  // Create the embed
  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`Welcome to ${guild.name}!`)
    .setDescription(welcomeMessage)
    .setColor(embedColor)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { 
        name: '📅 Account Created', 
        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, 
        inline: true 
      },
      { 
        name: '👥 Member Count', 
        value: `${guild.memberCount}`, 
        inline: true 
      }
    );
  
  // Add useful links section with channel mentions
  let usefulLinks = '';
  
  if (rulesChannel) {
    usefulLinks += `📜 Rules: <#${rulesChannel.id}>\n`;
  }
  
  if (generalChannel) {
    usefulLinks += `💬 Chat: <#${generalChannel.id}>\n`;
  }
  
  if (verificationChannel && config.verification?.enabled) {
    usefulLinks += `🔐 Verification: <#${verificationChannel.id}>\n`;
  }
  
  if (usefulLinks) {
    welcomeEmbed.addFields({ name: '🔗 Useful Channels', value: usefulLinks, inline: false });
  }
  
  // Add footer
  welcomeEmbed.setFooter({ 
    text: config.footerText || 'JMF Hosting | Game Server Solutions',
    iconURL: guild.iconURL({ dynamic: true })
  });
  
  welcomeEmbed.setTimestamp();
  
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