/**
 * JMF Hosting Discord Bot - Statistics Manager Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides tracking and analytics for bot usage,
 * including command usage, performance metrics, and user activity.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { Collection } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class StatisticsManager extends BaseModule {
    /**
     * Create a new statistics manager
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Statistics options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'statistics-manager',
            version: options.version || '1.0.0',
            description: 'Statistics manager for the bot',
            defaultConfig: {
                enabled: true,
                trackCommands: true,
                trackEvents: true,
                trackUsers: true,
                trackGuilds: true,
                trackPerformance: true,
                saveInterval: 300000, // 5 minutes
                dataPath: path.join(process.cwd(), 'data', 'statistics'),
                maxDataAge: 30, // Days to keep data
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Command statistics
        this.commandStats = {
            total: 0,
            success: 0,
            failed: 0,
            commands: new Collection()
        };
        
        // Event statistics
        this.eventStats = {
            total: 0,
            events: new Collection()
        };
        
        // User statistics
        this.userStats = new Collection();
        
        // Guild statistics
        this.guildStats = new Collection();
        
        // Performance metrics
        this.performanceMetrics = {
            uptime: 0,
            commandResponseTime: [],
            memoryUsage: [],
            cpuUsage: [],
            apiLatency: []
        };
        
        // Session start time
        this.sessionStart = Date.now();
        
        // Intervals
        this.saveInterval = null;
        this.performanceInterval = null;
    }

    /**
     * Initialize the statistics manager
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Create data directory if it doesn't exist
        const dataPath = this.getConfig('dataPath');
        try {
            await fs.access(dataPath);
        } catch (error) {
            await fs.mkdir(dataPath, { recursive: true });
            this.logger.debug(this.name, `Created statistics data directory: ${dataPath}`);
        }
        
        // Load statistics
        await this.loadStatistics();
        
        // Set up save interval
        const saveInterval = this.getConfig('saveInterval');
        if (saveInterval > 0) {
            this.saveInterval = setInterval(() => this.saveStatistics(), saveInterval);
        }
        
        // Set up performance tracking
        if (this.getConfig('trackPerformance')) {
            this.performanceInterval = setInterval(() => this.trackPerformance(), 60000); // Every minute
        }
        
        // Register event listeners
        this._registerEventListeners();
        
        this.logger.info(this.name, 'Statistics manager initialized');
    }

    /**
     * Load statistics from files
     * @returns {Promise<void>}
     */
    async loadStatistics() {
        if (!this.getConfig('enabled')) {
            return;
        }
        
        const dataPath = this.getConfig('dataPath');
        
        try {
            // Load command statistics
            try {
                const commandStatsPath = path.join(dataPath, 'commands.json');
                const commandStatsData = await fs.readFile(commandStatsPath, 'utf8');
                const commandStats = JSON.parse(commandStatsData);
                
                this.commandStats.total = commandStats.total || 0;
                this.commandStats.success = commandStats.success || 0;
                this.commandStats.failed = commandStats.failed || 0;
                
                if (commandStats.commands) {
                    for (const [commandName, stats] of Object.entries(commandStats.commands)) {
                        this.commandStats.commands.set(commandName, stats);
                    }
                }
                
                this.logger.debug(this.name, 'Loaded command statistics');
            } catch (error) {
                this.logger.debug(this.name, 'No command statistics found, starting fresh');
            }
            
            // Load event statistics
            try {
                const eventStatsPath = path.join(dataPath, 'events.json');
                const eventStatsData = await fs.readFile(eventStatsPath, 'utf8');
                const eventStats = JSON.parse(eventStatsData);
                
                this.eventStats.total = eventStats.total || 0;
                
                if (eventStats.events) {
                    for (const [eventName, count] of Object.entries(eventStats.events)) {
                        this.eventStats.events.set(eventName, count);
                    }
                }
                
                this.logger.debug(this.name, 'Loaded event statistics');
            } catch (error) {
                this.logger.debug(this.name, 'No event statistics found, starting fresh');
            }
            
            // Load user statistics
            if (this.getConfig('trackUsers')) {
                try {
                    const userStatsPath = path.join(dataPath, 'users.json');
                    const userStatsData = await fs.readFile(userStatsPath, 'utf8');
                    const userStats = JSON.parse(userStatsData);
                    
                    for (const [userId, stats] of Object.entries(userStats)) {
                        this.userStats.set(userId, stats);
                    }
                    
                    this.logger.debug(this.name, 'Loaded user statistics');
                } catch (error) {
                    this.logger.debug(this.name, 'No user statistics found, starting fresh');
                }
            }
            
            // Load guild statistics
            if (this.getConfig('trackGuilds')) {
                try {
                    const guildStatsPath = path.join(dataPath, 'guilds.json');
                    const guildStatsData = await fs.readFile(guildStatsPath, 'utf8');
                    const guildStats = JSON.parse(guildStatsData);
                    
                    for (const [guildId, stats] of Object.entries(guildStats)) {
                        this.guildStats.set(guildId, stats);
                    }
                    
                    this.logger.debug(this.name, 'Loaded guild statistics');
                } catch (error) {
                    this.logger.debug(this.name, 'No guild statistics found, starting fresh');
                }
            }
            
            this.logger.info(this.name, 'Loaded statistics');
        } catch (error) {
            this.logger.error(this.name, `Failed to load statistics: ${error.message}`);
        }
    }

    /**
     * Save statistics to files
     * @returns {Promise<void>}
     */
    async saveStatistics() {
        if (!this.getConfig('enabled')) {
            return;
        }
        
        const dataPath = this.getConfig('dataPath');
        
        try {
            // Save command statistics
            const commandStatsPath = path.join(dataPath, 'commands.json');
            const commandStats = {
                total: this.commandStats.total,
                success: this.commandStats.success,
                failed: this.commandStats.failed,
                commands: Object.fromEntries(this.commandStats.commands)
            };
            
            await fs.writeFile(commandStatsPath, JSON.stringify(commandStats, null, 2), 'utf8');
            
            // Save event statistics
            const eventStatsPath = path.join(dataPath, 'events.json');
            const eventStats = {
                total: this.eventStats.total,
                events: Object.fromEntries(this.eventStats.events)
            };
            
            await fs.writeFile(eventStatsPath, JSON.stringify(eventStats, null, 2), 'utf8');
            
            // Save user statistics
            if (this.getConfig('trackUsers')) {
                const userStatsPath = path.join(dataPath, 'users.json');
                const userStats = Object.fromEntries(this.userStats);
                
                await fs.writeFile(userStatsPath, JSON.stringify(userStats, null, 2), 'utf8');
            }
            
            // Save guild statistics
            if (this.getConfig('trackGuilds')) {
                const guildStatsPath = path.join(dataPath, 'guilds.json');
                const guildStats = Object.fromEntries(this.guildStats);
                
                await fs.writeFile(guildStatsPath, JSON.stringify(guildStats, null, 2), 'utf8');
            }
            
            // Save performance metrics
            if (this.getConfig('trackPerformance')) {
                const performancePath = path.join(dataPath, 'performance.json');
                await fs.writeFile(performancePath, JSON.stringify(this.performanceMetrics, null, 2), 'utf8');
            }
            
            this.logger.debug(this.name, 'Saved statistics');
        } catch (error) {
            this.logger.error(this.name, `Failed to save statistics: ${error.message}`);
        }
    }

    /**
     * Track command usage
     * @param {Object} interaction - The interaction object
     * @param {Object} command - The command object
     * @param {boolean} success - Whether the command was successful
     * @param {number} responseTime - The command response time in milliseconds
     */
    trackCommand(interaction, command, success, responseTime) {
        if (!this.getConfig('enabled') || !this.getConfig('trackCommands')) {
            return;
        }
        
        const { user, guildId, channelId } = interaction;
        const commandName = command.name;
        
        // Update command statistics
        this.commandStats.total++;
        if (success) {
            this.commandStats.success++;
        } else {
            this.commandStats.failed++;
        }
        
        // Update command-specific statistics
        let commandStats = this.commandStats.commands.get(commandName);
        if (!commandStats) {
            commandStats = {
                name: commandName,
                uses: 0,
                success: 0,
                failed: 0,
                avgResponseTime: 0,
                lastUsed: Date.now()
            };
            this.commandStats.commands.set(commandName, commandStats);
        }
        
        commandStats.uses++;
        if (success) {
            commandStats.success++;
        } else {
            commandStats.failed++;
        }
        
        // Update average response time
        if (responseTime) {
            const totalTime = commandStats.avgResponseTime * (commandStats.uses - 1) + responseTime;
            commandStats.avgResponseTime = totalTime / commandStats.uses;
            
            // Add to performance metrics
            if (this.getConfig('trackPerformance')) {
                this.performanceMetrics.commandResponseTime.push({
                    command: commandName,
                    time: responseTime,
                    timestamp: Date.now()
                });
                
                // Limit the size of the array
                if (this.performanceMetrics.commandResponseTime.length > 100) {
                    this.performanceMetrics.commandResponseTime.shift();
                }
            }
        }
        
        commandStats.lastUsed = Date.now();
        
        // Update user statistics
        if (this.getConfig('trackUsers')) {
            let userStats = this.userStats.get(user.id);
            if (!userStats) {
                userStats = {
                    id: user.id,
                    username: user.username,
                    commands: 0,
                    lastSeen: Date.now(),
                    firstSeen: Date.now(),
                    commandsUsed: {}
                };
                this.userStats.set(user.id, userStats);
            }
            
            userStats.commands++;
            userStats.lastSeen = Date.now();
            
            if (!userStats.commandsUsed[commandName]) {
                userStats.commandsUsed[commandName] = 0;
            }
            userStats.commandsUsed[commandName]++;
        }
        
        // Update guild statistics
        if (this.getConfig('trackGuilds') && guildId) {
            let guildStats = this.guildStats.get(guildId);
            if (!guildStats) {
                guildStats = {
                    id: guildId,
                    commands: 0,
                    lastActivity: Date.now(),
                    channels: {},
                    commandsUsed: {}
                };
                this.guildStats.set(guildId, guildStats);
            }
            
            guildStats.commands++;
            guildStats.lastActivity = Date.now();
            
            if (!guildStats.commandsUsed[commandName]) {
                guildStats.commandsUsed[commandName] = 0;
            }
            guildStats.commandsUsed[commandName]++;
            
            if (!guildStats.channels[channelId]) {
                guildStats.channels[channelId] = 0;
            }
            guildStats.channels[channelId]++;
        }
    }

    /**
     * Track event occurrence
     * @param {string} eventName - The event name
     */
    trackEvent(eventName) {
        if (!this.getConfig('enabled') || !this.getConfig('trackEvents')) {
            return;
        }
        
        this.eventStats.total++;
        
        let eventCount = this.eventStats.events.get(eventName) || 0;
        eventCount++;
        this.eventStats.events.set(eventName, eventCount);
    }

    /**
     * Track user activity
     * @param {Object} user - The user object
     * @param {string} activityType - The activity type
     */
    trackUserActivity(user, activityType) {
        if (!this.getConfig('enabled') || !this.getConfig('trackUsers')) {
            return;
        }
        
        let userStats = this.userStats.get(user.id);
        if (!userStats) {
            userStats = {
                id: user.id,
                username: user.username,
                commands: 0,
                lastSeen: Date.now(),
                firstSeen: Date.now(),
                commandsUsed: {},
                activities: {}
            };
            this.userStats.set(user.id, userStats);
        }
        
        userStats.lastSeen = Date.now();
        
        if (!userStats.activities) {
            userStats.activities = {};
        }
        
        if (!userStats.activities[activityType]) {
            userStats.activities[activityType] = 0;
        }
        
        userStats.activities[activityType]++;
    }

    /**
     * Track guild activity
     * @param {string} guildId - The guild ID
     * @param {string} activityType - The activity type
     */
    trackGuildActivity(guildId, activityType) {
        if (!this.getConfig('enabled') || !this.getConfig('trackGuilds')) {
            return;
        }
        
        let guildStats = this.guildStats.get(guildId);
        if (!guildStats) {
            guildStats = {
                id: guildId,
                commands: 0,
                lastActivity: Date.now(),
                channels: {},
                commandsUsed: {},
                activities: {}
            };
            this.guildStats.set(guildId, guildStats);
        }
        
        guildStats.lastActivity = Date.now();
        
        if (!guildStats.activities) {
            guildStats.activities = {};
        }
        
        if (!guildStats.activities[activityType]) {
            guildStats.activities[activityType] = 0;
        }
        
        guildStats.activities[activityType]++;
    }

    /**
     * Track performance metrics
     */
    trackPerformance() {
        if (!this.getConfig('enabled') || !this.getConfig('trackPerformance')) {
            return;
        }
        
        const now = Date.now();
        
        // Update uptime
        this.performanceMetrics.uptime = now - this.sessionStart;
        
        // Track memory usage
        const memoryUsage = process.memoryUsage();
        this.performanceMetrics.memoryUsage.push({
            rss: memoryUsage.rss / 1024 / 1024, // MB
            heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
            heapUsed: memoryUsage.heapUsed / 1024 / 1024, // MB
            external: memoryUsage.external / 1024 / 1024, // MB
            timestamp: now
        });
        
        // Limit the size of the array
        if (this.performanceMetrics.memoryUsage.length > 1440) { // 24 hours of data at 1 minute intervals
            this.performanceMetrics.memoryUsage.shift();
        }
        
        // Track CPU usage
        const cpuUsage = process.cpuUsage();
        this.performanceMetrics.cpuUsage.push({
            user: cpuUsage.user / 1000000, // seconds
            system: cpuUsage.system / 1000000, // seconds
            timestamp: now
        });
        
        // Limit the size of the array
        if (this.performanceMetrics.cpuUsage.length > 1440) { // 24 hours of data at 1 minute intervals
            this.performanceMetrics.cpuUsage.shift();
        }
        
        // Track API latency
        if (this.manager.client && this.manager.client.ws) {
            this.performanceMetrics.apiLatency.push({
                ping: this.manager.client.ws.ping,
                timestamp: now
            });
            
            // Limit the size of the array
            if (this.performanceMetrics.apiLatency.length > 1440) { // 24 hours of data at 1 minute intervals
                this.performanceMetrics.apiLatency.shift();
            }
        }
    }

    /**
     * Get command statistics
     * @param {string} [commandName] - The command name to get statistics for
     * @returns {Object} - The command statistics
     */
    getCommandStats(commandName) {
        if (commandName) {
            return this.commandStats.commands.get(commandName) || null;
        }
        
        return {
            total: this.commandStats.total,
            success: this.commandStats.success,
            failed: this.commandStats.failed,
            successRate: this.commandStats.total > 0 ? (this.commandStats.success / this.commandStats.total) * 100 : 0,
            commands: Array.from(this.commandStats.commands.values())
        };
    }

    /**
     * Get event statistics
     * @param {string} [eventName] - The event name to get statistics for
     * @returns {Object} - The event statistics
     */
    getEventStats(eventName) {
        if (eventName) {
            return this.eventStats.events.get(eventName) || 0;
        }
        
        return {
            total: this.eventStats.total,
            events: Array.from(this.eventStats.events.entries()).map(([name, count]) => ({
                name,
                count
            }))
        };
    }

    /**
     * Get user statistics
     * @param {string} [userId] - The user ID to get statistics for
     * @returns {Object} - The user statistics
     */
    getUserStats(userId) {
        if (userId) {
            return this.userStats.get(userId) || null;
        }
        
        return {
            total: this.userStats.size,
            users: Array.from(this.userStats.values())
        };
    }

    /**
     * Get guild statistics
     * @param {string} [guildId] - The guild ID to get statistics for
     * @returns {Object} - The guild statistics
     */
    getGuildStats(guildId) {
        if (guildId) {
            return this.guildStats.get(guildId) || null;
        }
        
        return {
            total: this.guildStats.size,
            guilds: Array.from(this.guildStats.values())
        };
    }

    /**
     * Get performance metrics
     * @returns {Object} - The performance metrics
     */
    getPerformanceMetrics() {
        return {
            uptime: this.performanceMetrics.uptime,
            uptimeFormatted: this._formatUptime(this.performanceMetrics.uptime),
            memoryUsage: this.performanceMetrics.memoryUsage.length > 0 ? this.performanceMetrics.memoryUsage[this.performanceMetrics.memoryUsage.length - 1] : null,
            cpuUsage: this.performanceMetrics.cpuUsage.length > 0 ? this.performanceMetrics.cpuUsage[this.performanceMetrics.cpuUsage.length - 1] : null,
            apiLatency: this.performanceMetrics.apiLatency.length > 0 ? this.performanceMetrics.apiLatency[this.performanceMetrics.apiLatency.length - 1] : null,
            commandResponseTime: this._calculateAverageResponseTime(),
            systemInfo: {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                cpus: os.cpus().length,
                totalMemory: os.totalmem() / 1024 / 1024 / 1024, // GB
                freeMemory: os.freemem() / 1024 / 1024 / 1024 // GB
            }
        };
    }

    /**
     * Get most used commands
     * @param {number} [limit=10] - The maximum number of commands to return
     * @returns {Array} - The most used commands
     */
    getMostUsedCommands(limit = 10) {
        return Array.from(this.commandStats.commands.values())
            .sort((a, b) => b.uses - a.uses)
            .slice(0, limit);
    }

    /**
     * Get most active users
     * @param {number} [limit=10] - The maximum number of users to return
     * @returns {Array} - The most active users
     */
    getMostActiveUsers(limit = 10) {
        return Array.from(this.userStats.values())
            .sort((a, b) => b.commands - a.commands)
            .slice(0, limit);
    }

    /**
     * Get most active guilds
     * @param {number} [limit=10] - The maximum number of guilds to return
     * @returns {Array} - The most active guilds
     */
    getMostActiveGuilds(limit = 10) {
        return Array.from(this.guildStats.values())
            .sort((a, b) => b.commands - a.commands)
            .slice(0, limit);
    }

    /**
     * Reset statistics
     * @param {string} [type] - The type of statistics to reset ('commands', 'events', 'users', 'guilds', 'performance')
     */
    resetStatistics(type) {
        switch (type) {
            case 'commands':
                this.commandStats.total = 0;
                this.commandStats.success = 0;
                this.commandStats.failed = 0;
                this.commandStats.commands.clear();
                break;
            
            case 'events':
                this.eventStats.total = 0;
                this.eventStats.events.clear();
                break;
            
            case 'users':
                this.userStats.clear();
                break;
            
            case 'guilds':
                this.guildStats.clear();
                break;
            
            case 'performance':
                this.performanceMetrics.uptime = 0;
                this.performanceMetrics.commandResponseTime = [];
                this.performanceMetrics.memoryUsage = [];
                this.performanceMetrics.cpuUsage = [];
                this.performanceMetrics.apiLatency = [];
                break;
            
            default:
                // Reset all
                this.commandStats.total = 0;
                this.commandStats.success = 0;
                this.commandStats.failed = 0;
                this.commandStats.commands.clear();
                
                this.eventStats.total = 0;
                this.eventStats.events.clear();
                
                this.userStats.clear();
                this.guildStats.clear();
                
                this.performanceMetrics.uptime = 0;
                this.performanceMetrics.commandResponseTime = [];
                this.performanceMetrics.memoryUsage = [];
                this.performanceMetrics.cpuUsage = [];
                this.performanceMetrics.apiLatency = [];
                
                this.sessionStart = Date.now();
                break;
        }
        
        this.logger.info(this.name, `Reset statistics${type ? ` (${type})` : ''}`);
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
        
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = null;
        }
        
        // Save statistics before cleanup
        this.saveStatistics().catch(() => {});
        
        this.logger.info(this.name, 'Statistics manager cleaned up');
    }

    /**
     * Register event listeners
     * @private
     */
    _registerEventListeners() {
        // Listen for command execution
        this.manager.on('commandExecuted', (interaction, command, success, responseTime) => {
            this.trackCommand(interaction, command, success, responseTime);
        });
        
        // Listen for events
        this.manager.on('eventTriggered', (eventName) => {
            this.trackEvent(eventName);
        });
        
        // Listen for user activity
        this.manager.on('userActivity', (user, activityType) => {
            this.trackUserActivity(user, activityType);
        });
        
        // Listen for guild activity
        this.manager.on('guildActivity', (guildId, activityType) => {
            this.trackGuildActivity(guildId, activityType);
        });
    }

    /**
     * Calculate average command response time
     * @returns {number} - The average response time in milliseconds
     * @private
     */
    _calculateAverageResponseTime() {
        if (this.performanceMetrics.commandResponseTime.length === 0) {
            return 0;
        }
        
        const total = this.performanceMetrics.commandResponseTime.reduce((sum, entry) => sum + entry.time, 0);
        return total / this.performanceMetrics.commandResponseTime.length;
    }

    /**
     * Format uptime
     * @param {number} uptime - The uptime in milliseconds
     * @returns {string} - The formatted uptime
     * @private
     */
    _formatUptime(uptime) {
        const seconds = Math.floor(uptime / 1000) % 60;
        const minutes = Math.floor(uptime / (1000 * 60)) % 60;
        const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        
        const parts = [];
        
        if (days > 0) {
            parts.push(`${days} day${days === 1 ? '' : 's'}`);
        }
        
        if (hours > 0) {
            parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
        }
        
        if (minutes > 0) {
            parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
        }
        
        if (seconds > 0 || parts.length === 0) {
            parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
        }
        
        return parts.join(', ');
    }
}

module.exports = StatisticsManager; 