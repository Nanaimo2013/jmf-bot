/**
 * JMF Hosting Discord Bot - Database Utility (Fallback)
 * Version: 1.0.0
 * Last Updated: 03/17/2025
 * 
 * This is a fallback database utility that provides basic database access
 * for modules that haven't been updated to use the new database manager.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

class DatabaseUtility {
    constructor() {
        this.logger = global.managers?.logger || console;
        this.databaseManager = global.managers?.database;
        this.isConnected = false;
    }

    /**
     * Initialize the database utility
     */
    async init() {
        try {
            if (this.databaseManager && this.databaseManager.isConnected()) {
                this.isConnected = true;
                this.logger.info('Database utility connected to database manager');
            } else {
                this.logger.warn('Database manager not available, database utility will use fallback methods');
            }
        } catch (error) {
            this.logger.error(`Failed to initialize database utility: ${error.message}`);
        }
    }

    /**
     * Execute a query
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async query(sql, params = []) {
        try {
            if (this.databaseManager && this.databaseManager.isConnected()) {
                return await this.databaseManager.query(sql, params);
            } else {
                this.logger.warn('Database not available, returning empty result');
                return [];
            }
        } catch (error) {
            this.logger.error(`Database query failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute a query and return the first result
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object|null>} First result or null
     */
    async get(sql, params = []) {
        try {
            const results = await this.query(sql, params);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            this.logger.error(`Database get failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute a query and return all results
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} All results
     */
    async all(sql, params = []) {
        return await this.query(sql, params);
    }

    /**
     * Execute a query and return the number of affected rows
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<number>} Number of affected rows
     */
    async run(sql, params = []) {
        try {
            if (this.databaseManager && this.databaseManager.isConnected()) {
                const result = await this.databaseManager.query(sql, params);
                return result.changes || 0;
            } else {
                this.logger.warn('Database not available, returning 0 affected rows');
                return 0;
            }
        } catch (error) {
            this.logger.error(`Database run failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if a table exists
     * @param {string} tableName - Table name
     * @returns {Promise<boolean>} True if table exists
     */
    async tableExists(tableName) {
        try {
            const result = await this.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                [tableName]
            );
            return result.length > 0;
        } catch (error) {
            this.logger.error(`Failed to check if table exists: ${error.message}`);
            return false;
        }
    }

    /**
     * Close the database connection
     */
    async close() {
        try {
            this.isConnected = false;
            this.logger.info('Database utility closed');
        } catch (error) {
            this.logger.error(`Failed to close database utility: ${error.message}`);
        }
    }
}

// Create and initialize the database utility
const database = new DatabaseUtility();

// Initialize when the module is loaded
if (global.managers?.database) {
    database.init().catch(error => {
        console.error('Failed to initialize database utility:', error);
    });
}

module.exports = database;
