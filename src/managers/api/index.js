/**
 * JMF Hosting Discord Bot - API Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module exports the API Manager and its components. The API Manager
 * is responsible for handling all REST API operations, including route
 * registration, authentication, and request handling.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const ApiManager = require('./api.manager');

/**
 * Create and initialize a new API Manager instance
 * @param {Object} config - Configuration options
 * @returns {Promise<ApiManager>} Initialized API Manager instance
 */
async function createApiManager(config = {}) {
    const manager = new ApiManager();
    await manager.initialize(config);
    return manager;
}

module.exports = {
    ApiManager,
    createApiManager
}; 