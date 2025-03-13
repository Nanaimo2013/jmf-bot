/**
 * JMF Hosting Discord Bot - Managers
 * Version: 1.0.0
 * Last Updated: 03/12/2025
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
    
    // Initialize database next
    managers.database = await database.createDatabaseManager(config.database || {});
    
    // Initialize other managers
    managers.api = await api.createApiManager(config.api || {});
    managers.bot = await bot.createBotManager(config.bot || {});
    managers.docker = await docker.createDockerManager(config.docker || {});
    managers.install = await install.createInstallManager(config.install || {});
    managers.monitor = await monitor.createMonitorManager(config.monitor || {});
    managers.test = await test.createTestManager(config.test || {});
    managers.update = await update.createUpdateManager(config.update || {});
    
    return managers;
}

/**
 * Shutdown all managers
 * @param {Object} managers - Object containing all managers
 * @returns {Promise<void>}
 */
async function shutdownManagers(managers) {
    // Shutdown in reverse order of initialization
    await managers.update?.shutdown?.();
    await managers.test?.shutdown?.();
    await managers.monitor?.shutdown?.();
    await managers.install?.shutdown?.();
    await managers.docker?.shutdown?.();
    await managers.bot?.shutdown?.();
    await managers.api?.shutdown?.();
    await managers.database?.shutdown?.();
    await managers.logger?.shutdown?.();
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