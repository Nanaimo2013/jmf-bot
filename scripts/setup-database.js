#!/usr/bin/env node

/**
 * Script to set up the database for the bot
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

// Load configuration
let config;
try {
  const mainConfig = require('../config/config.json');
  const dbConfig = require('../config/database/config.json');
  config = { main: mainConfig, database: dbConfig };
} catch (error) {
  console.error('Error loading configuration:', error.message);
  process.exit(1);
}

/**
 * Create a directory if it doesn't exist
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<boolean>} - True if directory was created, false if it already existed
 */
async function createDirectory(dirPath) {
  const fullPath = path.resolve(process.cwd(), dirPath);
  
  try {
    if (await existsAsync(fullPath)) {
      console.log(`✓ Directory already exists: ${dirPath}`);
      return false;
    }
    
    await mkdirAsync(fullPath, { recursive: true });
    console.log(`✓ Created directory: ${dirPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to create directory: ${dirPath}`, error.message);
    return false;
  }
}

/**
 * Setup SQLite database
 */
async function setupSQLite() {
  console.log('\n=== Setting up SQLite ===');
  
  const sqliteConfig = config.database.modules.sqlite;
  if (!sqliteConfig.enabled) {
    console.log('SQLite is disabled in configuration, skipping setup');
    return;
  }
  
  // Create database directory
  const dbDir = sqliteConfig.directory || './data';
  await createDirectory(dbDir);
  
  // Create backup directory
  const backupDir = sqliteConfig.backupDirectory || './backups/database';
  await createDirectory(backupDir);
  
  console.log('✓ SQLite setup complete');
}

/**
 * Setup MySQL database
 */
async function setupMySQL() {
  console.log('\n=== Setting up MySQL ===');
  
  const mysqlConfig = config.database.modules.mysql;
  if (!mysqlConfig.enabled) {
    console.log('MySQL is disabled in configuration, skipping setup');
    return;
  }
  
  // Create backup directory
  const backupDir = mysqlConfig.backupDirectory || './backups/database';
  await createDirectory(backupDir);
  
  console.log('✓ MySQL setup complete');
  console.log('Note: You need to manually create the MySQL database and user');
  console.log(`Database: ${mysqlConfig.database}`);
  console.log(`Host: ${mysqlConfig.host}`);
  console.log(`Port: ${mysqlConfig.port}`);
  console.log(`User: ${mysqlConfig.user}`);
}

/**
 * Setup migrations
 */
async function setupMigrations() {
  console.log('\n=== Setting up migrations ===');
  
  const migrationConfig = config.database.modules.migration;
  if (!migrationConfig.enabled) {
    console.log('Migrations are disabled in configuration, skipping setup');
    return;
  }
  
  // Create migrations directory
  const migrationsDir = migrationConfig.directory || './src/database/migrations';
  await createDirectory(migrationsDir);
  
  console.log('✓ Migrations setup complete');
}

/**
 * Main function to set up the database
 */
async function setupDatabase() {
  console.log('=== Database Setup ===');
  
  // Setup SQLite
  await setupSQLite();
  
  // Setup MySQL
  await setupMySQL();
  
  // Setup migrations
  await setupMigrations();
  
  console.log('\n=== Database setup complete ===');
}

// Run the setup
setupDatabase().catch(error => {
  console.error('Error setting up database:', error);
  process.exit(1);
}); 