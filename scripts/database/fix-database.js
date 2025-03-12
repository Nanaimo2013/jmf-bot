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
const logger = require('../../src/utils/logger');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { open } = require('sqlite');

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

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging'
  })
  .option('dry-run', {
    alias: 'd',
    type: 'boolean',
    description: 'Perform a dry run without making changes'
  })
  .help()
  .argv;

// Enhanced logging function
function log(message, level = 'info') {
  const symbols = { info: 'ℹ️', error: '❌', success: '✅', warning: '⚠️' };
  const symbol = symbols[level] || symbols.info;
  if (argv.verbose || level !== 'info') {
    logger[level](`${symbol} ${message}`);
  }
}

// Function to run a query and log the result
async function runQuery(query, params = []) {
  if (argv['dry-run']) {
    log(`Dry run: would execute query: ${query.split('\n')[0]}...`, 'warning');
    return Promise.resolve({ changes: 0, lastID: null });
  }
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        log(`Error executing query: ${query}`, 'error');
        log(`Error message: ${err.message}`, 'error');
        reject(err);
      } else {
        log(`Query executed successfully: ${query.split('\n')[0]}...`, 'success');
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

// Function to fix market_listings table
async function fixMarketListingsTable() {
  const tableName = 'market_listings';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (!exists) {
    log(`Creating ${tableName} table...`, 'info');
    await runQuery(`
      CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id VARCHAR(20) NOT NULL,
        guild_id VARCHAR(20) NOT NULL,
        item_id VARCHAR(50) NOT NULL,
        item_type VARCHAR(20) NOT NULL,
        quantity INTEGER NOT NULL,
        price INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active'
      )
    `);
    log(`Created ${tableName} table`, 'success');
  } else {
    // Check and add missing columns
    const hasItemTypeColumn = await columnExists(tableName, 'item_type');
    
    if (!hasItemTypeColumn) {
      log(`Adding item_type column to ${tableName} table...`, 'info');
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN item_type VARCHAR(20) NOT NULL DEFAULT 'item'`);
      log(`Added item_type column to ${tableName} table`, 'success');
    }
  }
}

// Function to fix account_links table
async function fixAccountLinksTable() {
  const tableName = 'account_links';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (!exists) {
    log(`Creating ${tableName} table...`, 'info');
    await runQuery(`
      CREATE TABLE ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(20) NOT NULL,
        discord_id VARCHAR(20),
        pterodactyl_id INTEGER,
        panel_id VARCHAR(100),
        pterodactyl_username VARCHAR(100),
        token VARCHAR(100),
        expires_at TIMESTAMP,
        whmcs_id INTEGER,
        verified BOOLEAN DEFAULT 0,
        verification_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    log(`Created ${tableName} table`, 'success');
  } else {
    // Check and add missing columns
    const requiredColumns = [
      { name: 'discord_id', type: 'VARCHAR(20)' },
      { name: 'pterodactyl_id', type: 'INTEGER' },
      { name: 'panel_id', type: 'VARCHAR(100)' },
      { name: 'pterodactyl_username', type: 'VARCHAR(100)' },
      { name: 'token', type: 'VARCHAR(100)' },
      { name: 'expires_at', type: 'TIMESTAMP' },
      { name: 'whmcs_id', type: 'INTEGER' },
      { name: 'verified', type: 'BOOLEAN DEFAULT 0' },
      { name: 'verification_code', type: 'VARCHAR(10)' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'verified_at', type: 'TIMESTAMP' }
    ];
    
    for (const column of requiredColumns) {
      const hasColumn = await columnExists(tableName, column.name);
      if (!hasColumn) {
        log(`Adding ${column.name} column to ${tableName} table...`, 'info');
        await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`);
        log(`Added ${column.name} column to ${tableName} table`, 'success');
      }
    }
  }
}

// Main function to fix database issues
async function fixDatabaseIssues() {
  try {
    log('Starting database fix process...', 'info');
    
    // Begin transaction
    await runQuery('BEGIN TRANSACTION');
    
    // Call the fix functions
    await fixCommandUsageTable();
    await fixButtonUsageTable();
    await fixAccountLinksTable();
    await fixMarketListingsTable();
    await fixCommandErrorsTable();
    await fixLevelingTable();
    await fixMiningDataTable();
    
    // Commit transaction
    await runQuery('COMMIT');
    log('Database fix process completed successfully', 'success');
  } catch (error) {
    log(`Error fixing database: ${error.message}`, 'error');
    await runQuery('ROLLBACK');
    log('Changes rolled back due to error', 'warning');
  } finally {
    // Close database connection
    db.close((err) => {
      if (err) {
        log(`Error closing database: ${err.message}`, 'error');
      } else {
        log('Database connection closed', 'info');
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
    log(`Creating ${tableName} table...`, 'info');
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
    log(`Created ${tableName} table`, 'success');
  } else {
    // Check if command column exists
    const hasCommandColumn = await columnExists(tableName, 'command');
    
    if (!hasCommandColumn) {
      log(`Adding command column to ${tableName} table...`, 'info');
      
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
      
      log(`Added command column to ${tableName} table`, 'success');
    }
  }
}

// Fix button_usage table
async function fixButtonUsageTable() {
  const tableName = 'button_usage';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (!exists) {
    log(`Creating ${tableName} table...`, 'info');
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
    log(`Created ${tableName} table`, 'success');
  } else {
    // Check if button_id column exists
    const hasButtonIdColumn = await columnExists(tableName, 'button_id');
    
    if (!hasButtonIdColumn) {
      log(`Adding button_id column to ${tableName} table...`, 'info');
      
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
      
      log(`Added button_id column to ${tableName} table`, 'success');
    }
  }
}

// Fix command_errors table
async function fixCommandErrorsTable() {
  const tableName = 'command_errors';
  
  // Check if table exists
  const exists = await tableExists(tableName);
  
  if (!exists) {
    log(`Creating ${tableName} table...`, 'info');
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
    log(`Created ${tableName} table`, 'success');
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
      log(`Adding total_xp column to ${tableName} table...`, 'info');
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN total_xp INTEGER DEFAULT 0`);
      await runQuery(`UPDATE ${tableName} SET total_xp = xp`);
      log(`Added total_xp column to ${tableName} table`, 'success');
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
      log(`Adding resources column to ${tableName} table...`, 'info');
      await runQuery(`ALTER TABLE ${tableName} ADD COLUMN resources TEXT DEFAULT '[]'`);
      log(`Added resources column to ${tableName} table`, 'success');
    }
  }
}

// Run the fix process
fixDatabaseIssues().catch(err => {
  log(`Unhandled error in database fix process: ${err.message}`, 'error');
  process.exit(1);
}); 