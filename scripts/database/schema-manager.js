/**
 * JMF Hosting Discord Bot - Database Schema Manager
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script manages database schemas, allowing users to list, apply,
 * and validate schemas for both SQLite and MySQL databases.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const { promisify } = require('util');
const readline = require('readline');
const logger = require('../../src/utils/logger');

// Command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';
const schemaName = args[1];
const dbType = args[2] || process.env.DB_TYPE || 'sqlite';

// Schema directories
const schemaDir = path.join(__dirname, '../../src/database/schema');
const scriptsSchemaDir = path.join(__dirname);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Function to list available schemas
async function listSchemas() {
  logger.info('Listing available database schemas...');
  
  // Check schema directories
  const directories = [schemaDir, scriptsSchemaDir];
  let schemas = [];
  
  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      
      // Filter schema files based on database type
      const schemaFiles = files.filter(file => {
        return file.endsWith(`.${dbType}.sql`) || 
               (file.endsWith('.sql') && !file.includes('.mysql.') && !file.includes('.sqlite.'));
      });
      
      schemas = [...schemas, ...schemaFiles.map(file => ({
        name: file,
        path: path.join(dir, file),
        directory: dir
      }))];
    }
  }
  
  if (schemas.length === 0) {
    logger.warn(`No ${dbType} schema files found in the schema directories.`);
    return [];
  }
  
  // Sort schemas by name
  schemas.sort((a, b) => a.name.localeCompare(b.name));
  
  // Print schemas
  logger.info(`Found ${schemas.length} ${dbType} schema files:`);
  schemas.forEach((schema, index) => {
    const relativePath = path.relative(process.cwd(), schema.path);
    logger.info(`${index + 1}. ${schema.name} (${relativePath})`);
  });
  
  return schemas;
}

// Function to apply a schema to SQLite database
async function applySQLiteSchema(schemaPath) {
  // Get database path from environment variables or use default
  const dbPath = process.env.DB_PATH || './data/database.sqlite';
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory: ${dbDir}`);
  }
  
  // Create a backup of the database
  if (fs.existsSync(dbPath)) {
    const backupPath = `${dbPath}.backup.${new Date().toISOString().replace(/[:.]/g, '')}`; 
    fs.copyFileSync(dbPath, backupPath);
    logger.info(`Created backup at: ${backupPath}`);
  }
  
  // Read schema file
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Split schema into individual statements
  const statements = schema
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0);
  
  // Connect to the database
  const db = new sqlite3.Database(dbPath);
  
  // Promisify database methods
  db.runAsync = promisify(db.run.bind(db));
  
  try {
    // Begin transaction
    await db.runAsync('BEGIN TRANSACTION');
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await db.runAsync(statement);
      } catch (error) {
        logger.error(`Error executing statement: ${statement}`);
        logger.error(`Error message: ${error.message}`);
        throw error;
      }
    }
    
    // Commit transaction
    await db.runAsync('COMMIT');
    
    logger.info(`Successfully applied schema: ${path.basename(schemaPath)}`);
    return true;
  } catch (error) {
    // Rollback transaction
    try {
      await db.runAsync('ROLLBACK');
      logger.info('Transaction rolled back due to error');
    } catch (rollbackError) {
      logger.error(`Error rolling back transaction: ${rollbackError.message}`);
    }
    
    logger.error(`Error applying schema: ${error.message}`);
    return false;
  } finally {
    // Close database connection
    db.close();
  }
}

// Function to apply a schema to MySQL database
async function applyMySQLSchema(schemaPath) {
  // Get MySQL connection details from environment variables
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const database = process.env.DB_DATABASE || 'jmf_bot';
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  
  // Read schema file
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Split schema into individual statements
  const statements = schema
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0);
  
  try {
    // Connect to the database
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true
    });
    
    // Begin transaction
    await connection.beginTransaction();
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        logger.error(`Error executing statement: ${statement}`);
        logger.error(`Error message: ${error.message}`);
        throw error;
      }
    }
    
    // Commit transaction
    await connection.commit();
    
    // Close connection
    await connection.end();
    
    logger.info(`Successfully applied schema: ${path.basename(schemaPath)}`);
    return true;
  } catch (error) {
    logger.error(`Error applying schema: ${error.message}`);
    return false;
  }
}

// Function to apply a schema
async function applySchema(schemaPath) {
  logger.info(`Applying schema: ${path.basename(schemaPath)}`);
  
  if (dbType === 'sqlite') {
    return await applySQLiteSchema(schemaPath);
  } else if (dbType === 'mysql') {
    return await applyMySQLSchema(schemaPath);
  } else {
    logger.error(`Unsupported database type: ${dbType}`);
    return false;
  }
}

// Function to validate a schema
async function validateSchema(schemaPath) {
  logger.info(`Validating schema: ${path.basename(schemaPath)}`);
  
  try {
    // Read schema file
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Check for common issues
    let issues = 0;
    
    for (const statement of statements) {
      // Check for missing semicolons (already handled by the split)
      
      // Check for invalid SQL syntax
      if (statement.includes('CREATE TABLE') && !statement.includes('(')) {
        logger.warn(`Invalid CREATE TABLE statement: ${statement}`);
        issues++;
      }
      
      // Check for missing column types
      if (statement.includes('CREATE TABLE') && statement.includes('(')) {
        const columnDefinitions = statement
          .substring(statement.indexOf('(') + 1, statement.lastIndexOf(')'))
          .split(',')
          .map(col => col.trim());
        
        for (const columnDef of columnDefinitions) {
          if (columnDef && !columnDef.startsWith('PRIMARY KEY') && !columnDef.startsWith('FOREIGN KEY') && !columnDef.startsWith('UNIQUE') && !columnDef.startsWith('CHECK') && !columnDef.startsWith('CONSTRAINT')) {
            const parts = columnDef.split(' ');
            if (parts.length < 2) {
              logger.warn(`Column definition missing type: ${columnDef}`);
              issues++;
            }
          }
        }
      }
    }
    
    if (issues === 0) {
      logger.info(`Schema validation passed: ${path.basename(schemaPath)}`);
      return true;
    } else {
      logger.warn(`Schema validation found ${issues} issues in: ${path.basename(schemaPath)}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error validating schema: ${error.message}`);
    return false;
  }
}

// Function to create a new schema
async function createSchema() {
  const schemaName = await question('Enter schema name (e.g., 01-initial-schema): ');
  const dbType = await question('Enter database type (sqlite/mysql/both): ');
  
  if (!schemaName) {
    logger.error('Schema name is required');
    rl.close();
    return;
  }
  
  if (!['sqlite', 'mysql', 'both'].includes(dbType)) {
    logger.error('Invalid database type. Must be sqlite, mysql, or both');
    rl.close();
    return;
  }
  
  // Create schema directory if it doesn't exist
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }
  
  // Create schema files
  if (dbType === 'sqlite' || dbType === 'both') {
    const sqliteSchemaPath = path.join(schemaDir, `${schemaName}.sqlite.sql`);
    fs.writeFileSync(sqliteSchemaPath, '-- SQLite schema\n\n');
    logger.info(`Created SQLite schema file: ${sqliteSchemaPath}`);
  }
  
  if (dbType === 'mysql' || dbType === 'both') {
    const mysqlSchemaPath = path.join(schemaDir, `${schemaName}.mysql.sql`);
    fs.writeFileSync(mysqlSchemaPath, '-- MySQL schema\n\n');
    logger.info(`Created MySQL schema file: ${mysqlSchemaPath}`);
  }
  
  logger.info('Schema files created successfully');
  rl.close();
}

// Function to show help
function showHelp() {
  console.log(`
JMF Bot Database Schema Manager
===============================

Usage: node schema-manager.js <command> [schema] [dbType]

Commands:
  list                    List available schemas
  apply <schema>          Apply a schema to the database
  validate <schema>       Validate a schema
  create                  Create a new schema
  help                    Show this help message

Arguments:
  schema                  Schema name or path
  dbType                  Database type (sqlite or mysql, defaults to .env DB_TYPE or sqlite)

Examples:
  node schema-manager.js list
  node schema-manager.js list mysql
  node schema-manager.js apply 01-initial-schema.sqlite.sql
  node schema-manager.js validate schema.sqlite.sql
  node schema-manager.js create
  `);
}

// Main function
async function main() {
  try {
    switch (command) {
      case 'list':
        await listSchemas();
        break;
      
      case 'apply':
        if (!schemaName) {
          const schemas = await listSchemas();
          
          if (schemas.length === 0) {
            logger.error('No schemas available to apply');
            break;
          }
          
          const schemaIndex = await question('Enter the number of the schema to apply: ');
          const selectedSchema = schemas[parseInt(schemaIndex) - 1];
          
          if (!selectedSchema) {
            logger.error('Invalid schema selection');
            break;
          }
          
          await applySchema(selectedSchema.path);
        } else {
          // Check if schemaName is a path or a name
          if (fs.existsSync(schemaName)) {
            await applySchema(schemaName);
          } else {
            // Try to find the schema in the schema directories
            const schemas = await listSchemas();
            const schema = schemas.find(s => s.name === schemaName);
            
            if (schema) {
              await applySchema(schema.path);
            } else {
              logger.error(`Schema not found: ${schemaName}`);
            }
          }
        }
        break;
      
      case 'validate':
        if (!schemaName) {
          const schemas = await listSchemas();
          
          if (schemas.length === 0) {
            logger.error('No schemas available to validate');
            break;
          }
          
          const schemaIndex = await question('Enter the number of the schema to validate: ');
          const selectedSchema = schemas[parseInt(schemaIndex) - 1];
          
          if (!selectedSchema) {
            logger.error('Invalid schema selection');
            break;
          }
          
          await validateSchema(selectedSchema.path);
        } else {
          // Check if schemaName is a path or a name
          if (fs.existsSync(schemaName)) {
            await validateSchema(schemaName);
          } else {
            // Try to find the schema in the schema directories
            const schemas = await listSchemas();
            const schema = schemas.find(s => s.name === schemaName);
            
            if (schema) {
              await validateSchema(schema.path);
            } else {
              logger.error(`Schema not found: ${schemaName}`);
            }
          }
        }
        break;
      
      case 'create':
        await createSchema();
        break;
      
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    logger.error(`Error: ${error.message}`);
  } finally {
    if (command !== 'create') {
      rl.close();
    }
  }
}

// Run the main function
main(); 