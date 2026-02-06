/**
 * JMF Hosting Discord Bot - Configuration Utilities
 * Version: 1.0.0
 * Last Updated: 03/13/2025
 * 
 * Utility functions for configuration management
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Deep merge two objects with improved handling
 * - Arrays are replaced, not merged
 * - Objects are recursively merged
 * - Primitives are replaced
 * - null values are preserved
 * 
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
    // Return source if it's not an object or is null
    if (!source || typeof source !== 'object') {
        return source;
    }
    
    // Return source if target is not an object or is null
    if (!target || typeof target !== 'object') {
        return { ...source };
    }
    
    // Create a new object to avoid modifying the original
    const result = { ...target };
    
    // Iterate through source properties
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = target[key];
            
            // Handle arrays - replace instead of merge
            if (Array.isArray(sourceValue)) {
                result[key] = [...sourceValue];
                continue;
            }
            
            // Handle objects - recursively merge
            if (sourceValue !== null && 
                typeof sourceValue === 'object' && 
                !Array.isArray(sourceValue) &&
                targetValue !== null && 
                typeof targetValue === 'object' && 
                !Array.isArray(targetValue)) {
                result[key] = deepMerge(targetValue, sourceValue);
                continue;
            }
            
            // Handle primitives and null - replace
            result[key] = sourceValue;
        }
    }
    
    return result;
}

/**
 * Safely merge configuration with defaults
 * - Only adds missing properties from defaults
 * - Never overwrites existing properties
 * 
 * @param {Object} config - Current configuration
 * @param {Object} defaults - Default configuration
 * @returns {Object} Merged configuration
 */
function mergeDefaults(config, defaults) {
    if (!defaults || typeof defaults !== 'object') {
        return config;
    }
    
    if (!config || typeof config !== 'object') {
        return { ...defaults };
    }
    
    const result = { ...config };
    
    for (const key in defaults) {
        if (Object.prototype.hasOwnProperty.call(defaults, key)) {
            // If key doesn't exist in config, add it
            if (!Object.prototype.hasOwnProperty.call(config, key)) {
                result[key] = defaults[key];
                continue;
            }
            
            const defaultValue = defaults[key];
            const configValue = config[key];
            
            // Recursively merge objects
            if (defaultValue !== null && 
                typeof defaultValue === 'object' && 
                !Array.isArray(defaultValue) &&
                configValue !== null && 
                typeof configValue === 'object' && 
                !Array.isArray(configValue)) {
                result[key] = mergeDefaults(configValue, defaultValue);
            }
            // Otherwise keep the existing config value
        }
    }
    
    return result;
}

/**
 * Load configuration from file
 * @param {string} filePath - Path to configuration file
 * @param {Object} defaults - Default configuration
 * @returns {Promise<Object>} Loaded configuration
 */
async function loadConfig(filePath, defaults = {}) {
    try {
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            // File doesn't exist, return defaults
            return { ...defaults };
        }
        
        // Read and parse file
        const data = await fs.readFile(filePath, 'utf8');
        const config = JSON.parse(data);
        
        // Merge with defaults
        return mergeDefaults(config, defaults);
    } catch (error) {
        console.error(`Error loading config from ${filePath}:`, error);
        return { ...defaults };
    }
}

/**
 * Save configuration to file
 * @param {string} filePath - Path to configuration file
 * @param {Object} config - Configuration to save
 * @param {boolean} mergeWithExisting - Whether to merge with existing config
 * @returns {Promise<boolean>} Whether save was successful
 */
async function saveConfig(filePath, config, mergeWithExisting = true) {
    try {
        let finalConfig = { ...config };
        
        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        try {
            await fs.access(dir);
        } catch (error) {
            await fs.mkdir(dir, { recursive: true });
        }
        
        // Merge with existing config if requested
        if (mergeWithExisting) {
            try {
                const existingConfig = await loadConfig(filePath);
                finalConfig = deepMerge(existingConfig, config);
            } catch (error) {
                // If loading fails, use the provided config
                console.error(`Error loading existing config for merge:`, error);
            }
        }
        
        // Write config to file
        await fs.writeFile(
            filePath,
            JSON.stringify(finalConfig, null, 2),
            'utf8'
        );
        
        return true;
    } catch (error) {
        console.error(`Error saving config to ${filePath}:`, error);
        return false;
    }
}

/**
 * Get a value from a nested configuration object
 * @param {Object} config - Configuration object
 * @param {string} path - Dot-notation path to value
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} Configuration value or default
 */
function getValue(config, path, defaultValue = undefined) {
    if (!config || !path) {
        return defaultValue;
    }
    
    const keys = path.split('.');
    let current = config;
    
    for (const key of keys) {
        if (current === undefined || current === null || !Object.prototype.hasOwnProperty.call(current, key)) {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
}

/**
 * Set a value in a nested configuration object
 * @param {Object} config - Configuration object
 * @param {string} path - Dot-notation path to value
 * @param {*} value - Value to set
 * @returns {Object} Updated configuration
 */
function setValue(config, path, value) {
    if (!config || !path) {
        return config;
    }
    
    const result = { ...config };
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = result;
    
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(current, key) || current[key] === null || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
    return result;
}

module.exports = {
    deepMerge,
    mergeDefaults,
    loadConfig,
    saveConfig,
    getValue,
    setValue
}; 