/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const logger = require('./src/utils/logger');

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

// Function to run a query and log the result
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        logger.error(`Error executing query: ${query}`);
        logger.error(`Error message: ${err.message}`);
        reject(err);
      } else {
        logger.info(`Query executed successfully: ${query.split('\n')[0]}...`);
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
}

// Function to check if a table exists
function tableExists(tableName) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

// Function to check if a column exists in a table
function columnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.get(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const columns = Array.isArray(rows) ? rows : [rows];
        const exists = columns.some(col => col && col.name === columnName);
        resolve(exists);
      }
    });
  });
}

// Function to get all columns in a table
function getTableColumns(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => row.name));
      }
    });
  });
}

// Main function to fix database issues
async function fixDatabaseIssues() {
  try {
    logger.info('Starting database fix process...');
    
    // Begin transaction
    await runQuery('BEGIN TRANSACTION');
    
    // Fix command_usage table
    await fixCommandUsageTable();
    
    // Fix button_usage table
    await fixButtonUsageTable();
    
    // Fix account_links table
    await fixAccountLinksTable();
    
    // Fix command_errors table
    await fixCommandErrorsTable();
    
    // Fix leveling table
    await fixLevelingTable();
    
    // Fix mining_data table
    await fixMiningDataTable();
    
    // Commit transaction
    await runQuery('COMMIT');
    logger.info('Database fix process completed successfully');
  } catch (error) {
    logger.error(`Error fixing database: ${error.message}`);
    await runQuery('ROLLBACK');
    logger.info('Changes rolled back due to error');
  } finally {
    // Close database connection
    db.close((err) => {
      if (err) {
        logger.error(`Error closing database: ${err.message}`);
      } else {
        logger.info('Database connection closed');
      }
    });
  }
}

// Fix command_usage table
async function fixCommandUsageTable() {
  const tableName = 'command_usage';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (!exists) {
    logger.info(`Creating ${tableName} table...`);
    await runQuery(`
      CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(20),
        guild_id VARCHAR(20),
        command VARCHAR(50),
        channel_id VARCHAR(20),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await runQuery(`CREATE INDEX idx_command_usage_user ON ${tableName}(user_id)`);
    await runQuery(`CREATE INDEX idx_command_usage_guild ON ${tableName}(guild_id)`);
    await runQuery(`CREATE INDEX idx_command_usage_command ON ${tableName}(command)`);
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
      await runQuery(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
      
      await runQuery(`
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
      const oldColumns = columns.join(', ');
      const newColumns = [...columns, 'command'].join(', ');
      await runQuery(`INSERT INTO ${tableName} (${oldColumns}, command) SELECT ${oldColumns}, NULL FROM ${tableName}_old`);
      
      // Drop old table
      await runQuery(`DROP TABLE ${tableName}_old`);
      
      // Recreate indexes
      await runQuery(`CREATE INDEX idx_command_usage_user ON ${tableName}(user_id)`);
      await runQuery(`CREATE INDEX idx_command_usage_guild ON ${tableName}(guild_id)`);
      await runQuery(`CREATE INDEX idx_command_usage_command ON ${tableName}(command)`);
      
      logger.info(`Added command column to ${tableName} table`);
    }
  }
}

// Fix button_usage table
async function fixButtonUsageTable() {
  const tableName = 'button_usage';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (!exists) {
    logger.info(`Creating ${tableName} table...`);
    await runQuery(`
      CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(20),
        guild_id VARCHAR(20),
        button_id VARCHAR(100),
        channel_id VARCHAR(20),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await runQuery(`CREATE INDEX idx_button_usage_user ON ${tableName}(user_id)`);
    await runQuery(`CREATE INDEX idx_button_usage_guild ON ${tableName}(guild_id)`);
    await runQuery(`CREATE INDEX idx_button_usage_button ON ${tableName}(button_id)`);
    logger.info(`Created ${tableName} table`);
  } else {
    // Check if button_id column exists
    const hasButtonIdColumn = await columnExists(tableName, 'button_id');
    
    if (!hasButtonIdColumn) {
      logger.info(`Adding button_id column to ${tableName} table...`);
      
      // In SQLite, we need to recreate the table to add a column
      // First, get all existing columns
      const columns = await getTableColumns(tableName);
      
      // Create a new table with the button_id column
      await runQuery(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
      
      await runQuery(`
        CREATE TABLE ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id VARCHAR(20),
          guild_id VARCHAR(20),
          button_id VARCHAR(100),
          channel_id VARCHAR(20),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Copy data from old table to new table
      const oldColumns = columns.join(', ');
      const newColumns = [...columns, 'button_id'].join(', ');
      await runQuery(`INSERT INTO ${tableName} (${oldColumns}, button_id) SELECT ${oldColumns}, NULL FROM ${tableName}_old`);
      
      // Drop old table
      await runQuery(`DROP TABLE ${tableName}_old`);
      
      // Recreate indexes
      await runQuery(`CREATE INDEX idx_button_usage_user ON ${tableName}(user_id)`);
      await runQuery(`CREATE INDEX idx_button_usage_guild ON ${tableName}(guild_id)`);
      await runQuery(`CREATE INDEX idx_button_usage_button ON ${tableName}(button_id)`);
      
      logger.info(`Added button_id column to ${tableName} table`);
    }
  }
}

// Fix account_links table
async function fixAccountLinksTable() {
  const tableName = 'account_links';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (!exists) {
    logger.info(`Creating ${tableName} table...`);
    await runQuery(`
      CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id VARCHAR(20) UNIQUE,
        pterodactyl_id INTEGER,
        token VARCHAR(100),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified BOOLEAN DEFAULT 0,
        verified_at TIMESTAMP,
        panel_id VARCHAR(100)
      )
    `);
    await runQuery(`CREATE INDEX idx_account_links_discord ON ${tableName}(discord_id)`);
    await runQuery(`CREATE INDEX idx_account_links_pterodactyl ON ${tableName}(pterodactyl_id)`);
    logger.info(`Created ${tableName} table`);
  } else {
    // Check if created_at column exists
    const hasCreatedAtColumn = await columnExists(tableName, 'created_at');
    
    if (!hasCreatedAtColumn) {
      logger.info(`Adding created_at column to ${tableName} table...`);
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      logger.info(`Added created_at column to ${tableName} table`);
    }
    
    // Check if token column exists
    const hasTokenColumn = await columnExists(tableName, 'token');
    
    if (!hasTokenColumn) {
      logger.info(`Adding token column to ${tableName} table...`);
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN token VARCHAR(100)`);
      logger.info(`Added token column to ${tableName} table`);
    }
    
    // Check if expires_at column exists
    const hasExpiresAtColumn = await columnExists(tableName, 'expires_at');
    
    if (!hasExpiresAtColumn) {
      logger.info(`Adding expires_at column to ${tableName} table...`);
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN expires_at TIMESTAMP`);
      logger.info(`Added expires_at column to ${tableName} table`);
    }
    
    // Check if panel_id column exists
    const hasPanelIdColumn = await columnExists(tableName, 'panel_id');
    
    if (!hasPanelIdColumn) {
      logger.info(`Adding panel_id column to ${tableName} table...`);
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN panel_id VARCHAR(100)`);
      logger.info(`Added panel_id column to ${tableName} table`);
    }
    
    // Check if discord_id column exists
    const hasDiscordIdColumn = await columnExists(tableName, 'discord_id');
    
    if (!hasDiscordIdColumn) {
      logger.info(`Adding discord_id column to ${tableName} table...`);
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN discord_id VARCHAR(20)`);
      
      // Update discord_id to match user_id if it exists
      const hasUserIdColumn = await columnExists(tableName, 'user_id');
      if (hasUserIdColumn) {
        await runQuery(`UPDATE ${tableName} SET discord_id = user_id WHERE discord_id IS NULL`);
      }
      
      logger.info(`Added discord_id column to ${tableName} table`);
    }
  }
}

// Fix command_errors table
async function fixCommandErrorsTable() {
  const tableName = 'command_errors';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (!exists) {
    logger.info(`Creating ${tableName} table...`);
    await runQuery(`
      CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(20),
        guild_id VARCHAR(20),
        command VARCHAR(50),
        error_message TEXT,
        stack_trace TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await runQuery(`CREATE INDEX idx_command_errors_user ON ${tableName}(user_id)`);
    await runQuery(`CREATE INDEX idx_command_errors_guild ON ${tableName}(guild_id)`);
    await runQuery(`CREATE INDEX idx_command_errors_command ON ${tableName}(command)`);
    logger.info(`Created ${tableName} table`);
  }
}

// Fix leveling table
async function fixLevelingTable() {
  const tableName = 'leveling';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (exists) {
    // Make sure all required columns exist
    const columns = await getTableColumns(tableName);
    
    if (!columns.includes('total_xp')) {
      logger.info(`Adding total_xp column to ${tableName} table...`);
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN total_xp INTEGER DEFAULT 0`);
      await runQuery(`UPDATE ${tableName} SET total_xp = xp`);
      logger.info(`Added total_xp column to ${tableName} table`);
    }
  }
}

// Fix mining_data table
async function fixMiningDataTable() {
  const tableName = 'mining_data';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (exists) {
    // Check if resources column exists
    const hasResourcesColumn = await columnExists(tableName, 'resources');
    
    if (!hasResourcesColumn) {
      logger.info(`Adding resources column to ${tableName} table...`);
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN resources TEXT DEFAULT '[]'`);
      logger.info(`Added resources column to ${tableName} table`);
    }
  }
}

// Run the fix process
fixDatabaseIssues().catch(err => {
  logger.error(`Unhandled error in database fix process: ${err.message}`);
  process.exit(1);
}); 