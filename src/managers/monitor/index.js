/**
 * JMF Hosting Discord Bot - Monitor Manager Index
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file exports the Monitor manager for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const MonitorManager = require('./monitor.manager');
const path = require('path');

/**
 * Create a new Monitor manager
 * @param {Object} [config={}] - Configuration options
 * @returns {Promise<MonitorManager>} Initialized Monitor manager
 */
async function createMonitorManager(config = {}) {
    const manager = new MonitorManager();
    await manager.initialize(config);
    return manager;
}

// Export the Monitor manager and factory function
module.exports = {
    MonitorManager,
    createMonitorManager
};