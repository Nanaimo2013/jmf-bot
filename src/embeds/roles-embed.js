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
 * Creates a roles embed for the JMF Hosting Discord server
 * @returns {EmbedBuilder} The roles embed
 */
function createRolesEmbed() {
  const rolesEmbed = new EmbedBuilder()
    .setTitle('🎭 Server Roles')
    .setColor(config.embedColor || '#00AAFF')
    .setDescription('Here\'s an overview of the roles in our Discord server and what they mean:')
    .addFields(
      { 
        name: '👑 Staff Roles',
        value: `**${config.roles?.owner || 'Owner'}** - Server owner and company founder\n` +
               `**${config.roles?.admin || 'Administrator'}** - Server administrators with full permissions\n` +
               `**${config.roles?.moderator || 'Moderator'}** - Moderators who enforce server rules\n` +
               `**${config.roles?.support || 'Support Staff'}** - Technical support team members`,
        inline: false 
      },
      { 
        name: '🌟 Special Roles',
        value: `**${config.roles?.developer || 'Developer'}** - Official JMF Hosting developers\n` +
               `**${config.roles?.partner || 'Partner'}** - Official business partners and affiliates\n` +
               `**${config.roles?.contentCreator || 'Content Creator'}** - Streamers and content creators`,
        inline: false 
      },
      { 
        name: '💎 Premium Roles',
        value: `**${config.roles?.premiumTier3 || 'Premium Tier 3'}** - Highest tier premium members\n` +
               `**${config.roles?.premiumTier2 || 'Premium Tier 2'}** - Mid-tier premium members\n` +
               `**${config.roles?.premiumTier1 || 'Premium Tier 1'}** - Entry-level premium members`,
        inline: false 
      },
      { 
        name: '👥 Community Roles',
        value: `**${config.roles?.activeMember || 'Active Member'}** - Active community members\n` +
               `**${config.roles?.member || 'Member'}** - Verified server members\n` +
               `**${config.roles?.unverified || 'Unverified'}** - New members who haven't verified yet`,
        inline: false 
      },
      { 
        name: '🎮 Game-Specific Roles',
        value: 'We also have roles for specific games that you can assign yourself in <#botCommands> using the `/role` command. These roles allow you to receive notifications for updates and events related to your favorite games.',
        inline: false 
      },
      { 
        name: '📊 Level Roles',
        value: 'As you chat and participate in our server, you\'ll earn XP and level up. Certain levels will automatically grant you special roles with additional perks:\n\n' +
               '**Level 5** - Early access to announcements\n' +
               '**Level 10** - Access to exclusive giveaways\n' +
               '**Level 20** - Special Discord profile badge\n' +
               '**Level 30** - Discount codes for our services\n' +
               '**Level 50** - VIP status and custom role color',
        inline: false 
      }
    )
    .setFooter({ 
      text: config.footerText || 'JMF Hosting | Game Server Solutions'
    })
    .setTimestamp();

  return rolesEmbed;
}

module.exports = { createRolesEmbed }; 