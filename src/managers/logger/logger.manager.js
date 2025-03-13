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
        
        // Override the logger from BaseManager with our basic logger
        this.logger = {
            debug: (category, message, ...meta) => this._basicLogger.debug(`[${category}] ${message}`, ...meta),
            info: (category, message, ...meta) => this._basicLogger.info(`[${category}] ${message}`, ...meta),
            warn: (category, message, ...meta) => this._basicLogger.warn(`[${category}] ${message}`, ...meta),
            error: (category, message, ...meta) => this._basicLogger.error(`[${category}] ${message}`, ...meta),
            success: (category, message, ...meta) => this._basicLogger.info(`[${category}] ✓ ${message}`, ...meta)
        };
        
        // Timers for performance logging
        this.timers = new Map();
    }

    /**
     * Initialize the logger manager
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        // We need to set up a basic console logger first for initialization messages
        this._setupBasicLogger();
        
        // Now initialize properly with the base manager
        await super.initialize(config);
        
        // Load modules before creating loggers
        await this._loadModules();
        
        // Create loggers after modules are loaded
        await this._createLoggers();
        
        this.info('logger', 'Logger manager initialized successfully');
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
        ['error', 'warn', 'info', 'debug'].forEach(level => {
            if (!this[level]) {
                this[level] = (category, message, ...meta) => {
                    basicLogger.log(level, `[${category}] ${message}`, ...meta);
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
                if (this.config.categories) {
                    const categories = Object.keys(this.config.categories);
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
            const defaultLevel = 'info';
            
            // Create console transport
            const consoleTransport = new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message }) => {
                        return `${timestamp} [${level.toUpperCase()}] ${message}`;
                    })
                )
            });

            // Create default logger
            this.loggers.set('default', winston.createLogger({
                level: defaultLevel,
                transports: [consoleTransport]
            }));
            
            // Create category-specific loggers if config is available
            if (this.config && this.config.categories) {
                const categories = Object.keys(this.config.categories);
                for (const category of categories) {
                    const categoryConfig = this.config.categories[category] || {};
                    const level = categoryConfig.level || (this.config && this.config.level) || defaultLevel;
                    
                    this.loggers.set(category, winston.createLogger({
                        level: level,
                        transports: [consoleTransport]
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
                this._log('info', category, `✓ ${message}`, ...meta);
            };
            
            this.fatal = (category, message, ...meta) => {
                this._log('error', category, `☠️ ${message}`, ...meta);
            };
            
            this.dev = (category, message, ...meta) => {
                if (process.env.NODE_ENV === 'development') {
                    this._log('debug', category, `🛠️ ${message}`, ...meta);
                }
            };
            
            this.performance = (category, message, duration, ...meta) => {
                this._log('info', category, `🏎️ ${message} (${duration}ms)`, { duration, ...meta });
            };
            
            this.security = (category, message, level = 'info', ...meta) => {
                this._log(level, category, `🔐 ${message}`, { security: true, ...meta });
            };
        } catch (error) {
            console.error('Failed to create loggers:', error);
            throw error;
        }
    }

    /**
     * Log a message
     * @param {string} level - Log level
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {...any} meta - Additional metadata
     * @private
     */
    _log(level, category, message, ...meta) {
        try {
            const logger = this.loggers.get(category) || this.loggers.get('default');
            if (!logger) {
                console.error(`No logger found for category: ${category}`);
                return;
            }
            
            logger.log(level, `[${category}] ${message}`, ...meta);
            
            // Emit log event for potential subscribers
            this.emit('log', { level, category, message, meta });
        } catch (error) {
            console.error('Error logging message:', error);
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
}

module.exports = LoggerManager; 