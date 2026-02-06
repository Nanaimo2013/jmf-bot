/**
 * JMF Hosting Discord Bot - Console Formatter Module
 * Version: 1.2.0
 * Last Updated: 03/13/2025
 * 
 * This module provides console formatting for the logger manager.
 * It formats log messages for console output with colors, icons, and sections.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const winston = require('winston');
const chalk = require('chalk');
const util = require('util');

class ConsoleFormatter extends BaseModule {
    /**
     * Create a new console formatter module
     * @param {Object} manager - The parent manager instance
     * @param {Object} [options] - Module options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: 'console',
            version: '1.2.0',
            defaultConfig: {
                showTimestamp: true,
                timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
                showLevel: true,
                showCategory: true,
                showMeta: false,
                showIcons: true,
                colors: true,
                indentMultiline: true,
                groupByCategory: true,
                sectionHeaders: true,
                deduplicate: true,
                deduplicationWindow: 1000
            },
            ...options
        });

        // Set up colors
        this.colors = {
            error: chalk.red,
            warn: chalk.yellow,
            info: chalk.cyan,
            debug: chalk.green,
            trace: chalk.magenta,
            success: chalk.green,
            fatal: chalk.red.bold,
            category: chalk.blue.bold,
            timestamp: chalk.gray,
            meta: chalk.gray,
            section: {
                startup: chalk.cyan.bold,
                managers: chalk.green.bold,
                modules: chalk.yellow.bold,
                database: chalk.blue.bold,
                bot: chalk.magenta.bold,
                shutdown: chalk.red.bold
            }
        };

        // Set up symbols
        this.symbols = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            debug: '🔍',
            trace: '🔎',
            success: '✅',
            fatal: '💀',
            performance: '⚡',
            security: '🔒',
            network: '🌐',
            database: '💾',
            cache: '📦',
            config: '⚙️',
            system: '🖥️',
            test: '🧪',
            dev: '👨‍💻'
        };

        // Track recent messages for deduplication
        this.recentMessages = new Map();
        this.currentSection = null;
        this.categoryGroups = new Map();
    }

    /**
     * Initialize the console formatter module
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        this.manager.info('console', 'Initializing module...');
        this.manager.info('console', 'Γ£ô Module initialized successfully');
    }

    /**
     * Create a console transport for a specific category
     * @param {string} category - Logger category
     * @returns {Object} Winston transport
     */
    createTransport(category) {
        return new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({
                    format: this.getConfig('timestampFormat')
                }),
                winston.format.colorize(),
                winston.format.printf((info) => this.formatMessage(info, category))
            )
        });
    }

    /**
     * Format a log message for console output
     * @param {Object} info - Log information
     * @param {string} category - Logger category
     * @returns {string} Formatted message
     */
    formatMessage(info, category) {
        const {
            timestamp,
            level,
            message,
            section,
            ...meta
        } = info;

        // Check for section change
        if (section && this.getConfig('sectionHeaders') && section !== this.currentSection) {
            this.currentSection = section;
            const sectionConfig = this.manager.getConfig(`sections.${section}`) || {};
            const sectionTitle = sectionConfig.title || `=== ${section.toUpperCase()} ===`;
            const sectionColor = sectionConfig.color || 'cyan';
            
            // Return section header
            return `\n${this.colors.section[sectionColor] ? 
                this.colors.section[sectionColor](sectionTitle) : 
                chalk[sectionColor](sectionTitle)}`;
        }

        // Check for duplicate message if deduplication is enabled
        if (this.getConfig('deduplicate')) {
            const msgKey = `${category}:${level}:${message}`;
            const now = Date.now();
            const lastSeen = this.recentMessages.get(msgKey);
            
            if (lastSeen && (now - lastSeen) < this.getConfig('deduplicationWindow')) {
                // Skip duplicate message
                this.recentMessages.set(msgKey, now);
                return null;
            }
            
            this.recentMessages.set(msgKey, now);
        }

        // Build the log parts
        const parts = [];

        // Timestamp
        if (this.getConfig('showTimestamp')) {
            parts.push(this.formatTimestamp(timestamp));
        }

        // Icon and Level
        const levelIcons = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            debug: '🔍',
            success: '✅',
            trace: '🔎',
            fatal: '💀',
            performance: '⚡',
            security: '🔒',
            network: '🌐',
            database: '💾',
            cache: '📦',
            config: '⚙️',
            system: '🖥️',
            test: '🧪',
            dev: '👨‍💻'
        };
        
        const levelIcon = info.icon || levelIcons[level] || '📝';
        parts.push(`${levelIcon} ${this.formatLevel(level, levelIcon)}`);

        // Category
        parts.push(this.formatCategory(category || meta.category || 'default'));

        // Message
        parts.push(this.formatMessageContent(message, level));

        // Meta information
        if (this.getConfig('showMeta') && Object.keys(meta).length > 0) {
            const filteredMeta = { ...meta };
            delete filteredMeta.icon;
            delete filteredMeta.category;
            delete filteredMeta.section;
            
            if (Object.keys(filteredMeta).length > 0) {
                parts.push(this.formatMeta(filteredMeta));
            }
        }

        return parts.join(' ');
    }

    /**
     * Format a timestamp
     * @param {string} timestamp - Timestamp string
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        return this.colors.timestamp(`[${timestamp}]`);
    }

    /**
     * Format a log level with icon
     * @param {string} level - Log level
     * @param {string} icon - Level icon
     * @returns {string} Formatted level
     */
    formatLevel(level, icon) {
        const color = this.colors[level] || this.colors.info;
        const displayIcon = this.getConfig('showIcons') ? (icon || this.symbols[level] || '') : '';
        return color.bold(`[${level.toUpperCase()}]`);
    }

    /**
     * Format a category
     * @param {string} category - Logger category
     * @returns {string} Formatted category
     */
    formatCategory(category) {
        return this.colors.category(`[${category}]`);
    }

    /**
     * Format message content
     * @param {string} message - Message content
     * @param {string} level - Log level
     * @returns {string} Formatted message
     */
    formatMessageContent(message, level) {
        // Handle different message types
        if (message === null || message === undefined) {
            return String(message);
        }
        
        if (typeof message === 'object') {
            try {
                // Try to use JSON.stringify first for cleaner output
                return JSON.stringify(message, null, 2);
            } catch (err) {
                // Fall back to util.inspect if JSON.stringify fails
                return util.inspect(message, { colors: true, depth: 3 });
            }
        }
        
        if (typeof message !== 'string') {
            return String(message);
        }
        
        // Format based on level
        switch (level) {
            case 'error':
                return this.formatError(message);
            case 'warn':
                return this.formatWarning(message);
            case 'info':
                return this.formatInfo(message);
            case 'debug':
                return this.formatDebug(message);
            case 'trace':
                return this.formatTrace(message);
            default:
                return message;
        }
    }

    /**
     * Format metadata
     * @param {Object} meta - Metadata object
     * @returns {string} Formatted metadata
     */
    formatMeta(meta) {
        return this.colors.meta(util.inspect(meta, { colors: true, depth: 2 }));
    }

    /**
     * Format an error message
     * @param {string} message - Message content
     * @returns {string} Formatted error message
     */
    formatError(message) {
        return `${this.symbols.error} ${this.colors.error(message)}`;
    }

    /**
     * Format a warning message
     * @param {string} message - Message content
     * @returns {string} Formatted warning message
     */
    formatWarning(message) {
        return `${this.symbols.warn} ${this.colors.warn(message)}`;
    }

    /**
     * Format an info message
     * @param {string} message - Message content
     * @returns {string} Formatted info message
     */
    formatInfo(message) {
        return `${this.symbols.info} ${this.colors.info(message)}`;
    }

    /**
     * Format a debug message
     * @param {string} message - Message content
     * @returns {string} Formatted debug message
     */
    formatDebug(message) {
        return `${this.symbols.debug} ${this.colors.debug(message)}`;
    }

    /**
     * Format a trace message
     * @param {string} message - Message content
     * @returns {string} Formatted trace message
     */
    formatTrace(message) {
        return `${this.symbols.trace} ${this.colors.trace(message)}`;
    }

    /**
     * Format a fatal message
     * @param {string} message - Message content
     * @returns {string} Formatted fatal message
     */
    formatFatal(message) {
        return `${this.symbols.fatal} ${this.colors.error(message)}`;
    }

    /**
     * Format a success message
     * @param {string} message - Message content
     * @returns {string} Formatted success message
     */
    formatSuccess(message) {
        return `${this.symbols.success} ${this.colors.success(message)}`;
    }

    /**
     * Format a performance message
     * @param {string} message - Message content
     * @param {number} duration - Operation duration
     * @returns {string} Formatted performance message
     */
    formatPerformance(message, duration) {
        return `${this.symbols.performance} ${this.colors.info(message)} (${duration}ms)`;
    }

    /**
     * Format a security message
     * @param {string} message - Message content
     * @returns {string} Formatted security message
     */
    formatSecurity(message) {
        return `${this.symbols.security} ${this.colors.info(message)}`;
    }
}

module.exports = ConsoleFormatter; 