/**
 * JMF Hosting Discord Bot - Managers
 * Version: 1.0.0
 * Last Updated: 03/13/2025
 * 
 * This module exports all managers for the bot, providing a centralized
 * access point for all manager functionality.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const base = require('./base');
const api = require('./api');
const bot = require('./bot');
const database = require('./database');
const docker = require('./docker');
const install = require('./install');
const logger = require('./logger');
const monitor = require('./monitor');
const test = require('./test');
const update = require('./update');

/**
 * Initialize all managers
 * @param {Object} config - Configuration options for all managers
 * @returns {Promise<Object>} Object containing all initialized managers
 */
async function initializeManagers(config = {}) {
    const managers = {};
    
    // Initialize logger first
    managers.logger = new logger.LoggerManager();
    await managers.logger.initialize(config.logger || {});
    
    // Show managers section
    if (managers.logger && typeof managers.logger.section === 'function') {
        managers.logger.section('managers');
    }
    
    // Initialize API manager
    managers.api = await api.createApiManager(config.api || {});
    
    // Initialize bot manager
    managers.bot = await bot.createBotManager(config.bot || {});
    
    // Show database section
    if (managers.logger && typeof managers.logger.section === 'function') {
        managers.logger.section('database');
    }
    
    // Initialize database manager
    try {
        managers.database = await database.createDatabaseManager(config.database || {});
    } catch (error) {
        managers.logger.error('database', `Failed to initialize database manager: ${error.message}`);
        // Provide a dummy database manager to prevent errors
        managers.database = {
            isInitialized: () => true,
            shutdown: async () => {},
            query: async () => ({}),
            getConnection: () => null
        };
    }
    
    // Show modules section
    if (managers.logger && typeof managers.logger.section === 'function') {
        managers.logger.section('modules');
    }
    
    // Initialize other managers
    managers.docker = await docker.createDockerManager(config.docker || {});
    managers.install = await install.createInstallManager(config.install || {});
    managers.monitor = await monitor.createMonitorManager(config.monitor || {});
    managers.test = await test.createTestManager(config.test || {});
    managers.update = await update.createUpdateManager(config.update || {});
    
    return managers;
}

/**
 * Shut down all managers in the correct order
 * @param {Object} managers - Manager instances
 * @returns {Promise<void>}
 */
async function shutdownManagers(managers = global.managers) {
    if (!managers) {
        console.warn('No managers to shut down');
        return;
    }
    
    // Shutdown in reverse order of initialization
    const managerOrder = [
        'update', 'test', 'monitor', 'install', 
        'docker', 'bot', 'api', 'database', 'logger'
    ];
    
    const logger = managers.logger;
    const logInfo = (message) => {
        if (logger) {
            logger.info('system', message);
        } else {
            console.log(message);
        }
    };
    
    const logError = (message, error) => {
        if (logger) {
            logger.error('system', message, error);
        } else {
            console.error(message, error);
        }
    };
    
    for (const managerName of managerOrder) {
        try {
            const manager = managers[managerName];
            if (manager && typeof manager.shutdown === 'function') {
                logInfo(`Shutting down ${managerName} manager...`);
                
                // Set a timeout for each manager shutdown
                const shutdownPromise = manager.shutdown();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Shutdown timed out for ${managerName} manager`)), 10000);
                });
                
                // Wait for shutdown or timeout
                await Promise.race([shutdownPromise, timeoutPromise])
                    .then(() => {
                        logInfo(`${managerName} manager shut down successfully`);
                    })
                    .catch(error => {
                        logError(`Error shutting down ${managerName} manager: ${error.message}`, error);
                        // Continue with other managers even if one fails
                    });
            }
        } catch (error) {
            logError(`Error shutting down ${managerName} manager: ${error.message}`, error);
            // Continue with other managers even if one fails
        }
    }
}

module.exports = {
    base,
    api,
    bot,
    database,
    docker,
    install,
    logger,
    monitor,
    test,
    update,
    initializeManagers,
    shutdownManagers
}; 