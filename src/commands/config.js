/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Manage bot configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current configuration')
        .addStringOption(option =>
          option
            .setName('section')
            .setDescription('Configuration section to view')
            .setRequired(false)
            .addChoices(
              { name: 'General', value: 'general' },
              { name: 'Channels', value: 'channels' },
              { name: 'Roles', value: 'roles' },
              { name: 'Leveling', value: 'levelSystem' },
              { name: 'Economy', value: 'economy' },
              { name: 'Mining', value: 'miningGame' },
              { name: 'Verification', value: 'verification' },
              { name: 'Tickets', value: 'tickets' },
              { name: 'AI Chat', value: 'aiChat' },
              { name: 'Database', value: 'database' },
              { name: 'Logging', value: 'logging' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set a configuration value')
        .addStringOption(option =>
          option
            .setName('path')
            .setDescription('Configuration path (e.g., levelSystem.enabled)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('value')
            .setDescription('New value (use "true", "false", numbers, or text)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reload')
        .setDescription('Reload configuration from file')
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      // Check if user is in the ownerIds list
      const isOwner = config.ownerIds && config.ownerIds.includes(interaction.user.id);
      
      // Only allow owners to modify sensitive settings
      if (!isOwner && (subcommand === 'set' || subcommand === 'reload')) {
        const path = interaction.options.getString('path');
        const sensitiveSettings = ['token', 'database.password', 'aiChat.openai.apiKey', 'aiChat.huggingface.apiKey', 'webDashboard.secret'];
        
        if (sensitiveSettings.some(setting => path && path.startsWith(setting))) {
          return interaction.reply({
            content: 'You do not have permission to modify sensitive settings.',
            ephemeral: true
          });
        }
      }

      // Handle view subcommand
      if (subcommand === 'view') {
        const section = interaction.options.getString('section');
        
        if (section) {
          // View specific section
          if (!config[section]) {
            return interaction.reply({
              content: `Configuration section "${section}" not found.`,
              ephemeral: true
            });
          }
          
          // Create embed for section
          const embed = new EmbedBuilder()
            .setTitle(`Configuration: ${section}`)
            .setColor(config.embedColor || '#0099ff')
            .setTimestamp();
          
          // Format the section data
          const sectionData = formatConfigSection(config[section], section);
          
          // Add fields to embed
          for (const [key, value] of Object.entries(sectionData)) {
            embed.addFields({ name: key, value: value.toString().substring(0, 1024), inline: true });
          }
          
          return interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        } else {
          // View main sections
          const embed = new EmbedBuilder()
            .setTitle('Bot Configuration')
            .setDescription('Here are the main configuration sections. Use `/config view [section]` to view details.')
            .setColor(config.embedColor || '#0099ff')
            .setTimestamp();
          
          // Add main sections
          const sections = [
            'General Settings',
            'Channels',
            'Roles',
            'Level System',
            'Economy',
            'Mining Game',
            'Verification',
            'Tickets',
            'AI Chat',
            'Database',
            'Logging'
          ];
          
          const sectionValues = [
            `Prefix: ${config.prefix}, Debug: ${config.debug || false}`,
            `${Object.keys(config.channels || {}).length} channels configured`,
            `${Object.keys(config.roles || {}).length} roles configured`,
            `Enabled: ${config.levelSystem?.enabled || false}`,
            `Enabled: ${config.economy?.enabled || false}`,
            `Enabled: ${config.miningGame?.enabled || false}`,
            `Enabled: ${config.verification?.enabled || false}`,
            `Enabled: ${config.tickets?.enabled || false}`,
            `Enabled: ${config.aiChat?.enabled || false}`,
            `Enabled: ${config.database?.enabled || false}`,
            `Enabled: ${config.logging?.enabled || false}`
          ];
          
          for (let i = 0; i < sections.length; i++) {
            embed.addFields({ name: sections[i], value: sectionValues[i], inline: true });
          }
          
          return interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        }
      }
      
      // Handle set subcommand
      else if (subcommand === 'set') {
        const configPath = interaction.options.getString('path');
        let valueStr = interaction.options.getString('value');
        
        // Parse the value
        let value;
        if (valueStr.toLowerCase() === 'true') {
          value = true;
        } else if (valueStr.toLowerCase() === 'false') {
          value = false;
        } else if (!isNaN(valueStr) && valueStr.trim() !== '') {
          value = Number(valueStr);
        } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
          try {
            value = JSON.parse(valueStr);
          } catch (error) {
            return interaction.reply({
              content: `Invalid array format. Make sure to use proper JSON syntax.`,
              ephemeral: true
            });
          }
        } else if (valueStr.startsWith('{') && valueStr.endsWith('}')) {
          try {
            value = JSON.parse(valueStr);
          } catch (error) {
            return interaction.reply({
              content: `Invalid object format. Make sure to use proper JSON syntax.`,
              ephemeral: true
            });
          }
        } else {
          value = valueStr;
        }
        
        // Update the config
        const pathParts = configPath.split('.');
        let current = config;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          
          if (!current[part]) {
            current[part] = {};
          }
          
          current = current[part];
        }
        
        const lastPart = pathParts[pathParts.length - 1];
        current[lastPart] = value;
        
        // Save the config
        await saveConfig();
        
        return interaction.reply({
          content: `Configuration updated: \`${configPath}\` set to \`${valueStr}\``,
          ephemeral: true
        });
      }
      
      // Handle reload subcommand
      else if (subcommand === 'reload') {
        await interaction.deferReply({ ephemeral: true });
        
        try {
          // Clear the require cache for the config
          delete require.cache[require.resolve('../../config.json')];
          
          // Reload the config
          const newConfig = require('../../config.json');
          
          // Update the global config object
          Object.keys(config).forEach(key => delete config[key]);
          Object.assign(config, newConfig);
          
          return interaction.editReply({
            content: 'Configuration reloaded successfully.',
            ephemeral: true
          });
        } catch (error) {
          logger.error(`Error reloading config: ${error.message}`);
          return interaction.editReply({
            content: `Error reloading configuration: ${error.message}`,
            ephemeral: true
          });
        }
      }
    } catch (error) {
      logger.error(`Error in config command: ${error.message}`);
      return interaction.reply({
        content: 'An error occurred while executing this command.',
        ephemeral: true
      });
    }
  }
};

/**
 * Format a configuration section for display
 * @param {Object} section - Configuration section
 * @param {string} sectionName - Section name
 * @returns {Object} - Formatted section
 */
function formatConfigSection(section, sectionName) {
  const result = {};
  
  // Handle sensitive data
  const sensitiveFields = ['token', 'password', 'apiKey', 'secret'];
  
  for (const [key, value] of Object.entries(section)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // For nested objects, show a summary
      result[key] = `[Object with ${Object.keys(value).length} properties]`;
    } else if (Array.isArray(value)) {
      // For arrays, show a summary
      result[key] = `[Array with ${value.length} items]`;
    } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      // Mask sensitive data
      result[key] = '********';
    } else {
      // Regular values
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Save the configuration to file
 */
async function saveConfig() {
  try {
    const configPath = path.join(__dirname, '../../config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    logger.info('Configuration saved to file');
  } catch (error) {
    logger.error(`Error saving configuration: ${error.message}`);
    throw error;
  }
} 