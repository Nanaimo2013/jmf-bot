/**
 * JMF Hosting Discord Bot - Logger Manager Index
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file exports the Logger manager for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const LoggerManager = require('./logger.manager');
const path = require('path');

/**
 * Create a new Logger manager
 * @param {Object} [config={}] - Configuration options
 * @returns {Promise<LoggerManager>} Initialized Logger manager
 */
async function createLoggerManager(config = {}) {
    const manager = new LoggerManager();
    await manager.initialize(config);
    return manager;
}

// Export the Logger manager and factory function
module.exports = {
    LoggerManager,
    createLoggerManager
}; 