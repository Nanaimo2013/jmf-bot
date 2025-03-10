/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

// Get the config path
const configPath = path.join(process.cwd(), 'config.json');

/**
 * Load the config from file
 * @returns {Promise<Object>} The config object
 */
async function loadConfig() {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    logger.info('Config loaded successfully');
    return config;
  } catch (error) {
    logger.error('Error loading config:', error);
    throw error;
  }
}

/**
 * Save the config to file
 * @param {Object} config - The config object to save
 * @returns {Promise<boolean>} Whether the save was successful
 */
async function saveConfig(config = null) {
  try {
    // If no config is provided, use the one from require cache
    if (!config) {
      // Clear the require cache for the config file
      delete require.cache[require.resolve('../../config.json')];
      // Re-require the config file
      config = require('../../config.json');
    }
    
    // Write the config to file
    await fs.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      'utf8'
    );
    
    logger.info('Config saved successfully');
    return true;
  } catch (error) {
    logger.error('Error saving config:', error);
    return false;
  }
}

/**
 * Update a specific section of the config
 * @param {string} section - The section to update
 * @param {Object} data - The data to update
 * @returns {Promise<boolean>} Whether the update was successful
 */
async function updateConfigSection(section, data) {
  try {
    // Load the current config
    const config = await loadConfig();
    
    // Update the section
    config[section] = { ...config[section], ...data };
    
    // Save the config
    return await saveConfig(config);
  } catch (error) {
    logger.error(`Error updating config section ${section}:`, error);
    return false;
  }
}

/**
 * Get a channel by ID or name
 * @param {Guild} guild - The guild
 * @param {string} channelIdOrName - The channel ID or name
 * @returns {GuildChannel|null} The channel or null if not found
 */
function getChannel(guild, channelIdOrName) {
  if (!channelIdOrName) return null;
  
  // Try to get by ID first
  let channel = guild.channels.cache.get(channelIdOrName);
  
  // If not found, try by name
  if (!channel) {
    channel = guild.channels.cache.find(
      c => c.name === channelIdOrName || c.name.includes(channelIdOrName)
    );
  }
  
  return channel;
}

module.exports = {
  loadConfig,
  saveConfig,
  updateConfigSection,
  getChannel
}; 