/**
 * JMF Hosting Discord Bot - Configuration Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides enhanced configuration management capabilities
 * for the base manager, including schema validation, environment variable
 * integration, and configuration change tracking.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../base.module');
const path = require('path');
const fs = require('fs').promises;
const utils = require('../utilities');

class ConfigModule extends BaseModule {
    /**
     * Create a new configuration module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager);
        this.name = 'config';
        this.schemas = new Map();
        this.history = [];
        this.maxHistorySize = 50;
        this.envPrefix = 'JMF_';
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        this.maxHistorySize = config.maxHistorySize || this.maxHistorySize;
        this.envPrefix = config.envPrefix || this.envPrefix;
        
        // Register hooks with the manager
        this.manager.registerHook('beforeConfigSave', this._beforeConfigSave.bind(this));
        this.manager.registerHook('afterConfigLoad', this._afterConfigLoad.bind(this));
        
        // Register event listeners
        this.manager.on('configChanged', this._onConfigChanged.bind(this));
        
        this.log('info', 'Configuration module initialized');
    }

    /**
     * Register a configuration schema
     * @param {string} section - Configuration section
     * @param {Object} schema - JSON schema for validation
     */
    registerSchema(section, schema) {
        this.schemas.set(section, schema);
        this.log('debug', `Registered schema for section: ${section}`);
    }

    /**
     * Validate configuration against schema
     * @param {string} section - Configuration section to validate
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result with isValid and errors properties
     */
    validateConfig(section, config) {
        const schema = this.schemas.get(section);
        if (!schema) {
            return { isValid: true, errors: [] };
        }
        
        try {
            // Simple schema validation
            const errors = [];
            
            // Check required properties
            if (schema.required && Array.isArray(schema.required)) {
                for (const prop of schema.required) {
                    if (config[prop] === undefined) {
                        errors.push(`Missing required property: ${prop}`);
                    }
                }
            }
            
            // Check property types
            if (schema.properties) {
                for (const [prop, propSchema] of Object.entries(schema.properties)) {
                    if (config[prop] !== undefined) {
                        const type = propSchema.type;
                        if (type && !this._checkType(config[prop], type)) {
                            errors.push(`Property ${prop} should be of type ${type}`);
                        }
                    }
                }
            }
            
            return {
                isValid: errors.length === 0,
                errors
            };
        } catch (error) {
            this.log('error', `Error validating config for section ${section}:`, error);
            return {
                isValid: false,
                errors: [error.message]
            };
        }
    }

    /**
     * Check if a value matches the expected type
     * @param {any} value - Value to check
     * @param {string} type - Expected type
     * @returns {boolean} Whether the value matches the type
     * @private
     */
    _checkType(value, type) {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                return true;
        }
    }

    /**
     * Load environment variables into configuration
     * @param {Object} config - Configuration object to update
     * @returns {Object} Updated configuration
     */
    loadEnvVars(config = {}) {
        const result = { ...config };
        
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith(this.envPrefix)) {
                const configKey = key.substring(this.envPrefix.length).toLowerCase().split('_');
                let current = result;
                
                // Navigate to the nested property
                for (let i = 0; i < configKey.length - 1; i++) {
                    const part = configKey[i];
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }
                
                // Set the value, converting to appropriate type
                const lastKey = configKey[configKey.length - 1];
                current[lastKey] = this._convertEnvValue(value);
            }
        }
        
        return result;
    }

    /**
     * Convert environment variable value to appropriate type
     * @param {string} value - Environment variable value
     * @returns {any} Converted value
     * @private
     */
    _convertEnvValue(value) {
        // Convert "true" and "false" to boolean
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        
        // Convert numbers
        if (/^-?\d+(\.\d+)?$/.test(value)) {
            return Number(value);
        }
        
        // Try to parse JSON
        try {
            return JSON.parse(value);
        } catch (e) {
            // Return as string if not valid JSON
            return value;
        }
    }

    /**
     * Create a backup of the current configuration
     * @returns {Promise<string>} Path to the backup file
     */
    async createBackup() {
        const config = this.manager._config;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(process.cwd(), 'config', this.manager.name, 'backups');
        const backupPath = path.join(backupDir, `config-${timestamp}.json`);
        
        try {
            await fs.mkdir(backupDir, { recursive: true });
            await utils.writeJsonFile(backupPath, config);
            this.log('info', `Created configuration backup: ${backupPath}`);
            return backupPath;
        } catch (error) {
            this.log('error', 'Failed to create configuration backup:', error);
            throw error;
        }
    }

    /**
     * Restore configuration from a backup
     * @param {string} backupPath - Path to the backup file
     * @returns {Promise<Object>} Restored configuration
     */
    async restoreBackup(backupPath) {
        try {
            const config = await utils.readJsonFile(backupPath);
            this.manager._config = config;
            await this.manager.saveConfig();
            this.log('info', `Restored configuration from backup: ${backupPath}`);
            return config;
        } catch (error) {
            this.log('error', 'Failed to restore configuration backup:', error);
            throw error;
        }
    }

    /**
     * List available configuration backups
     * @returns {Promise<string[]>} Array of backup file paths
     */
    async listBackups() {
        const backupDir = path.join(process.cwd(), 'config', this.manager.name, 'backups');
        
        try {
            await fs.mkdir(backupDir, { recursive: true });
            const files = await fs.readdir(backupDir);
            return files
                .filter(file => file.startsWith('config-') && file.endsWith('.json'))
                .map(file => path.join(backupDir, file));
        } catch (error) {
            this.log('error', 'Failed to list configuration backups:', error);
            throw error;
        }
    }

    /**
     * Get configuration change history
     * @returns {Array} Configuration change history
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Clear configuration change history
     */
    clearHistory() {
        this.history = [];
        this.log('info', 'Configuration change history cleared');
    }

    /**
     * Hook called before saving configuration
     * @param {Object} data - Hook data
     * @private
     */
    async _beforeConfigSave(data) {
        // Create a backup before saving
        await this.createBackup();
    }

    /**
     * Hook called after loading configuration
     * @param {Object} data - Hook data
     * @private
     */
    async _afterConfigLoad(data) {
        // Apply environment variables
        const updatedConfig = this.loadEnvVars(data.config);
        Object.assign(this.manager._config, updatedConfig);
    }

    /**
     * Handler for configuration change events
     * @param {Object} data - Event data
     * @private
     */
    _onConfigChanged(data) {
        // Add to history
        this.history.unshift({
            timestamp: new Date(),
            key: data.key,
            value: data.value
        });
        
        // Trim history if needed
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down configuration module');
        await super.shutdown();
    }
}

module.exports = ConfigModule; 