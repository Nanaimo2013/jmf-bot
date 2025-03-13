/**
 * JMF Hosting Discord Bot - File Logger Module
 * Version: 1.1.0
 * Last Updated: 03/12/2025
 * 
 * This module handles logging to files, including log rotation,
 * archiving, and searching. It provides a comprehensive file logging
 * system with support for different categories and log levels.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const archiver = require('archiver');
const readline = require('readline');
const { createReadStream } = require('fs');

class FileLogger extends BaseModule {
    /**
     * Create a new file logger module
     * @param {Object} manager - The parent manager instance
     * @param {Object} [options] - Module options
     */
    constructor(manager, options = {}) {
        super(manager, 'file', {
            version: '1.1.0',
            defaultConfig: {
                directory: path.join(process.cwd(), 'logs'),
                archiveDirectory: path.join(process.cwd(), 'logs/archives'),
                maxSize: '20m',
                maxFiles: '14d',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                format: 'json',
                categories: ['system', 'database', 'network', 'security', 'performance', 'user', 'test', 'api'],
                rotationFrequency: 'daily', // daily, hourly, weekly
                compressionLevel: 9,
                searchBatchSize: 1000
            },
            hooks: {
                afterInitialize: [
                    async () => {
                        await this._setupDirectories();
                    }
                ]
            },
            ...options
        });

        this.transports = new Map();
    }

    /**
     * Initialize the file logger module
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        await this._setupDirectories();
        this.manager.info('logger', 'File logger module initialized');
    }

    /**
     * Set up log directories
     * @returns {Promise<void>}
     * @private
     */
    async _setupDirectories() {
        return this.executeOperation('setupDirectories', async () => {
            try {
                // Get directory from config or use default
                let directory = this.getConfig('directory');
                if (!directory) {
                    directory = path.join(process.cwd(), 'logs');
                    this.manager.warn('logger', `Log directory not specified in config, using default: ${directory}`);
                    // Update config with default directory
                    this.setConfig('directory', directory);
                }
                
                // Get archive directory from config or use default
                let archiveDirectory = this.getConfig('archiveDirectory');
                if (!archiveDirectory) {
                    archiveDirectory = path.join(directory, 'archives');
                    this.manager.warn('logger', `Archive directory not specified in config, using default: ${archiveDirectory}`);
                    // Update config with default archive directory
                    this.setConfig('archiveDirectory', archiveDirectory);
                }
                
                // Create main log directory
                await fs.mkdir(directory, { recursive: true });
                
                // Create archive directory
                await fs.mkdir(archiveDirectory, { recursive: true });
                
                // Create category-specific directories
                const categories = this.getConfig('categories');
                if (Array.isArray(categories) && categories.length > 0) {
                    for (const category of categories) {
                        await fs.mkdir(path.join(directory, category), { recursive: true });
                    }
                } else {
                    // Create default categories if none specified
                    const defaultCategories = ['system', 'database', 'commands', 'events', 'api'];
                    for (const category of defaultCategories) {
                        await fs.mkdir(path.join(directory, category), { recursive: true });
                    }
                    // Update config with default categories
                    this.setConfig('categories', defaultCategories);
                }
                
                this.manager.info('logger', `Log directories created in ${directory}`);
            } catch (error) {
                this.manager.error('logger', `Failed to create log directories: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Get a transport for a specific category
     * @param {string} category - Logger category
     * @returns {Object} Winston transport
     */
    getTransport(category) {
        if (this.transports.has(category)) {
            return this.transports.get(category);
        }

        const transport = this._createTransport(category);
        this.transports.set(category, transport);
        return transport;
    }

    /**
     * Create a transport for a specific category
     * @param {string} category - Logger category
     * @returns {Object} Winston transport
     * @private
     */
    _createTransport(category) {
        const directory = this.getConfig('directory');
        const filename = path.join(directory, category, `%DATE%.log`);
        
        const transport = new DailyRotateFile({
            filename,
            datePattern: this.getConfig('datePattern'),
            maxSize: this.getConfig('maxSize'),
            maxFiles: this.getConfig('maxFiles'),
            zippedArchive: this.getConfig('zippedArchive'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        });

        // Handle rotation events
        transport.on('rotate', (oldFilename, newFilename) => {
            this.manager.emitEvent('logRotated', { 
                oldFile: oldFilename, 
                newFile: newFilename,
                category
            });
        });

        return transport;
    }

    /**
     * Rotate log files
     * @returns {Promise<void>}
     */
    async rotate() {
        return this.executeOperation('rotate', async () => {
            for (const [category, transport] of this.transports.entries()) {
                try {
                    await new Promise((resolve, reject) => {
                        transport.rotate((err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                    
                    this.manager.info('logger', `Rotated logs for category: ${category}`);
                } catch (error) {
                    this.manager.error('logger', `Failed to rotate logs for category ${category}: ${error.message}`);
                }
            }
        });
    }

    /**
     * Archive old log files
     * @param {string} olderThan - Archive logs older than this duration (e.g., '30d')
     * @returns {Promise<void>}
     */
    async archiveOldLogs(olderThan = '30d') {
        return this.executeOperation('archiveOldLogs', async () => {
            const directory = this.getConfig('directory');
            const archiveDirectory = this.getConfig('archiveDirectory');
            const categories = this.getConfig('categories');
            
            // Parse the olderThan parameter
            const match = olderThan.match(/^(\d+)([dhm])$/);
            if (!match) {
                throw new Error(`Invalid olderThan format: ${olderThan}. Expected format: 30d, 24h, etc.`);
            }
            
            const [, value, unit] = match;
            const cutoffDate = new Date();
            
            switch (unit) {
                case 'd':
                    cutoffDate.setDate(cutoffDate.getDate() - parseInt(value));
                    break;
                case 'h':
                    cutoffDate.setHours(cutoffDate.getHours() - parseInt(value));
                    break;
                case 'm':
                    cutoffDate.setMinutes(cutoffDate.getMinutes() - parseInt(value));
                    break;
                default:
                    throw new Error(`Invalid time unit: ${unit}. Expected: d, h, or m.`);
            }
            
            // Process each category
            for (const category of categories) {
                const categoryDir = path.join(directory, category);
                
                try {
                    const files = await fs.readdir(categoryDir);
                    const logFiles = files.filter(file => file.endsWith('.log'));
                    
                    for (const file of logFiles) {
                        const filePath = path.join(categoryDir, file);
                        const stats = await fs.stat(filePath);
                        
                        if (stats.mtime < cutoffDate) {
                            await this._archiveFile(filePath, category, archiveDirectory);
                        }
                    }
                } catch (error) {
                    this.manager.error('logger', `Failed to archive logs for category ${category}: ${error.message}`);
                }
            }
        });
    }

    /**
     * Archive a log file
     * @param {string} filePath - Path to the log file
     * @param {string} category - Logger category
     * @param {string} archiveDirectory - Archive directory
     * @returns {Promise<void>}
     * @private
     */
    async _archiveFile(filePath, category, archiveDirectory) {
        return new Promise((resolve, reject) => {
            const filename = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const zipFilename = `${category}_${filename}_${timestamp}.zip`;
            const zipPath = path.join(archiveDirectory, zipFilename);
            
            const output = fsSync.createWriteStream(zipPath);
            const archive = archiver('zip', {
                zlib: { level: this.getConfig('compressionLevel') }
            });
            
            output.on('close', () => {
                fs.unlink(filePath)
                    .then(() => {
                        this.manager.info('logger', `Archived and removed log file: ${filePath} -> ${zipPath}`);
                        this.manager.emitEvent('logArchived', { 
                            originalFile: filePath, 
                            zipFilename,
                            category
                        });
                        resolve();
                    })
                    .catch(reject);
            });
            
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.file(filePath, { name: filename });
            archive.finalize();
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
            const {
                category = null,
                startDate = null,
                endDate = null,
                level = null,
                limit = 100,
                offset = 0
            } = options;
            
            const directory = this.getConfig('directory');
            const categories = category ? [category] : this.getConfig('categories');
            const results = [];
            
            // Process each category
            for (const cat of categories) {
                const categoryDir = path.join(directory, cat);
                
                try {
                    const files = await fs.readdir(categoryDir);
                    const logFiles = files.filter(file => file.endsWith('.log'));
                    
                    // Sort files by date (newest first)
                    logFiles.sort((a, b) => {
                        const dateA = this._extractDateFromFilename(a);
                        const dateB = this._extractDateFromFilename(b);
                        return dateB - dateA;
                    });
                    
                    // Filter files by date range
                    const filteredFiles = logFiles.filter(file => {
                        const fileDate = this._extractDateFromFilename(file);
                        
                        if (startDate && fileDate < new Date(startDate)) {
                            return false;
                        }
                        
                        if (endDate && fileDate > new Date(endDate)) {
                            return false;
                        }
                        
                        return true;
                    });
                    
                    // Search each file
                    for (const file of filteredFiles) {
                        const filePath = path.join(categoryDir, file);
                        const fileResults = await this._searchFile(filePath, query, level, cat);
                        results.push(...fileResults);
                        
                        // Stop if we have enough results
                        if (results.length >= offset + limit) {
                            break;
                        }
                    }
                } catch (error) {
                    this.manager.error('logger', `Failed to search logs for category ${cat}: ${error.message}`);
                }
                
                // Stop if we have enough results
                if (results.length >= offset + limit) {
                    break;
                }
            }
            
            // Apply offset and limit
            return results.slice(offset, offset + limit);
        });
    }

    /**
     * Search a log file for specific content
     * @param {string} filePath - Path to the log file
     * @param {string|Object|Function} query - Search query
     * @param {string} level - Log level
     * @param {string} category - Logger category
     * @returns {Promise<Array>} Search results
     * @private
     */
    async _searchFile(filePath, query, level, category) {
        return new Promise((resolve, reject) => {
            const results = [];
            const rl = readline.createInterface({
                input: createReadStream(filePath),
                crlfDelay: Infinity
            });
            
            rl.on('line', (line) => {
                try {
                    const logEntry = JSON.parse(line);
                    
                    // Filter by level
                    if (level && logEntry.level !== level) {
                        return;
                    }
                    
                    // Apply query filter
                    if (this._matchesQuery(logEntry, query)) {
                        results.push({
                            ...logEntry,
                            file: path.basename(filePath),
                            category: category || logEntry.category
                        });
                    }
                } catch (error) {
                    // Skip invalid JSON lines
                }
            });
            
            rl.on('close', () => {
                resolve(results);
            });
            
            rl.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Check if a log entry matches a query
     * @param {Object} logEntry - Log entry
     * @param {string|Object|Function} query - Search query
     * @returns {boolean} Whether the log entry matches the query
     * @private
     */
    _matchesQuery(logEntry, query) {
        // String query (search in message)
        if (typeof query === 'string') {
            return logEntry.message && logEntry.message.includes(query);
        }
        
        // Function query
        if (typeof query === 'function') {
            return query(logEntry);
        }
        
        // Object query (match properties)
        if (typeof query === 'object' && query !== null) {
            return Object.entries(query).every(([key, value]) => {
                if (typeof value === 'string') {
                    return logEntry[key] && logEntry[key].includes(value);
                }
                return logEntry[key] === value;
            });
        }
        
        return false;
    }

    /**
     * Extract date from a log filename
     * @param {string} filename - Log filename
     * @returns {Date} Extracted date
     * @private
     */
    _extractDateFromFilename(filename) {
        const datePattern = this.getConfig('datePattern').toLowerCase();
        let dateStr = filename.replace('.log', '');
        
        // Handle different date patterns
        if (datePattern.includes('yyyy-mm-dd')) {
            const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
            if (match) {
                dateStr = match[1];
            }
        } else if (datePattern.includes('mm-dd-yyyy')) {
            const match = dateStr.match(/(\d{2}-\d{2}-\d{4})/);
            if (match) {
                const [month, day, year] = match[1].split('-');
                dateStr = `${year}-${month}-${day}`;
            }
        }
        
        return new Date(dateStr);
    }

    /**
     * Get the status of the file logger module
     * @returns {Promise<Object>} Status information
     */
    async getStatus() {
        const status = await super.getStatus();
        return {
            ...status,
            directory: this.getConfig('directory'),
            archiveDirectory: this.getConfig('archiveDirectory'),
            maxSize: this.getConfig('maxSize'),
            maxFiles: this.getConfig('maxFiles'),
            categories: Array.from(this.transports.keys())
        };
    }
}

module.exports = FileLogger; 