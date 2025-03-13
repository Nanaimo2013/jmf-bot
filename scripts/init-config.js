/**
 * Configuration Initialization Script
 * 
 * This script initializes all configuration files for the JMF Hosting Discord Bot.
 * It creates the necessary directories and copies example configuration files
 * to their proper locations if they don't already exist.
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Define paths
const CONFIG_DIR = path.join(process.cwd(), 'config');
const EXAMPLE_CONFIG = path.join(CONFIG_DIR, 'config.json.example');
const MAIN_CONFIG = path.join(CONFIG_DIR, 'config.json');
const DATABASE_CONFIG_DIR = path.join(CONFIG_DIR, 'database');
const DATABASE_CONFIG = path.join(DATABASE_CONFIG_DIR, 'config.json');
const LOGGER_CONFIG_DIR = path.join(CONFIG_DIR, 'logger');
const LOGGER_CONFIG = path.join(LOGGER_CONFIG_DIR, 'config.json');
const ENV_EXAMPLE = path.join(process.cwd(), '.env.example');
const ENV_FILE = path.join(process.cwd(), '.env');

// Create directories if they don't exist
const createDirectories = async () => {
  console.log(chalk.blue('Creating configuration directories...'));
  
  try {
    await fs.ensureDir(CONFIG_DIR);
    await fs.ensureDir(DATABASE_CONFIG_DIR);
    await fs.ensureDir(LOGGER_CONFIG_DIR);
    await fs.ensureDir(path.join(process.cwd(), 'data'));
    await fs.ensureDir(path.join(process.cwd(), 'logs'));
    await fs.ensureDir(path.join(process.cwd(), 'backups'));
    
    console.log(chalk.green('✓ Directories created successfully'));
  } catch (error) {
    console.error(chalk.red('Error creating directories:'), error);
    process.exit(1);
  }
};

// Copy example files if they don't exist
const copyExampleFiles = async () => {
  console.log(chalk.blue('Checking configuration files...'));
  
  try {
    // Main config
    if (!await fs.pathExists(MAIN_CONFIG)) {
      if (await fs.pathExists(EXAMPLE_CONFIG)) {
        await fs.copy(EXAMPLE_CONFIG, MAIN_CONFIG);
        console.log(chalk.green('✓ Created config.json from example'));
      } else {
        console.log(chalk.yellow('! Example config file not found, skipping main config creation'));
      }
    } else {
      console.log(chalk.yellow('! config.json already exists, skipping'));
    }
    
    // .env file
    if (!await fs.pathExists(ENV_FILE)) {
      if (await fs.pathExists(ENV_EXAMPLE)) {
        await fs.copy(ENV_EXAMPLE, ENV_FILE);
        console.log(chalk.green('✓ Created .env from example'));
      } else {
        console.log(chalk.yellow('! .env.example not found, skipping .env creation'));
      }
    } else {
      console.log(chalk.yellow('! .env already exists, skipping'));
    }
    
    // Check if database config exists
    if (!await fs.pathExists(DATABASE_CONFIG)) {
      // Create a basic database config
      const databaseConfig = {
        "type": "sqlite",
        "connections": {
          "sqlite": {
            "driver": "sqlite3",
            "filename": "./data/database.sqlite",
            "useNullAsDefault": true,
            "foreign_key_constraints": true
          }
        },
        "pool": {
          "min": 2,
          "max": 10
        },
        "migrations": {
          "directory": "./src/database/migrations",
          "tableName": "migrations"
        },
        "seeds": {
          "directory": "./src/database/seeds"
        },
        "backup": {
          "enabled": true,
          "directory": "./backups/database",
          "interval": "1d",
          "maxBackups": 10
        },
        "debug": false
      };
      
      await fs.writeJson(DATABASE_CONFIG, databaseConfig, { spaces: 2 });
      console.log(chalk.green('✓ Created database config.json'));
    } else {
      console.log(chalk.yellow('! Database config.json already exists, skipping'));
    }
    
    // Check if logger config exists
    if (!await fs.pathExists(LOGGER_CONFIG)) {
      // Create a basic logger config
      const loggerConfig = {
        "level": "info",
        "format": "simple",
        "colors": true,
        "timestamp": true,
        "logDirectory": "./logs",
        "categories": {
          "default": {
            "level": "info",
            "format": "detailed",
            "console": true,
            "file": true
          },
          "system": {
            "level": "debug",
            "format": "detailed",
            "console": true,
            "file": true
          },
          "database": {
            "level": "info",
            "format": "detailed",
            "console": true,
            "file": true
          }
        },
        "transports": {
          "console": {
            "enabled": true,
            "level": "debug",
            "format": "colored"
          },
          "file": {
            "enabled": true,
            "level": "debug",
            "format": "json",
            "maxSize": "10m",
            "maxFiles": 10
          }
        }
      };
      
      await fs.writeJson(LOGGER_CONFIG, loggerConfig, { spaces: 2 });
      console.log(chalk.green('✓ Created logger config.json'));
    } else {
      console.log(chalk.yellow('! Logger config.json already exists, skipping'));
    }
    
    console.log(chalk.green('\nConfiguration initialization completed successfully!'));
    console.log(chalk.blue('\nNext steps:'));
    console.log(chalk.blue('1. Edit the .env file with your Discord bot token and other settings'));
    console.log(chalk.blue('2. Edit config/config.json with your bot settings'));
    console.log(chalk.blue('3. Run npm start to start the bot'));
    
  } catch (error) {
    console.error(chalk.red('Error copying configuration files:'), error);
    process.exit(1);
  }
};

// Main function
const init = async () => {
  console.log(chalk.cyan('=== JMF Hosting Discord Bot - Configuration Initialization ===\n'));
  
  await createDirectories();
  await copyExampleFiles();
};

// Run the initialization
init().catch(error => {
  console.error(chalk.red('Initialization failed:'), error);
  process.exit(1);
}); 