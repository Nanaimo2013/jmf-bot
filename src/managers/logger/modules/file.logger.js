const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs').promises;
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

class FileLogger {
    constructor(manager) {
        this.manager = manager;
        this.name = 'file';
        this.type = 'transport';
        this.activeTransports = new Map();
    }

    async initialize(config) {
        this.config = {
            directory: config.directory || 'logs',
            maxSize: config.maxSize || '20m',
            maxFiles: config.maxFiles || '14d',
            compress: config.compress !== false,
            categories: config.categories || ['system', 'database', 'network', 'security', 'performance', 'user'],
            ...config
        };

        await this._setupDirectories();
        await this._createTransports();
    }

    async _setupDirectories() {
        // Create main logs directory
        await fs.mkdir(this.config.directory, { recursive: true });

        // Create category-specific directories
        for (const category of this.config.categories) {
            await fs.mkdir(path.join(this.config.directory, category), { recursive: true });
        }
    }

    _createTransports() {
        // Create default transport
        this.activeTransports.set('default', this._createRotateTransport());

        // Create category-specific transports
        for (const category of this.config.categories) {
            this.activeTransports.set(
                category,
                this._createRotateTransport(category)
            );
        }
    }

    _createRotateTransport(category = '') {
        const filename = category
            ? path.join(this.config.directory, category, `%DATE%.log`)
            : path.join(this.config.directory, '%DATE%.log');

        return new DailyRotateFile({
            filename,
            datePattern: 'YYYY-MM-DD',
            maxSize: this.config.maxSize,
            maxFiles: this.config.maxFiles,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            auditFile: path.join(this.config.directory, '.audit.json'),
            zippedArchive: this.config.compress,
            hooks: {
                onRotate: (oldFile, newFile) => {
                    this.manager.emit('rotate', { oldFile, newFile, category });
                },
                onArchive: (zipFilename) => {
                    this.manager.emit('archive', { zipFilename, category });
                }
            }
        });
    }

    getTransport(category) {
        return this.activeTransports.get(category) || this.activeTransports.get('default');
    }

    async archiveOldLogs(olderThan = '30d') {
        const archiveDir = path.join(this.config.directory, 'archives');
        await fs.mkdir(archiveDir, { recursive: true });

        const now = new Date();
        const cutoff = new Date(now - this._parseDuration(olderThan));

        for (const [category, transport] of this.activeTransports) {
            const logDir = path.dirname(transport.dirname);
            const files = await fs.readdir(logDir);

            for (const file of files) {
                if (!file.endsWith('.log')) continue;

                const filePath = path.join(logDir, file);
                const stats = await fs.stat(filePath);

                if (stats.mtime < cutoff) {
                    await this._archiveFile(filePath, archiveDir, category);
                }
            }
        }
    }

    async _archiveFile(filePath, archiveDir, category) {
        try {
            // Read the file
            const content = await fs.readFile(filePath);

            // Compress the content
            const compressed = await gzip(content);

            // Create archive filename
            const filename = path.basename(filePath, '.log');
            const archiveFile = path.join(
                archiveDir,
                category,
                `${filename}.log.gz`
            );

            // Ensure category directory exists in archive
            await fs.mkdir(path.dirname(archiveFile), { recursive: true });

            // Write the compressed file
            await fs.writeFile(archiveFile, compressed);

            // Delete the original file
            await fs.unlink(filePath);

            this.manager.info('logger', `Archived log file: ${filePath} -> ${archiveFile}`);
        } catch (error) {
            this.manager.error('logger', `Failed to archive log file: ${filePath}`, error);
        }
    }

    _parseDuration(duration) {
        const units = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000
        };

        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) {
            throw new Error(`Invalid duration format: ${duration}`);
        }

        const [, value, unit] = match;
        return parseInt(value) * units[unit];
    }

    async cleanup() {
        const promises = [];
        for (const transport of this.activeTransports.values()) {
            promises.push(
                new Promise((resolve) => {
                    transport.on('finish', resolve);
                    transport.close();
                })
            );
        }
        await Promise.all(promises);
    }

    // Utility methods for log analysis
    async searchLogs(query, options = {}) {
        const results = [];
        const categories = options.categories || ['default', ...this.config.categories];

        for (const category of categories) {
            const transport = this.getTransport(category);
            const logDir = path.dirname(transport.dirname);
            const files = await fs.readdir(logDir);

            for (const file of files) {
                if (!file.endsWith('.log')) continue;

                const filePath = path.join(logDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const lines = content.split('\n');

                for (const line of lines) {
                    if (!line) continue;
                    const log = JSON.parse(line);
                    if (this._matchesQuery(log, query)) {
                        results.push({ ...log, category, file });
                    }
                }
            }
        }

        return results;
    }

    _matchesQuery(log, query) {
        if (typeof query === 'string') {
            return JSON.stringify(log).includes(query);
        }

        if (typeof query === 'object') {
            return Object.entries(query).every(([key, value]) => {
                const logValue = key.split('.').reduce((obj, k) => obj?.[k], log);
                return logValue === value;
            });
        }

        if (typeof query === 'function') {
            return query(log);
        }

        return false;
    }
}

module.exports = FileLogger; 