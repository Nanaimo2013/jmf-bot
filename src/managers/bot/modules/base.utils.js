/**
 * JMF Hosting Discord Bot - Base Utility Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This is the base utility module that provides common utility functions
 * for Discord bot operations, including permission checking, formatting,
 * and other helper methods.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { PermissionFlagsBits, ChannelType, Collection } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;

class BaseUtilsModule extends BaseModule {
    /**
     * Create a new base utility module
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Utility options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'utils',
            version: options.version || '1.0.0',
            defaultConfig: options.defaultConfig || {},
            requiredPermissions: options.requiredPermissions || []
        });

        // Discord.js client
        this.client = manager.client;
        
        // Utility caches
        this._caches = {
            permissions: new Collection(),
            channels: new Collection(),
            members: new Collection()
        };
    }

    /**
     * Initialize the utility module
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        this.logger.debug(this.name, `Utility module initialized: ${this.name}`);
    }

    /**
     * Check if a member has the required permissions
     * @param {GuildMember} member - The guild member
     * @param {Array|BigInt} permissions - The permissions to check
     * @param {Object} [options] - Check options
     * @param {boolean} [options.checkAdmin=true] - Whether to check for administrator permission
     * @param {boolean} [options.checkOwner=true] - Whether to check if the member is the guild owner
     * @returns {boolean} - Whether the member has the permissions
     */
    hasPermissions(member, permissions, options = {}) {
        const { checkAdmin = true, checkOwner = true } = options;
        
        // Check if member is the guild owner
        if (checkOwner && member.guild.ownerId === member.id) {
            return true;
        }
        
        // Check if member has administrator permission
        if (checkAdmin && member.permissions.has(PermissionFlagsBits.Administrator)) {
            return true;
        }
        
        // Check specific permissions
        if (Array.isArray(permissions)) {
            return permissions.every(permission => member.permissions.has(permission));
        } else {
            return member.permissions.has(permissions);
        }
    }

    /**
     * Check if the bot has the required permissions in a channel
     * @param {TextChannel|VoiceChannel|CategoryChannel} channel - The channel
     * @param {Array|BigInt} permissions - The permissions to check
     * @returns {boolean} - Whether the bot has the permissions
     */
    botHasPermissions(channel, permissions) {
        const me = channel.guild.members.me;
        
        if (!me) {
            return false;
        }
        
        // Check specific permissions
        if (Array.isArray(permissions)) {
            return permissions.every(permission => channel.permissionsFor(me).has(permission));
        } else {
            return channel.permissionsFor(me).has(permissions);
        }
    }

    /**
     * Format a duration in milliseconds to a human-readable string
     * @param {number} ms - The duration in milliseconds
     * @param {Object} [options] - Format options
     * @param {boolean} [options.long=false] - Whether to use long format
     * @param {number} [options.precision=1] - The number of units to include
     * @returns {string} - The formatted duration
     */
    formatDuration(ms, options = {}) {
        const { long = false, precision = 1 } = options;
        
        if (ms < 0) ms = 0;
        
        const time = {
            day: Math.floor(ms / 86400000),
            hour: Math.floor(ms / 3600000) % 24,
            minute: Math.floor(ms / 60000) % 60,
            second: Math.floor(ms / 1000) % 60
        };
        
        const units = Object.entries(time)
            .filter(([unit, value]) => value > 0)
            .map(([unit, value]) => {
                if (long) {
                    return `${value} ${unit}${value !== 1 ? 's' : ''}`;
                } else {
                    const shortUnit = unit[0];
                    return `${value}${shortUnit}`;
                }
            });
        
        return units.slice(0, precision).join(long ? ', ' : ' ') || (long ? '0 seconds' : '0s');
    }

    /**
     * Format a date to a human-readable string
     * @param {Date|number|string} date - The date to format
     * @param {Object} [options] - Format options
     * @param {string} [options.format='short'] - The format to use (short, long, relative)
     * @returns {string} - The formatted date
     */
    formatDate(date, options = {}) {
        const { format = 'short' } = options;
        const dateObj = date instanceof Date ? date : new Date(date);
        
        switch (format) {
            case 'short':
                return dateObj.toLocaleDateString();
                
            case 'long':
                return dateObj.toLocaleString();
                
            case 'relative':
                const now = Date.now();
                const diff = now - dateObj.getTime();
                
                if (diff < 0) {
                    return 'in the future';
                }
                
                if (diff < 60000) {
                    return 'just now';
                }
                
                if (diff < 3600000) {
                    const minutes = Math.floor(diff / 60000);
                    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
                }
                
                if (diff < 86400000) {
                    const hours = Math.floor(diff / 3600000);
                    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
                }
                
                if (diff < 2592000000) {
                    const days = Math.floor(diff / 86400000);
                    return `${days} day${days !== 1 ? 's' : ''} ago`;
                }
                
                if (diff < 31536000000) {
                    const months = Math.floor(diff / 2592000000);
                    return `${months} month${months !== 1 ? 's' : ''} ago`;
                }
                
                const years = Math.floor(diff / 31536000000);
                return `${years} year${years !== 1 ? 's' : ''} ago`;
                
            default:
                return dateObj.toLocaleString();
        }
    }

    /**
     * Format a number with commas
     * @param {number} number - The number to format
     * @returns {string} - The formatted number
     */
    formatNumber(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Format bytes to a human-readable string
     * @param {number} bytes - The bytes to format
     * @param {number} [decimals=2] - The number of decimal places
     * @returns {string} - The formatted bytes
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Truncate a string to a specified length
     * @param {string} str - The string to truncate
     * @param {number} length - The maximum length
     * @param {string} [end='...'] - The string to append if truncated
     * @returns {string} - The truncated string
     */
    truncate(str, length, end = '...') {
        if (str.length <= length) return str;
        return str.slice(0, length - end.length) + end;
    }

    /**
     * Chunk an array into smaller arrays
     * @param {Array} array - The array to chunk
     * @param {number} size - The chunk size
     * @returns {Array} - The chunked array
     */
    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Paginate an array
     * @param {Array} array - The array to paginate
     * @param {number} page - The page number (1-based)
     * @param {number} pageSize - The page size
     * @returns {Object} - The paginated result
     */
    paginate(array, page, pageSize) {
        const totalItems = array.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const items = array.slice(startIndex, endIndex);
        
        return {
            items,
            pageInfo: {
                totalItems,
                totalPages,
                currentPage,
                pageSize,
                startIndex,
                endIndex,
                hasPreviousPage: currentPage > 1,
                hasNextPage: currentPage < totalPages
            }
        };
    }

    /**
     * Get a random element from an array
     * @param {Array} array - The array to get a random element from
     * @returns {*} - The random element
     */
    random(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Shuffle an array
     * @param {Array} array - The array to shuffle
     * @returns {Array} - The shuffled array
     */
    shuffle(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    /**
     * Wait for a specified amount of time
     * @param {number} ms - The time to wait in milliseconds
     * @returns {Promise<void>} - A promise that resolves after the specified time
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Find a channel by name or ID
     * @param {Guild} guild - The guild to search in
     * @param {string} nameOrId - The channel name or ID
     * @param {Object} [options] - Search options
     * @param {Array} [options.types] - The channel types to include
     * @returns {Channel|null} - The found channel or null
     */
    findChannel(guild, nameOrId, options = {}) {
        const { types } = options;
        
        // Check cache first
        const cacheKey = `${guild.id}:${nameOrId}`;
        if (this._caches.channels.has(cacheKey)) {
            return this._caches.channels.get(cacheKey);
        }
        
        // Try to find by ID first
        let channel = guild.channels.cache.get(nameOrId);
        
        // If not found by ID, try to find by name
        if (!channel) {
            channel = guild.channels.cache.find(c => {
                if (types && !types.includes(c.type)) {
                    return false;
                }
                return c.name.toLowerCase() === nameOrId.toLowerCase();
            });
        }
        
        // Cache the result
        if (channel) {
            this._caches.channels.set(cacheKey, channel);
        }
        
        return channel;
    }

    /**
     * Find a member by name, nickname, tag, or ID
     * @param {Guild} guild - The guild to search in
     * @param {string} query - The search query
     * @returns {Promise<GuildMember|null>} - The found member or null
     */
    async findMember(guild, query) {
        // Check cache first
        const cacheKey = `${guild.id}:${query}`;
        if (this._caches.members.has(cacheKey)) {
            return this._caches.members.get(cacheKey);
        }
        
        // Try to find by ID first
        let member = guild.members.cache.get(query);
        
        // If not found by ID, try to find by tag
        if (!member) {
            member = guild.members.cache.find(m => m.user.tag === query);
        }
        
        // If not found by tag, try to find by username
        if (!member) {
            member = guild.members.cache.find(m => 
                m.user.username.toLowerCase() === query.toLowerCase()
            );
        }
        
        // If not found by username, try to find by nickname
        if (!member) {
            member = guild.members.cache.find(m => 
                m.nickname && m.nickname.toLowerCase() === query.toLowerCase()
            );
        }
        
        // If not found in cache, try to fetch from API
        if (!member) {
            try {
                member = await guild.members.fetch(query);
            } catch (error) {
                // Try to search by username or nickname
                const members = await guild.members.fetch();
                member = members.find(m => 
                    m.user.username.toLowerCase().includes(query.toLowerCase()) ||
                    (m.nickname && m.nickname.toLowerCase().includes(query.toLowerCase()))
                );
            }
        }
        
        // Cache the result
        if (member) {
            this._caches.members.set(cacheKey, member);
        }
        
        return member;
    }

    /**
     * Parse a duration string to milliseconds
     * @param {string} durationStr - The duration string (e.g. '1d 2h 3m 4s')
     * @returns {number} - The duration in milliseconds
     */
    parseDuration(durationStr) {
        const regex = /(\d+)([dhms])/g;
        let ms = 0;
        let match;
        
        while ((match = regex.exec(durationStr)) !== null) {
            const [, amount, unit] = match;
            const value = parseInt(amount, 10);
            
            switch (unit) {
                case 'd':
                    ms += value * 86400000;
                    break;
                case 'h':
                    ms += value * 3600000;
                    break;
                case 'm':
                    ms += value * 60000;
                    break;
                case 's':
                    ms += value * 1000;
                    break;
            }
        }
        
        return ms;
    }

    /**
     * Generate a random string
     * @param {number} length - The length of the string
     * @param {string} [chars] - The characters to use
     * @returns {string} - The random string
     */
    randomString(length, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Clean cache entries older than a specified time
     * @param {number} [maxAge=3600000] - The maximum age in milliseconds
     * @returns {void}
     */
    cleanCaches(maxAge = 3600000) {
        const now = Date.now();
        
        for (const [cacheName, cache] of Object.entries(this._caches)) {
            for (const [key, entry] of cache.entries()) {
                if (entry.timestamp && now - entry.timestamp > maxAge) {
                    cache.delete(key);
                }
            }
        }
        
        this.logger.debug(this.name, 'Cleaned utility caches');
    }
}

module.exports = BaseUtilsModule; 