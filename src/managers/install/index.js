/**
 * JMF Hosting Discord Bot - Install Manager Index
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file exports the Install manager for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const InstallManager = require('./install.manager');
const path = require('path');

/**
 * Create a new Install manager
 * @param {Object} [config={}] - Configuration options
 * @returns {Promise<InstallManager>} Initialized Install manager
 */
async function createInstallManager(config = {}) {
    const manager = new InstallManager();
    await manager.initialize(config);
    return manager;
}

// Export the Install manager and factory function
module.exports = {
    InstallManager,
    createInstallManager
}; 