/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script fixes SQLite schema issues by removing MySQL-specific syntax
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const schemaPath = path.join(__dirname, '../../src/database/schema/unified-schema.sql');
const sqliteDbPath = path.join(__dirname, '../../data/database.sqlite');
const backupDir = path.join(__dirname, '../../data/backups');
const tempSchemaPath = path.join(__dirname, '../../src/database/schema/sqlite-schema.sql');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Create a backup of the database
function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `database_${timestamp}.sqlite`);
  
  console.log(`Creating backup at ${backupPath}`);
  
  try {
    fs.copyFileSync(sqliteDbPath, backupPath);
    console.log('Database backup created successfully');
    return true;
  } catch (error) {
    console.error(`Failed to create database backup: ${error.message}`);
    return false;
  }
}

// Fix the schema file for SQLite compatibility
function fixSchemaForSQLite() {
  console.log('Fixing schema for SQLite compatibility...');
  
  try {
    // Read the unified schema
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Replace MySQL-specific syntax with SQLite-compatible syntax
    schemaContent = schemaContent
      // Remove AUTO_INCREMENT
      .replace(/AUTO_INCREMENT/g, '')
      // Replace ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      .replace(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;/g, ';')
      // Replace INT NOT NULL AUTO_INCREMENT PRIMARY KEY with INTEGER PRIMARY KEY
      .replace(/INT NOT NULL PRIMARY KEY/g, 'INTEGER PRIMARY KEY')
      .replace(/INT NOT NULL AUTO_INCREMENT PRIMARY KEY/g, 'INTEGER PRIMARY KEY')
      .replace(/BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY/g, 'INTEGER PRIMARY KEY')
      // Replace DATETIME with TIMESTAMP
      .replace(/DATETIME/g, 'TIMESTAMP')
      // Replace ON UPDATE CASCADE with nothing
      .replace(/ON UPDATE CASCADE/g, '')
      // Replace ON DELETE CASCADE with nothing (SQLite handles this differently)
      .replace(/ON DELETE CASCADE/g, '');
    
    // Write the fixed schema to a temporary file
    fs.writeFileSync(tempSchemaPath, schemaContent);
    console.log(`Fixed schema written to ${tempSchemaPath}`);
    
    return true;
  } catch (error) {
    console.error(`Failed to fix schema: ${error.message}`);
    return false;
  }
}

// Apply the fixed schema to the SQLite database
function applyFixedSchema() {
  console.log('Applying fixed schema to SQLite database...');
  
  return new Promise((resolve, reject) => {
    exec(`sqlite3 ${sqliteDbPath} < ${tempSchemaPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error applying schema: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      
      console.log('Schema applied successfully');
      resolve(true);
    });
  });
}

// Check if a table exists in the database
function tableExists(tableName) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(sqliteDbPath);
    
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
      (err, row) => {
        db.close();
        
        if (err) {
          reject(err);
          return;
        }
        
        resolve(!!row);
      }
    );
  });
}

// Fix the item_type column issue
async function fixItemTypeColumn() {
  console.log('Checking for item_type column issue...');
  
  try {
    const inventoryTableExists = await tableExists('user_inventory');
    
    if (!inventoryTableExists) {
      console.log('user_inventory table does not exist, no fix needed');
      return true;
    }
    
    const db = new sqlite3.Database(sqliteDbPath);
    
    // Check if the column exists
    const hasItemTypeColumn = await new Promise((resolve, reject) => {
      db.get(
        "PRAGMA table_info(user_inventory)",
        [],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          const hasColumn = rows && rows.some(row => row.name === 'item_type');
          resolve(hasColumn);
        }
      );
    });
    
    if (hasItemTypeColumn) {
      console.log('item_type column already exists, no fix needed');
      db.close();
      return true;
    }
    
    // Add the missing column
    await new Promise((resolve, reject) => {
      db.run(
        "ALTER TABLE user_inventory ADD COLUMN item_type TEXT DEFAULT 'resource'",
        [],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log('Added item_type column to user_inventory table');
          resolve(true);
        }
      );
    });
    
    db.close();
    return true;
  } catch (error) {
    console.error(`Failed to fix item_type column: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting SQLite schema fix...');
  
  // Backup the database first
  if (!backupDatabase()) {
    console.error('Aborting due to backup failure');
    process.exit(1);
  }
  
  // Fix the schema file
  if (!fixSchemaForSQLite()) {
    console.error('Aborting due to schema fix failure');
    process.exit(1);
  }
  
  try {
    // Apply the fixed schema
    await applyFixedSchema();
    
    // Fix specific issues
    await fixItemTypeColumn();
    
    console.log('SQLite schema fix completed successfully');
  } catch (error) {
    console.error(`Schema fix failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main(); 