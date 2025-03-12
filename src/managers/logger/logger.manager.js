const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

class LoggerManager extends EventEmitter {
    constructor() {
        super();
        this.modulesPath = path.join(__dirname, 'modules');
        this.modules = new Map();
        this.loggers = new Map();
        this.config = null;
        this.defaultIcons = {
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            debug: '🐛',
            trace: '🔍',
            fatal: '☠️',
            success: '✅',
            start: '🚀',
            stop: '🛑',
            config: '⚙️',
            database: '💾',
            network: '🌐',
            security: '🔐',
            performance: '🏎️',
            user: '👤',
            system: '🖥️',
            test: '🧪',
            dev: '🛠️',
            api: '🔗',
            cache: '🗃️',
            auth: '🔑',
            payment: '💳',
            email: '📧',
            file: '📁',
            memory: '🧠',
            storage: '📦',
            update: '🔄',
            backup: '💽',
            connect: '🔌',
            disconnect: '🔌',
            load: '📥',
            save: '💾',
            sync: '🔄',
            alert: '🚨',
            maintenance: '🛠️',
            upgrade: '⬆️',
            download: '⬇️',
            upload: '⬆️',
            search: '🔎',
            filter: '🔍',
            sort: '🔀',
            refresh: '🔄',
            lock: '🔒',
            unlock: '🔓',
            share: '🔗',
            edit: '✏️',
            delete: '🗑️'
        };
    }

    async loadModules() {
        try {
            const files = await fs.readdir(this.modulesPath);
            const moduleFiles = files.filter(file => file.endsWith('.js'));

            for (const file of moduleFiles) {
                const modulePath = path.join(this.modulesPath, file);
                const moduleClass = require(modulePath);
                const moduleInstance = new moduleClass(this);
                this.modules.set(moduleInstance.name, moduleInstance);
                this.info('logger', `Loaded logger module: ${moduleInstance.name}`);
            }
        } catch (error) {
            this.error('logger', 'Error loading logger modules:', error);
            throw error;
        }
    }

    async initialize(config = {}) {
        this.config = {
            level: config.level || 'info',
            enableConsole: config.enableConsole !== false,
            enableFile: config.enableFile !== false,
            directory: config.directory || 'logs',
            maxSize: config.maxSize || '20m',
            maxFiles: config.maxFiles || '14d',
            format: config.format || 'simple',
            ...config
        };

        await this._setupLogDirectory();
        await this._createLoggers();

        this.info('logger', 'Logger manager initialized successfully');
    }

    async _setupLogDirectory() {
        try {
            await fs.mkdir(this.config.directory, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
            throw error;
        }
    }

    _createLoggers() {
        const levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };

        const formats = {
            simple: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message, category, ...meta }) => {
                    const icon = this.defaultIcons[level] || '📝';
                    return `${timestamp} ${icon} [${level.toUpperCase()}] [${category}] ${message} ${
                        Object.keys(meta).length ? JSON.stringify(meta) : ''
                    }`;
                })
            ),
            json: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        };

        // Create default logger
        this.loggers.set('default', winston.createLogger({
            levels,
            level: this.config.level,
            format: formats[this.config.format],
            transports: this._createTransports()
        }));

        // Create category-specific loggers
        for (const category of ['system', 'database', 'network', 'security', 'performance', 'user']) {
            this.loggers.set(category, winston.createLogger({
                levels,
                level: this.config.level,
                format: formats[this.config.format],
                transports: this._createTransports(category)
            }));
        }
    }

    _createTransports(category = '') {
        const transports = [];

        if (this.config.enableConsole) {
            transports.push(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message, category, ...meta }) => {
                        const icon = this.defaultIcons[level] || '📝';
                        return chalk`{gray ${timestamp}} ${icon} {bold [${level.toUpperCase()}]} {cyan [${category}]} ${message} ${
                            Object.keys(meta).length ? chalk.gray(JSON.stringify(meta)) : ''
                        }`;
                    })
                )
            }));
        }

        if (this.config.enableFile) {
            const filename = category 
                ? path.join(this.config.directory, `${category}-%DATE%.log`)
                : path.join(this.config.directory, 'combined-%DATE%.log');

            transports.push(new DailyRotateFile({
                filename,
                datePattern: 'YYYY-MM-DD',
                maxSize: this.config.maxSize,
                maxFiles: this.config.maxFiles,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            }));
        }

        return transports;
    }

    _log(level, category, message, ...meta) {
        const logger = this.loggers.get(category) || this.loggers.get('default');
        if (!logger) {
            console.error(`No logger found for category: ${category}`);
            return;
        }

        const icon = this.defaultIcons[level] || '📝';
        logger.log(level, message, { category, icon, ...meta });

        // Emit log event for potential subscribers
        this.emit('log', { level, category, message, icon, meta });
    }

    // Logging methods with category support
    error(category, message, ...meta) {
        this._log('error', category, message, ...meta);
    }

    warn(category, message, ...meta) {
        this._log('warn', category, message, ...meta);
    }

    info(category, message, ...meta) {
        this._log('info', category, message, ...meta);
    }

    debug(category, message, ...meta) {
        this._log('debug', category, message, ...meta);
    }

    trace(category, message, ...meta) {
        this._log('trace', category, message, ...meta);
    }

    // Special logging methods
    success(category, message, ...meta) {
        this._log('info', category, `${this.defaultIcons.success} ${message}`, ...meta);
    }

    fatal(category, message, ...meta) {
        this._log('error', category, `${this.defaultIcons.fatal} ${message}`, ...meta);
    }

    dev(category, message, ...meta) {
        if (process.env.NODE_ENV === 'development') {
            this._log('debug', category, `${this.defaultIcons.dev} ${message}`, ...meta);
        }
    }

    performance(category, message, duration, ...meta) {
        this._log('info', category, `${this.defaultIcons.performance} ${message} (${duration}ms)`, ...meta);
    }

    security(category, message, level = 'info', ...meta) {
        this._log(level, category, `${this.defaultIcons.security} ${message}`, ...meta);
    }

    // Utility methods
    startTimer(category, operation) {
        const start = process.hrtime();
        return {
            end: () => {
                const [seconds, nanoseconds] = process.hrtime(start);
                const duration = seconds * 1000 + nanoseconds / 1e6;
                this.performance(category, `${operation} completed`, duration.toFixed(2));
                return duration;
            }
        };
    }

    async rotate() {
        for (const logger of this.loggers.values()) {
            for (const transport of logger.transports) {
                if (transport instanceof DailyRotateFile) {
                    await transport.rotate();
                }
            }
        }
    }

    getLogger(category) {
        return this.loggers.get(category) || this.loggers.get('default');
    }
}

module.exports = LoggerManager; 