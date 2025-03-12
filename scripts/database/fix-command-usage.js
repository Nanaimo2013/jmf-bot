/**
 * JMF Hosting Discord Bot - Fix Command Usage Table
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script fixes the command_usage table by ensuring it has the correct column names.
 * It will rename command_name to command if needed.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const logger = require('../../src/utils/logger');

// Get database path from environment variables or use default
const dbPath = process.env.DB_PATH || './data/database.sqlite';

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logger.info(`Created database directory: ${dbDir}`);
}

// Create a backup of the database
const backupPath = `${dbPath}.backup.${new Date().toISOString().replace(/[:.]/g, '')}`; 
if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  logger.info(`Created backup at: ${backupPath}`);
}

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error(`Error connecting to database: ${err.message}`);
    process.exit(1);
  }
  logger.info(`Connected to SQLite database at ${dbPath}`);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Promisify database methods
db.runAsync = promisify(db.run.bind(db));
db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));

// Function to check if a table exists
async function tableExists(tableName) {
  try {
    const result = await db.getAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return !!result;
  } catch (error) {
    logger.error(`Error checking if table ${tableName} exists: ${error.message}`);
    throw error;
  }
}

// Function to check if a column exists in a table
async function columnExists(tableName, columnName) {
  try {
    const columns = await db.allAsync(`PRAGMA table_info(${tableName})`);
    return columns.some(col => col.name === columnName);
  } catch (error) {
    logger.error(`Error checking if column ${columnName} exists in table ${tableName}: ${error.message}`);
    throw error;
  }
}

// Function to get all columns in a table
async function getTableColumns(tableName) {
  try {
    const columns = await db.allAsync(`PRAGMA table_info(${tableName})`);
    return columns.map(col => col.name);
  } catch (error) {
    logger.error(`Error getting columns for table ${tableName}: ${error.message}`);
    throw error;
  }
}

// Function to fix command_usage table
async function fixCommandUsageTable() {
  const tableName = 'command_usage';
  
  try {
    const exists = await tableExists(tableName);
    
    if (!exists) {
      logger.info(`Creating ${tableName} table...`);
      await db.runAsync(`
        CREATE TABLE ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          command VARCHAR(50) NOT NULL,
          channel_id VARCHAR(20),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          execution_time INTEGER,
          success BOOLEAN DEFAULT 1
        )
      `);
      await db.runAsync(`CREATE INDEX idx_command_usage_user ON ${tableName}(user_id)`);
      await db.runAsync(`CREATE INDEX idx_command_usage_guild ON ${tableName}(guild_id)`);
      await db.runAsync(`CREATE INDEX idx_command_usage_command ON ${tableName}(command)`);
      logger.info(`Created ${tableName} table`);
    } else {
      // Check if command column exists
      const hasCommandColumn = await columnExists(tableName, 'command');
      const hasCommandNameColumn = await columnExists(tableName, 'command_name');
      
      if (!hasCommandColumn && hasCommandNameColumn) {
        logger.info(`Renaming command_name column to command in ${tableName} table...`);
        
        // In SQLite, we need to recreate the table to rename a column
        // First, get all existing columns
        const columns = await getTableColumns(tableName);
        
        // Create a new table with the command column instead of command_name
        await db.runAsync(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
        
        // Create the new table with the correct column names
        await db.runAsync(`
          CREATE TABLE ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(20) NOT NULL,
            guild_id VARCHAR(20),
            command VARCHAR(50) NOT NULL,
            channel_id VARCHAR(20),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            execution_time INTEGER,
            success BOOLEAN DEFAULT 1
          )
        `);
        
        // Copy data from old table to new table, renaming command_name to command
        await db.runAsync(`
          INSERT INTO ${tableName} (id, user_id, guild_id, command, channel_id, timestamp, execution_time, success)
          SELECT id, user_id, guild_id, command_name, channel_id, timestamp, execution_time, success 
          FROM ${tableName}_old
        `);
        
        // Drop old table
        await db.runAsync(`DROP TABLE ${tableName}_old`);
        
        // Recreate indexes
        await db.runAsync(`CREATE INDEX idx_command_usage_user ON ${tableName}(user_id)`);
        await db.runAsync(`CREATE INDEX idx_command_usage_guild ON ${tableName}(guild_id)`);
        await db.runAsync(`CREATE INDEX idx_command_usage_command ON ${tableName}(command)`);
        
        logger.info(`Renamed command_name column to command in ${tableName} table`);
      } else if (!hasCommandColumn && !hasCommandNameColumn) {
        logger.info(`Adding command column to ${tableName} table...`);
        
        // In SQLite, we need to recreate the table to add a column
        // First, get all existing columns
        const columns = await getTableColumns(tableName);
        
        // Create a new table with the command column
        await db.runAsync(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
        
        await db.runAsync(`
          CREATE TABLE ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(20) NOT NULL,
            guild_id VARCHAR(20),
            command VARCHAR(50) NOT NULL,
            channel_id VARCHAR(20),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            execution_time INTEGER,
            success BOOLEAN DEFAULT 1
          )
        `);
        
        // Copy data from old table to new table
        const oldColumns = columns.join(', ');
        await db.runAsync(`
          INSERT INTO ${tableName} (id, user_id, guild_id, command, channel_id, timestamp)
          SELECT id, user_id, guild_id, 'unknown', channel_id, timestamp 
          FROM ${tableName}_old
        `);
        
        // Drop old table
        await db.runAsync(`DROP TABLE ${tableName}_old`);
        
        // Recreate indexes
        await db.runAsync(`CREATE INDEX idx_command_usage_user ON ${tableName}(user_id)`);
        await db.runAsync(`CREATE INDEX idx_command_usage_guild ON ${tableName}(guild_id)`);
        await db.runAsync(`CREATE INDEX idx_command_usage_command ON ${tableName}(command)`);
        
        logger.info(`Added command column to ${tableName} table`);
      } else {
        logger.info(`Command column already exists in ${tableName} table`);
      }
    }
  } catch (error) {
    logger.error(`Error fixing ${tableName} table: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  try {
    logger.info('Starting command_usage table fix...');
    
    await fixCommandUsageTable();
    
    logger.info('Command_usage table fix completed successfully');
  } catch (error) {
    logger.error(`Error during command_usage table fix: ${error.message}`);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the fix
main(); 