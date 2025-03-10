/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const logger = require('../utils/logger');

/**
 * Create a server stats embed
 * @param {Object} stats - Server statistics
 * @returns {Object} - Embed and components
 */
function createServerStatsEmbed(stats) {
  try {
    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle('📊 JMF Hosting Statistics')
      .setColor(config.embedColor || '#0099ff')
      .setTimestamp()
      .setFooter({ 
        text: `${config.footerText || 'JMF Hosting'} • Last Updated`,
        iconURL: stats.guild?.iconURL({ dynamic: true }) 
      });

    // Add member stats
    if (stats.members) {
      embed.addFields({
        name: '👥 Member Statistics',
        value: [
          `**Total Members:** ${stats.members.total.toLocaleString()}`,
          `**Human Members:** ${stats.members.humans.toLocaleString()}`,
          `**Bot Members:** ${stats.members.bots.toLocaleString()}`,
          `**Online Members:** ${stats.members.online.toLocaleString()}`,
          `**New Today:** ${stats.members.newToday.toLocaleString()}`
        ].join('\n'),
        inline: true
      });
    }

    // Add server stats
    if (stats.servers) {
      embed.addFields({
        name: '🖥️ Server Statistics',
        value: [
          `**Total Servers:** ${stats.servers.total.toLocaleString()}`,
          `**Active Servers:** ${stats.servers.active.toLocaleString()}`,
          `**Suspended Servers:** ${stats.servers.suspended.toLocaleString()}`,
          `**CPU Usage:** ${stats.servers.cpuUsage}%`,
          `**RAM Usage:** ${stats.servers.ramUsage}%`
        ].join('\n'),
        inline: true
      });
    }

    // Add node stats
    if (stats.nodes) {
      embed.addFields({
        name: '🌐 Node Statistics',
        value: [
          `**Total Nodes:** ${stats.nodes.total.toLocaleString()}`,
          `**Online Nodes:** ${stats.nodes.online.toLocaleString()}`,
          `**Offline Nodes:** ${stats.nodes.offline.toLocaleString()}`,
          `**Average Load:** ${stats.nodes.averageLoad}%`,
          `**Total Storage:** ${stats.nodes.totalStorage}`
        ].join('\n'),
        inline: true
      });
    }

    // Add customer stats
    if (stats.customers) {
      embed.addFields({
        name: '💼 Customer Statistics',
        value: [
          `**Total Customers:** ${stats.customers.total.toLocaleString()}`,
          `**Active Customers:** ${stats.customers.active.toLocaleString()}`,
          `**New This Month:** ${stats.customers.newThisMonth.toLocaleString()}`,
          `**Support Tickets:** ${stats.customers.supportTickets.toLocaleString()}`,
          `**Satisfaction Rate:** ${stats.customers.satisfactionRate}%`
        ].join('\n'),
        inline: true
      });
    }

    // Add financial stats if available and authorized
    if (stats.financial && stats.isAuthorized) {
      embed.addFields({
        name: '💰 Financial Statistics',
        value: [
          `**Monthly Revenue:** $${stats.financial.monthlyRevenue.toLocaleString()}`,
          `**Annual Revenue:** $${stats.financial.annualRevenue.toLocaleString()}`,
          `**Average Order:** $${stats.financial.averageOrder.toLocaleString()}`,
          `**Active Subscriptions:** ${stats.financial.activeSubscriptions.toLocaleString()}`,
          `**Renewal Rate:** ${stats.financial.renewalRate}%`
        ].join('\n'),
        inline: true
      });
    }

    // Add system status
    if (stats.system) {
      embed.addFields({
        name: '🚦 System Status',
        value: [
          `**API Status:** ${stats.system.apiStatus ? '✅ Online' : '❌ Offline'}`,
          `**Database Status:** ${stats.system.databaseStatus ? '✅ Online' : '❌ Offline'}`,
          `**Website Status:** ${stats.system.websiteStatus ? '✅ Online' : '❌ Offline'}`,
          `**Game Panel Status:** ${stats.system.gamePanelStatus ? '✅ Online' : '❌ Offline'}`,
          `**Billing System Status:** ${stats.system.billingStatus ? '✅ Online' : '❌ Offline'}`
        ].join('\n'),
        inline: true
      });
    }

    // Add refresh button
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('refresh_stats')
          .setLabel('Refresh Statistics')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔄')
      );

    return { embed, components: [row] };
  } catch (error) {
    logger.error(`Error creating server stats embed: ${error.message}`);
    
    // Return a simple error embed
    const errorEmbed = new EmbedBuilder()
      .setTitle('Error Creating Statistics')
      .setDescription('An error occurred while generating the server statistics.')
      .setColor('#FF0000')
      .setTimestamp();
    
    return { embed: errorEmbed, components: [] };
  }
}

module.exports = { createServerStatsEmbed }; 