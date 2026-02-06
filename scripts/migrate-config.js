/**
 * JMF Hosting Discord Bot - Configuration Migration Script
 * Version: 1.0.0
 * Last Updated: 03/13/2025
 * 
 * This script migrates existing configuration files to the new format
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const fs = require('fs').promises;
const path = require('path');
const configUtils = require('../src/utils/config.utils');

// Configuration paths
const CONFIG_PATHS = {
    main: path.join(__dirname, '../config/config.json'),
    api: path.join(__dirname, '../config/api/config.json'),
    bot: path.join(__dirname, '../config/bot/config.json'),
    logger: path.join(__dirname, '../config/logger/config.json'),
    database: path.join(__dirname, '../config/database/config.json'),
    update: path.join(__dirname, '../config/update/config.json'),
    install: path.join(__dirname, '../config/install/config.json'),
    monitor: path.join(__dirname, '../config/monitor/config.json'),
};

// Default configuration
const DEFAULT_CONFIG = {
    bot: {
        prefix: '!',
        embedColor: '#00AAFF',
        footerText: 'JMF Hosting | Game Server Solutions',
    },
    database: {
        enabled: true,
        type: 'sqlite',
        modules: {
            sqlite: {
                enabled: true,
                filename: './data/database.sqlite'
            },
            mysql: {
                enabled: false
            },
            migration: {
                enabled: false
            }
        }
    },
    logging: {
        level: 'info',
        format: 'json',
        directory: './logs',
        console: true,
        file: true,
    },
    api: {
        enabled: true,
        port: 3001,
        host: 'localhost',
        prefix: '/api',
    },
    monitor: {
        enabled: true,
        interval: 60000,
    },
    update: {
        enabled: true,
        checkForUpdates: true,
    },
    install: {
        configDir: './config',
        dataDir: './data',
        logsDir: './logs',
    },
};

/**
 * Load a configuration file
 * @param {string} filePath - Path to the configuration file
 * @returns {Promise<Object>} - The loaded configuration
 */
async function loadConfigFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`Configuration file not found: ${filePath}`);
            return {};
        }
        throw error;
    }
}

/**
 * Migrate configuration files
 * @returns {Promise<void>}
 */
async function migrateConfig() {
    try {
        console.log('Starting configuration migration...');
        
        // Load main configuration
        let mainConfig = await loadConfigFile(CONFIG_PATHS.main);
        
        // Load individual configuration files
        const configs = {};
        for (const [key, filePath] of Object.entries(CONFIG_PATHS)) {
            if (key === 'main') continue;
            
            try {
                configs[key] = await loadConfigFile(filePath);
                console.log(`Loaded configuration from ${filePath}`);
            } catch (error) {
                console.error(`Error loading configuration from ${filePath}:`, error);
            }
        }
        
        // Merge configurations
        for (const [key, config] of Object.entries(configs)) {
            if (Object.keys(config).length === 0) continue;
            
            // Merge with main config
            mainConfig[key] = configUtils.deepMerge(mainConfig[key] || {}, config);
            console.log(`Merged ${key} configuration`);
        }
        
        // Merge with default config to ensure all required fields exist
        mainConfig = configUtils.mergeDefaults(mainConfig, DEFAULT_CONFIG);
        
        // Create backup of existing config
        try {
            const backupPath = `${CONFIG_PATHS.main}.backup-${Date.now()}`;
            await fs.copyFile(CONFIG_PATHS.main, backupPath);
            console.log(`Created backup of existing configuration: ${backupPath}`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error creating backup:', error);
            }
        }
        
        // Save merged configuration
        const configDir = path.dirname(CONFIG_PATHS.main);
        try {
            await fs.access(configDir);
        } catch (error) {
            await fs.mkdir(configDir, { recursive: true });
            console.log(`Created configuration directory: ${configDir}`);
        }
        
        await fs.writeFile(
            CONFIG_PATHS.main,
            JSON.stringify(mainConfig, null, 2),
            'utf8'
        );
        
        console.log(`Configuration migration completed successfully!`);
        console.log(`New configuration saved to: ${CONFIG_PATHS.main}`);
    } catch (error) {
        console.error('Error migrating configuration:', error);
        process.exit(1);
    }
}

// Run migration
migrateConfig(); 