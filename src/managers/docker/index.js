/**
 * JMF Hosting Discord Bot - Docker Manager Index
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file exports the Docker manager for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const DockerManager = require('./docker.manager');
const path = require('path');

/**
 * Create a new Docker manager
 * @param {Object} [config={}] - Configuration options
 * @returns {Promise<DockerManager>} Initialized Docker manager
 */
async function createDockerManager(config = {}) {
    const manager = new DockerManager();
    await manager.initialize(config);
    return manager;
}

// Export the Docker manager and factory function
module.exports = {
    DockerManager,
    createDockerManager
};