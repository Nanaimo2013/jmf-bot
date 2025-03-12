/**
 * JMF Hosting Discord Bot - Safe Shutdown Script
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script safely shuts down the bot, ensuring all connections
 * are properly closed and resources are released.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('../../src/utils/logger');

// ASCII Art for the shutdown message
const shutdownArt = `
   _____ _           _     _                     
  / ____| |         | |   | |                    
 | (___ | |__  _   _| |_  | |     ___  __      __
  \\___ \\| '_ \\| | | | __| | |    / _ \\ \\ \\ /\\ / /
  ____) | | | | |_| | |_  | |___| (_) | \\ V  V / 
 |_____/|_| |_|\\__,_|\\__| |______\\___/   \\_/\\_/  
                                                 
`;

// Function to find the bot process
function findBotProcess() {
  return new Promise((resolve, reject) => {
    exec('ps aux | grep "node.*src/index.js" | grep -v grep', (error, stdout, stderr) => {
      if (error && !stdout) {
        logger.warn('No bot process found running');
        resolve(null);
        return;
      }
      
      const lines = stdout.trim().split('\n');
      if (lines.length === 0) {
        logger.warn('No bot process found running');
        resolve(null);
        return;
      }
      
      // Extract PID from the first line
      const parts = lines[0].trim().split(/\s+/);
      if (parts.length >= 2) {
        const pid = parseInt(parts[1]);
        logger.info(`Found bot process with PID: ${pid}`);
        resolve(pid);
      } else {
        logger.warn('Could not parse process information');
        resolve(null);
      }
    });
  });
}

// Function to send SIGTERM to the bot process
function stopBotProcess(pid) {
  return new Promise((resolve, reject) => {
    if (!pid) {
      resolve(false);
      return;
    }
    
    logger.info(`Sending SIGTERM to process ${pid}...`);
    exec(`kill -15 ${pid}`, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error stopping bot process: ${error.message}`);
        reject(error);
        return;
      }
      
      // Check if process is still running after a short delay
      setTimeout(() => {
        exec(`ps -p ${pid}`, (checkError, checkStdout) => {
          if (checkError) {
            // Process not found, which means it was successfully terminated
            logger.info(`Bot process ${pid} successfully stopped`);
            resolve(true);
          } else {
            // Process still running, try SIGKILL
            logger.warn(`Process ${pid} did not respond to SIGTERM, sending SIGKILL...`);
            exec(`kill -9 ${pid}`, (killError) => {
              if (killError) {
                logger.error(`Error force stopping bot process: ${killError.message}`);
                reject(killError);
              } else {
                logger.info(`Bot process ${pid} forcefully stopped`);
                resolve(true);
              }
            });
          }
        });
      }, 5000); // Wait 5 seconds before checking
    });
  });
}

// Function to check and close database connections
function closeDatabaseConnections() {
  try {
    // Path to the database file
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/database.sqlite');
    
    // Check if database file exists
    if (fs.existsSync(dbPath)) {
      logger.info(`Database file found at: ${dbPath}`);
      
      // Create a temporary connection to ensure proper shutdown
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
          logger.error(`Error connecting to database: ${err.message}`);
          return;
        }
        
        logger.info('Connected to database for safe shutdown');
        
        // Close the connection
        db.close((err) => {
          if (err) {
            logger.error(`Error closing database: ${err.message}`);
          } else {
            logger.info('Database connection closed successfully');
          }
        });
      });
    } else {
      logger.warn(`Database file not found at: ${dbPath}`);
    }
  } catch (error) {
    logger.error(`Error handling database connections: ${error.message}`);
  }
}

// Function to create a PID file for the shutdown process
function createShutdownPidFile() {
  try {
    const pidDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(pidDir)) {
      fs.mkdirSync(pidDir, { recursive: true });
    }
    
    const pidFile = path.join(pidDir, 'shutdown.pid');
    fs.writeFileSync(pidFile, process.pid.toString());
    logger.info(`Created shutdown PID file: ${pidFile}`);
    
    // Remove PID file on exit
    process.on('exit', () => {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
        logger.info('Removed shutdown PID file');
      }
    });
  } catch (error) {
    logger.error(`Error creating shutdown PID file: ${error.message}`);
  }
}

// Main function to execute the shutdown process
async function shutdownBot() {
  console.log(shutdownArt);
  logger.info('Starting bot shutdown process...');
  
  // Create a PID file for the shutdown process
  createShutdownPidFile();
  
  try {
    // Find the bot process
    const pid = await findBotProcess();
    
    if (pid) {
      // Stop the bot process
      await stopBotProcess(pid);
    } else {
      logger.warn('No bot process found to stop');
    }
    
    // Close database connections
    closeDatabaseConnections();
    
    logger.info('Bot shutdown process completed successfully');
    console.log('\nJMF Bot has been safely shut down.');
    
    // Exit this process after a short delay
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    logger.error(`Error during shutdown process: ${error.message}`);
    console.error('\nError shutting down the bot. Check logs for details.');
    process.exit(1);
  }
}

// Execute the shutdown process
shutdownBot();