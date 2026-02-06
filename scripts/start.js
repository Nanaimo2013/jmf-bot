#!/usr/bin/env node

/**
 * JMF Hosting Discord Bot - Startup Script
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This script starts the JMF Hosting Discord Bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const path = require('path');
const Bot = require('../src/bot');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    
    // Try to log to file if possible
    if (global.managers && global.managers.logger) {
        global.managers.logger.error('process', 'Uncaught Exception:', error);
    }
    
    // Exit with error code
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    
    // Try to log to file if possible
    if (global.managers && global.managers.logger) {
        global.managers.logger.error('process', 'Unhandled Promise Rejection:', reason);
    }
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    
    // Try to log to file if possible
    if (global.managers && global.managers.logger) {
        global.managers.logger.info('process', 'Received SIGINT. Shutting down gracefully...');
    }
    
    // Shutdown bot if it exists
    if (global.bot) {
        try {
            await global.bot.shutdown();
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
    
    // Exit process
    process.exit(0);
});

// Handle SIGTERM
process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    
    // Try to log to file if possible
    if (global.managers && global.managers.logger) {
        global.managers.logger.info('process', 'Received SIGTERM. Shutting down gracefully...');
    }
    
    // Shutdown bot if it exists
    if (global.bot) {
        try {
            await global.bot.shutdown();
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
    
    // Exit process
    process.exit(0);
});

/**
 * Main function to start the bot
 */
async function main() {
    try {
        // Create bot instance
        const bot = new Bot();
        global.bot = bot;
        
        // Initialize bot
        await bot.initialize({
            logLevel: process.env.LOG_LEVEL || 'info',
            logDirectory: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
            configPath: process.env.CONFIG_PATH || path.join(process.cwd(), 'config')
        });
        
        // Start bot
        await bot.start();
        
        console.log('Bot is now running. Press Ctrl+C to stop.');
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

// Run the main function
main(); 