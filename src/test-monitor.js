/**
 * JMF Hosting Discord Bot - Monitor Test
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This script tests the monitor manager's ability to collect metrics
 * from the database manager.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

// Load environment variables
require('dotenv').config();

// Import required modules
const path = require('path');
const fs = require('fs');

// Set up a basic logger for testing
const logger = {
    debug: (category, message) => console.log(`[${category}] DEBUG: ${message}`),
    info: (category, message) => console.log(`[${category}] INFO: ${message}`),
    warn: (category, message) => console.log(`[${category}] WARNING: ${message}`),
    error: (category, message, stack) => {
        console.error(`[${category}] ERROR: ${message}`);
        if (stack) console.error(stack);
    },
    success: (category, message) => console.log(`[${category}] SUCCESS: ${message}`),
    section: (section) => console.log(`\n=== ${section.toUpperCase()} ===\n`)
};

// Create a mock database module
class MockDatabaseModule {
    constructor(name, enabled = true) {
        this.name = name;
        this.enabled = enabled;
        this.initialized = false;
    }

    async initialize() {
        this.initialized = true;
        return true;
    }

    async close() {
        this.initialized = false;
        return true;
    }

    isEnabled() {
        return this.enabled;
    }

    isInitialized() {
        return this.initialized;
    }

    async getStatus() {
        return {
            name: this.name,
            enabled: this.enabled,
            initialized: this.initialized,
            timestamp: new Date().toISOString()
        };
    }
}

// Create a mock database manager
class MockDatabaseManager {
    constructor() {
        this.name = 'database';
        this.version = '1.0.0';
        this.isInitialized = true;
        this.isShuttingDown = false;
        this._isConnected = true;
        this.modules = new Map();
        this.config = {
            type: 'sqlite',
            modules: {
                sqlite: { enabled: true },
                mysql: { enabled: false },
                migration: { enabled: false }
            },
            sqlite: {
                database: path.join(__dirname, '../data/database/test.db')
            }
        };
        this.logger = logger;
    }

    isConnected() {
        return this._isConnected;
    }

    getActiveModule() {
        return this.modules.get(this.config.type);
    }

    async getStatus() {
        try {
            const status = {
                name: this.name,
                version: this.version,
                initialized: this.isInitialized,
                shuttingDown: this.isShuttingDown,
                modules: {},
                connected: this.isConnected(),
                type: this.config.type,
                timestamp: new Date().toISOString()
            };
            
            // Get status of all modules
            if (this.modules && this.modules instanceof Map) {
                for (const [moduleName, module] of this.modules.entries()) {
                    if (!module) {
                        status.modules[moduleName] = { error: 'Module is null or undefined' };
                        continue;
                    }
                    
                    try {
                        if (typeof module.getStatus === 'function') {
                            status.modules[moduleName] = await module.getStatus();
                        } else {
                            status.modules[moduleName] = {
                                name: module.name || moduleName,
                                enabled: typeof module.isEnabled === 'function' ? module.isEnabled() : 
                                         (module.enabled !== undefined ? module.enabled : false),
                                initialized: typeof module.isInitialized === 'function' ? module.isInitialized() : 
                                            (module.initialized !== undefined ? module.initialized : false)
                            };
                        }
                    } catch (error) {
                        this.logger.error('database', `Failed to get status for module ${moduleName}: ${error.message}`);
                        status.modules[moduleName] = {
                            error: error.message
                        };
                    }
                }
            }
            
            return status;
        } catch (error) {
            this.logger.error('database', `Failed to get status: ${error.message}`);
            return {
                name: this.name,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Create a mock monitor manager
class MockMonitorManager {
    constructor() {
        this.name = 'monitor';
        this.version = '1.0.0';
        this.logger = logger;
        this.config = {
            interval: 5000,
            enabled: true,
            metrics: {
                system: true,
                memory: true,
                cpu: true,
                disk: true,
                network: true,
                database: true,
                api: true,
                bot: true
            }
        };
    }

    async getManager(name) {
        if (name === 'database') {
            return this.dbManager;
        }
        return null;
    }

    async _getDatabaseStats(dbPath) {
        if (!dbPath) {
            throw new Error('The "path" argument must be of type string or an instance of Buffer or URL. Received null');
        }
        
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            // Ensure path is absolute
            const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
            
            // Check if file exists
            const stats = await fs.stat(absolutePath);
            
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                accessed: stats.atime,
                exists: true,
                path: absolutePath
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    exists: false,
                    path: dbPath,
                    error: 'File does not exist'
                };
            }
            
            throw error;
        }
    }

    async collectDatabaseMetrics() {
        if (!this.config.metrics.database) {
            return {};
        }

        try {
            const database = await this.getManager('database');
            
            if (!database) {
                this.logger.debug('monitor', 'Database manager not available, skipping metrics collection');
                return {
                    status: 'unavailable',
                    message: 'Database manager not available'
                };
            }
            
            // Check if database is initialized
            if (!database.isInitialized) {
                this.logger.debug('monitor', 'Database manager not initialized, skipping metrics collection');
                return {
                    status: 'not_initialized',
                    message: 'Database manager not initialized'
                };
            }
            
            // Get database status safely
            let status = { status: 'unknown' };
            try {
                if (typeof database.getStatus === 'function') {
                    status = await database.getStatus();
                } else {
                    status = {
                        status: database.isConnected ? 'connected' : 'disconnected',
                        type: database.config ? database.config.type : 'unknown',
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (error) {
                this.logger.warn('monitor', `Failed to get database status: ${error.message}`);
                status = { 
                    status: 'error',
                    error: error.message
                };
            }
            
            // Get database stats safely
            let stats = {};
            try {
                const dbPath = database.config && database.config.sqlite && database.config.sqlite.database;
                if (dbPath) {
                    // Add database stats
                    stats = await this._getDatabaseStats(dbPath);
                }
            } catch (error) {
                this.logger.warn('monitor', `Failed to get database stats: ${error.message}`);
            }
            
            // Get module status safely
            const moduleStatus = {};
            if (database.modules && database.modules instanceof Map) {
                for (const [name, module] of database.modules.entries()) {
                    if (!module) continue;
                    
                    try {
                        if (typeof module.getStatus === 'function') {
                            moduleStatus[name] = await module.getStatus();
                        } else {
                            moduleStatus[name] = {
                                name: module.name || name,
                                enabled: typeof module.isEnabled === 'function' ? module.isEnabled() : 
                                         (module.enabled !== undefined ? module.enabled : false),
                                initialized: typeof module.isInitialized === 'function' ? module.isInitialized() : 
                                            (module.initialized !== undefined ? module.initialized : false)
                            };
                        }
                    } catch (error) {
                        this.logger.warn('monitor', `Failed to get status for module ${name}: ${error.message}`);
                        moduleStatus[name] = {
                            error: error.message
                        };
                    }
                }
            }
            
            return {
                ...status,
                stats,
                modules: moduleStatus,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('monitor', `Error collecting database metrics: ${error.message}`);
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Test function
async function runTest() {
    try {
        logger.section('test');
        logger.info('test', 'Initializing test...');

        // Create database manager
        const dbManager = new MockDatabaseManager();
        
        // Create mock modules
        dbManager.modules.set('sqlite', new MockDatabaseModule('sqlite'));
        dbManager.modules.set('mysql', new MockDatabaseModule('mysql', false));
        dbManager.modules.set('migration', new MockDatabaseModule('migration', false));

        // Create monitor manager
        const monitorManager = new MockMonitorManager();
        monitorManager.dbManager = dbManager;

        // Collect database metrics
        logger.info('test', 'Collecting database metrics...');
        const metrics = await monitorManager.collectDatabaseMetrics();
        logger.success('test', 'Database metrics collected');

        // Display metrics
        logger.section('metrics');
        console.log(JSON.stringify(metrics, null, 2));

        // Test with disabled module
        logger.section('test with disabled module');
        logger.info('test', 'Testing with disabled migration module...');
        
        // Get status of migration module
        const migrationModule = dbManager.modules.get('migration');
        const migrationStatus = await migrationModule.getStatus();
        logger.info('test', `Migration module status: ${JSON.stringify(migrationStatus)}`);

        // Test with null module
        logger.section('test with null module');
        logger.info('test', 'Testing with null module...');
        
        // Set a null module
        dbManager.modules.set('null-module', null);
        
        // Collect metrics again
        logger.info('test', 'Collecting database metrics with null module...');
        const metricsWithNull = await monitorManager.collectDatabaseMetrics();
        logger.success('test', 'Database metrics collected with null module');
        
        // Display metrics
        logger.section('metrics with null module');
        console.log(JSON.stringify(metricsWithNull, null, 2));

        logger.section('cleanup');
        logger.success('test', 'Test completed successfully');

    } catch (error) {
        logger.error('test', `Test failed: ${error.message}`, error.stack);
    }
}

// Run the test
runTest(); 