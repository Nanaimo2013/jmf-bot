/**
 * JMF Hosting Discord Bot
 * Version: 1.4.0
 * Last Updated: 03/14/2025
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Load environment variables
require('dotenv').config();

// Import Bot class
const Bot = require('./bot');
const fs = require('fs');
const path = require('path');

// Global managers object
global.managers = {};

// Flag to track if shutdown is in progress
let isShuttingDown = false;

// Create bot instance
const bot = new Bot();

// Save the process ID to a file for easier shutdown
const pidFilePath = path.join(__dirname, '..', '.pid');
fs.writeFileSync(pidFilePath, process.pid.toString(), 'utf8');
console.log(`Process ID ${process.pid} saved to ${pidFilePath}`);

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
// Also handle Windows-specific signals
if (process.platform === 'win32') {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.on('SIGINT', () => {
        process.emit('SIGINT');
    });
}

/**
 * Initialize and start the bot
 * @returns {Promise<void>}
 */
async function initialize() {
    try {
        console.log('Starting JMF Hosting Discord Bot...');
        
        // Initialize the bot
        await bot.initialize({
            logLevel: process.env.LOG_LEVEL || 'info',
            logDirectory: process.env.LOG_DIRECTORY || './logs',
            configPath: process.env.CONFIG_PATH || './config'
        });
        
        const logger = global.managers.logger;
        
        // Show startup section
        logger.section('startup');
        
        // Start the bot
        await bot.start();
        
        // Log successful initialization
        logger.success('system', 'JMF Hosting Discord Bot is fully operational');
        
        // Show bot section
        logger.section('bot');
        
        // Log bot status
        const status = bot.getStatus();
        logger.info('system', `Bot uptime: ${formatUptime(status.uptime)}`);
        logger.info('system', `Loaded modules: ${status.moduleCount}`);
        
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
 * Gracefully shut down the bot
 * @param {string} signal - Shutdown signal
 * @returns {Promise<void>}
 */
async function gracefulShutdown(signal) {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    // Get logger if available
    const logger = global.managers?.logger || console;
    
    // Log shutdown
    if (logger === console) {
        logger.log(`Shutting down due to ${signal}...`);
    } else {
        logger.section('shutdown');
        logger.info('system', `Shutting down due to ${signal}...`);
    }
    
    try {
        // Stop the bot
        if (bot) {
            await bot.stop();
        }
        
        // Shutdown managers
        if (global.managers) {
            // Shutdown in reverse order
            const managerNames = Object.keys(global.managers).reverse();
            
            for (const name of managerNames) {
                const manager = global.managers[name];
                if (manager && typeof manager.shutdown === 'function') {
                    if (logger !== console) {
                        logger.info('system', `Shutting down ${name} manager...`);
                    }
                    await manager.shutdown();
                }
            }
        }
        
        // Log successful shutdown
        if (logger !== console) {
            logger.success('system', 'Shutdown complete');
        } else {
            logger.log('Shutdown complete');
        }
        
        // Remove PID file
        if (fs.existsSync(pidFilePath)) {
            fs.unlinkSync(pidFilePath);
        }
        
        // Exit with success code
        process.exit(0);
    } catch (error) {
        // Log error
        if (logger === console) {
            logger.error(`Error during shutdown: ${error.message}`);
            logger.error(error.stack);
        } else {
            logger.error('system', `Error during shutdown: ${error.message}`, error.stack);
        }
        
        // Remove PID file
        if (fs.existsSync(pidFilePath)) {
            fs.unlinkSync(pidFilePath);
        }
        
        // Exit with error code
        process.exit(1);
    }
}

/**
 * Format uptime in a human-readable format
 * @param {number} ms - Uptime in milliseconds
 * @returns {string} Formatted uptime
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// Start the bot
initialize(); 