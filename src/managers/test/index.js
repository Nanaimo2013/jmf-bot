/**
 * JMF Hosting Discord Bot - Test Manager Index
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file exports the Test manager for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const TestManager = require('./test.manager');
const path = require('path');

/**
 * Create a new Test manager
 * @param {Object} [config={}] - Configuration options
 * @returns {Promise<TestManager>} Initialized Test manager
 */
async function createTestManager(config = {}) {
    const manager = new TestManager();
    await manager.initialize(config);
    return manager;
}

// Export the Test manager and factory function
module.exports = {
    TestManager,
    createTestManager
}; 