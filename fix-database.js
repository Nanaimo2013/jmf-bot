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
const dbPath = process.env.DATABASE_PATH || './data/database.sqlite';

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logger.info(`Created database directory: ${dbDir}`);
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
        const column = columns.find(col => col && col.name === columnName);
        resolve(!!column);
      }
    });
  });
}

// Fix database schema
async function fixDatabaseSchema() {
  try {
    logger.info('Starting database schema fix...');

    // Create command_usage table if it doesn't exist
    const commandUsageExists = await tableExists('command_usage');
    if (!commandUsageExists) {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS command_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id VARCHAR(20),
          guild_id VARCHAR(20),
          command VARCHAR(50),
          channel_id VARCHAR(20),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_usage_user ON command_usage(user_id)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_usage_guild ON command_usage(guild_id)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command)`);
      logger.info('Created command_usage table');
    } else {
      // Check if command column exists
      const commandColumnExists = await columnExists('command_usage', 'command');
      if (!commandColumnExists) {
        // SQLite doesn't support dropping columns, so we need to recreate the table
        logger.info('command_usage table exists but missing command column, recreating...');
        
        // Begin transaction
        await runQuery('BEGIN TRANSACTION');
        
        // Rename the old table
        await runQuery('ALTER TABLE command_usage RENAME TO command_usage_old');
        
        // Create the new table with the correct schema
        await runQuery(`
          CREATE TABLE command_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(20),
            guild_id VARCHAR(20),
            command VARCHAR(50),
            channel_id VARCHAR(20),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Copy data from old table to new table
        await runQuery(`
          INSERT INTO command_usage (id, user_id, guild_id, command, channel_id, timestamp)
          SELECT id, user_id, guild_id, NULL as command, channel_id, timestamp FROM command_usage_old
        `);
        
        // Create indexes
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_usage_user ON command_usage(user_id)`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_usage_guild ON command_usage(guild_id)`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command)`);
        
        // Drop the old table
        await runQuery('DROP TABLE command_usage_old');
        
        // Commit transaction
        await runQuery('COMMIT');
        
        logger.info('Recreated command_usage table with command column');
      }
    }

    // Create button_usage table if it doesn't exist
    const buttonUsageExists = await tableExists('button_usage');
    if (!buttonUsageExists) {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS button_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id VARCHAR(20),
          guild_id VARCHAR(20),
          button_id VARCHAR(100),
          channel_id VARCHAR(20),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_button_usage_user ON button_usage(user_id)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_button_usage_guild ON button_usage(guild_id)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_button_usage_button ON button_usage(button_id)`);
      logger.info('Created button_usage table');
    } else {
      // Check if button_id column exists
      const buttonIdColumnExists = await columnExists('button_usage', 'button_id');
      if (!buttonIdColumnExists) {
        // SQLite doesn't support dropping columns, so we need to recreate the table
        logger.info('button_usage table exists but missing button_id column, recreating...');
        
        // Begin transaction
        await runQuery('BEGIN TRANSACTION');
        
        // Rename the old table
        await runQuery('ALTER TABLE button_usage RENAME TO button_usage_old');
        
        // Create the new table with the correct schema
        await runQuery(`
          CREATE TABLE button_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(20),
            guild_id VARCHAR(20),
            button_id VARCHAR(100),
            channel_id VARCHAR(20),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Copy data from old table to new table
        await runQuery(`
          INSERT INTO button_usage (id, user_id, guild_id, button_id, channel_id, timestamp)
          SELECT id, user_id, guild_id, NULL as button_id, channel_id, timestamp FROM button_usage_old
        `);
        
        // Create indexes
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_button_usage_user ON button_usage(user_id)`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_button_usage_guild ON button_usage(guild_id)`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_button_usage_button ON button_usage(button_id)`);
        
        // Drop the old table
        await runQuery('DROP TABLE button_usage_old');
        
        // Commit transaction
        await runQuery('COMMIT');
        
        logger.info('Recreated button_usage table with button_id column');
      }
    }

    // Create command_errors table if it doesn't exist
    const commandErrorsExists = await tableExists('command_errors');
    if (!commandErrorsExists) {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS command_errors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id VARCHAR(20),
          guild_id VARCHAR(20),
          command VARCHAR(50),
          error_message TEXT,
          stack_trace TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_errors_user ON command_errors(user_id)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_errors_guild ON command_errors(guild_id)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_errors_command ON command_errors(command)`);
      logger.info('Created command_errors table');
    } else {
      // Check if command column exists
      const commandColumnExists = await columnExists('command_errors', 'command');
      if (!commandColumnExists) {
        // SQLite doesn't support dropping columns, so we need to recreate the table
        logger.info('command_errors table exists but missing command column, recreating...');
        
        // Begin transaction
        await runQuery('BEGIN TRANSACTION');
        
        // Rename the old table
        await runQuery('ALTER TABLE command_errors RENAME TO command_errors_old');
        
        // Create the new table with the correct schema
        await runQuery(`
          CREATE TABLE command_errors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(20),
            guild_id VARCHAR(20),
            command VARCHAR(50),
            error_message TEXT,
            stack_trace TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Copy data from old table to new table
        await runQuery(`
          INSERT INTO command_errors (id, user_id, guild_id, command, error_message, stack_trace, timestamp)
          SELECT id, user_id, guild_id, NULL as command, error_message, stack_trace, timestamp FROM command_errors_old
        `);
        
        // Create indexes
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_errors_user ON command_errors(user_id)`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_errors_guild ON command_errors(guild_id)`);
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_command_errors_command ON command_errors(command)`);
        
        // Drop the old table
        await runQuery('DROP TABLE command_errors_old');
        
        // Commit transaction
        await runQuery('COMMIT');
        
        logger.info('Recreated command_errors table with command column');
      }
    }

    logger.info('Database schema fix completed successfully');
  } catch (error) {
    logger.error(`Error fixing database schema: ${error.message}`);
    // If we're in a transaction, roll it back
    try {
      await runQuery('ROLLBACK');
    } catch (rollbackError) {
      logger.error(`Error rolling back transaction: ${rollbackError.message}`);
    }
  } finally {
    // Close the database connection
    db.close((err) => {
      if (err) {
        logger.error(`Error closing database connection: ${err.message}`);
      } else {
        logger.info('Database connection closed');
      }
    });
  }
}

// Run the fix
fixDatabaseSchema(); 