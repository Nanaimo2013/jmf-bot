#!/usr/bin/env node

/**
 * JMF Hosting Discord Bot - Configuration Management Script
 * Version: 1.1.0
 * Last Updated: 03/13/2025
 * 
 * This script provides utilities for managing JMF Hosting Discord Bot configuration files.
 * It can:
 * - Initialize configuration files
 * - Validate configuration files
 * - Update configuration files
 * - Backup configuration files
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define paths
const CONFIG_DIR = path.join(process.cwd(), 'config');
const MAIN_CONFIG = path.join(CONFIG_DIR, 'config.json');
const CONFIG_EXAMPLE = path.join(CONFIG_DIR, 'config.json.example');
const ENV_FILE = path.join(process.cwd(), '.env');
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'config');

/**
 * Initialize configuration files
 */
async function initializeConfig() {
    console.log(chalk.blue('\nInitializing configuration files...'));

    try {
        // Create directories
        await fs.ensureDir(CONFIG_DIR);
        await fs.ensureDir(BACKUP_DIR);

        // Check if config.json exists
        if (!await fs.pathExists(MAIN_CONFIG)) {
            if (await fs.pathExists(CONFIG_EXAMPLE)) {
                await fs.copy(CONFIG_EXAMPLE, MAIN_CONFIG);
                console.log(chalk.green('✓ Created config.json from example'));
            } else {
                console.log(chalk.yellow('! Example config file not found'));
            }
        } else {
            console.log(chalk.yellow('! config.json already exists'));
        }

        console.log(chalk.green('\nConfiguration initialization completed!'));
    } catch (error) {
        console.error(chalk.red('Error initializing configuration:'), error);
        process.exit(1);
    }
}

/**
 * Validate configuration files
 */
async function validateConfig() {
    console.log(chalk.blue('\nValidating configuration files...'));

    try {
        // Check if files exist
        if (!await fs.pathExists(MAIN_CONFIG)) {
            console.log(chalk.red('✗ config.json not found'));
            return false;
        }

        // Read and parse config
        const config = await fs.readJson(MAIN_CONFIG);

        // Required sections
        const requiredSections = [
            'bot',
            'managers',
            'database',
            'logging',
            'features'
        ];

        // Check required sections
        const missingSections = requiredSections.filter(section => !config[section]);
        if (missingSections.length > 0) {
            console.log(chalk.red(`✗ Missing required sections: ${missingSections.join(', ')}`));
            return false;
        }

        // Validate bot section
        if (!config.bot.token || !config.bot.clientId || !config.bot.guildId) {
            console.log(chalk.red('✗ Missing required bot configuration'));
            return false;
        }

        // Validate managers section
        if (!config.managers.roles || !config.managers.permissions) {
            console.log(chalk.red('✗ Missing required manager configuration'));
            return false;
        }

        console.log(chalk.green('✓ Configuration is valid!'));
        return true;
    } catch (error) {
        console.error(chalk.red('Error validating configuration:'), error);
        return false;
    }
}

/**
 * Update configuration files
 */
async function updateConfig() {
    console.log(chalk.blue('\nUpdating configuration files...'));

    try {
        // Read current config
        const config = await fs.readJson(MAIN_CONFIG);
        const example = await fs.readJson(CONFIG_EXAMPLE);

        // Find missing keys
        const missingKeys = findMissingKeys(config, example);

        if (missingKeys.length === 0) {
            console.log(chalk.green('✓ Configuration is up to date!'));
            return;
        }

        console.log(chalk.yellow('\nMissing configuration keys:'));
        missingKeys.forEach(key => console.log(`  - ${key}`));

        // Ask to update
        const { update } = await inquirer.prompt([{
            type: 'confirm',
            name: 'update',
            message: 'Would you like to update the configuration with these keys?',
            default: true
        }]);

        if (update) {
            // Add missing keys
            for (const key of missingKeys) {
                const value = getNestedValue(example, key);
                setNestedValue(config, key, value);
            }

            // Backup current config
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(BACKUP_DIR, `config.${timestamp}.json`);
            await fs.copy(MAIN_CONFIG, backupPath);

            // Write updated config
            await fs.writeJson(MAIN_CONFIG, config, { spaces: 2 });
            console.log(chalk.green('✓ Configuration updated successfully!'));
            console.log(chalk.blue(`Backup saved to: ${backupPath}`));
        }
    } catch (error) {
        console.error(chalk.red('Error updating configuration:'), error);
        process.exit(1);
    }
}

/**
 * Find missing keys in an object compared to a reference object
 */
function findMissingKeys(obj, ref, prefix = '') {
    const missing = [];

    for (const key in ref) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (!(key in obj)) {
            missing.push(fullKey);
        } else if (typeof ref[key] === 'object' && ref[key] !== null && !Array.isArray(ref[key])) {
            missing.push(...findMissingKeys(obj[key], ref[key], fullKey));
        }
    }

    return missing;
}

/**
 * Get a nested value from an object using a dot-notation path
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
}

/**
 * Set a nested value in an object using a dot-notation path
 */
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!(key in current)) {
            current[key] = {};
        }
        return current[key];
    }, obj);
    target[lastKey] = value;
}

/**
 * Main function
 */
async function main() {
    console.log(chalk.cyan('=== JMF Hosting Discord Bot - Configuration Management ===\n'));

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
            { name: 'Initialize configuration files', value: 'init' },
            { name: 'Validate configuration', value: 'validate' },
            { name: 'Update configuration', value: 'update' },
            { name: 'Exit', value: 'exit' }
        ]
    }]);

    switch (action) {
        case 'init':
            await initializeConfig();
            break;
        case 'validate':
            await validateConfig();
            break;
        case 'update':
            await updateConfig();
            break;
        case 'exit':
            console.log(chalk.blue('\nGoodbye!'));
            process.exit(0);
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red('\nAn unexpected error occurred:'), error);
        process.exit(1);
    });
} 