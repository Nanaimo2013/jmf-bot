/**
 * JMF Hosting Discord Bot - Graceful Shutdown Script
 * Version: 1.0.0
 * Last Updated: 03/13/2025
 * 
 * This script provides a way to gracefully shut down the bot
 * from the command line, ensuring all managers are properly closed.
 * 
 * Usage: node scripts/stop.js [options]
 * Options:
 *   --timeout <ms>  Shutdown timeout in milliseconds (default: 10000)
 *   --force         Force shutdown after timeout
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Path to the PID file
const pidFilePath = path.join(__dirname, '..', '.pid');

// Check if PID file exists
if (!fs.existsSync(pidFilePath)) {
    console.error('PID file not found. Bot may not be running.');
    process.exit(1);
}

// Read PID from file
const pid = fs.readFileSync(pidFilePath, 'utf8').trim();

console.log(`Attempting to stop bot process with PID: ${pid}`);

// Use different commands based on platform
const isWindows = process.platform === 'win32';
const command = isWindows ? `taskkill /F /PID ${pid}` : `kill -SIGINT ${pid}`;

// Execute the command
exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Failed to stop bot: ${error.message}`);
        
        // Check if process exists
        const checkCommand = isWindows ? `tasklist /FI "PID eq ${pid}"` : `ps -p ${pid}`;
        exec(checkCommand, (checkError, checkStdout) => {
            if (checkError || !checkStdout.includes(pid)) {
                console.log('Process not found. Bot may have already stopped.');
                // Clean up PID file if it exists
                if (fs.existsSync(pidFilePath)) {
                    fs.unlinkSync(pidFilePath);
                    console.log('Removed PID file.');
                }
            } else {
                console.log('Process still running. You may need to stop it manually.');
            }
        });
        
        process.exit(1);
    }
    
    console.log(stdout || 'Bot stopped successfully.');
    
    // Clean up PID file if it exists
    if (fs.existsSync(pidFilePath)) {
        fs.unlinkSync(pidFilePath);
        console.log('Removed PID file.');
    }
    
    console.log('Bot shutdown complete.');
}); 