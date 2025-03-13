/**
 * JMF Hosting Discord Bot - Cache Manager Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides a flexible caching system with support for
 * different storage strategies, TTL, and automatic cleanup.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { Collection } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class CacheManager extends BaseModule {
    /**
     * Create a new cache manager
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Cache options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'cache-manager',
            version: options.version || '1.0.0',
            description: 'Cache manager for the bot',
            defaultConfig: {
                defaultTTL: 300000, // 5 minutes
                checkInterval: 60000, // 1 minute
                persistPath: path.join(process.cwd(), 'data', 'cache'),
                persistInterval: 300000, // 5 minutes
                maxSize: 1000, // Maximum number of items in memory cache
                strategy: 'memory', // 'memory', 'file', or 'hybrid'
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Memory cache
        this.cache = new Collection();
        
        // Cache statistics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            expired: 0,
            byNamespace: new Map()
        };
        
        // Cache intervals
        this.intervals = {
            cleanup: null,
            persist: null
        };
        
        // Cache namespaces
        this.namespaces = new Set();
    }

    /**
     * Initialize the cache manager
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Create cache directory if using file or hybrid strategy
        const strategy = this.getConfig('strategy');
        if (strategy === 'file' || strategy === 'hybrid') {
            await this._ensureCacheDirectory();
        }
        
        // Load persisted cache if using file or hybrid strategy
        if (strategy === 'file' || strategy === 'hybrid') {
            await this._loadPersistedCache();
        }
        
        // Set up cleanup interval
        const checkInterval = this.getConfig('checkInterval');
        if (checkInterval > 0) {
            this.intervals.cleanup = setInterval(() => this.cleanup(), checkInterval);
        }
        
        // Set up persist interval if using file or hybrid strategy
        if ((strategy === 'file' || strategy === 'hybrid') && this.getConfig('persistInterval') > 0) {
            this.intervals.persist = setInterval(() => this.persistCache(), this.getConfig('persistInterval'));
        }
        
        this.logger.info(this.name, 'Cache manager initialized');
    }

    /**
     * Get a value from the cache
     * @param {string} key - The cache key
     * @param {Object} [options] - Get options
     * @param {string} [options.namespace='global'] - The cache namespace
     * @param {*} [options.defaultValue=null] - The default value if key not found
     * @returns {*} - The cached value or default value
     */
    get(key, options = {}) {
        const namespace = options.namespace || 'global';
        const cacheKey = this._getCacheKey(key, namespace);
        
        // Check if key exists in cache
        if (this.cache.has(cacheKey)) {
            const cacheItem = this.cache.get(cacheKey);
            
            // Check if item has expired
            if (cacheItem.expiry && cacheItem.expiry < Date.now()) {
                // Remove expired item
                this.delete(key, { namespace });
                
                // Update statistics
                this.stats.expired++;
                this.stats.misses++;
                
                return options.defaultValue !== undefined ? options.defaultValue : null;
            }
            
            // Update statistics
            this.stats.hits++;
            this._updateNamespaceStats(namespace, 'hits');
            
            return cacheItem.value;
        }
        
        // Update statistics
        this.stats.misses++;
        this._updateNamespaceStats(namespace, 'misses');
        
        return options.defaultValue !== undefined ? options.defaultValue : null;
    }

    /**
     * Set a value in the cache
     * @param {string} key - The cache key
     * @param {*} value - The value to cache
     * @param {Object} [options] - Set options
     * @param {string} [options.namespace='global'] - The cache namespace
     * @param {number} [options.ttl] - Time to live in milliseconds
     * @param {boolean} [options.persist=false] - Whether to persist the value to disk
     * @returns {CacheManager} - The cache manager instance for chaining
     */
    set(key, value, options = {}) {
        const namespace = options.namespace || 'global';
        const cacheKey = this._getCacheKey(key, namespace);
        
        // Add namespace to set
        this.namespaces.add(namespace);
        
        // Calculate expiry time
        const ttl = options.ttl !== undefined ? options.ttl : this.getConfig('defaultTTL');
        const expiry = ttl > 0 ? Date.now() + ttl : null;
        
        // Create cache item
        const cacheItem = {
            key,
            namespace,
            value,
            expiry,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            persist: options.persist || false
        };
        
        // Check if cache is full
        if (this.cache.size >= this.getConfig('maxSize') && !this.cache.has(cacheKey)) {
            // Remove oldest item
            this._removeOldestItem();
        }
        
        // Set cache item
        this.cache.set(cacheKey, cacheItem);
        
        // Update statistics
        this.stats.sets++;
        this._updateNamespaceStats(namespace, 'sets');
        
        // Persist cache item if needed
        if (options.persist && (this.getConfig('strategy') === 'file' || this.getConfig('strategy') === 'hybrid')) {
            this._persistCacheItem(cacheKey, cacheItem).catch(error => {
                this.logger.error(this.name, `Failed to persist cache item: ${error.message}`);
            });
        }
        
        return this;
    }

    /**
     * Delete a value from the cache
     * @param {string} key - The cache key
     * @param {Object} [options] - Delete options
     * @param {string} [options.namespace='global'] - The cache namespace
     * @returns {boolean} - Whether the key was deleted
     */
    delete(key, options = {}) {
        const namespace = options.namespace || 'global';
        const cacheKey = this._getCacheKey(key, namespace);
        
        // Check if key exists in cache
        if (this.cache.has(cacheKey)) {
            const cacheItem = this.cache.get(cacheKey);
            
            // Delete cache item
            this.cache.delete(cacheKey);
            
            // Update statistics
            this.stats.deletes++;
            this._updateNamespaceStats(namespace, 'deletes');
            
            // Delete persisted cache item if needed
            if (cacheItem.persist && (this.getConfig('strategy') === 'file' || this.getConfig('strategy') === 'hybrid')) {
                this._deletePersistentCacheItem(cacheKey).catch(error => {
                    this.logger.error(this.name, `Failed to delete persistent cache item: ${error.message}`);
                });
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Check if a key exists in the cache
     * @param {string} key - The cache key
     * @param {Object} [options] - Has options
     * @param {string} [options.namespace='global'] - The cache namespace
     * @returns {boolean} - Whether the key exists
     */
    has(key, options = {}) {
        const namespace = options.namespace || 'global';
        const cacheKey = this._getCacheKey(key, namespace);
        
        // Check if key exists in cache
        if (this.cache.has(cacheKey)) {
            const cacheItem = this.cache.get(cacheKey);
            
            // Check if item has expired
            if (cacheItem.expiry && cacheItem.expiry < Date.now()) {
                // Remove expired item
                this.delete(key, { namespace });
                
                // Update statistics
                this.stats.expired++;
                
                return false;
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Clear the cache
     * @param {Object} [options] - Clear options
     * @param {string} [options.namespace] - The namespace to clear (all namespaces if not specified)
     * @returns {number} - The number of items cleared
     */
    clear(options = {}) {
        const namespace = options.namespace;
        
        if (namespace) {
            // Clear specific namespace
            const keys = [];
            
            for (const [cacheKey, cacheItem] of this.cache.entries()) {
                if (cacheItem.namespace === namespace) {
                    keys.push(cacheKey);
                }
            }
            
            // Delete keys
            for (const cacheKey of keys) {
                this.cache.delete(cacheKey);
            }
            
            // Update statistics
            this.stats.deletes += keys.length;
            this._updateNamespaceStats(namespace, 'deletes', keys.length);
            
            // Delete persisted cache items if needed
            if (this.getConfig('strategy') === 'file' || this.getConfig('strategy') === 'hybrid') {
                this._deletePersistentNamespace(namespace).catch(error => {
                    this.logger.error(this.name, `Failed to delete persistent namespace: ${error.message}`);
                });
            }
            
            return keys.length;
        } else {
            // Clear all namespaces
            const count = this.cache.size;
            
            // Clear cache
            this.cache.clear();
            
            // Update statistics
            this.stats.deletes += count;
            
            // Delete all persisted cache items if needed
            if (this.getConfig('strategy') === 'file' || this.getConfig('strategy') === 'hybrid') {
                this._deleteAllPersistentCache().catch(error => {
                    this.logger.error(this.name, `Failed to delete all persistent cache: ${error.message}`);
                });
            }
            
            return count;
        }
    }

    /**
     * Clean up expired cache items
     * @returns {number} - The number of items cleaned up
     */
    cleanup() {
        const now = Date.now();
        const keys = [];
        
        // Find expired items
        for (const [cacheKey, cacheItem] of this.cache.entries()) {
            if (cacheItem.expiry && cacheItem.expiry < now) {
                keys.push(cacheKey);
            }
        }
        
        // Delete expired items
        for (const cacheKey of keys) {
            const cacheItem = this.cache.get(cacheKey);
            
            // Delete cache item
            this.cache.delete(cacheKey);
            
            // Update statistics
            this.stats.expired++;
            this.stats.deletes++;
            this._updateNamespaceStats(cacheItem.namespace, 'deletes');
            
            // Delete persisted cache item if needed
            if (cacheItem.persist && (this.getConfig('strategy') === 'file' || this.getConfig('strategy') === 'hybrid')) {
                this._deletePersistentCacheItem(cacheKey).catch(error => {
                    this.logger.error(this.name, `Failed to delete persistent cache item: ${error.message}`);
                });
            }
        }
        
        if (keys.length > 0) {
            this.logger.debug(this.name, `Cleaned up ${keys.length} expired cache items`);
        }
        
        return keys.length;
    }

    /**
     * Persist the cache to disk
     * @returns {Promise<number>} - The number of items persisted
     */
    async persistCache() {
        // Skip if not using file or hybrid strategy
        if (this.getConfig('strategy') !== 'file' && this.getConfig('strategy') !== 'hybrid') {
            return 0;
        }
        
        try {
            // Ensure cache directory exists
            await this._ensureCacheDirectory();
            
            // Find items to persist
            const itemsToPersist = [];
            
            for (const [cacheKey, cacheItem] of this.cache.entries()) {
                if (cacheItem.persist) {
                    itemsToPersist.push({ cacheKey, cacheItem });
                }
            }
            
            // Persist items
            for (const { cacheKey, cacheItem } of itemsToPersist) {
                await this._persistCacheItem(cacheKey, cacheItem);
            }
            
            this.logger.debug(this.name, `Persisted ${itemsToPersist.length} cache items`);
            
            return itemsToPersist.length;
        } catch (error) {
            this.logger.error(this.name, `Failed to persist cache: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getStatistics() {
        return {
            size: this.cache.size,
            hits: this.stats.hits,
            misses: this.stats.misses,
            sets: this.stats.sets,
            deletes: this.stats.deletes,
            expired: this.stats.expired,
            hitRatio: this.stats.hits + this.stats.misses > 0 
                ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
                : 0,
            byNamespace: Object.fromEntries(this.stats.byNamespace),
            namespaces: Array.from(this.namespaces)
        };
    }

    /**
     * Get cache key
     * @param {string} key - The key
     * @param {string} namespace - The namespace
     * @returns {string} - The cache key
     * @private
     */
    _getCacheKey(key, namespace) {
        return `${namespace}:${key}`;
    }

    /**
     * Update namespace statistics
     * @param {string} namespace - The namespace
     * @param {string} stat - The statistic to update
     * @param {number} [count=1] - The count to add
     * @private
     */
    _updateNamespaceStats(namespace, stat, count = 1) {
        if (!this.stats.byNamespace.has(namespace)) {
            this.stats.byNamespace.set(namespace, {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0
            });
        }
        
        const namespaceStats = this.stats.byNamespace.get(namespace);
        namespaceStats[stat] += count;
    }

    /**
     * Remove oldest item from cache
     * @private
     */
    _removeOldestItem() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        // Find oldest item
        for (const [cacheKey, cacheItem] of this.cache.entries()) {
            if (cacheItem.updatedAt < oldestTime) {
                oldestKey = cacheKey;
                oldestTime = cacheItem.updatedAt;
            }
        }
        
        // Remove oldest item
        if (oldestKey) {
            const cacheItem = this.cache.get(oldestKey);
            
            // Delete cache item
            this.cache.delete(oldestKey);
            
            // Update statistics
            this.stats.deletes++;
            this._updateNamespaceStats(cacheItem.namespace, 'deletes');
            
            // Delete persisted cache item if needed
            if (cacheItem.persist && (this.getConfig('strategy') === 'file' || this.getConfig('strategy') === 'hybrid')) {
                this._deletePersistentCacheItem(oldestKey).catch(error => {
                    this.logger.error(this.name, `Failed to delete persistent cache item: ${error.message}`);
                });
            }
            
            this.logger.debug(this.name, `Removed oldest cache item: ${oldestKey}`);
        }
    }

    /**
     * Ensure cache directory exists
     * @returns {Promise<void>}
     * @private
     */
    async _ensureCacheDirectory() {
        const persistPath = this.getConfig('persistPath');
        
        try {
            await fs.access(persistPath);
        } catch (error) {
            await fs.mkdir(persistPath, { recursive: true });
            this.logger.debug(this.name, `Created cache directory: ${persistPath}`);
        }
    }

    /**
     * Load persisted cache
     * @returns {Promise<void>}
     * @private
     */
    async _loadPersistedCache() {
        const persistPath = this.getConfig('persistPath');
        
        try {
            // Check if cache directory exists
            try {
                await fs.access(persistPath);
            } catch (error) {
                return;
            }
            
            // Get cache files
            const files = await fs.readdir(persistPath);
            const cacheFiles = files.filter(file => file.endsWith('.json'));
            
            if (cacheFiles.length === 0) {
                return;
            }
            
            // Load each cache file
            for (const file of cacheFiles) {
                try {
                    const filePath = path.join(persistPath, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const cacheItem = JSON.parse(data);
                    
                    // Skip expired items
                    if (cacheItem.expiry && cacheItem.expiry < Date.now()) {
                        // Delete expired file
                        await fs.unlink(filePath);
                        
                        // Update statistics
                        this.stats.expired++;
                        
                        continue;
                    }
                    
                    // Add namespace to set
                    this.namespaces.add(cacheItem.namespace);
                    
                    // Set cache item
                    const cacheKey = this._getCacheKey(cacheItem.key, cacheItem.namespace);
                    this.cache.set(cacheKey, cacheItem);
                } catch (error) {
                    this.logger.error(this.name, `Failed to load cache file ${file}: ${error.message}`);
                }
            }
            
            this.logger.info(this.name, `Loaded ${this.cache.size} persisted cache items`);
        } catch (error) {
            this.logger.error(this.name, `Failed to load persisted cache: ${error.message}`);
        }
    }

    /**
     * Persist cache item
     * @param {string} cacheKey - The cache key
     * @param {Object} cacheItem - The cache item
     * @returns {Promise<void>}
     * @private
     */
    async _persistCacheItem(cacheKey, cacheItem) {
        const persistPath = this.getConfig('persistPath');
        const filePath = path.join(persistPath, `${cacheKey.replace(/:/g, '_')}.json`);
        
        try {
            // Ensure cache directory exists
            await this._ensureCacheDirectory();
            
            // Write cache item to file
            const data = JSON.stringify(cacheItem);
            await fs.writeFile(filePath, data, 'utf8');
        } catch (error) {
            this.logger.error(this.name, `Failed to persist cache item: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete persistent cache item
     * @param {string} cacheKey - The cache key
     * @returns {Promise<void>}
     * @private
     */
    async _deletePersistentCacheItem(cacheKey) {
        const persistPath = this.getConfig('persistPath');
        const filePath = path.join(persistPath, `${cacheKey.replace(/:/g, '_')}.json`);
        
        try {
            // Check if file exists
            try {
                await fs.access(filePath);
            } catch (error) {
                return;
            }
            
            // Delete file
            await fs.unlink(filePath);
        } catch (error) {
            this.logger.error(this.name, `Failed to delete persistent cache item: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete persistent namespace
     * @param {string} namespace - The namespace
     * @returns {Promise<void>}
     * @private
     */
    async _deletePersistentNamespace(namespace) {
        const persistPath = this.getConfig('persistPath');
        
        try {
            // Check if cache directory exists
            try {
                await fs.access(persistPath);
            } catch (error) {
                return;
            }
            
            // Get cache files
            const files = await fs.readdir(persistPath);
            const cacheFiles = files.filter(file => file.startsWith(`${namespace}_`) && file.endsWith('.json'));
            
            // Delete each file
            for (const file of cacheFiles) {
                const filePath = path.join(persistPath, file);
                await fs.unlink(filePath);
            }
            
            this.logger.debug(this.name, `Deleted ${cacheFiles.length} persistent cache items for namespace: ${namespace}`);
        } catch (error) {
            this.logger.error(this.name, `Failed to delete persistent namespace: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete all persistent cache
     * @returns {Promise<void>}
     * @private
     */
    async _deleteAllPersistentCache() {
        const persistPath = this.getConfig('persistPath');
        
        try {
            // Check if cache directory exists
            try {
                await fs.access(persistPath);
            } catch (error) {
                return;
            }
            
            // Get cache files
            const files = await fs.readdir(persistPath);
            const cacheFiles = files.filter(file => file.endsWith('.json'));
            
            // Delete each file
            for (const file of cacheFiles) {
                const filePath = path.join(persistPath, file);
                await fs.unlink(filePath);
            }
            
            this.logger.debug(this.name, `Deleted ${cacheFiles.length} persistent cache items`);
        } catch (error) {
            this.logger.error(this.name, `Failed to delete all persistent cache: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        // Clear intervals
        if (this.intervals.cleanup) {
            clearInterval(this.intervals.cleanup);
            this.intervals.cleanup = null;
        }
        
        if (this.intervals.persist) {
            clearInterval(this.intervals.persist);
            this.intervals.persist = null;
        }
        
        // Persist cache if needed
        if (this.getConfig('strategy') === 'file' || this.getConfig('strategy') === 'hybrid') {
            try {
                await this.persistCache();
            } catch (error) {
                this.logger.error(this.name, `Failed to persist cache during cleanup: ${error.message}`);
            }
        }
        
        // Clear cache
        this.cache.clear();
        
        // Clear namespaces
        this.namespaces.clear();
        
        // Reset statistics
        this.stats.hits = 0;
        this.stats.misses = 0;
        this.stats.sets = 0;
        this.stats.deletes = 0;
        this.stats.expired = 0;
        this.stats.byNamespace.clear();
        
        this.logger.info(this.name, 'Cache manager cleaned up');
    }
}

module.exports = CacheManager; 