/**
 * JMF Hosting Discord Bot - Database Schema Fix
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script fixes database schema issues by adding missing columns
 * and creating missing tables.
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
        const oldColumns = columns.join(', ');
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
      
      // Check if timestamp column exists
      const hasTimestampColumn = await columnExists(tableName, 'timestamp');
      
      if (!hasTimestampColumn) {
        logger.info(`Adding timestamp column to ${tableName} table...`);
        
        // In SQLite, we need to recreate the table to add a column
        const columns = await getTableColumns(tableName);
        
        // Create a new table with the timestamp column
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
        const oldColumns = columns.join(', ');
        await db.runAsync(`INSERT INTO ${tableName} (id, user_id, guild_id, command, channel_id, timestamp)
          SELECT id, user_id, guild_id, command, channel_id, CURRENT_TIMESTAMP as timestamp 
          FROM ${tableName}_old`);
        
        // Drop old table
        await db.runAsync(`DROP TABLE ${tableName}_old`);
        
        // Recreate indexes
        await db.runAsync(`CREATE INDEX idx_command_usage_user ON ${tableName}(user_id)`);
        await db.runAsync(`CREATE INDEX idx_command_usage_guild ON ${tableName}(guild_id)`);
        await db.runAsync(`CREATE INDEX idx_command_usage_command ON ${tableName}(command)`);
        
        logger.info(`Added timestamp column to ${tableName} table`);
      } else {
        logger.info(`Timestamp column already exists in ${tableName} table`);
      }
    }
  } catch (error) {
    logger.error(`Error fixing ${tableName} table: ${error.message}`);
    throw error;
  }
}

// Function to fix button_usage table
async function fixButtonUsageTable() {
  const tableName = 'button_usage';
  
  try {
    const exists = await tableExists(tableName);
    
    if (!exists) {
      logger.info(`Creating ${tableName} table...`);
      await db.runAsync(`
        CREATE TABLE ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id VARCHAR(20),
          guild_id VARCHAR(20),
          button_id VARCHAR(100),
          channel_id VARCHAR(20),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.runAsync(`CREATE INDEX idx_button_usage_user ON ${tableName}(user_id)`);
      await db.runAsync(`CREATE INDEX idx_button_usage_guild ON ${tableName}(guild_id)`);
      await db.runAsync(`CREATE INDEX idx_button_usage_button ON ${tableName}(button_id)`);
      logger.info(`Created ${tableName} table`);
    } else {
      // Check if button_id column exists
      const hasButtonIdColumn = await columnExists(tableName, 'button_id');
      
      if (!hasButtonIdColumn) {
        logger.info(`Adding button_id column to ${tableName} table...`);
        
        // In SQLite, we need to recreate the table to add a column
        const columns = await getTableColumns(tableName);
        
        // Create a new table with the button_id column
        await db.runAsync(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
        
        await db.runAsync(`
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
        await db.runAsync(`INSERT INTO ${tableName} (id, user_id, guild_id, channel_id, button_id, timestamp)
          SELECT id, user_id, guild_id, channel_id, NULL as button_id, CURRENT_TIMESTAMP as timestamp 
          FROM ${tableName}_old`);
        
        // Drop old table
        await db.runAsync(`DROP TABLE ${tableName}_old`);
        
        // Recreate indexes
        await db.runAsync(`CREATE INDEX idx_button_usage_user ON ${tableName}(user_id)`);
        await db.runAsync(`CREATE INDEX idx_button_usage_guild ON ${tableName}(guild_id)`);
        await db.runAsync(`CREATE INDEX idx_button_usage_button ON ${tableName}(button_id)`);
        
        logger.info(`Added button_id column to ${tableName} table`);
      } else {
        logger.info(`Button_id column already exists in ${tableName} table`);
      }
    }
  } catch (error) {
    logger.error(`Error fixing ${tableName} table: ${error.message}`);
    throw error;
  }
}

// Function to fix select_menu_usage table
async function fixSelectMenuUsageTable() {
  const tableName = 'select_menu_usage';
  
  try {
    const exists = await tableExists(tableName);
    
    if (!exists) {
      logger.info(`Creating ${tableName} table...`);
      await db.runAsync(`
        CREATE TABLE ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id VARCHAR(20),
          guild_id VARCHAR(20),
          menu_id VARCHAR(100),
          selected_values TEXT,
          channel_id VARCHAR(20),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.runAsync(`CREATE INDEX idx_select_menu_usage_user ON ${tableName}(user_id)`);
      await db.runAsync(`CREATE INDEX idx_select_menu_usage_guild ON ${tableName}(guild_id)`);
      await db.runAsync(`CREATE INDEX idx_select_menu_usage_menu ON ${tableName}(menu_id)`);
      logger.info(`Created ${tableName} table`);
    } else {
      // Check if menu_id column exists
      const hasMenuIdColumn = await columnExists(tableName, 'menu_id');
      
      if (!hasMenuIdColumn) {
        logger.info(`Adding menu_id column to ${tableName} table...`);
        
        // In SQLite, we need to recreate the table to add a column
        const columns = await getTableColumns(tableName);
        
        // Create a new table with the menu_id column
        await db.runAsync(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
        
        await db.runAsync(`
          CREATE TABLE ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(20),
            guild_id VARCHAR(20),
            menu_id VARCHAR(100),
            selected_values TEXT,
            channel_id VARCHAR(20),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Copy data from old table to new table
        const oldColumns = columns.join(', ');
        await db.runAsync(`INSERT INTO ${tableName} (id, user_id, guild_id, channel_id, menu_id, selected_values, timestamp)
          SELECT id, user_id, guild_id, channel_id, NULL as menu_id, NULL as selected_values, CURRENT_TIMESTAMP as timestamp 
          FROM ${tableName}_old`);
        
        // Drop old table
        await db.runAsync(`DROP TABLE ${tableName}_old`);
        
        // Recreate indexes
        await db.runAsync(`CREATE INDEX idx_select_menu_usage_user ON ${tableName}(user_id)`);
        await db.runAsync(`CREATE INDEX idx_select_menu_usage_guild ON ${tableName}(guild_id)`);
        await db.runAsync(`CREATE INDEX idx_select_menu_usage_menu ON ${tableName}(menu_id)`);
        
        logger.info(`Added menu_id column to ${tableName} table`);
      } else {
        logger.info(`Menu_id column already exists in ${tableName} table`);
      }
    }
  } catch (error) {
    logger.error(`Error fixing ${tableName} table: ${error.message}`);
    throw error;
  }
}

// Function to fix account_links table
async function fixAccountLinksTable() {
  const tableName = 'account_links';
  
  try {
    const exists = await tableExists(tableName);
    
    if (!exists) {
      logger.info(`Creating ${tableName} table...`);
      await db.runAsync(`
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
      await db.runAsync(`CREATE INDEX idx_account_links_discord ON ${tableName}(discord_id)`);
      await db.runAsync(`CREATE INDEX idx_account_links_pterodactyl ON ${tableName}(pterodactyl_id)`);
      logger.info(`Created ${tableName} table`);
    } else {
      // Check if created_at column exists
      const hasCreatedAtColumn = await columnExists(tableName, 'created_at');
      
      if (!hasCreatedAtColumn) {
        logger.info(`Adding created_at column to ${tableName} table...`);
        
        // In SQLite, we need to recreate the table to add a column
        const columns = await getTableColumns(tableName);
        
        // Create a new table with the created_at column
        await db.runAsync(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
        
        // Build the new table schema based on existing columns plus the new one
        let createTableSQL = `
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
        `;
        
        await db.runAsync(createTableSQL);
        
        // Build the column list for the INSERT statement
        const oldColumnsArray = columns.filter(col => col !== 'created_at');
        const oldColumns = oldColumnsArray.join(', ');
        const newColumns = [...oldColumnsArray, 'created_at'].join(', ');
        
        // Copy data from old table to new table
        await db.runAsync(`INSERT INTO ${tableName} (${oldColumns}, created_at)
          SELECT ${oldColumns}, CURRENT_TIMESTAMP as created_at
          FROM ${tableName}_old`);
        
        // Drop old table
        await db.runAsync(`DROP TABLE ${tableName}_old`);
        
        // Recreate indexes
        await db.runAsync(`CREATE INDEX idx_account_links_discord ON ${tableName}(discord_id)`);
        await db.runAsync(`CREATE INDEX idx_account_links_pterodactyl ON ${tableName}(pterodactyl_id)`);
        
        logger.info(`Added created_at column to ${tableName} table`);
      } else {
        logger.info(`Created_at column already exists in ${tableName} table`);
      }
      
      // Check for other required columns
      const requiredColumns = [
        { name: 'token', type: 'VARCHAR(100)' },
        { name: 'expires_at', type: 'TIMESTAMP' },
        { name: 'panel_id', type: 'VARCHAR(100)' }
      ];
      
      for (const column of requiredColumns) {
        const hasColumn = await columnExists(tableName, column.name);
        
        if (!hasColumn) {
          logger.info(`Adding ${column.name} column to ${tableName} table...`);
          
          // In SQLite, we need to recreate the table to add a column
          const columns = await getTableColumns(tableName);
          
          // Create a new table with the new column
          await db.runAsync(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
          
          // Build the new table schema
          let createTableSQL = `
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
          `;
          
          await db.runAsync(createTableSQL);
          
          // Build the column list for the INSERT statement
          const oldColumnsArray = columns;
          const oldColumns = oldColumnsArray.join(', ');
          
          // Copy data from old table to new table
          let insertSQL = `INSERT INTO ${tableName} (${oldColumns}`;
          let selectSQL = `SELECT ${oldColumns}`;
          
          // Add NULL for the new column
          insertSQL += `, ${column.name}) `;
          selectSQL += `, NULL as ${column.name} FROM ${tableName}_old`;
          
          await db.runAsync(insertSQL + selectSQL);
          
          // Drop old table
          await db.runAsync(`DROP TABLE ${tableName}_old`);
          
          // Recreate indexes
          await db.runAsync(`CREATE INDEX idx_account_links_discord ON ${tableName}(discord_id)`);
          await db.runAsync(`CREATE INDEX idx_account_links_pterodactyl ON ${tableName}(pterodactyl_id)`);
          
          logger.info(`Added ${column.name} column to ${tableName} table`);
        } else {
          logger.info(`${column.name} column already exists in ${tableName} table`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error fixing ${tableName} table: ${error.message}`);
    throw error;
  }
}

// Main function to fix all database issues
async function fixDatabaseIssues() {
  try {
    logger.info('Starting database schema fix...');
    
    // Begin transaction
    await db.runAsync('BEGIN TRANSACTION');
    
    // Fix tables
    await fixCommandUsageTable();
    await fixButtonUsageTable();
    await fixSelectMenuUsageTable();
    await fixAccountLinksTable();
    
    // Commit transaction
    await db.runAsync('COMMIT');
    
    logger.info('Database schema fix completed successfully');
  } catch (error) {
    logger.error(`Error fixing database schema: ${error.message}`);
    
    // Rollback transaction
    try {
      await db.runAsync('ROLLBACK');
      logger.info('Transaction rolled back due to error');
    } catch (rollbackError) {
      logger.error(`Error rolling back transaction: ${rollbackError.message}`);
    }
  } finally {
    // Close database connection
    db.close((err) => {
      if (err) {
        logger.error(`Error closing database connection: ${err.message}`);
      } else {
        logger.info('Database connection closed');
      }
    });
  }
}

// Run the fix process
fixDatabaseIssues().catch(err => {
  logger.error(`Unhandled error in database fix process: ${err.message}`);
  process.exit(1);
}); 