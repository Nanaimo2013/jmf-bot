/**
 * JMF Hosting Discord Bot - Database Reset
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script completely resets the database by deleting it and recreating it with the correct schema.
 * WARNING: This will delete all data in the database!
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const readline = require('readline');
const logger = require('../../src/utils/logger');

// Get database path from environment variables or use default
const dbPath = process.env.DB_PATH || './data/database.sqlite';

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask for confirmation
function askForConfirmation() {
  return new Promise((resolve) => {
    rl.question('\x1b[31mWARNING: This will delete all data in the database. Are you sure you want to continue? (yes/no)\x1b[0m ', (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Main function
async function resetDatabase() {
  try {
    // Ask for confirmation
    const confirmed = await askForConfirmation();
    if (!confirmed) {
      logger.info('Database reset cancelled.');
      rl.close();
      return;
    }
    
    logger.info('Starting database reset...');
    
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Created database directory: ${dbDir}`);
    }
    
    // Create a backup of the database if it exists
    if (fs.existsSync(dbPath)) {
      const backupPath = `${dbPath}.backup.${new Date().toISOString().replace(/[:.]/g, '')}`; 
      fs.copyFileSync(dbPath, backupPath);
      logger.info(`Created backup at: ${backupPath}`);
      
      // Delete the existing database
      fs.unlinkSync(dbPath);
      logger.info('Deleted existing database.');
    }
    
    // Create a new database
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error(`Error creating database: ${err.message}`);
        process.exit(1);
      }
      logger.info(`Created new SQLite database at ${dbPath}`);
    });
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Promisify database methods
    db.runAsync = promisify(db.run.bind(db));
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../../src/database/schema/sqlite-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await db.runAsync(statement);
      } catch (error) {
        logger.error(`Error executing statement: ${error.message}`);
        logger.error(`Statement: ${statement}`);
      }
    }
    
    logger.info('Database schema applied successfully.');
    
    // Close the database connection
    db.close();
    
    logger.info('Database reset completed successfully.');
  } catch (error) {
    logger.error(`Error during database reset: ${error.message}`);
  } finally {
    rl.close();
  }
}

// Run the reset
resetDatabase(); 