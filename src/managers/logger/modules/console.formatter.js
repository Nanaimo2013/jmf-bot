/**
 * JMF Hosting Discord Bot - Console Formatter Module
 * Version: 1.1.0
 * Last Updated: 03/12/2025
 * 
 * This module handles formatting log messages for console output,
 * providing colorized and structured log messages with icons and
 * timestamps.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const chalk = require('chalk');
const winston = require('winston');
const figures = require('figures');

class ConsoleFormatter extends BaseModule {
    /**
     * Create a new console formatter module
     * @param {Object} manager - The parent manager instance
     * @param {Object} [options] - Module options
     */
    constructor(manager, options = {}) {
        super(manager, 'console', {
            version: '1.1.0',
            defaultConfig: {
                colorize: true,
                showTimestamp: true,
                showIcons: true,
                showMeta: true,
                timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
                colors: {
                    error: 'red',
                    warn: 'yellow',
                    info: 'green',
                    debug: 'blue',
                    trace: 'magenta',
                    timestamp: 'gray',
                    category: 'cyan',
                    meta: 'gray'
                }
            },
            ...options
        });

        this.name = 'console';
        this.type = 'formatter';

        // Extended color scheme
        this.colors = {
            error: chalk.red,
            warn: chalk.yellow,
            info: chalk.green,
            debug: chalk.blue,
            trace: chalk.magenta,
            success: chalk.green,
            timestamp: chalk.gray,
            category: chalk.cyan,
            meta: chalk.gray,
            separator: chalk.gray,
            label: chalk.white
        };

        // Extended symbols
        this.symbols = {
            error: figures.cross,
            warn: figures.warning,
            info: figures.info,
            debug: figures.bullet,
            trace: figures.magnifyingGlass,
            success: figures.tick,
            arrow: figures.arrowRight,
            pointer: figures.pointer,
            line: figures.line,
            ellipsis: figures.ellipsis,
            fatal: '☠️'
        };
    }

    /**
     * Initialize the console formatter module
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        this.manager.info('logger', 'Console formatter module initialized');
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
            ...meta
        } = info;

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
            
            if (Object.keys(filteredMeta).length > 0) {
                parts.push(this.formatMeta(filteredMeta));
            }
        }

        return parts.join(' ');
    }

    /**
     * Format a timestamp
     * @param {string} timestamp - Timestamp
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toISOString().replace('T', ' ').split('.')[0];
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
     * Format a message content
     * @param {string} message - Message content
     * @param {string} level - Log level
     * @returns {string} Formatted message
     */
    formatMessageContent(message, level) {
        const color = this.colors[level] || this.colors.info;
        
        // Handle multi-line messages
        if (message.includes('\n')) {
            const lines = message.split('\n');
            const firstLine = color(lines[0]);
            const restLines = lines
                .slice(1)
                .map(line => `${' '.repeat(20)}${this.symbols.line} ${color(line)}`)
                .join('\n');
            return `${firstLine}\n${restLines}`;
        }
        
        return color(message);
    }

    /**
     * Format metadata
     * @param {Object} meta - Metadata
     * @returns {string} Formatted metadata
     */
    formatMeta(meta) {
        const formatValue = (value) => {
            if (typeof value === 'object' && value !== null) {
                if (value instanceof Error) {
                    return value.stack || value.message;
                }
                return JSON.stringify(value, null, 2);
            }
            return value;
        };

        const metaStrings = Object.entries(meta).map(([key, value]) => {
            const formattedValue = formatValue(value);
            return `${this.colors.label(key)}=${this.colors.meta(formattedValue)}`;
        });

        return this.colors.meta(`(${metaStrings.join(', ')})`);
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
     * Format a list of items
     * @param {Array} items - List items
     * @param {Object} options - Formatting options
     * @returns {string} Formatted list
     */
    formatList(items, options = {}) {
        const { 
            bullet = '•', 
            indent = 2, 
            color = null 
        } = options;
        
        const colorFn = color ? this.colors[color] || (s => s) : (s => s);
        const indentStr = ' '.repeat(indent);
        
        return items
            .map(item => `${indentStr}${bullet} ${colorFn(item)}`)
            .join('\n');
    }

    /**
     * Format a section with title and content
     * @param {string} title - Section title
     * @param {string} content - Section content
     * @param {Object} options - Formatting options
     * @returns {string} Formatted section
     */
    formatSection(title, content, options = {}) {
        const { 
            titleColor = 'info', 
            contentIndent = 2 
        } = options;
        
        const colorFn = this.colors[titleColor] || this.colors.info;
        const indentStr = ' '.repeat(contentIndent);
        const contentLines = content.split('\n').map(line => `${indentStr}${line}`).join('\n');
        
        return `${colorFn(`=== ${title} ===`)}\n${contentLines}`;
    }

    /**
     * Format a progress bar
     * @param {number} current - Current value
     * @param {number} total - Total value
     * @param {Object} options - Formatting options
     * @returns {string} Formatted progress bar
     */
    formatProgressBar(current, total, options = {}) {
        const { 
            width = 20, 
            completeChar = '█', 
            incompleteChar = '░',
            color = 'info'
        } = options;
        
        const percentage = Math.min(100, Math.floor((current / total) * 100));
        const filledWidth = Math.floor((width * current) / total);
        const emptyWidth = width - filledWidth;
        
        const bar = completeChar.repeat(filledWidth) + incompleteChar.repeat(emptyWidth);
        const colorFn = this.colors[color] || this.colors.info;
        
        return `${colorFn(bar)} ${percentage}% (${current}/${total})`;
    }

    /**
     * Get the status of the console formatter module
     * @returns {Promise<Object>} Status information
     */
    async getStatus() {
        const status = await super.getStatus();
        return {
            ...status,
            colorize: this.getConfig('colorize'),
            showTimestamp: this.getConfig('showTimestamp'),
            showIcons: this.getConfig('showIcons')
        };
    }
}

module.exports = ConsoleFormatter; 