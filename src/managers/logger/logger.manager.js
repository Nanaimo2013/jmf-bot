/**
 * JMF Hosting Discord Bot - Logger Manager
 * Version: 1.1.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles all logging operations for the bot, including
 * console output, file logging, and log rotation. It provides a
 * comprehensive logging system with different log levels and categories.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base/base.manager');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

class LoggerManager extends BaseManager {
    /**
     * Create a new logger manager
     * @param {Object} [options] - Manager options
     */
    constructor(options = {}) {
        super('logger', {
            version: '1.1.0',
            defaultConfig: {
                level: 'info',
                enableConsole: true,
                enableFile: true,
                directory: path.join(process.cwd(), 'logs'),
                maxSize: '10m',
                maxFiles: 10,
                format: 'json',
                categories: {
                    system: { level: 'info' },
                    database: { level: 'info' },
                    bot: { level: 'info' },
                    api: { level: 'info' },
                    commands: { level: 'info' },
                    events: { level: 'info' },
                    monitor: { level: 'info' }
                },
                rotation: {
                    enabled: true,
                    interval: '1d',
                    maxAge: '30d'
                }
            },
            ...options
        });

        // Winston loggers
        this.loggers = new Map();
        
        // Basic console logger for initialization
        this._basicLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp }) => {
                    return `${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console()
            ]
        });
        
        // Create basic logging methods
        ['error', 'warn', 'info', 'debug', 'success'].forEach(level => {
            this[level] = (category, message, ...meta) => {
                const formattedMessage = this._formatMessage(message);
                if (level === 'success') {
                    this._basicLogger.info(`[${category}] ✓ ${formattedMessage}`, ...meta);
                } else {
                    this._basicLogger[level](`[${category}] ${formattedMessage}`, ...meta);
                }
            };
        });
        
        // Timers for performance logging
        this.timers = new Map();

        // Set default properties
        this.sections = {};
        this.currentSection = null;
    }

    /**
     * Initialize the logger manager
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        try {
            // We need to set up a basic console logger first for initialization messages
            this._setupBasicLogger();
            
            // Merge the provided config with our default config
            this._config = {
                ...this._config,
                ...config
            };
            
            // Create log directory
            await this._setupLogDirectory();
            
            // Load modules before creating loggers
            await this._loadModules();
            
            // Create loggers after modules are loaded
            await this._createLoggers();
            
            // Set up sections
            this._setupSections();
            
            // Mark as initialized
            this._initialized = true;
            
            this.info('logger', 'Logger manager initialized successfully');
        } catch (error) {
            console.error(`Logger initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Set up a basic console logger for initialization
     * @private
     */
    _setupBasicLogger() {
        const basicLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} [${level.toUpperCase()}] ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console()
            ]
        });

        // Create basic logging methods
        ['error', 'warn', 'info', 'debug', 'success'].forEach(level => {
            if (!this[level]) {
                this[level] = (category, message, ...meta) => {
                    if (level === 'success') {
                        basicLogger.info(`[${category}] ✓ ${message}`, ...meta);
                    } else {
                        basicLogger.log(level, `[${category}] ${message}`, ...meta);
                    }
                };
            }
        });
    }

    /**
     * Load logger modules
     * @returns {Promise<void>}
     * @private
     */
    async _loadModules() {
        try {
            // Load console formatter
            await this.loadModule('console', path.join(__dirname, 'modules/console.formatter.js'));
            
            // Load file logger if enabled
            if (this.getConfig('enableFile') !== false) {
                await this.loadModule('file', path.join(__dirname, 'modules/file.logger.js'), {
                    directory: this.getConfig('directory'),
                    archiveDirectory: path.join(this.getConfig('directory'), 'archives'),
                    categories: Object.keys(this.getConfig('categories') || {})
                });
                this.info('logger', 'File logger module loaded');
            }
        } catch (error) {
            this.error('logger', `Failed to load logger modules: ${error.message}`, error);
        }
    }

    /**
     * Set up the log directory
     * @returns {Promise<void>}
     * @private
     */
    async _setupLogDirectory() {
        return this.executeOperation('setupLogDirectory', async () => {
            try {
                const directory = this.getConfig('directory');
                await fs.mkdir(directory, { recursive: true });
                
                // Create category-specific directories
                if (this._config && this._config.categories) {
                    const categories = Object.keys(this._config.categories);
                    for (const category of categories) {
                        await fs.mkdir(path.join(directory, category), { recursive: true });
                    }
                }
                
                this.info('logger', `Log directories created in ${directory}`);
            } catch (error) {
                console.error('Failed to create log directory:', error);
                throw error;
            }
        });
    }

    /**
     * Create loggers for different categories
     * @returns {Promise<void>}
     * @private
     */
    async _createLoggers() {
        try {
            // Set default level
            const defaultLevel = this.getConfig('level') || 'info';
            
            // Get console formatter module
            const consoleModule = this.getModule('console');
            if (!consoleModule) {
                throw new Error('Console formatter module not found');
            }
            
            // Create default logger with console transport only
            this.loggers.set('default', winston.createLogger({
                level: defaultLevel,
                transports: [
                    consoleModule.createTransport('default')
                ]
            }));
            
            // Create category-specific loggers if config is available
            if (this._config && this._config.categories) {
                const categories = Object.keys(this._config.categories);
                for (const category of categories) {
                    const categoryConfig = this._config.categories[category] || {};
                    const level = categoryConfig.level || defaultLevel;
                    
                    // Create category-specific transports
                    const transports = [consoleModule.createTransport(category)];
                    
                    // Add file transport if enabled
                    const fileModule = this.getModule('file');
                    if (fileModule && this.getConfig('enableFile')) {
                        transports.push(fileModule.createTransport(category));
                    }
                    
                    // Create logger with unique transports
                    this.loggers.set(category, winston.createLogger({
                        level,
                        transports,
                        exitOnError: false
                    }));
                }
            }
            
            // Replace the basic logging methods with the proper ones
            ['error', 'warn', 'info', 'debug', 'trace'].forEach(level => {
                this[level] = (category, message, ...meta) => {
                    this._log(level, category, message, ...meta);
                };
            });
            
            // Add special logging methods
            this.success = (category, message, ...meta) => {
                this._log('info', category, `✓ ${message}`, { icon: '✅', ...meta });
            };
            
            this.fatal = (category, message, ...meta) => {
                this._log('error', category, `☠️ ${message}`, { icon: '💀', ...meta });
            };
            
            this.dev = (category, message, ...meta) => {
                if (process.env.NODE_ENV === 'development') {
                    this._log('debug', category, `🛠️ ${message}`, { icon: '👨‍💻', ...meta });
                }
            };
            
            this.performance = (category, message, duration, ...meta) => {
                this._log('info', category, `${message}`, { icon: '⚡', duration, ...meta });
            };
            
            this.security = (category, message, level = 'info', ...meta) => {
                this._log(level, category, `${message}`, { icon: '🔐', security: true, ...meta });
            };
            
            // Add section logging method
            this.section = (sectionName) => {
                this._log('info', 'system', '', { section: sectionName });
            };
        } catch (error) {
            console.error('Failed to create loggers:', error);
            throw error;
        }
    }

    /**
     * Log a message with the specified level and section
     * @param {string} level - Log level (debug, info, warn, error)
     * @param {string} section - Log section/category
     * @param {string} message - Log message
     * @param {any} metadata - Additional metadata
     * @private
     */
    _log(level, section, message, metadata) {
        // Skip if no message
        if (!message) return;
        
        // Format message if needed
        const formattedMessage = this._formatMessage(message);
        
        // Get logger for section
        const logger = this.getLogger(section);
        
        // If we have a logger for this section, use it
        if (logger) {
            // Only log once - don't log to both section logger and default logger
            if (level === 'success') {
                // Success is a special case - log as info with success prefix
                logger.info(`✓ ${formattedMessage}`, metadata);
            } else if (logger[level]) {
                logger[level](formattedMessage, metadata);
            }
        } else {
            // Fall back to default logger
            const defaultLogger = this.loggers.get('default');
            if (defaultLogger) {
                if (level === 'success') {
                    defaultLogger.info(`[${section}] ✓ ${formattedMessage}`, metadata);
                } else if (defaultLogger[level]) {
                    defaultLogger[level](`[${section}] ${formattedMessage}`, metadata);
                }
            }
        }
    }

    /**
     * Start a timer for performance measurement
     * @param {string} category - Log category
     * @param {string} operation - Operation name
     * @returns {Function} Function to stop the timer and log the result
     */
    startTimer(category, operation) {
        const startTime = process.hrtime();
        const timerId = `${category}:${operation}:${Date.now()}`;
        
        this.timers.set(timerId, { startTime, category, operation });
        
        return () => {
            const timerData = this.timers.get(timerId);
            if (!timerData) return 0;
            
            const [seconds, nanoseconds] = process.hrtime(timerData.startTime);
            const duration = Math.round((seconds * 1000) + (nanoseconds / 1000000));
            
            this.performance(category, `${operation} completed`, duration);
            this.timers.delete(timerId);
            
            return duration;
        };
    }

    /**
     * Rotate log files
     * @returns {Promise<void>}
     */
    async rotate() {
        return this.executeOperation('rotate', async () => {
            const fileModule = this.getModule('file');
            if (!fileModule) {
                throw new Error('File logger module not found');
            }
            
            await fileModule.rotate();
            this.info('logger', 'Log rotation completed');
        });
    }

    /**
     * Archive old log files
     * @param {string} olderThan - Archive logs older than this duration (e.g., '30d')
     * @returns {Promise<void>}
     */
    async archiveOldLogs(olderThan = '30d') {
        return this.executeOperation('archiveOldLogs', async () => {
            const fileModule = this.getModule('file');
            if (!fileModule) {
                throw new Error('File logger module not found');
            }
            
            await fileModule.archiveOldLogs(olderThan);
            this.info('logger', `Archived logs older than ${olderThan}`);
        });
    }

    /**
     * Search logs for specific content
     * @param {string|Object|Function} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    async searchLogs(query, options = {}) {
        return this.executeOperation('searchLogs', async () => {
            const fileModule = this.getModule('file');
            if (!fileModule) {
                throw new Error('File logger module not found');
            }
            
            return fileModule.searchLogs(query, options);
        });
    }

    /**
     * Get a logger for a specific category
     * @param {string} category - Logger category
     * @returns {Object} Winston logger
     */
    getLogger(category) {
        return this.loggers.get(category) || this.loggers.get('default');
    }

    /**
     * Get the status of the logger manager
     * @returns {Promise<Object>} Status information
     */
    async getStatus() {
        const status = await super.getStatus();
        return {
            ...status,
            loggers: Array.from(this.loggers.keys()),
            level: this.getConfig('level'),
            directory: this.getConfig('directory')
        };
    }

    /**
     * Format a message for logging
     * @param {any} message - The message to format
     * @returns {string} The formatted message
     * @private
     */
    _formatMessage(message) {
        if (message === null || message === undefined) {
            return '';
        }
        
        if (typeof message === 'object') {
            try {
                return JSON.stringify(message);
            } catch (e) {
                return '[Object]';
            }
        }
        
        return message;
    }

    /**
     * Set up logging sections
     * @private
     */
    _setupSections() {
        // Check if sections are defined
        if (!this._config.sections) return;
        
        // Store sections
        this.sections = this._config.sections;
    }

    /**
     * Show a section header
     * @param {string} sectionName - Name of the section
     */
    section(sectionName) {
        // Check if section exists
        if (!this.sections[sectionName]) {
            this.warn('logger', `Section "${sectionName}" not found`);
            return;
        }
        
        // Set current section
        this.currentSection = sectionName;
        
        // Get section config
        const section = this.sections[sectionName];
        
        // Log section header
        const title = section.title || `=== ${sectionName.toUpperCase()} ===`;
        this.info('logger', title);
    }
}

module.exports = LoggerManager; 