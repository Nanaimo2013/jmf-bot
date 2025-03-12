/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const logger = require('../../src/utils/logger');

async function fixAccountLinksTable() {
  try {
    logger.info('Starting account_links table fix script');
    
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info('Created data directory');
    }

    // Get database path
    const dbPath = process.env.DB_PATH || path.join(dataDir, 'database.sqlite');
    logger.info(`Using database at: ${dbPath}`);
    
    // Open SQLite database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    logger.info('Connected to SQLite database');
    
    // Check if account_links table exists
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='account_links'");
    
    if (!tableExists) {
      logger.info('account_links table does not exist, creating it');
      
      // Create the account_links table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS account_links (
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
      
      logger.info('account_links table created successfully');
    } else {
      logger.info('account_links table exists, checking for missing columns');
      
      // Get existing columns
      const tableInfo = await db.all("PRAGMA table_info(account_links)");
      const existingColumns = tableInfo.map(col => col.name);
      
      logger.info(`Existing columns: ${existingColumns.join(', ')}`);
      
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
        if (!existingColumns.includes(column.name)) {
          logger.info(`Adding missing column: ${column.name}`);
          await db.exec(`ALTER TABLE account_links ADD COLUMN ${column.name} ${column.type}`);
          logger.info(`Added column ${column.name} successfully`);
        }
      }
      
      // If discord_id is missing but was just added, populate it from user_id
      if (!existingColumns.includes('discord_id') && requiredColumns.find(c => c.name === 'discord_id')) {
        logger.info('Populating discord_id column from user_id');
        await db.exec(`UPDATE account_links SET discord_id = user_id WHERE discord_id IS NULL`);
        logger.info('discord_id column populated successfully');
      }
    }
    
    // Create indexes
    logger.info('Creating indexes for account_links table');
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_account_links_user_id ON account_links(user_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_account_links_discord_id ON account_links(discord_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_account_links_pterodactyl_id ON account_links(pterodactyl_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_account_links_panel_id ON account_links(panel_id)`);
    
    logger.info('Indexes created successfully');
    
    // Close the database connection
    await db.close();
    logger.info('Database connection closed');
    
    logger.info('account_links table fix completed successfully');
    
  } catch (error) {
    logger.error(`Error fixing account_links table: ${error.message}`);
    process.exit(1);
  }
}

async function fixMarketListingsTable() {
  try {
    logger.info('Starting market_listings table fix script');
    
    // Get database path
    const dataDir = path.join(process.cwd(), 'data');
    const dbPath = process.env.DB_PATH || path.join(dataDir, 'database.sqlite');
    
    // Open SQLite database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    logger.info('Connected to SQLite database');
    
    // Check if market_listings table exists
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='market_listings'");
    
    if (!tableExists) {
      logger.info('market_listings table does not exist, creating it');
      
      // Create the market_listings table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS market_listings (
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
      
      logger.info('market_listings table created successfully');
    } else {
      logger.info('market_listings table exists, checking for missing columns');
      
      // Get existing columns
      const tableInfo = await db.all("PRAGMA table_info(market_listings)");
      const existingColumns = tableInfo.map(col => col.name);
      
      logger.info(`Existing columns: ${existingColumns.join(', ')}`);
      
      // Check and add missing columns
      const requiredColumns = [
        { name: 'item_type', type: 'VARCHAR(20) NOT NULL DEFAULT "item"' }
      ];
      
      for (const column of requiredColumns) {
        if (!existingColumns.includes(column.name)) {
          logger.info(`Adding missing column: ${column.name}`);
          await db.exec(`ALTER TABLE market_listings ADD COLUMN ${column.name} ${column.type}`);
          logger.info(`Added column ${column.name} successfully`);
        }
      }
    }
    
    // Create indexes
    logger.info('Creating indexes for market_listings table');
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON market_listings(seller_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_market_listings_item_type ON market_listings(item_type)`);
    
    logger.info('Indexes created successfully');
    
    // Close the database connection
    await db.close();
    logger.info('Database connection closed');
    
    logger.info('market_listings table fix completed successfully');
    
  } catch (error) {
    logger.error(`Error fixing market_listings table: ${error.message}`);
    process.exit(1);
  }
}

// Run the fix functions
async function main() {
  try {
    await fixAccountLinksTable();
    await fixMarketListingsTable();
    logger.info('All database fixes completed successfully');
  } catch (error) {
    logger.error(`Error in main function: ${error.message}`);
    process.exit(1);
  }
}

main(); 