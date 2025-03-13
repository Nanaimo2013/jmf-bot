/**
 * Configuration Validation Script
 * 
 * This script validates all configuration files for the JMF Hosting Discord Bot.
 * It checks that all required fields are present and have valid values.
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define paths
const CONFIG_DIR = path.join(process.cwd(), 'config');
const MAIN_CONFIG = path.join(CONFIG_DIR, 'config.json');
const DATABASE_CONFIG = path.join(CONFIG_DIR, 'database', 'config.json');
const LOGGER_CONFIG = path.join(CONFIG_DIR, 'logger', 'config.json');

// Validation results
const results = {
  env: { valid: false, missing: [], invalid: [] },
  config: { valid: false, missing: [], invalid: [] },
  database: { valid: false, missing: [], invalid: [] },
  logger: { valid: false, missing: [], invalid: [] }
};

// Validate environment variables
const validateEnv = () => {
  console.log(chalk.blue('Validating environment variables...'));
  
  // Required environment variables
  const requiredEnv = [
    'DISCORD_TOKEN',
    'CLIENT_ID',
    'GUILD_ID',
    'NODE_ENV',
    'DB_TYPE'
  ];
  
  // Check required variables
  for (const variable of requiredEnv) {
    if (!process.env[variable]) {
      results.env.missing.push(variable);
    }
  }
  
  // Validate specific variables
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    results.env.invalid.push(`NODE_ENV must be one of: development, production, test. Got: ${process.env.NODE_ENV}`);
  }
  
  if (process.env.DB_TYPE && !['sqlite', 'mysql', 'postgres'].includes(process.env.DB_TYPE)) {
    results.env.invalid.push(`DB_TYPE must be one of: sqlite, mysql, postgres. Got: ${process.env.DB_TYPE}`);
  }
  
  // Set validity
  results.env.valid = results.env.missing.length === 0 && results.env.invalid.length === 0;
  
  // Print results
  if (results.env.valid) {
    console.log(chalk.green('✓ Environment variables are valid'));
  } else {
    if (results.env.missing.length > 0) {
      console.log(chalk.red(`✗ Missing environment variables: ${results.env.missing.join(', ')}`));
    }
    if (results.env.invalid.length > 0) {
      console.log(chalk.red(`✗ Invalid environment variables:`));
      results.env.invalid.forEach(msg => console.log(chalk.red(`  - ${msg}`)));
    }
  }
};

// Validate main config
const validateMainConfig = async () => {
  console.log(chalk.blue('\nValidating main configuration...'));
  
  try {
    // Check if file exists
    if (!await fs.pathExists(MAIN_CONFIG)) {
      console.log(chalk.red(`✗ Main config file not found at ${MAIN_CONFIG}`));
      results.config.valid = false;
      return;
    }
    
    // Read config
    const config = await fs.readJson(MAIN_CONFIG);
    
    // Required fields
    const requiredFields = [
      'bot.token',
      'bot.clientId',
      'bot.guildId',
      'bot.prefix',
      'database.type'
    ];
    
    // Check required fields
    for (const field of requiredFields) {
      const parts = field.split('.');
      let value = config;
      let missing = false;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          missing = true;
          break;
        }
      }
      
      if (missing) {
        results.config.missing.push(field);
      }
    }
    
    // Validate specific fields
    if (config.database && config.database.type && !['sqlite', 'mysql', 'postgres'].includes(config.database.type)) {
      results.config.invalid.push(`database.type must be one of: sqlite, mysql, postgres. Got: ${config.database.type}`);
    }
    
    // Set validity
    results.config.valid = results.config.missing.length === 0 && results.config.invalid.length === 0;
    
    // Print results
    if (results.config.valid) {
      console.log(chalk.green('✓ Main configuration is valid'));
    } else {
      if (results.config.missing.length > 0) {
        console.log(chalk.red(`✗ Missing fields in main config: ${results.config.missing.join(', ')}`));
      }
      if (results.config.invalid.length > 0) {
        console.log(chalk.red(`✗ Invalid fields in main config:`));
        results.config.invalid.forEach(msg => console.log(chalk.red(`  - ${msg}`)));
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error validating main config: ${error.message}`));
    results.config.valid = false;
  }
};

// Validate database config
const validateDatabaseConfig = async () => {
  console.log(chalk.blue('\nValidating database configuration...'));
  
  try {
    // Check if file exists
    if (!await fs.pathExists(DATABASE_CONFIG)) {
      console.log(chalk.red(`✗ Database config file not found at ${DATABASE_CONFIG}`));
      results.database.valid = false;
      return;
    }
    
    // Read config
    const config = await fs.readJson(DATABASE_CONFIG);
    
    // Required fields
    const requiredFields = [
      'type',
      'connections'
    ];
    
    // Check required fields
    for (const field of requiredFields) {
      if (!(field in config)) {
        results.database.missing.push(field);
      }
    }
    
    // Validate specific fields
    if (config.type && !['sqlite', 'mysql', 'postgres'].includes(config.type)) {
      results.database.invalid.push(`type must be one of: sqlite, mysql, postgres. Got: ${config.type}`);
    }
    
    // Check connections based on type
    if (config.type && config.connections) {
      if (!config.connections[config.type]) {
        results.database.invalid.push(`connections.${config.type} is required when type is ${config.type}`);
      }
    }
    
    // Set validity
    results.database.valid = results.database.missing.length === 0 && results.database.invalid.length === 0;
    
    // Print results
    if (results.database.valid) {
      console.log(chalk.green('✓ Database configuration is valid'));
    } else {
      if (results.database.missing.length > 0) {
        console.log(chalk.red(`✗ Missing fields in database config: ${results.database.missing.join(', ')}`));
      }
      if (results.database.invalid.length > 0) {
        console.log(chalk.red(`✗ Invalid fields in database config:`));
        results.database.invalid.forEach(msg => console.log(chalk.red(`  - ${msg}`)));
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error validating database config: ${error.message}`));
    results.database.valid = false;
  }
};

// Validate logger config
const validateLoggerConfig = async () => {
  console.log(chalk.blue('\nValidating logger configuration...'));
  
  try {
    // Check if file exists
    if (!await fs.pathExists(LOGGER_CONFIG)) {
      console.log(chalk.red(`✗ Logger config file not found at ${LOGGER_CONFIG}`));
      results.logger.valid = false;
      return;
    }
    
    // Read config
    const config = await fs.readJson(LOGGER_CONFIG);
    
    // Required fields
    const requiredFields = [
      'level',
      'format',
      'logDirectory',
      'transports'
    ];
    
    // Check required fields
    for (const field of requiredFields) {
      if (!(field in config)) {
        results.logger.missing.push(field);
      }
    }
    
    // Validate specific fields
    if (config.level && !['error', 'warn', 'info', 'debug', 'trace'].includes(config.level)) {
      results.logger.invalid.push(`level must be one of: error, warn, info, debug, trace. Got: ${config.level}`);
    }
    
    // Set validity
    results.logger.valid = results.logger.missing.length === 0 && results.logger.invalid.length === 0;
    
    // Print results
    if (results.logger.valid) {
      console.log(chalk.green('✓ Logger configuration is valid'));
    } else {
      if (results.logger.missing.length > 0) {
        console.log(chalk.red(`✗ Missing fields in logger config: ${results.logger.missing.join(', ')}`));
      }
      if (results.logger.invalid.length > 0) {
        console.log(chalk.red(`✗ Invalid fields in logger config:`));
        results.logger.invalid.forEach(msg => console.log(chalk.red(`  - ${msg}`)));
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error validating logger config: ${error.message}`));
    results.logger.valid = false;
  }
};

// Main function
const validate = async () => {
  console.log(chalk.cyan('=== JMF Hosting Discord Bot - Configuration Validation ===\n'));
  
  // Run validations
  validateEnv();
  await validateMainConfig();
  await validateDatabaseConfig();
  await validateLoggerConfig();
  
  // Print summary
  console.log(chalk.cyan('\n=== Validation Summary ==='));
  console.log(`Environment Variables: ${results.env.valid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
  console.log(`Main Configuration: ${results.config.valid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
  console.log(`Database Configuration: ${results.database.valid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
  console.log(`Logger Configuration: ${results.logger.valid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`);
  
  // Overall result
  const allValid = results.env.valid && results.config.valid && results.database.valid && results.logger.valid;
  
  console.log(chalk.cyan('\n=== Overall Result ==='));
  if (allValid) {
    console.log(chalk.green('✓ All configurations are valid!'));
    process.exit(0);
  } else {
    console.log(chalk.red('✗ Configuration validation failed. Please fix the issues above.'));
    process.exit(1);
  }
};

// Run the validation
validate().catch(error => {
  console.error(chalk.red('Validation failed with an unexpected error:'), error);
  process.exit(1);
}); 