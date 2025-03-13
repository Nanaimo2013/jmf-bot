/**
 * JMF Hosting Discord Bot - Cache Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides caching capabilities for the bot, including
 * in-memory caching, persistent caching, and cache management utilities.
 * It helps improve performance by reducing redundant operations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../base.module');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CacheModule extends BaseModule {
    /**
     * Create a new cache module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager);
        this.name = 'cache';
        this.memoryCache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0
        };
        this.defaultTTL = 3600000; // 1 hour in milliseconds
        this.maxSize = 1000; // Maximum number of items in memory cache
        this.persistentCacheDir = path.join(process.cwd(), 'data', manager.name, 'cache');
        this.cleanupInterval = null;
        this.cleanupFrequency = 300000; // 5 minutes
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Apply configuration
        this.defaultTTL = config.defaultTTL || this.defaultTTL;
        this.maxSize = config.maxSize || this.maxSize;
        this.persistentCacheDir = config.persistentCacheDir || this.persistentCacheDir;
        this.cleanupFrequency = config.cleanupFrequency || this.cleanupFrequency;
        
        // Create persistent cache directory
        await fs.mkdir(this.persistentCacheDir, { recursive: true });
        
        // Register hooks
        this.manager.registerHook('beforeShutdown', this._beforeShutdown.bind(this));
        
        // Start cleanup interval
        this._startCleanup();
        
        this.log('info', 'Cache module initialized');
    }

    /**
     * Start cache cleanup interval
     * @private
     */
    _startCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.cleanupInterval = setInterval(() => {
            this._cleanupExpiredItems();
        }, this.cleanupFrequency);
        
        this.log('debug', `Cache cleanup started (frequency: ${this.cleanupFrequency}ms)`);
    }

    /**
     * Clean up expired cache items
     * @private
     */
    _cleanupExpiredItems() {
        const now = Date.now();
        let evictionCount = 0;
        
        // Clean up memory cache
        for (const [key, item] of this.memoryCache) {
            if (item.expiry && item.expiry < now) {
                this.memoryCache.delete(key);
                evictionCount++;
            }
        }
        
        if (evictionCount > 0) {
            this.stats.evictions += evictionCount;
            this.log('debug', `Cleaned up ${evictionCount} expired cache items`);
        }
        
        // Clean up persistent cache (async)
        this._cleanupPersistentCache().catch(error => {
            this.log('error', 'Failed to clean up persistent cache:', error);
        });
    }

    /**
     * Clean up persistent cache
     * @private
     */
    async _cleanupPersistentCache() {
        try {
            const now = Date.now();
            const files = await fs.readdir(this.persistentCacheDir);
            let evictionCount = 0;
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                const filePath = path.join(this.persistentCacheDir, file);
                try {
                    const stats = await fs.stat(filePath);
                    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    if (data.expiry && data.expiry < now) {
                        await fs.unlink(filePath);
                        evictionCount++;
                    }
                } catch (error) {
                    // If we can't read the file or it's invalid, delete it
                    await fs.unlink(filePath).catch(() => {});
                    evictionCount++;
                }
            }
            
            if (evictionCount > 0) {
                this.stats.evictions += evictionCount;
                this.log('debug', `Cleaned up ${evictionCount} expired persistent cache items`);
            }
        } catch (error) {
            this.log('error', 'Error cleaning up persistent cache:', error);
        }
    }

    /**
     * Get an item from the cache
     * @param {string} key - Cache key
     * @param {Object} [options] - Options
     * @param {boolean} [options.persistent=false] - Whether to check persistent cache
     * @returns {Promise<any>} Cached value or undefined if not found
     */
    async get(key, options = {}) {
        const { persistent = false } = options;
        
        // Check memory cache first
        if (this.memoryCache.has(key)) {
            const item = this.memoryCache.get(key);
            
            // Check if expired
            if (item.expiry && item.expiry < Date.now()) {
                this.memoryCache.delete(key);
                this.stats.misses++;
                return undefined;
            }
            
            this.stats.hits++;
            return item.value;
        }
        
        // Check persistent cache if requested
        if (persistent) {
            try {
                const value = await this._getPersistent(key);
                if (value !== undefined) {
                    // Add to memory cache for faster access next time
                    this._setMemory(key, value.value, { ttl: value.ttl });
                    this.stats.hits++;
                    return value.value;
                }
            } catch (error) {
                this.log('error', `Error getting persistent cache item: ${key}`, error);
            }
        }
        
        this.stats.misses++;
        return undefined;
    }

    /**
     * Set an item in the cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {Object} [options] - Options
     * @param {number} [options.ttl] - Time to live in milliseconds
     * @param {boolean} [options.persistent=false] - Whether to store in persistent cache
     * @returns {Promise<void>}
     */
    async set(key, value, options = {}) {
        const { ttl = this.defaultTTL, persistent = false } = options;
        
        // Set in memory cache
        this._setMemory(key, value, { ttl });
        
        // Set in persistent cache if requested
        if (persistent) {
            try {
                await this._setPersistent(key, value, { ttl });
            } catch (error) {
                this.log('error', `Error setting persistent cache item: ${key}`, error);
            }
        }
        
        this.stats.sets++;
    }

    /**
     * Set an item in memory cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {Object} [options] - Options
     * @param {number} [options.ttl] - Time to live in milliseconds
     * @private
     */
    _setMemory(key, value, options = {}) {
        const { ttl = this.defaultTTL } = options;
        
        // Check if we need to evict items
        if (this.memoryCache.size >= this.maxSize && !this.memoryCache.has(key)) {
            this._evictOldest();
        }
        
        // Calculate expiry time
        const expiry = ttl > 0 ? Date.now() + ttl : null;
        
        // Store in memory cache
        this.memoryCache.set(key, {
            value,
            expiry,
            ttl,
            createdAt: Date.now()
        });
    }

    /**
     * Evict the oldest item from memory cache
     * @private
     */
    _evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, item] of this.memoryCache) {
            if (item.createdAt < oldestTime) {
                oldestTime = item.createdAt;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.memoryCache.delete(oldestKey);
            this.stats.evictions++;
        }
    }

    /**
     * Get an item from persistent cache
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached value or undefined if not found
     * @private
     */
    async _getPersistent(key) {
        const filePath = this._getPersistentPath(key);
        
        try {
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Check if expired
            if (data.expiry && data.expiry < Date.now()) {
                await fs.unlink(filePath).catch(() => {});
                return undefined;
            }
            
            return {
                value: data.value,
                ttl: data.ttl
            };
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.log('error', `Error reading persistent cache: ${key}`, error);
            }
            return undefined;
        }
    }

    /**
     * Set an item in persistent cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {Object} [options] - Options
     * @param {number} [options.ttl] - Time to live in milliseconds
     * @returns {Promise<void>}
     * @private
     */
    async _setPersistent(key, value, options = {}) {
        const { ttl = this.defaultTTL } = options;
        const filePath = this._getPersistentPath(key);
        
        // Calculate expiry time
        const expiry = ttl > 0 ? Date.now() + ttl : null;
        
        // Prepare data
        const data = {
            key,
            value,
            ttl,
            expiry,
            createdAt: Date.now()
        };
        
        // Write to file
        await fs.writeFile(filePath, JSON.stringify(data), 'utf8');
    }

    /**
     * Get the file path for a persistent cache item
     * @param {string} key - Cache key
     * @returns {string} File path
     * @private
     */
    _getPersistentPath(key) {
        // Hash the key to create a safe filename
        const hash = crypto.createHash('md5').update(key).digest('hex');
        return path.join(this.persistentCacheDir, `${hash}.json`);
    }

    /**
     * Delete an item from the cache
     * @param {string} key - Cache key
     * @param {Object} [options] - Options
     * @param {boolean} [options.persistent=false] - Whether to delete from persistent cache
     * @returns {Promise<boolean>} Whether the item was deleted
     */
    async delete(key, options = {}) {
        const { persistent = false } = options;
        let deleted = false;
        
        // Delete from memory cache
        if (this.memoryCache.has(key)) {
            this.memoryCache.delete(key);
            deleted = true;
        }
        
        // Delete from persistent cache if requested
        if (persistent) {
            try {
                const filePath = this._getPersistentPath(key);
                await fs.unlink(filePath).catch(() => {});
                deleted = true;
            } catch (error) {
                this.log('error', `Error deleting persistent cache item: ${key}`, error);
            }
        }
        
        return deleted;
    }

    /**
     * Check if an item exists in the cache
     * @param {string} key - Cache key
     * @param {Object} [options] - Options
     * @param {boolean} [options.persistent=false] - Whether to check persistent cache
     * @returns {Promise<boolean>} Whether the item exists
     */
    async has(key, options = {}) {
        const { persistent = false } = options;
        
        // Check memory cache
        if (this.memoryCache.has(key)) {
            const item = this.memoryCache.get(key);
            
            // Check if expired
            if (item.expiry && item.expiry < Date.now()) {
                this.memoryCache.delete(key);
                return false;
            }
            
            return true;
        }
        
        // Check persistent cache if requested
        if (persistent) {
            try {
                const value = await this._getPersistent(key);
                return value !== undefined;
            } catch (error) {
                this.log('error', `Error checking persistent cache item: ${key}`, error);
            }
        }
        
        return false;
    }

    /**
     * Clear the cache
     * @param {Object} [options] - Options
     * @param {boolean} [options.persistent=false] - Whether to clear persistent cache
     * @returns {Promise<void>}
     */
    async clear(options = {}) {
        const { persistent = false } = options;
        
        // Clear memory cache
        this.memoryCache.clear();
        
        // Clear persistent cache if requested
        if (persistent) {
            try {
                const files = await fs.readdir(this.persistentCacheDir);
                
                for (const file of files) {
                    if (!file.endsWith('.json')) continue;
                    
                    const filePath = path.join(this.persistentCacheDir, file);
                    await fs.unlink(filePath).catch(() => {});
                }
                
                this.log('info', 'Persistent cache cleared');
            } catch (error) {
                this.log('error', 'Error clearing persistent cache:', error);
                throw error;
            }
        }
        
        this.log('info', 'Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        return {
            ...this.stats,
            size: this.memoryCache.size,
            hitRate: this.stats.hits + this.stats.misses > 0 
                ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
                : 0
        };
    }

    /**
     * Reset cache statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0
        };
        
        this.log('info', 'Cache statistics reset');
    }

    /**
     * Get all cache keys
     * @returns {string[]} Array of cache keys
     */
    getKeys() {
        return Array.from(this.memoryCache.keys());
    }

    /**
     * Get cache item details
     * @param {string} key - Cache key
     * @returns {Object|undefined} Cache item details or undefined if not found
     */
    getItemDetails(key) {
        if (!this.memoryCache.has(key)) {
            return undefined;
        }
        
        const item = this.memoryCache.get(key);
        return {
            key,
            expiry: item.expiry ? new Date(item.expiry).toISOString() : null,
            ttl: item.ttl,
            createdAt: new Date(item.createdAt).toISOString(),
            size: this._estimateSize(item.value),
            type: typeof item.value
        };
    }

    /**
     * Estimate the size of a value in bytes
     * @param {any} value - Value to estimate size of
     * @returns {number} Estimated size in bytes
     * @private
     */
    _estimateSize(value) {
        const type = typeof value;
        
        if (value === null || value === undefined) {
            return 0;
        }
        
        if (type === 'boolean') {
            return 4;
        }
        
        if (type === 'number') {
            return 8;
        }
        
        if (type === 'string') {
            return value.length * 2;
        }
        
        if (type === 'object') {
            if (Array.isArray(value)) {
                return value.reduce((size, item) => size + this._estimateSize(item), 0);
            }
            
            return Object.entries(value).reduce((size, [key, val]) => {
                return size + key.length * 2 + this._estimateSize(val);
            }, 0);
        }
        
        return 0;
    }

    /**
     * Hook called before manager shutdown
     * @private
     */
    async _beforeShutdown() {
        // Nothing to do here
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down cache module');
        
        // Stop cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        await super.shutdown();
    }

    /**
     * Get the status of the module
     * @returns {Promise<Object>} Status object
     */
    async getStatus() {
        const baseStatus = await super.getStatus();
        
        return {
            ...baseStatus,
            cache: {
                size: this.memoryCache.size,
                hitRate: this.stats.hits + this.stats.misses > 0 
                    ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
                    : 0,
                hits: this.stats.hits,
                misses: this.stats.misses
            }
        };
    }
}

module.exports = CacheModule; 