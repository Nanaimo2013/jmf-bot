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
    // Get managers from global object
    const { logger, database, bot } = global.managers;
    
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Get bot configuration from bot manager
      const config = bot.getConfigManager().getConfig();
      
      if (subcommand === 'view') {
        const section = interaction.options.getString('section');
        
        if (section) {
          // View specific section
          if (!config[section]) {
            return interaction.reply({
              content: `❌ Configuration section '${section}' not found.`,
              ephemeral: true
            });
          }
          
          const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${section.charAt(0).toUpperCase() + section.slice(1)} Configuration`)
            .setDescription(formatConfigSection(config[section], section))
            .setTimestamp()
            .setFooter({ text: 'JMF Hosting Bot Configuration' });
          
          return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          // View all sections
          const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Bot Configuration')
            .setDescription('Here is the current bot configuration:')
            .setTimestamp()
            .setFooter({ text: 'JMF Hosting Bot Configuration' });
          
          // Add fields for each section
          Object.keys(config).forEach(section => {
            if (typeof config[section] === 'object' && !Array.isArray(config[section])) {
              embed.addFields({ name: section.charAt(0).toUpperCase() + section.slice(1), value: formatConfigSection(config[section], section) });
            }
          });
          
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } else if (subcommand === 'set') {
        // Handle set subcommand
        const section = interaction.options.getString('path');
        const key = interaction.options.getString('value');
        
        if (!config[section]) {
          return interaction.reply({
            content: `❌ Configuration section '${section}' not found.`,
            ephemeral: true
          });
        }
        
        // Check if key exists in section
        if (!(key in config[section])) {
          return interaction.reply({
            content: `❌ Configuration key '${key}' not found in section '${section}'.`,
            ephemeral: true
          });
        }
        
        // Parse value based on current type
        let parsedValue;
        try {
          const currentType = typeof config[section][key];
          
          if (currentType === 'boolean') {
            parsedValue = key.toLowerCase() === 'true';
          } else if (currentType === 'number') {
            parsedValue = Number(key);
            
            if (isNaN(parsedValue)) {
              throw new Error('Invalid number');
            }
          } else if (currentType === 'object' && Array.isArray(config[section][key])) {
            parsedValue = JSON.parse(key);
            
            if (!Array.isArray(parsedValue)) {
              throw new Error('Value must be an array');
            }
          } else if (currentType === 'object') {
            parsedValue = JSON.parse(key);
            
            if (typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
              throw new Error('Value must be an object');
            }
          } else {
            parsedValue = key;
          }
        } catch (error) {
          return interaction.reply({
            content: `❌ Invalid value format: ${error.message}`,
            ephemeral: true
          });
        }
        
        // Update config
        config[section][key] = parsedValue;
        
        // Save config using bot manager
        await bot.getConfigManager().saveConfig();
        
        // Log the change
        logger.info('commands', `Config updated by ${interaction.user.tag}: ${section}.${key} = ${JSON.stringify(parsedValue)}`);
        
        return interaction.reply({
          content: `✅ Configuration updated: \`${section}.${key}\` = \`${JSON.stringify(parsedValue)}\``,
          ephemeral: true
        });
      } else if (subcommand === 'reload') {
        await interaction.deferReply({ ephemeral: true });
        
        try {
          // Clear the require cache for the config
          delete require.cache[require.resolve('../../config.json')];
          
          // Reload the config
          const newConfig = require('../../config.json');
          
          // Update the global config object
          Object.keys(config).forEach(key => delete config[key]);
          Object.assign(config, newConfig);
          
          // Save the config
          await saveConfig();
          
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
      // Log error
      logger.error('commands', `Error in config command: ${error.message}`, error.stack);
      
      return interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

/**
 * Format a configuration section for display
 * @param {Object} section - Configuration section
 * @param {string} sectionName - Section name
 * @returns {string} Formatted section
 */
function formatConfigSection(section, sectionName) {
  if (!section || typeof section !== 'object') {
    return 'No configuration available';
  }
  
  let formatted = '';
  
  Object.keys(section).forEach(key => {
    const value = section[key];
    
    if (typeof value === 'object' && value !== null) {
      formatted += `**${key}**: \`${JSON.stringify(value)}\`\n`;
    } else {
      formatted += `**${key}**: \`${value}\`\n`;
    }
  });
  
  return formatted || 'No configuration available';
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