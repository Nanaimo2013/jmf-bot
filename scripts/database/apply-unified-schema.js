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
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Get database type from environment variables
const dbType = process.env.DB_TYPE || 'sqlite';

// Path to the unified schema file
const schemaPath = path.join(__dirname, '../../src/database/schema/unified-schema.sql');

/**
 * Apply schema to SQLite database
 */
async function applySQLiteSchema() {
  console.log(`${colors.bright}${colors.blue}Applying unified schema to SQLite database...${colors.reset}`);
  
  // Get database path from environment variables or use default
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');
  
  // Ensure the data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`${colors.green}Created data directory: ${dataDir}${colors.reset}`);
  }
  
  try {
    // Read schema file
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Open SQLite database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log(`${colors.green}Connected to SQLite database at ${dbPath}${colors.reset}`);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        // Skip MySQL-specific statements
        if (statement.includes('AUTO_INCREMENT')) {
          const sqliteStatement = statement.replace('AUTO_INCREMENT', 'AUTOINCREMENT');
          await db.exec(sqliteStatement);
        } else {
          await db.exec(statement);
        }
      } catch (error) {
        console.error(`${colors.red}Error executing statement: ${error.message}${colors.reset}`);
        console.error(`${colors.yellow}Statement: ${statement}${colors.reset}`);
      }
    }
    
    console.log(`${colors.green}Successfully applied schema to SQLite database${colors.reset}`);
    await db.close();
    
  } catch (error) {
    console.error(`${colors.red}Error applying schema to SQLite database: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Apply schema to MySQL database
 */
async function applyMySQLSchema() {
  console.log(`${colors.bright}${colors.blue}Applying unified schema to MySQL database...${colors.reset}`);
  
  // Get MySQL connection details from environment variables
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_DATABASE || 'jmf_bot';
  
  try {
    // Read schema file
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Connect to MySQL database
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });
    
    console.log(`${colors.green}Connected to MySQL server at ${host}:${port}${colors.reset}`);
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    console.log(`${colors.green}Ensured database exists: ${database}${colors.reset}`);
    
    // Use the database
    await connection.query(`USE \`${database}\``);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        // Skip SQLite-specific statements
        if (statement.includes('AUTOINCREMENT')) {
          const mysqlStatement = statement.replace('AUTOINCREMENT', 'AUTO_INCREMENT');
          await connection.query(mysqlStatement);
        } else {
          await connection.query(statement);
        }
      } catch (error) {
        console.error(`${colors.red}Error executing statement: ${error.message}${colors.reset}`);
        console.error(`${colors.yellow}Statement: ${statement}${colors.reset}`);
      }
    }
    
    console.log(`${colors.green}Successfully applied schema to MySQL database${colors.reset}`);
    await connection.end();
    
  } catch (error) {
    console.error(`${colors.red}Error applying schema to MySQL database: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bright}${colors.magenta}JMF Bot - Unified Schema Application Tool${colors.reset}`);
  console.log(`${colors.cyan}Database Type: ${dbType}${colors.reset}`);
  
  if (dbType.toLowerCase() === 'mysql') {
    await applyMySQLSchema();
  } else {
    await applySQLiteSchema();
  }
  
  console.log(`${colors.bright}${colors.green}Schema application completed successfully!${colors.reset}`);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
}); 