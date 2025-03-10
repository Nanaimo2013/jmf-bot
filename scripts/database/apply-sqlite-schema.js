/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script applies the SQLite schema to the database
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const schemaPath = path.join(__dirname, '../../src/database/schema/sqlite-schema.sql');
const dbPath = path.join(__dirname, '../../data/database.sqlite');

// Main function
async function main() {
  console.log('Applying SQLite schema...');
  
  // Check if schema file exists
  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found: ${schemaPath}`);
    process.exit(1);
  }
  
  // Check if database directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    console.log(`Creating database directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Apply schema
  console.log(`Applying schema to database: ${dbPath}`);
  
  exec(`sqlite3 ${dbPath} < ${schemaPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error applying schema: ${error.message}`);
      console.error(stderr);
      process.exit(1);
    }
    
    console.log('Schema applied successfully');
  });
}

// Run the main function
main(); 