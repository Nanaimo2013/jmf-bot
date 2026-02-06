/**
 * JMF Hosting Discord Bot - Bot Manager Index
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This file exports the bot manager.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BotManager = require('./bot.manager');

/**
 * Create a new bot manager
 * @param {Object} bot - The bot instance
 * @returns {Promise<BotManager>} - The initialized bot manager
 */
async function createBotManager(bot) {
    const manager = new BotManager(bot);
    await manager.initialize();
    return manager;
}

module.exports = {
    BotManager,
    createBotManager
}; 