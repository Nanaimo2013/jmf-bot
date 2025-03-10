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
 * Migrate SQLite database to unified schema
 */
async function migrateSQLiteDatabase() {
  console.log(`${colors.bright}${colors.blue}Migrating SQLite database to unified schema...${colors.reset}`);
  
  // Get database path from environment variables or use default
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');
  
  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.log(`${colors.yellow}Database file not found at ${dbPath}. Creating new database with unified schema.${colors.reset}`);
    
    // Create new database with unified schema
    const applySchemaScript = path.join(__dirname, 'apply-unified-schema.js');
    require(applySchemaScript);
    return;
  }
  
  try {
    // Open SQLite database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log(`${colors.green}Connected to SQLite database at ${dbPath}${colors.reset}`);
    
    // Backup the database
    const backupPath = `${dbPath}.backup-${new Date().toISOString().replace(/:/g, '-')}`;
    fs.copyFileSync(dbPath, backupPath);
    console.log(`${colors.green}Created database backup at ${backupPath}${colors.reset}`);
    
    // Get existing tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    console.log(`${colors.cyan}Found ${tables.length} existing tables${colors.reset}`);
    
    // Read schema file
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Process each table in the schema
    for (const statement of statements) {
      // Skip non-CREATE TABLE statements
      if (!statement.toUpperCase().includes('CREATE TABLE IF NOT EXISTS')) {
        continue;
      }
      
      // Extract table name
      const tableNameMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (!tableNameMatch) continue;
      
      const tableName = tableNameMatch[1];
      
      // Check if table exists
      const tableExists = tables.some(t => t.name === tableName);
      
      if (tableExists) {
        console.log(`${colors.cyan}Table ${tableName} exists, checking for missing columns...${colors.reset}`);
        
        // Get existing columns
        const columns = await db.all(`PRAGMA table_info(${tableName})`);
        const existingColumns = columns.map(c => c.name);
        
        // Extract columns from schema
        const columnsMatch = statement.match(/CREATE TABLE IF NOT EXISTS \w+\s*\(([\s\S]*)\)/i);
        if (!columnsMatch) continue;
        
        const columnDefinitions = columnsMatch[1].split(',')
          .map(col => col.trim())
          .filter(col => !col.startsWith('PRIMARY KEY') && !col.startsWith('UNIQUE') && !col.startsWith('FOREIGN KEY'));
        
        // Extract column names
        const schemaColumns = columnDefinitions.map(def => {
          const nameMatch = def.match(/^(\w+)/);
          return nameMatch ? nameMatch[1] : null;
        }).filter(Boolean);
        
        // Find missing columns
        const missingColumns = schemaColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log(`${colors.yellow}Found ${missingColumns.length} missing columns in ${tableName}${colors.reset}`);
          
          // Add missing columns
          for (const column of missingColumns) {
            // Find column definition
            const columnDef = columnDefinitions.find(def => def.match(new RegExp(`^${column}\\s`)));
            if (!columnDef) continue;
            
            try {
              await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`);
              console.log(`${colors.green}Added column ${column} to ${tableName}${colors.reset}`);
            } catch (error) {
              console.error(`${colors.red}Error adding column ${column} to ${tableName}: ${error.message}${colors.reset}`);
            }
          }
        } else {
          console.log(`${colors.green}No missing columns in ${tableName}${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}Table ${tableName} does not exist, creating...${colors.reset}`);
        
        // Create table
        try {
          // Replace AUTO_INCREMENT with AUTOINCREMENT for SQLite
          const sqliteStatement = statement.replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT');
          await db.exec(sqliteStatement);
          console.log(`${colors.green}Created table ${tableName}${colors.reset}`);
        } catch (error) {
          console.error(`${colors.red}Error creating table ${tableName}: ${error.message}${colors.reset}`);
        }
      }
    }
    
    // Create indexes
    console.log(`${colors.cyan}Creating indexes...${colors.reset}`);
    for (const statement of statements) {
      // Only process CREATE INDEX statements
      if (!statement.toUpperCase().includes('CREATE INDEX IF NOT EXISTS')) {
        continue;
      }
      
      try {
        await db.exec(statement);
      } catch (error) {
        console.error(`${colors.red}Error creating index: ${error.message}${colors.reset}`);
      }
    }
    
    console.log(`${colors.green}Successfully migrated SQLite database to unified schema${colors.reset}`);
    await db.close();
    
  } catch (error) {
    console.error(`${colors.red}Error migrating SQLite database: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Migrate MySQL database to unified schema
 */
async function migrateMySQLDatabase() {
  console.log(`${colors.bright}${colors.blue}Migrating MySQL database to unified schema...${colors.reset}`);
  
  // Get MySQL connection details from environment variables
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_DATABASE || 'jmf_bot';
  
  try {
    // Connect to MySQL server
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });
    
    console.log(`${colors.green}Connected to MySQL server at ${host}:${port}${colors.reset}`);
    
    // Check if database exists
    const [databases] = await connection.query('SHOW DATABASES');
    const databaseExists = databases.some(db => db.Database === database);
    
    if (!databaseExists) {
      console.log(`${colors.yellow}Database ${database} does not exist. Creating new database with unified schema.${colors.reset}`);
      
      // Create new database with unified schema
      const applySchemaScript = path.join(__dirname, 'apply-unified-schema.js');
      require(applySchemaScript);
      return;
    }
    
    // Use the database
    await connection.query(`USE \`${database}\``);
    
    // Get existing tables
    const [tables] = await connection.query('SHOW TABLES');
    const existingTables = tables.map(t => t[`Tables_in_${database}`]);
    console.log(`${colors.cyan}Found ${existingTables.length} existing tables${colors.reset}`);
    
    // Read schema file
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Process each table in the schema
    for (const statement of statements) {
      // Skip non-CREATE TABLE statements
      if (!statement.toUpperCase().includes('CREATE TABLE IF NOT EXISTS')) {
        continue;
      }
      
      // Extract table name
      const tableNameMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (!tableNameMatch) continue;
      
      const tableName = tableNameMatch[1];
      
      // Check if table exists
      const tableExists = existingTables.includes(tableName);
      
      if (tableExists) {
        console.log(`${colors.cyan}Table ${tableName} exists, checking for missing columns...${colors.reset}`);
        
        // Get existing columns
        const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
        const existingColumns = columns.map(c => c.Field);
        
        // Extract columns from schema
        const columnsMatch = statement.match(/CREATE TABLE IF NOT EXISTS \w+\s*\(([\s\S]*)\)/i);
        if (!columnsMatch) continue;
        
        const columnDefinitions = columnsMatch[1].split(',')
          .map(col => col.trim())
          .filter(col => !col.startsWith('PRIMARY KEY') && !col.startsWith('UNIQUE') && !col.startsWith('FOREIGN KEY'));
        
        // Extract column names
        const schemaColumns = columnDefinitions.map(def => {
          const nameMatch = def.match(/^(\w+)/);
          return nameMatch ? nameMatch[1] : null;
        }).filter(Boolean);
        
        // Find missing columns
        const missingColumns = schemaColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log(`${colors.yellow}Found ${missingColumns.length} missing columns in ${tableName}${colors.reset}`);
          
          // Add missing columns
          for (const column of missingColumns) {
            // Find column definition
            const columnDef = columnDefinitions.find(def => def.match(new RegExp(`^${column}\\s`)));
            if (!columnDef) continue;
            
            try {
              await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDef}`);
              console.log(`${colors.green}Added column ${column} to ${tableName}${colors.reset}`);
            } catch (error) {
              console.error(`${colors.red}Error adding column ${column} to ${tableName}: ${error.message}${colors.reset}`);
            }
          }
        } else {
          console.log(`${colors.green}No missing columns in ${tableName}${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}Table ${tableName} does not exist, creating...${colors.reset}`);
        
        // Create table
        try {
          // Replace AUTOINCREMENT with AUTO_INCREMENT for MySQL
          const mysqlStatement = statement.replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT');
          await connection.query(mysqlStatement);
          console.log(`${colors.green}Created table ${tableName}${colors.reset}`);
        } catch (error) {
          console.error(`${colors.red}Error creating table ${tableName}: ${error.message}${colors.reset}`);
        }
      }
    }
    
    // Create indexes
    console.log(`${colors.cyan}Creating indexes...${colors.reset}`);
    for (const statement of statements) {
      // Only process CREATE INDEX statements
      if (!statement.toUpperCase().includes('CREATE INDEX IF NOT EXISTS')) {
        continue;
      }
      
      try {
        // Replace IF NOT EXISTS with IGNORE for MySQL
        const mysqlStatement = statement.replace(/IF NOT EXISTS/g, 'IGNORE');
        await connection.query(mysqlStatement);
      } catch (error) {
        console.error(`${colors.red}Error creating index: ${error.message}${colors.reset}`);
      }
    }
    
    console.log(`${colors.green}Successfully migrated MySQL database to unified schema${colors.reset}`);
    await connection.end();
    
  } catch (error) {
    console.error(`${colors.red}Error migrating MySQL database: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bright}${colors.magenta}JMF Bot - Database Migration Tool${colors.reset}`);
  console.log(`${colors.cyan}Database Type: ${dbType}${colors.reset}`);
  
  if (dbType.toLowerCase() === 'mysql') {
    await migrateMySQLDatabase();
  } else {
    await migrateSQLiteDatabase();
  }
  
  console.log(`${colors.bright}${colors.green}Database migration completed successfully!${colors.reset}`);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
}); 