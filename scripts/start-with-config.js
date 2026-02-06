/**
 * JMF Hosting Discord Bot - Start Script with Configuration
 * Version: 1.0.0
 * Last Updated: 03/13/2025
 * 
 * This script starts the bot with the improved configuration system
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration paths
const CONFIG_PATH = path.join(__dirname, '../config/config.json');
const CONFIG_EXAMPLE_PATH = path.join(__dirname, '../config/config.json.example');

// Check if configuration exists
if (!fs.existsSync(CONFIG_PATH)) {
    console.log('Configuration file not found, checking for example configuration...');
    
    // Check if example configuration exists
    if (fs.existsSync(CONFIG_EXAMPLE_PATH)) {
        console.log('Example configuration found, copying to configuration file...');
        
        // Create config directory if it doesn't exist
        const configDir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Copy example configuration
        fs.copyFileSync(CONFIG_EXAMPLE_PATH, CONFIG_PATH);
        console.log('Configuration file created successfully!');
    } else {
        console.log('Example configuration not found, running configuration migration...');
        
        // Run configuration migration
        try {
            require('./migrate-config');
            console.log('Configuration migration completed successfully!');
        } catch (error) {
            console.error('Error running configuration migration:', error);
            process.exit(1);
        }
    }
}

// Start the bot
console.log('Starting the bot...');

// Save the current working directory
const cwd = process.cwd();

// Start the bot process
const botProcess = spawn('node', ['scripts/start.js'], {
    stdio: 'inherit',
    cwd: cwd
});

// Handle process events
botProcess.on('error', (error) => {
    console.error('Failed to start bot process:', error);
    process.exit(1);
});

botProcess.on('exit', (code, signal) => {
    if (code !== 0) {
        console.error(`Bot process exited with code ${code} and signal ${signal}`);
        process.exit(code);
    }
});

// Handle signals
process.on('SIGINT', () => {
    console.log('Received SIGINT, forwarding to bot process...');
    botProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, forwarding to bot process...');
    botProcess.kill('SIGTERM');
}); 