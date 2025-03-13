/**
 * JMF Hosting Discord Bot - Utilities
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides common utility functions used throughout the bot.
 * It includes helpers for string manipulation, object handling, file operations,
 * and other general-purpose utilities.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @param {string} [chars] - Characters to use
 * @returns {string} Random string
 */
function randomString(length, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    const charsLength = chars.length;
    
    for (let i = 0; i < length; i++) {
        result += chars[randomBytes[i] % charsLength];
    }
    
    return result;
}

/**
 * Generate a UUID v4
 * @returns {string} UUID
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (obj instanceof Object) {
        const copy = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                copy[key] = deepClone(obj[key]);
            }
        }
        return copy;
    }
    
    throw new Error(`Unable to copy object: ${obj}`);
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
    if (source === null || typeof source !== 'object') {
        return source;
    }
    
    const output = { ...target };
    
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        }
    }
    
    return output;
}

/**
 * Format a date
 * @param {Date} date - Date to format
 * @param {string} [format] - Format string
 * @returns {string} Formatted date
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    
    const replacements = {
        YYYY: d.getFullYear().toString(),
        YY: d.getFullYear().toString().slice(-2),
        MM: (d.getMonth() + 1).toString().padStart(2, '0'),
        DD: d.getDate().toString().padStart(2, '0'),
        HH: d.getHours().toString().padStart(2, '0'),
        mm: d.getMinutes().toString().padStart(2, '0'),
        ss: d.getSeconds().toString().padStart(2, '0'),
        SSS: d.getMilliseconds().toString().padStart(3, '0')
    };
    
    return format.replace(/YYYY|YY|MM|DD|HH|mm|ss|SSS/g, match => replacements[match]);
}

/**
 * Format a duration in milliseconds
 * @param {number} ms - Duration in milliseconds
 * @param {boolean} [short] - Use short format
 * @returns {string} Formatted duration
 */
function formatDuration(ms, short = false) {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (short) {
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
    if (seconds > 0) parts.push(`${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
}

/**
 * Format bytes to a human-readable string
 * @param {number} bytes - Bytes to format
 * @param {number} [decimals] - Number of decimal places
 * @returns {string} Formatted bytes
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Truncate a string
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} [suffix] - Suffix to add
 * @returns {string} Truncated string
 */
function truncate(str, maxLength, suffix = '...') {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Escape regex special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if a string is a valid URL
 * @param {string} str - String to check
 * @returns {boolean} True if the string is a valid URL
 */
function isValidUrl(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a string is a valid email
 * @param {string} str - String to check
 * @returns {boolean} True if the string is a valid email
 */
function isValidEmail(str) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>} Promise that resolves after the duration
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function
 * @param {Function} fn - Function to retry
 * @param {number} [retries] - Number of retries
 * @param {number} [delay] - Delay between retries in milliseconds
 * @param {Function} [onRetry] - Function to call on retry
 * @returns {Promise<any>} Promise that resolves with the function result
 */
async function retry(fn, retries = 3, delay = 1000, onRetry = null) {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        
        if (onRetry) {
            onRetry(error, retries);
        }
        
        await sleep(delay);
        return retry(fn, retries - 1, delay, onRetry);
    }
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} True if the file exists
 */
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Create a directory recursively
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<void>}
 */
async function createDirectory(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Read a JSON file
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} Parsed JSON
 */
async function readJsonFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
}

/**
 * Write a JSON file
 * @param {string} filePath - Path to the file
 * @param {Object} data - Data to write
 * @param {boolean} [pretty] - Pretty print the JSON
 * @returns {Promise<void>}
 */
async function writeJsonFile(filePath, data, pretty = true) {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await fs.writeFile(filePath, content, 'utf8');
}

/**
 * Get all files in a directory recursively
 * @param {string} dirPath - Path to the directory
 * @param {string[]} [extensions] - File extensions to include
 * @returns {Promise<string[]>} Array of file paths
 */
async function getFilesRecursive(dirPath, extensions = null) {
    const files = [];
    
    async function processDir(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                await processDir(fullPath);
            } else if (!extensions || extensions.some(ext => entry.name.endsWith(ext))) {
                files.push(fullPath);
            }
        }
    }
    
    await processDir(dirPath);
    return files;
}

/**
 * Calculate MD5 hash of a string
 * @param {string} str - String to hash
 * @returns {string} MD5 hash
 */
function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Calculate SHA256 hash of a string
 * @param {string} str - String to hash
 * @returns {string} SHA256 hash
 */
function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Encrypt a string
 * @param {string} str - String to encrypt
 * @param {string} key - Encryption key
 * @returns {string} Encrypted string
 */
function encrypt(str, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(str, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string
 * @param {string} str - String to decrypt
 * @param {string} key - Encryption key
 * @returns {string} Decrypted string
 */
function decrypt(str, key) {
    const [ivHex, encryptedHex] = str.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {
    randomString,
    generateUUID,
    deepClone,
    deepMerge,
    formatDate,
    formatDuration,
    formatBytes,
    truncate,
    escapeRegex,
    isValidUrl,
    isValidEmail,
    sleep,
    retry,
    fileExists,
    createDirectory,
    readJsonFile,
    writeJsonFile,
    getFilesRecursive,
    md5,
    sha256,
    encrypt,
    decrypt
}; 