/**
 * JMF Hosting Discord Bot - Simple Start Script
 * 
 * This script starts the bot in the foreground and ensures proper signal handling
 * for graceful shutdown.
 */

const { spawn } = require('child_process');
const path = require('path');

// Path to the main bot file
const botPath = path.join(__dirname, '..', 'src', 'index.js');

console.log('Starting JMF Hosting Discord Bot...');

// Spawn the bot process
const botProcess = spawn('node', [botPath], {
    stdio: 'inherit'
});

// Handle process events
botProcess.on('error', (error) => {
    console.error(`Failed to start bot: ${error.message}`);
    process.exit(1);
});

botProcess.on('exit', (code, signal) => {
    if (code !== null) {
        console.log(`Bot exited with code: ${code}`);
    } else {
        console.log(`Bot was killed with signal: ${signal}`);
    }
    process.exit(code || 0);
});

// Forward signals to the bot process
process.on('SIGINT', () => {
    console.log('Received SIGINT, forwarding to bot process...');
    botProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, forwarding to bot process...');
    botProcess.kill('SIGTERM');
});

console.log(`Bot started with PID: ${botProcess.pid}`);
console.log('Press Ctrl+C to stop the bot'); 