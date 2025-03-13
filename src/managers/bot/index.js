/**
 * JMF Hosting Discord Bot - Bot Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles the Discord bot functionality, including commands,
 * events, and other Discord-specific features.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BotManager = require('./bot.manager');

/**
 * Create and initialize a new Bot Manager instance
 * @param {Object} config - Configuration options
 * @returns {Promise<BotManager>} Initialized Bot Manager instance
 */
async function createBotManager(config = {}) {
    const manager = new BotManager();
    await manager.initialize(config);
    return manager;
}

module.exports = {
    BotManager,
    createBotManager
}; 