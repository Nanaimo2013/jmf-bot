/**
 * JMF Hosting Discord Bot - Update Manager
 * Version: 1.1.0
 * Last Updated: 03/12/2025
 * 
 * This file exports the update manager and its modules.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const UpdateManager = require('./update.manager');
const GitHubModule = require('./modules/github');
const MigrationModule = require('./modules/migration');
const DockerModule = require('./modules/docker');

/**
 * Creates and initializes a new UpdateManager instance
 * @param {Object} config - Configuration for the update manager
 * @returns {Promise<UpdateManager>} - The initialized update manager
 */
async function createUpdateManager(config) {
    const manager = new UpdateManager(config);
    await manager.initialize();
    return manager;
}

// Export the update manager, modules, and create function
module.exports = {
    UpdateManager,
    modules: {
        GitHubModule,
        MigrationModule,
        DockerModule
    },
    createUpdateManager
}; 