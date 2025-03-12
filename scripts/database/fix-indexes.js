/**
 * JMF Hosting Discord Bot - Database Index Fix
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script fixes database index issues by checking if tables and columns
 * exist before creating indexes.
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

// Main function to fix indexes
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
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the fix
fixIndexes(); 