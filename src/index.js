/**
 * JMF Hosting Discord Bot
 * Version: 1.3.0
 * Last Updated: 03/12/2025
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Load environment variables
require('dotenv').config();

// Import managers module
const managers = require('./managers');

// Global managers object
global.managers = {};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    if (global.managers.logger) {
        global.managers.logger.error('system', `Uncaught Exception: ${error.message}`, error.stack);
    } else {
        console.error(`Uncaught Exception: ${error.message}`, error.stack);
    }
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    if (global.managers.logger) {
        global.managers.logger.error('system', `Unhandled Rejection: ${reason}`, reason.stack || reason);
    } else {
        console.error(`Unhandled Rejection: ${reason}`, reason.stack || reason);
    }
});

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Initialize all managers
 * @returns {Promise<void>}
 */
async function initialize() {
    try {
        console.log('Starting JMF Hosting Discord Bot...');
        
        // Initialize all managers
        global.managers = await managers.initializeManagers({
            logger: {
                level: process.env.LOG_LEVEL || 'info',
                directory: process.env.LOG_DIRECTORY || './logs'
            },
            database: {
                type: process.env.DB_TYPE || 'sqlite',
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                username: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME || './data/bot.db',
                migrations: process.env.DB_MIGRATIONS_DIR || './src/database/migrations'
            },
            bot: {
                token: process.env.DISCORD_TOKEN,
                clientId: process.env.CLIENT_ID,
                guildId: process.env.GUILD_ID
            },
            api: {
                port: process.env.API_PORT || 3000,
                host: process.env.API_HOST || 'localhost',
                auth: {
                    enabled: process.env.API_AUTH_ENABLED === 'true',
                    secret: process.env.API_SECRET
                }
            },
            monitor: {
                interval: parseInt(process.env.MONITOR_INTERVAL || '60000'),
                enabled: process.env.MONITOR_ENABLED !== 'false'
            },
            docker: {
                socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
            },
            install: {
                configDir: process.env.CONFIG_DIR || './config'
            },
            test: {
                enabled: process.env.TEST_MODE === 'true'
            },
            update: {
                checkInterval: parseInt(process.env.UPDATE_CHECK_INTERVAL || '86400000'),
                autoUpdate: process.env.AUTO_UPDATE === 'true'
            }
        });
        
        const { logger, bot, api, monitor } = global.managers;
        
        // Log successful initialization
        logger.success('system', 'JMF Hosting Discord Bot is fully operational');
        
        // Start bot, API, and monitoring
        await bot.start();
        logger.success('system', 'Bot is now online!');
        
        await api.start();
        logger.success('system', 'API server started');
        
        await monitor.start();
        logger.success('system', 'Monitoring started');
        
    } catch (error) {
        if (global.managers.logger) {
            global.managers.logger.error('system', `Initialization failed: ${error.message}`, error.stack);
        } else {
            console.error(`Initialization failed: ${error.message}`, error.stack);
        }
        await gracefulShutdown('INIT_FAILURE');
    }
}

/**
 * Gracefully shut down all managers
 * @param {string} signal - Shutdown signal
 * @returns {Promise<void>}
 */
async function gracefulShutdown(signal) {
    if (global.managers.logger) {
        global.managers.logger.warn('system', `Received ${signal} signal, shutting down...`);
    } else {
        console.warn(`Received ${signal} signal, shutting down...`);
    }
    
    try {
        // Shutdown all managers
        await managers.shutdownManagers(global.managers);
        
        if (global.managers.logger) {
            global.managers.logger.info('system', 'All managers shut down successfully');
        } else {
            console.log('All managers shut down successfully');
        }
    } catch (error) {
        console.error(`Error during shutdown: ${error.message}`);
    }
    
    // Exit process
    process.exit(signal === 'UNCAUGHT_EXCEPTION' ? 1 : 0);
}

// Start the bot
initialize().catch(error => {
    console.error(`Fatal error during initialization: ${error.message}`);
    process.exit(1);
}); 