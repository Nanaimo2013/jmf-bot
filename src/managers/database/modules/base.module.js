/**
 * JMF Hosting Discord Bot - Base Database Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This is the base class for all database modules. It provides common
 * functionality and enforces a consistent interface across modules.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const path = require('path');
const LoggerManager = require('../../logger/logger.manager');

class BaseDatabaseModule {
    constructor(name) {
        this.name = name;
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'database', name)
        });
    }

    /**
     * Initialize the module with the provided configuration
     * @param {Object} config - Module configuration
     */
    async initialize(config) {
        this.logger.info(this.name, `${this.logger.defaultIcons.start} Initializing ${this.name} module...`);
        try {
            await this._validateConfig(config);
            this.config = config;
            this.logger.success(this.name, `${this.logger.defaultIcons.success} ${this.name} module initialized`);
        } catch (error) {
            this.logger.error(this.name, `${this.logger.defaultIcons.error} Failed to initialize ${this.name} module:`, error);
            throw error;
        }
    }

    /**
     * Validate the module configuration
     * @param {Object} config - Configuration to validate
     * @protected
     */
    async _validateConfig(config) {
        if (!config) {
            throw new Error('Configuration is required');
        }
    }

    /**
     * Execute a database query
     * @param {string} sql - SQL query to execute
     * @param {Array} params - Query parameters
     * @returns {Promise<any>} Query results
     */
    async query(sql, params = []) {
        throw new Error('query() must be implemented by subclass');
    }

    /**
     * Begin a transaction
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        throw new Error('beginTransaction() must be implemented by subclass');
    }

    /**
     * Commit a transaction
     * @returns {Promise<void>}
     */
    async commit() {
        throw new Error('commit() must be implemented by subclass');
    }

    /**
     * Rollback a transaction
     * @returns {Promise<void>}
     */
    async rollback() {
        throw new Error('rollback() must be implemented by subclass');
    }

    /**
     * Check if the module is connected to the database
     * @returns {boolean}
     */
    isConnected() {
        throw new Error('isConnected() must be implemented by subclass');
    }

    /**
     * Get the current database version
     * @returns {Promise<number>}
     */
    async getVersion() {
        throw new Error('getVersion() must be implemented by subclass');
    }

    /**
     * Create a backup of the database
     * @param {Object} options - Backup options
     * @returns {Promise<string>} Backup file path
     */
    async backup(options = {}) {
        throw new Error('backup() must be implemented by subclass');
    }

    /**
     * Restore the database from a backup
     * @param {string} backupPath - Path to the backup file
     * @returns {Promise<void>}
     */
    async restore(backupPath) {
        throw new Error('restore() must be implemented by subclass');
    }

    /**
     * Verify the database integrity
     * @returns {Promise<boolean>}
     */
    async verifyIntegrity() {
        throw new Error('verifyIntegrity() must be implemented by subclass');
    }

    /**
     * Get the database status
     * @returns {Promise<Object>}
     */
    async getStatus() {
        throw new Error('getStatus() must be implemented by subclass');
    }

    /**
     * Close the database connection
     * @returns {Promise<void>}
     */
    async close() {
        throw new Error('close() must be implemented by subclass');
    }

    /**
     * Log a query execution
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @param {number} duration - Query execution duration in milliseconds
     * @protected
     */
    _logQuery(sql, params, duration) {
        this.logger.debug(this.name, `${this.logger.defaultIcons.query} Query executed in ${duration}ms:`, {
            sql,
            params
        });
    }

    /**
     * Log an error
     * @param {Error} error - Error object
     * @param {string} context - Error context
     * @protected
     */
    _logError(error, context) {
        this.logger.error(this.name, `${this.logger.defaultIcons.error} ${context}:`, error);
    }

    /**
     * Format a duration for logging
     * @param {number} ms - Duration in milliseconds
     * @returns {string}
     * @protected
     */
    _formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.floor(ms / 1000);
        const milliseconds = ms % 1000;
        return `${seconds}s ${milliseconds}ms`;
    }
}

module.exports = BaseDatabaseModule; 