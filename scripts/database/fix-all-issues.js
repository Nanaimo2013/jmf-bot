/**
 * JMF Hosting Discord Bot - Comprehensive Database Fix
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script fixes multiple database issues:
 * 1. Adds missing 'command' column to command_usage table
 * 2. Creates indexes safely by checking if tables and columns exist first
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

// Function to create an index if the table and column exist
async function createIndexIfColumnExists(tableName, columnName, indexName) {
  try {
    const tableExistsResult = await tableExists(tableName);
    if (!tableExistsResult) {
      logger.info(`Table ${tableName} does not exist, skipping index creation for ${indexName}`);
      return;
    }
    
    const columnExistsResult = await columnExists(tableName, columnName);
    if (!columnExistsResult) {
      logger.info(`Column ${columnName} does not exist in table ${tableName}, skipping index creation for ${indexName}`);
      return;
    }
    
    // Create the index
    await db.runAsync(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnName})`);
    logger.info(`Created index ${indexName} on ${tableName}(${columnName})`);
  } catch (error) {
    logger.error(`Error creating index ${indexName}: ${error.message}`);
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
          user_id VARCHAR(20),
          guild_id VARCHAR(20),
          command VARCHAR(50),
          channel_id VARCHAR(20),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.runAsync(`CREATE INDEX idx_command_usage_user ON ${tableName}(user_id)`);
      await db.runAsync(`CREATE INDEX idx_command_usage_guild ON ${tableName}(guild_id)`);
      await db.runAsync(`CREATE INDEX idx_command_usage_command ON ${tableName}(command)`);
      logger.info(`Created ${tableName} table`);
    } else {
      // Check if command column exists
      const hasCommandColumn = await columnExists(tableName, 'command');
      
      if (!hasCommandColumn) {
        logger.info(`Adding command column to ${tableName} table...`);
        
        // In SQLite, we need to recreate the table to add a column
        // First, get all existing columns
        const columns = await getTableColumns(tableName);
        
        // Create a new table with the command column
        await db.runAsync(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
        
        await db.runAsync(`
          CREATE TABLE ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(20),
            guild_id VARCHAR(20),
            command VARCHAR(50),
            channel_id VARCHAR(20),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Copy data from old table to new table
        await db.runAsync(`INSERT INTO ${tableName} (id, user_id, guild_id, channel_id, command, timestamp)
          SELECT id, user_id, guild_id, channel_id, NULL as command, CURRENT_TIMESTAMP as timestamp 
          FROM ${tableName}_old`);
        
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

// Function to fix indexes
async function fixIndexes() {
  try {
    logger.info('Starting to fix indexes...');
    
    // Fix account_links indexes
    await createIndexIfColumnExists('account_links', 'discord_id', 'idx_account_links_discord_id');
    await createIndexIfColumnExists('account_links', 'pterodactyl_id', 'idx_account_links_pterodactyl_id');
    await createIndexIfColumnExists('account_links', 'panel_id', 'idx_account_links_panel_id');
    
    // Fix market_listings indexes
    await createIndexIfColumnExists('market_listings', 'seller_id', 'idx_market_listings_seller_id');
    await createIndexIfColumnExists('market_listings', 'item_type', 'idx_market_listings_item_type');
    await createIndexIfColumnExists('market_listings', 'is_active', 'idx_market_listings_is_active');
    await createIndexIfColumnExists('market_listings', 'active', 'idx_market_listings_active');
    
    logger.info('Finished fixing indexes');
  } catch (error) {
    logger.error(`Error fixing indexes: ${error.message}`);
  }
}

// Main function to fix all issues
async function fixAllIssues() {
  try {
    logger.info('Starting comprehensive database fix...');
    
    // Fix command_usage table
    await fixCommandUsageTable();
    
    // Fix indexes
    await fixIndexes();
    
    logger.info('Comprehensive database fix completed successfully');
  } catch (error) {
    logger.error(`Error during comprehensive database fix: ${error.message}`);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the fix
fixAllIssues(); 