/**
 * JMF Hosting Discord Bot - Utility Module
 * Version: 1.1.0
 * Last Updated: 03/13/2025
 * 
 * This module provides utility functions for the bot manager,
 * including string formatting, data validation, and common operations.
 * 
 * © 2024 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../base.module');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Custom promise-based timeout function to replace timers/promises
const customSetTimeout = ms => new Promise(resolve => setTimeout(resolve, ms));

class UtilityModule extends BaseModule {
    /**
     * Create a new utility module
     * @param {Object} manager - The parent manager instance
     * @param {Object} [options] - Module options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'utility',
            version: options.version || '1.1.0',
            description: 'Utility functions for the bot manager',
            defaultConfig: {
                cacheEnabled: true,
                cacheTTL: 300, // 5 minutes
                retryAttempts: 3,
                retryDelay: 1000, // 1 second
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });
        
        // Cache for expensive operations
        this._cache = new Map();
        
        // Database connection status
        this._databaseConnected = false;
        
        // Event bus connection status
        this._eventBusConnected = false;
    }

    /**
     * Initialize the utility module
     * @param {Object} [config] - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Connect to database
        try {
            const database = await this.getDatabase();
            if (database) {
                this._databaseConnected = true;
                this.log('info', 'Connected to database');
            }
        } catch (error) {
            this.log('warn', `Failed to connect to database: ${error.message}`);
        }
        
        // Connect to event bus
        try {
            const eventBus = await this.getEventBus();
            if (eventBus) {
                this._eventBusConnected = true;
                this.log('info', 'Connected to event bus');
                
                // Subscribe to cache invalidation events
                await this.subscribeToEvent('cacheInvalidate', async (data) => {
                    if (data.module === this.name) {
                        if (data.key) {
                            this._cache.delete(data.key);
                            this.log('debug', `Cache invalidated for key: ${data.key}`);
                        } else {
                            this._cache.clear();
                            this.log('debug', 'Cache cleared');
                        }
                    }
                });
            }
        } catch (error) {
            this.log('warn', `Failed to connect to event bus: ${error.message}`);
        }
        
        this.log('info', 'Utility module initialized');
    }

    /**
     * Format a string with placeholders
     * @param {string} template - Template string with {placeholders}
     * @param {Object} data - Data to replace placeholders
     * @returns {string} Formatted string
     */
    formatString(template, data = {}) {
        return template.replace(/{([^{}]*)}/g, (match, key) => {
            const value = key.split('.').reduce((obj, prop) => obj && obj[prop], data);
            return value !== undefined ? value : match;
        });
    }

    /**
     * Generate a random string
     * @param {number} length - Length of the string
     * @param {string} [chars] - Characters to use
     * @returns {string} Random string
     */
    randomString(length = 10, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        let result = '';
        const charsLength = chars.length;
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * charsLength));
        }
        
        return result;
    }

    /**
     * Generate a secure random token
     * @param {number} length - Length of the token in bytes
     * @returns {string} Hex-encoded token
     */
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Hash a string using SHA-256
     * @param {string} data - Data to hash
     * @param {string} [salt] - Optional salt
     * @returns {string} Hex-encoded hash
     */
    hashString(data, salt = '') {
        return crypto.createHash('sha256').update(data + salt).digest('hex');
    }

    /**
     * Validate an email address
     * @param {string} email - Email address to validate
     * @returns {boolean} Whether the email is valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate a URL
     * @param {string} url - URL to validate
     * @returns {boolean} Whether the URL is valid
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Truncate a string to a maximum length
     * @param {string} str - String to truncate
     * @param {number} maxLength - Maximum length
     * @param {string} [suffix] - Suffix to add if truncated
     * @returns {string} Truncated string
     */
    truncateString(str, maxLength, suffix = '...') {
        if (str.length <= maxLength) {
            return str;
        }
        
        return str.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Retry a function multiple times
     * @param {Function} fn - Function to retry
     * @param {number} [attempts] - Maximum number of attempts
     * @param {number} [delay] - Delay between attempts in milliseconds
     * @returns {Promise<*>} Function result
     */
    async retry(fn, attempts = this.getConfig('retryAttempts'), delay = this.getConfig('retryDelay')) {
        let lastError;
        
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                this.log('debug', `Retry attempt ${i + 1}/${attempts} failed: ${error.message}`);
                
                if (i < attempts - 1) {
                    await customSetTimeout(delay);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Get a value from the cache
     * @param {string} key - Cache key
     * @param {*} [defaultValue] - Default value if key not found
     * @returns {*} Cached value or default
     */
    getCached(key, defaultValue = null) {
        if (!this.getConfig('cacheEnabled')) {
            return defaultValue;
        }
        
        const cached = this._cache.get(key);
        
        if (!cached) {
            return defaultValue;
        }
        
        if (cached.expires && cached.expires < Date.now()) {
            this._cache.delete(key);
            return defaultValue;
        }
        
        return cached.value;
    }

    /**
     * Set a value in the cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} [ttl] - Time to live in seconds
     * @returns {boolean} Success status
     */
    setCached(key, value, ttl = this.getConfig('cacheTTL')) {
        if (!this.getConfig('cacheEnabled')) {
            return false;
        }
        
        this._cache.set(key, {
            value,
            expires: ttl > 0 ? Date.now() + (ttl * 1000) : null
        });
        
        return true;
    }

    /**
     * Delete a value from the cache
     * @param {string} key - Cache key
     * @returns {boolean} Success status
     */
    deleteCached(key) {
        return this._cache.delete(key);
    }

    /**
     * Clear the entire cache
     * @returns {void}
     */
    clearCache() {
        this._cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validItems = 0;
        let expiredItems = 0;
        
        for (const [, cached] of this._cache) {
            if (!cached.expires || cached.expires > now) {
                validItems++;
            } else {
                expiredItems++;
            }
        }
        
        return {
            totalItems: this._cache.size,
            validItems,
            expiredItems
        };
    }

    /**
     * Parse a duration string into milliseconds
     * @param {string} duration - Duration string (e.g., '1d', '2h', '30m', '10s')
     * @returns {number} Milliseconds
     */
    parseDuration(duration) {
        const match = duration.match(/^(\d+)([dhms])$/);
        
        if (!match) {
            throw new Error(`Invalid duration format: ${duration}`);
        }
        
        const [, value, unit] = match;
        const numValue = parseInt(value, 10);
        
        switch (unit) {
            case 'd': return numValue * 86400000; // days
            case 'h': return numValue * 3600000;  // hours
            case 'm': return numValue * 60000;    // minutes
            case 's': return numValue * 1000;     // seconds
            default: return numValue;
        }
    }

    /**
     * Format a timestamp
     * @param {number|Date} timestamp - Timestamp to format
     * @param {string} [format] - Format string
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        
        const tokens = {
            YYYY: date.getFullYear(),
            MM: String(date.getMonth() + 1).padStart(2, '0'),
            DD: String(date.getDate()).padStart(2, '0'),
            HH: String(date.getHours()).padStart(2, '0'),
            mm: String(date.getMinutes()).padStart(2, '0'),
            ss: String(date.getSeconds()).padStart(2, '0'),
            SSS: String(date.getMilliseconds()).padStart(3, '0')
        };
        
        return format.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, match => tokens[match]);
    }

    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj);
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (obj instanceof Object) {
            const copy = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    copy[key] = this.deepClone(obj[key]);
                }
            }
            return copy;
        }
        
        throw new Error(`Unable to copy object: ${obj}`);
    }

    /**
     * Deep merge objects
     * @param {Object} target - Target object
     * @param {...Object} sources - Source objects
     * @returns {Object} Merged object
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        
        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        
        return this.deepMerge(target, ...sources);
    }

    /**
     * Check if a value is an object
     * @param {*} item - Value to check
     * @returns {boolean} Whether the value is an object
     */
    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * Escape a string for use in a regular expression
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Get a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Shuffle an array
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const result = [...array];
        
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        
        return result;
    }

    /**
     * Chunk an array into smaller arrays
     * @param {Array} array - Array to chunk
     * @param {number} size - Chunk size
     * @returns {Array} Array of chunks
     */
    chunkArray(array, size) {
        const result = [];
        
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        
        return result;
    }

    /**
     * Get a unique array (remove duplicates)
     * @param {Array} array - Array to process
     * @param {Function} [keyFn] - Function to get comparison key
     * @returns {Array} Array with duplicates removed
     */
    uniqueArray(array, keyFn = item => item) {
        const seen = new Set();
        return array.filter(item => {
            const key = keyFn(item);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Wait for a specified time
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>} Promise that resolves after the wait
     */
    async wait(ms) {
        return customSetTimeout(ms);
    }

    /**
     * Check if a value is empty (null, undefined, empty string, empty array, empty object)
     * @param {*} value - Value to check
     * @returns {boolean} Whether the value is empty
     */
    isEmpty(value) {
        if (value === null || value === undefined) {
            return true;
        }
        
        if (typeof value === 'string' || Array.isArray(value)) {
            return value.length === 0;
        }
        
        if (typeof value === 'object') {
            return Object.keys(value).length === 0;
        }
        
        return false;
    }

    /**
     * Get a value from an object by path
     * @param {Object} obj - Object to get value from
     * @param {string} path - Path to value (e.g., 'user.profile.name')
     * @param {*} [defaultValue] - Default value if path not found
     * @returns {*} Value at path or default
     */
    getValueByPath(obj, path, defaultValue = undefined) {
        return path.split('.').reduce((o, p) => (o ? o[p] : defaultValue), obj);
    }

    /**
     * Set a value in an object by path
     * @param {Object} obj - Object to set value in
     * @param {string} path - Path to value (e.g., 'user.profile.name')
     * @param {*} value - Value to set
     * @returns {Object} Updated object
     */
    setValueByPath(obj, path, value) {
        const result = { ...obj };
        const parts = path.split('.');
        let current = result;
        
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part] || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
        
        current[parts[parts.length - 1]] = value;
        return result;
    }

    /**
     * Save data to the database
     * @param {string} table - Table name
     * @param {Object} data - Data to save
     * @param {Object} [where] - Where clause
     * @returns {Promise<Object>} Query result
     */
    async saveToDatabase(table, data, where = null) {
        if (!this._databaseConnected) {
            throw new Error('Database not connected');
        }
        
        try {
            if (where) {
                // Update existing record
                const whereClause = Object.entries(where)
                    .map(([key]) => `${key} = ?`)
                    .join(' AND ');
                
                const setClause = Object.entries(data)
                    .map(([key]) => `${key} = ?`)
                    .join(', ');
                
                const params = [
                    ...Object.values(data),
                    ...Object.values(where)
                ];
                
                const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
                return await this.dbQuery(sql, params);
            } else {
                // Insert new record
                const columns = Object.keys(data).join(', ');
                const placeholders = Object.keys(data).map(() => '?').join(', ');
                const params = Object.values(data);
                
                const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
                return await this.dbQuery(sql, params);
            }
        } catch (error) {
            this.log('error', `Failed to save to database: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load data from the database
     * @param {string} table - Table name
     * @param {Object} [where] - Where clause
     * @param {string} [orderBy] - Order by clause
     * @param {number} [limit] - Limit
     * @returns {Promise<Array>} Query results
     */
    async loadFromDatabase(table, where = null, orderBy = null, limit = null) {
        if (!this._databaseConnected) {
            throw new Error('Database not connected');
        }
        
        try {
            let sql = `SELECT * FROM ${table}`;
            const params = [];
            
            if (where) {
                const whereClause = Object.entries(where)
                    .map(([key]) => `${key} = ?`)
                    .join(' AND ');
                
                sql += ` WHERE ${whereClause}`;
                params.push(...Object.values(where));
            }
            
            if (orderBy) {
                sql += ` ORDER BY ${orderBy}`;
            }
            
            if (limit) {
                sql += ` LIMIT ${limit}`;
            }
            
            return await this.dbQuery(sql, params);
        } catch (error) {
            this.log('error', `Failed to load from database: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete data from the database
     * @param {string} table - Table name
     * @param {Object} where - Where clause
     * @returns {Promise<Object>} Query result
     */
    async deleteFromDatabase(table, where) {
        if (!this._databaseConnected) {
            throw new Error('Database not connected');
        }
        
        try {
            const whereClause = Object.entries(where)
                .map(([key]) => `${key} = ?`)
                .join(' AND ');
            
            const params = Object.values(where);
            
            const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
            return await this.dbQuery(sql, params);
        } catch (error) {
            this.log('error', `Failed to delete from database: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute a custom SQL query
     * @param {string} sql - SQL query
     * @param {Array} [params] - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async executeQuery(sql, params = []) {
        if (!this._databaseConnected) {
            throw new Error('Database not connected');
        }
        
        try {
            return await this.dbQuery(sql, params);
        } catch (error) {
            this.log('error', `Failed to execute query: ${error.message}`);
            throw error;
        }
    }

    /**
     * Publish an event to the event bus
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     * @returns {Promise<boolean>} Success status
     */
    async publishEvent(eventName, data = {}) {
        if (!this._eventBusConnected) {
            this.log('warn', 'Event bus not connected');
            return false;
        }
        
        try {
            return await super.publishEvent(eventName, data, 'utility');
        } catch (error) {
            this.log('error', `Failed to publish event: ${error.message}`);
            return false;
        }
    }

    /**
     * Clean up resources
     * @returns {Promise<void>}
     */
    async shutdown() {
        // Clear cache
        this._cache.clear();
        
        // Publish shutdown event
        if (this._eventBusConnected) {
            await this.publishEvent('moduleShutdown', {
                module: this.name,
                timestamp: Date.now()
            });
        }
        
        await super.shutdown();
        
        this.log('info', 'Utility module shut down');
    }
}

module.exports = UtilityModule; 