# JMF Hosting Discord Bot Database Manager

## Overview

The Database Manager is a comprehensive system for managing database operations in the JMF Hosting Discord Bot. It provides a modular architecture that supports multiple database types (SQLite and MySQL) and includes migration functionality.

## Features

- **Modular Architecture**: Easily switch between SQLite and MySQL databases
- **Migration System**: Create, apply, and rollback database migrations
- **Transaction Support**: Full transaction support for database operations
- **Backup and Restore**: Create and restore database backups
- **Error Handling**: Comprehensive error handling and logging

## Structure

```
src/managers/database/
├── database.manager.js    # Main Database Manager class
├── index.js               # Export file for easy importing
├── modules/
│   ├── base.module.js     # Base Database Module
│   ├── sqlite.module.js   # SQLite Module
│   ├── mysql.module.js    # MySQL Module
│   └── migration.module.js # Migration Module
└── README.md              # Documentation
```

## Usage

### Initialization

```javascript
const { DatabaseManager } = require('./managers/database');
const LoggerManager = require('./managers/logger');

// Create and initialize the logger
const logger = new LoggerManager();
await logger.initialize();

// Create and initialize the database manager
const dbManager = new DatabaseManager(bot);

// Register the logger
dbManager.logger = logger;

// Initialize the database manager
await dbManager.initialize();
```

### Basic Queries

```javascript
// Execute a query
const users = await dbManager.query('SELECT * FROM users WHERE active = ?', [true]);

// Check if a table exists
const tableExists = await dbManager.tableExists('users');

// Create a table
await dbManager.query(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);
```

### Transactions

```javascript
try {
    // Begin transaction
    await dbManager.beginTransaction();
    
    // Execute multiple queries
    await dbManager.query('INSERT INTO users (username, email) VALUES (?, ?)', ['user1', 'user1@example.com']);
    await dbManager.query('UPDATE user_count SET count = count + 1');
    
    // Commit transaction
    await dbManager.commit();
} catch (error) {
    // Rollback transaction on error
    await dbManager.rollback();
    throw error;
}
```

### Migrations

```javascript
// Create a new migration
const migrationPath = await dbManager.createMigration('create_users_table');

// Run pending migrations
const appliedMigrations = await dbManager.migrate();

// Rollback the last batch of migrations
const rolledBackMigrations = await dbManager.rollbackLastMigration();
```

### Backups

```javascript
// Create a database backup
const backupPath = await dbManager.createBackup();
console.log(`Backup created at: ${backupPath}`);
```

## Configuration

The Database Manager uses a configuration file located at `config/database/config.json`. Here's an example configuration:

```json
{
    "type": "sqlite",
    "modules": {
        "sqlite": {
            "enabled": true,
            "filename": "database.sqlite",
            "directory": "./data",
            "backupDirectory": "./backups/database",
            "journalMode": "WAL",
            "busyTimeout": 5000
        },
        "mysql": {
            "enabled": false,
            "host": "localhost",
            "port": 3306,
            "user": "root",
            "password": "",
            "database": "jmf_bot",
            "connectionLimit": 10,
            "backupDirectory": "./backups/database"
        },
        "migration": {
            "enabled": true,
            "migrationsDir": "./migrations",
            "tableName": "migrations"
        }
    }
}
```

## Creating Migrations

Migrations are JavaScript files that export `up` and `down` functions. The `up` function is called when applying the migration, and the `down` function is called when rolling back the migration.

Example migration:

```javascript
/**
 * Migration: create_users_table
 * Created: 2025-03-12T10:00:00.000Z
 */

/**
 * Run the migration
 * @param {DatabaseManager} db - Database manager
 */
exports.up = async function(db) {
    await db.query(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

/**
 * Rollback the migration
 * @param {DatabaseManager} db - Database manager
 */
exports.down = async function(db) {
    await db.query('DROP TABLE users');
};
```

## License

© 2025 JMFHosting. All Rights Reserved.
Developed by Nanaimo2013 (https://github.com/Nanaimo2013) 