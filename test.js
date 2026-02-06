/**
 * JMF Hosting Discord Bot - Test Script
 * Version: 1.1.0
 * Last Updated: 03/15/2025
 * 
 * This script runs comprehensive tests on all components of the bot
 * and provides detailed, well-formatted logs of the results.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);

// Test configuration
const config = {
    testTimeout: 45000, // 45 seconds
    outputFile: path.join(process.cwd(), 'test-results.log'),
    summaryFile: path.join(process.cwd(), 'test-summary.md'),
    detailedLogs: true,
    fixIssues: true,
    components: {
        managers: true,
        database: true,
        modules: true,
        config: true,
        paths: true,
        migrations: true,
        commands: true,
        events: true,
        discord: true, // New component to test Discord API integration
        performance: true, // New component to test performance
        security: true, // New component to test security
        packageInfo: true, // New component to test package info
        nodeModules: true // New component to test node modules
    }
};

// Test results
let results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    skipped: 0,
    total: 0,
    startTime: Date.now(),
    endTime: null,
    duration: null,
    tests: []
};

// Store logs
let logs = [];
// Store clean logs (without color codes)
let cleanLogs = [];

// Logger
const logger = {
    log: (message) => {
        console.log(message);
        logs.push(message);
        cleanLogs.push(stripAnsiCodes(message));
    },
    info: (message) => {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${chalk.blue('INFO')} ${message}`;
        console.log(formattedMessage);
        logs.push(formattedMessage);
        cleanLogs.push(stripAnsiCodes(`[${timestamp}] INFO ${message}`));
    },
    success: (message) => {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${chalk.green('✓ SUCCESS')} ${message}`;
        console.log(formattedMessage);
        logs.push(formattedMessage);
        cleanLogs.push(stripAnsiCodes(`[${timestamp}] ✓ SUCCESS ${message}`));
    },
    warn: (message) => {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${chalk.yellow('⚠ WARNING')} ${message}`;
        console.log(formattedMessage);
        logs.push(formattedMessage);
        cleanLogs.push(stripAnsiCodes(`[${timestamp}] ⚠ WARNING ${message}`));
        results.warnings++;
    },
    error: (message, error) => {
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] ${chalk.red('✗ ERROR')} ${message}`;
        console.log(formattedMessage);
        logs.push(formattedMessage);
        cleanLogs.push(stripAnsiCodes(`[${timestamp}] ✗ ERROR ${message}`));
        
        if (error) {
            const errorDetails = `  ${chalk.red('→')} ${error.message}\n  ${chalk.gray(error.stack)}`;
            console.log(errorDetails);
            logs.push(errorDetails);
            cleanLogs.push(stripAnsiCodes(`  → ${error.message}\n  ${error.stack}`));
        }
    },
    section: (title) => {
        const separator = '='.repeat(80);
        const formattedTitle = `\n${separator}\n${chalk.cyan.bold(title)}\n${separator}`;
        console.log(formattedTitle);
        logs.push(formattedTitle);
        cleanLogs.push(`\n${separator}\n${title}\n${separator}`);
    },
    subsection: (title) => {
        const separator = '-'.repeat(80);
        const formattedTitle = `\n${separator}\n${chalk.cyan(title)}\n${separator}`;
        console.log(formattedTitle);
        logs.push(formattedTitle);
        cleanLogs.push(`\n${separator}\n${title}\n${separator}`);
    },
    result: (name, status, message, duration, details = null) => {
        let statusText;
        let statusColor;
        
        switch (status) {
            case 'passed':
                statusText = 'PASSED';
                statusColor = chalk.green;
                results.passed++;
                break;
            case 'failed':
                statusText = 'FAILED';
                statusColor = chalk.red;
                results.failed++;
                break;
            case 'warning':
                statusText = 'WARNING';
                statusColor = chalk.yellow;
                results.warnings++;
                break;
            case 'skipped':
                statusText = 'SKIPPED';
                statusColor = chalk.gray;
                results.skipped++;
                break;
            default:
                statusText = status.toUpperCase();
                statusColor = chalk.white;
        }
        
        const durationText = duration ? ` (${duration}ms)` : '';
        const formattedMessage = `${statusColor(`[${statusText}]`)} ${name}${durationText}: ${message}`;
        console.log(formattedMessage);
        logs.push(formattedMessage);
        cleanLogs.push(stripAnsiCodes(`[${statusText}] ${name}${durationText}: ${message}`));
        
        if (details && config.detailedLogs) {
            const detailsStr = typeof details === 'object' 
                ? util.inspect(details, { depth: 3, colors: true, compact: false })
                : details;
            console.log(chalk.gray(detailsStr));
            logs.push(chalk.gray(detailsStr));
            
            // Add clean version of details
            const cleanDetails = typeof details === 'object'
                ? formatObject(details)
                : details;
            cleanLogs.push(cleanDetails);
        }
        
        // Ensure tests array exists before pushing to it
        if (!results.tests) {
            results.tests = [];
        }
        
        results.tests.push({
            name,
            status,
            message,
            duration,
            details
        });
        
        results.total++;
    }
};

// Helper function to strip ANSI color codes
function stripAnsiCodes(str) {
    return str.replace(/\x1B\[\d+m|\x1B\[1m|\x1B\[22m|\x1B\[\d+;\d+m/g, '');
}

// Helper function to format objects for better readability
function formatObject(obj, indent = 2) {
    if (obj === null || obj === undefined) return String(obj);
    
    try {
        if (typeof obj === 'object') {
            // Use a more readable format with proper indentation
            return JSON.stringify(obj, null, indent)
                .replace(/,/g, ',')  // Keep commas
                .replace(/:/g, ': ') // Add space after colons
                .replace(/"/g, '');  // Remove quotes from keys for cleaner output
        }
        return String(obj);
    } catch (error) {
        return `[Object that couldn't be stringified: ${error.message}]`;
    }
}

// Helper functions
async function runTest(name, testFn) {
    const startTime = Date.now();
    let status = 'failed';
    let message = '';
    let details = null;
    
    try {
        logger.info(`Running test: ${name}`);
        const result = await Promise.race([
            testFn(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Test timed out')), config.testTimeout)
            )
        ]);
        
        status = result.status || 'passed';
        message = result.message || 'Test completed successfully';
        details = result.details || null;
    } catch (error) {
        status = 'failed';
        message = error.message;
        logger.error(`Test failed: ${name}`, error);
    }
    
    const duration = Date.now() - startTime;
    logger.result(name, status, message, duration, details);
    
    return { status, message, duration, details };
}

// Helper function to check if a directory exists
async function checkDirectoryExists(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch (error) {
        return false;
    }
}

// Helper function to check if a file exists
async function checkFileExists(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.isFile();
    } catch (error) {
        return false;
    }
}

async function createDirectoryIfNotExists(dirPath) {
    if (!(await checkDirectoryExists(dirPath))) {
        await fs.mkdir(dirPath, { recursive: true });
        logger.info(`Created directory: ${dirPath}`);
        return true;
    }
    return false;
}

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
    }
}

async function writeJsonFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        throw new Error(`Failed to write JSON file ${filePath}: ${error.message}`);
    }
}

async function getPackageInfo() {
    try {
        const packagePath = path.join(process.cwd(), 'package.json');
        if (await checkFileExists(packagePath)) {
            return await readJsonFile(packagePath);
        }
        return null;
    } catch (error) {
        logger.warn(`Failed to read package.json: ${error.message}`);
        return null;
    }
}

async function checkNodeModules() {
    const requiredModules = [
        'discord.js',
        'sqlite3',
        'chalk',
        'dotenv'
    ];
    
    const missingModules = [];
    const installedModules = [];
    
    for (const module of requiredModules) {
        try {
            require.resolve(module);
            installedModules.push(module);
        } catch (error) {
            missingModules.push(module);
        }
    }
    
    return { missingModules, installedModules };
}

// Test functions
async function testConfigFiles() {
    const configDir = path.join(process.cwd(), 'config');
    const mainConfigPath = path.join(configDir, 'config.json');
    
    // Check if config directory exists
    if (!(await checkDirectoryExists(configDir))) {
        if (config.fixIssues) {
            await createDirectoryIfNotExists(configDir);
            return { status: 'warning', message: 'Config directory created, but was missing' };
        }
        return { status: 'failed', message: 'Config directory does not exist' };
    }
    
    // Check if main config file exists
    if (!(await checkFileExists(mainConfigPath))) {
        if (config.fixIssues) {
            // Create a basic config file
            const basicConfig = {
                bot: {
                    token: "YOUR_BOT_TOKEN",
                    clientId: "YOUR_CLIENT_ID",
                    guildId: "YOUR_GUILD_ID",
                    paths: {
                        logs: "./logs",
                        data: "./data",
                        errors: "./logs/errors",
                        languages: "./src/languages",
                        templates: "./src/templates",
                        statistics: "./data/statistics"
                    }
                },
                database: {
                    type: "sqlite",
                    sqlite: {
                        database: "./data/database/bot.db",
                        backupDir: "./data/database/backups"
                    },
                    modules: {
                        migration: {
                            enabled: true
                        }
                    }
                },
                logging: {
                    level: "info",
                    directory: "./logs"
                },
                security: {
                    rateLimit: {
                        enabled: true,
                        maxRequests: 100,
                        timeWindow: 60000
                    },
                    permissions: {
                        strictMode: true
                    }
                }
            };
            
            await writeJsonFile(mainConfigPath, basicConfig);
            return { status: 'warning', message: 'Config file created, but was missing' };
        }
        return { status: 'failed', message: 'Config file does not exist' };
    }
    
    // Validate config file
    try {
        const configData = await readJsonFile(mainConfigPath);
        
        // Check for required sections
        const requiredSections = ['bot', 'database', 'logging'];
        const missingSections = requiredSections.filter(section => !configData[section]);
        
        if (missingSections.length > 0) {
            return { 
                status: 'warning', 
                message: `Config file is missing required sections: ${missingSections.join(', ')}` 
            };
        }
        
        // Check for null paths in config
        const nullPaths = [];
        
        // Check bot paths
        if (configData.bot && configData.bot.paths) {
            Object.entries(configData.bot.paths).forEach(([key, value]) => {
                if (value === null) {
                    nullPaths.push(`bot.paths.${key}`);
                }
            });
        }
        
        // Check database paths
        if (configData.database) {
            if (configData.database.sqlite && configData.database.sqlite.database === null) {
                nullPaths.push('database.sqlite.database');
            }
            
            if (configData.database.sqlite && configData.database.sqlite.backupDir === null) {
                nullPaths.push('database.sqlite.backupDir');
            }
        }
        
        // Check for empty token
        if (configData.bot && (!configData.bot.token || configData.bot.token === "YOUR_BOT_TOKEN")) {
            return { 
                status: 'warning', 
                message: 'Bot token is not set in config file'
            };
        }
        
        if (nullPaths.length > 0) {
            return { 
                status: 'warning', 
                message: `Config file contains null paths: ${nullPaths.join(', ')}` 
            };
        }
        
        return { 
            status: 'passed', 
            message: 'Config file is valid',
            details: {
                configSections: Object.keys(configData),
                botConfigured: !!configData.bot.token && configData.bot.token !== "YOUR_BOT_TOKEN"
            }
        };
    } catch (error) {
        return { status: 'failed', message: `Failed to validate config file: ${error.message}` };
    }
}

async function testDirectoryStructure() {
    const requiredDirs = [
        'logs',
        'data',
        'data/database',
        'data/statistics',
        'logs/errors',
        'src/languages',
        'src/database/migrations',
        'src/commands',
        'src/events',
        'src/managers',
        'src/utils',
        'src/templates'
    ];
    
    const missingDirs = [];
    const createdDirs = [];
    
    for (const dir of requiredDirs) {
        const dirPath = path.join(process.cwd(), dir);
        
        if (!(await checkDirectoryExists(dirPath))) {
            missingDirs.push(dir);
            
            if (config.fixIssues) {
                await createDirectoryIfNotExists(dirPath);
                createdDirs.push(dir);
            }
        }
    }
    
    if (missingDirs.length > 0) {
        if (createdDirs.length > 0) {
            return { 
                status: 'warning', 
                message: `Created missing directories: ${createdDirs.join(', ')}`,
                details: { missingDirs, createdDirs }
            };
        }
        
        return { 
            status: 'failed', 
            message: `Missing required directories: ${missingDirs.join(', ')}`,
            details: { missingDirs }
        };
    }
    
    return { 
        status: 'passed', 
        message: 'All required directories exist',
        details: { checkedDirectories: requiredDirs.length }
    };
}

async function testDatabaseConnection() {
    logger.info('Running test: Database Connection');
    
    try {
        // Import the database manager
        const DatabaseManager = require('./src/managers/database/database.manager');
        const LoggerManager = require('./src/managers/logger/logger.manager');
        
        // Set up global managers registry for dependencies
        if (!global.managers) {
            global.managers = {};
        }
        
        // Initialize logger manager first
        const loggerManager = new LoggerManager();
        await loggerManager.initialize();
        global.managers.logger = loggerManager;
        
        // Create a new database manager
        const dbManager = new DatabaseManager();
        
        // Initialize the database manager
        await dbManager.initialize();
        
        // Connect to the database
        await dbManager.connect();
        
        // Check if connected
        const isConnected = dbManager.isConnected();
        
        if (!isConnected) {
            return {
                status: 'failed',
                message: 'Database manager initialized but not connected'
            };
        }
        
        // Test a simple query
        const result = await dbManager.query('SELECT 1 as test');
        
        // Test tableExists method
        const migrationsTableExists = await dbManager.tableExists('migrations');
        
        // Disconnect from the database
        await dbManager.disconnect();
        
        return {
            status: 'passed',
            message: `Connected to ${dbManager.getConfig('type')} database successfully`,
            data: {
                dbType: dbManager.getConfig('type'),
                version: dbManager.version,
                queryTest: result,
                tableExists: {
                    migrations: migrationsTableExists
                }
            }
        };
    } catch (error) {
        return {
            status: 'failed',
            message: `Failed to connect to database: ${error.message}`,
            error: error.message,
            stack: error.stack
        };
    }
}

async function testMigrationModule() {
    try {
        // Dynamically import the migration module
        const MigrationModule = require('./src/managers/database/modules/migration.module');
        const DatabaseManager = require('./src/managers/database/database.manager');
        const LoggerManager = require('./src/managers/logger/logger.manager');
        
        // Set up global managers registry for dependencies
        if (!global.managers) {
            global.managers = {};
        }
        
        // Initialize logger manager first if not already available
        if (!global.managers.logger) {
            const loggerManager = new LoggerManager();
            await loggerManager.initialize();
            global.managers.logger = loggerManager;
        }
        
        // Create a database manager instance
        const dbManager = new DatabaseManager();
        
        // Initialize the database manager
        await dbManager.initialize();
        
        // Check if migrations are enabled in config
        let config;
        try {
            config = require('./config/config.json');
        } catch (e) {
            // If config file doesn't exist, use default settings
            config = { database: { migrations: { enabled: false } } };
        }
        
        const migrationsEnabled = config.database?.migrations?.enabled || false;
        
        if (!migrationsEnabled) {
            return {
                status: 'warning',
                message: 'Migration module is disabled in configuration',
                details: { enabled: false, reason: 'Disabled in configuration' }
            };
        }
        
        // Create a migration module instance
        const migrationModule = new MigrationModule(dbManager, {
            defaultConfig: {
                enabled: true
            }
        });
        
        // Initialize the migration module
        await migrationModule.initialize();
        
        // Connect the migration module to the database
        await migrationModule.connect();
        
        // Complete the migration setup now that we're connected
        await migrationModule.completeSetup();
        
        // Get migration status
        const status = await migrationModule.getStatus();
        
        // Check for pending migrations
        const pendingMigrations = await migrationModule.getPendingMigrations();
        
        // Get applied migrations
        const appliedMigrations = await migrationModule.getAppliedMigrations();
        
        // Shutdown the module and manager
        await dbManager.shutdown();
        
        if (pendingMigrations.length > 0) {
            return { 
                status: 'warning', 
                message: `Migration module initialized successfully, but has ${pendingMigrations.length} pending migrations`,
                details: {
                    pendingMigrations,
                    appliedMigrations,
                    status
                }
            };
        }
        
        return { 
            status: 'passed', 
            message: 'Migration module initialized successfully and no pending migrations',
            details: {
                appliedMigrations,
                status
            }
        };
    } catch (error) {
        return { status: 'failed', message: `Failed to test migration module: ${error.message}` };
    }
}

async function testLoggerManager() {
    logger.info('Running test: Logger Manager');
    
    try {
        // Import the logger manager
        const LoggerManager = require('./src/managers/logger/logger.manager');
        
        // Create a new logger manager
        const loggerManager = new LoggerManager();
        
        // Initialize the logger manager
        await loggerManager.initialize();
        
        // Test basic logging
        loggerManager.logger.info('default', 'Test message');
        
        // Test object serialization
        const testObject = { name: 'Test Object', value: 123, nested: { prop: 'test' } };
        loggerManager.logger.info('default', testObject);
        
        // Test logging with metadata
        loggerManager.logger.info('default', 'Test message with metadata', { meta: 'data' });
        
        // Check if log files were created
        const logDir = path.join(process.cwd(), 'logs');
        const logFiles = await fs.readdir(logDir).catch(() => []);
        
        // Return test result
        return {
            status: 'passed',
            message: 'Logger manager initialized and tested successfully',
            data: {
                logFilesCreated: logFiles.length > 0,
                logFiles: logFiles.slice(0, 5) // Show only first 5 log files
            }
        };
    } catch (error) {
        return {
            status: 'failed',
            message: 'Failed to initialize logger manager',
            error: error.message,
            stack: error.stack
        };
    }
}

async function testMonitorManager() {
    try {
        // Dynamically import the monitor manager
        const MonitorManager = require('./src/managers/monitor/monitor.manager');
        
        // Create an instance
        const monitorManager = new MonitorManager();
        
        // Initialize the manager
        await monitorManager.initialize();
        
        // Run a check - handle if method doesn't exist
        let metrics = {};
        if (typeof monitorManager.check === 'function') {
            metrics = await monitorManager.check();
        }
        
        // Test specific metrics - handle if methods don't exist
        let cpuUsage = null;
        let memoryUsage = null;
        let uptime = null;
        
        if (typeof monitorManager.getCpuUsage === 'function') {
            cpuUsage = await monitorManager.getCpuUsage();
        } else if (monitorManager.metrics && monitorManager.metrics.cpu) {
            cpuUsage = monitorManager.metrics.cpu;
        }
        
        if (typeof monitorManager.getMemoryUsage === 'function') {
            memoryUsage = await monitorManager.getMemoryUsage();
        } else if (monitorManager.metrics && monitorManager.metrics.memory) {
            memoryUsage = monitorManager.metrics.memory;
        }
        
        if (typeof monitorManager.getUptime === 'function') {
            uptime = await monitorManager.getUptime();
        } else if (monitorManager.metrics && monitorManager.metrics.uptime) {
            uptime = monitorManager.metrics.uptime;
        }
        
        // Shutdown the manager
        if (typeof monitorManager.shutdown === 'function') {
            await monitorManager.shutdown();
        }
        
        // Check if we got any metrics
        const hasMetrics = cpuUsage || memoryUsage || uptime || 
                          (metrics && Object.keys(metrics).length > 0);
        
        if (!hasMetrics) {
            return {
                status: 'warning',
                message: 'Monitor manager initialized but no metrics were collected',
                details: { initialized: true, metricsCollected: false }
            };
        }
        
        return { 
            status: 'passed', 
            message: 'Monitor manager initialized and checked successfully',
            details: {
                metrics,
                cpuUsage,
                memoryUsage,
                uptime
            }
        };
    } catch (error) {
        return { 
            status: 'failed', 
            message: `Failed to test monitor manager: ${error.message}`,
            details: { error: error.toString(), stack: error.stack }
        };
    }
}

async function testCommandsLoading() {
    try {
        // Check if commands directory exists
        const commandsDir = path.join(process.cwd(), 'src', 'commands');
        
        if (!(await checkDirectoryExists(commandsDir))) {
            return { status: 'skipped', message: 'Commands directory does not exist' };
        }
        
        // Get all command files
        const commandFiles = await fs.readdir(commandsDir);
        const jsFiles = commandFiles.filter(file => file.endsWith('.js'));
        
        if (jsFiles.length === 0) {
            return { status: 'warning', message: 'No command files found' };
        }
        
        // Try to load each command
        const loadedCommands = [];
        const failedCommands = [];
        const commandDetails = [];
        
        for (const file of jsFiles) {
            try {
                const commandPath = path.join(commandsDir, file);
                const command = require(commandPath);
                
                // Check if command has required properties
                if (command.data && command.execute) {
                    loadedCommands.push(file);
                    commandDetails.push({
                        name: command.data.name || 'unknown',
                        description: command.data.description || 'No description',
                        options: command.data.options?.length || 0,
                        file
                    });
                } else {
                    failedCommands.push({ file, reason: 'Missing required properties (data or execute)' });
                }
            } catch (error) {
                failedCommands.push({ file, reason: error.message });
            }
        }
        
        if (failedCommands.length > 0) {
            return { 
                status: 'warning', 
                message: `Loaded ${loadedCommands.length} commands, but ${failedCommands.length} failed`,
                details: { loadedCommands, failedCommands, commandDetails }
            };
        }
        
        return { 
            status: 'passed', 
            message: `Successfully loaded ${loadedCommands.length} commands`,
            details: { commandDetails }
        };
    } catch (error) {
        return { status: 'failed', message: `Failed to test commands loading: ${error.message}` };
    }
}

async function testEventsLoading() {
    try {
        // Check if events directory exists
        const eventsDir = path.join(process.cwd(), 'src', 'events');
        
        if (!(await checkDirectoryExists(eventsDir))) {
            return { status: 'skipped', message: 'Events directory does not exist' };
        }
        
        // Check if config.json exists and create a temporary one if needed
        const configPath = path.join(process.cwd(), 'config.json');
        let createdTempConfig = false;
        
        if (!(await checkFileExists(configPath))) {
            // Create a minimal temporary config.json for testing
            try {
                await fs.writeFile(configPath, JSON.stringify({
                    bot: { token: "TEST_TOKEN" },
                    database: { type: "sqlite", sqlite: { database: ":memory:" } },
                    logging: { level: "info" }
                }, null, 2));
                createdTempConfig = true;
            } catch (configError) {
                logger.warn(`Could not create temporary config.json: ${configError.message}`);
            }
        }
        
        // Get all event files
        const eventFiles = await fs.readdir(eventsDir);
        const jsFiles = eventFiles.filter(file => file.endsWith('.js'));
        
        if (jsFiles.length === 0) {
            // Clean up temp config if created
            if (createdTempConfig) {
                try { await fs.unlink(configPath); } catch (e) {}
            }
            return { status: 'warning', message: 'No event files found' };
        }
        
        // Try to load each event
        const loadedEvents = [];
        const failedEvents = [];
        const eventDetails = [];
        
        for (const file of jsFiles) {
            try {
                const eventPath = path.join(eventsDir, file);
                const event = require(eventPath);
                
                // Check if event has required properties
                if (event.name && event.execute) {
                    loadedEvents.push(file);
                    eventDetails.push({
                        name: event.name,
                        once: !!event.once,
                        file
                    });
                } else {
                    failedEvents.push({ 
                        file, 
                        reason: 'Missing required properties (name or execute)',
                        suggestion: 'Create a config.json file in the root directory'
                    });
                }
            } catch (error) {
                failedEvents.push({ 
                    file, 
                    reason: error.message,
                    suggestion: error.message.includes('config.json') ? 
                        'Create a config.json file in the root directory' : null
                });
            }
        }
        
        // Clean up temp config if created
        if (createdTempConfig) {
            try { await fs.unlink(configPath); } catch (e) {}
        }
        
        if (failedEvents.length > 0) {
            return { 
                status: 'warning', 
                message: `Loaded ${loadedEvents.length} events, but ${failedEvents.length} failed`,
                details: { loadedEvents, failedEvents, eventDetails }
            };
        }
        
        return { 
            status: 'passed', 
            message: `Successfully loaded ${loadedEvents.length} events`,
            details: { eventDetails }
        };
    } catch (error) {
        return { status: 'failed', message: `Failed to test events loading: ${error.message}` };
    }
}

async function testDiscordConnection() {
    try {
        // Try to load the Discord.js library
        const { Client, GatewayIntentBits } = require('discord.js');
        
        // Load config
        const configPath = path.join(process.cwd(), 'config', 'config.json');
        
        if (!(await checkFileExists(configPath))) {
            return { 
                status: 'skipped', 
                message: 'Discord connection test skipped: Config file not found' 
            };
        }
        
        const configData = await readJsonFile(configPath);
        
        if (!configData.bot || !configData.bot.token || configData.bot.token === "YOUR_BOT_TOKEN") {
            return { 
                status: 'skipped', 
                message: 'Discord connection test skipped: Bot token not configured' 
            };
        }
        
        // Create a client with minimal intents
        const client = new Client({ 
            intents: [GatewayIntentBits.Guilds],
            rest: {
                timeout: 15000 // 15 seconds timeout
            }
        });
        
        // Try to login
        await new Promise((resolve, reject) => {
            // Set a timeout for login
            const timeout = setTimeout(() => {
                client.destroy();
                reject(new Error('Discord login timed out'));
            }, 15000);
            
            client.once('ready', () => {
                clearTimeout(timeout);
                resolve();
            });
            
            client.login(configData.bot.token).catch(err => {
                clearTimeout(timeout);
                reject(err);
            });
        });
        
        // Get basic info
        const botUser = client.user;
        const guildCount = client.guilds.cache.size;
        const botPing = client.ws.ping;
        
        // Properly destroy the client
        client.destroy();
        
        return { 
            status: 'passed', 
            message: `Successfully connected to Discord as ${botUser.tag}`,
            details: {
                username: botUser.tag,
                id: botUser.id,
                verified: botUser.verified,
                guildCount,
                ping: botPing
            }
        };
    } catch (error) {
        return { 
            status: 'failed', 
            message: `Failed to connect to Discord: ${error.message}` 
        };
    }
}

async function testPerformance() {
    try {
        // Test database performance
        const dbStartTime = Date.now();
        const DatabaseManager = require('./src/managers/database/database.manager');
        const LoggerManager = require('./src/managers/logger/logger.manager');
        
        // Set up global managers registry for dependencies
        if (!global.managers) {
            global.managers = {};
        }
        
        // Initialize logger manager first if not already available
        if (!global.managers.logger) {
            const loggerManager = new LoggerManager();
            await loggerManager.initialize();
            global.managers.logger = loggerManager;
        }
        
        const dbManager = new DatabaseManager();
        await dbManager.initialize();
        
        // Run 100 simple queries
        const queryResults = [];
        for (let i = 0; i < 100; i++) {
            queryResults.push(await dbManager.query('SELECT 1 as test'));
        }
        
        await dbManager.shutdown();
        const dbDuration = Date.now() - dbStartTime;
        
        // Test file system performance
        const fsStartTime = Date.now();
        const testDir = path.join(process.cwd(), 'test-perf');
        await createDirectoryIfNotExists(testDir);
        
        // Write and read 10 files
        for (let i = 0; i < 10; i++) {
            const filePath = path.join(testDir, `test-${i}.json`);
            const testData = { test: i, data: 'performance test', array: Array(100).fill('test') };
            await writeJsonFile(filePath, testData);
            const readData = await readJsonFile(filePath);
        }
        
        // Clean up
        for (let i = 0; i < 10; i++) {
            const filePath = path.join(testDir, `test-${i}.json`);
            await fs.unlink(filePath);
        }
        await fs.rmdir(testDir);
        
        const fsDuration = Date.now() - fsStartTime;
        
        // Test CPU performance
        const cpuStartTime = Date.now();
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
            result += Math.sqrt(i) * Math.sin(i);
        }
        const cpuDuration = Date.now() - cpuStartTime;
        
        return { 
            status: 'passed', 
            message: 'Performance tests completed successfully',
            details: {
                database: {
                    duration: dbDuration,
                    queriesPerSecond: Math.round(100 / (dbDuration / 1000))
                },
                fileSystem: {
                    duration: fsDuration,
                    operationsPerSecond: Math.round(20 / (fsDuration / 1000))
                },
                cpu: {
                    duration: cpuDuration,
                    operationsPerSecond: Math.round(1000000 / (cpuDuration / 1000))
                }
            }
        };
    } catch (error) {
        return { 
            status: 'failed', 
            message: `Performance tests failed: ${error.message}` 
        };
    }
}

async function testSecurityConfig() {
    try {
        // Load config
        const configPath = path.join(process.cwd(), 'config', 'config.json');
        
        if (!(await checkFileExists(configPath))) {
            return { 
                status: 'skipped', 
                message: 'Security config test skipped: Config file not found' 
            };
        }
        
        const configData = await readJsonFile(configPath);
        
        const securityIssues = [];
        
        // Check if token is in config and not a placeholder
        if (configData.bot && configData.bot.token && configData.bot.token !== "YOUR_BOT_TOKEN") {
            securityIssues.push('Bot token is stored in plain text in config file');
        }
        
        // Check for security section in config
        if (!configData.security) {
            securityIssues.push('No security section in config file');
        } else {
            // Check for rate limiting
            if (!configData.security.rateLimit || !configData.security.rateLimit.enabled) {
                securityIssues.push('Rate limiting is not enabled');
            }
            
            // Check for permission settings
            if (!configData.security.permissions) {
                securityIssues.push('No permission settings in security config');
            }
        }
        
        // Check for .env file (better practice for tokens)
        const envExists = await checkFileExists(path.join(process.cwd(), '.env'));
        if (!envExists) {
            securityIssues.push('.env file not found (recommended for storing sensitive data)');
        }
        
        // Check for gitignore
        const gitignoreExists = await checkFileExists(path.join(process.cwd(), '.gitignore'));
        if (!gitignoreExists) {
            securityIssues.push('.gitignore file not found');
        }
        
        // Check if .env is in gitignore
        if (envExists && gitignoreExists) {
            const gitignoreContent = await fs.readFile(path.join(process.cwd(), '.gitignore'), 'utf8');
            if (!gitignoreContent.includes('.env')) {
                securityIssues.push('.env file is not included in .gitignore');
            }
        }
        
        // Check for config.json in gitignore if it contains sensitive data
        if (gitignoreExists && configData.bot && configData.bot.token) {
            const gitignoreContent = await fs.readFile(path.join(process.cwd(), '.gitignore'), 'utf8');
            if (!gitignoreContent.includes('config.json') && !gitignoreContent.includes('config/*.json')) {
                securityIssues.push('config.json with sensitive data is not included in .gitignore');
            }
        }
        
        return {
            status: securityIssues.length === 0 ? 'passed' : 'warning',
            message: securityIssues.length === 0 
                ? 'Security configuration is properly set up' 
                : `Found ${securityIssues.length} security configuration issues`,
            details: securityIssues
        };
    } catch (error) {
        return {
            status: 'failed',
            message: `Failed to test security configuration: ${error.message}`,
            error: error
        };
    }
}

// Helper function to generate a markdown summary of test results
async function generateMarkdownSummary(results) {
    const now = new Date().toISOString().split('T')[0];
    let markdown = `# JMF Bot Test Results Summary\n\n`;
    markdown += `## Overview\n\n`;
    markdown += `Test run completed on ${now} with the following results:\n\n`;
    markdown += `- **Total tests**: ${results.total}\n`;
    markdown += `- **Passed**: ${results.passed}\n`;
    markdown += `- **Failed**: ${results.failed}\n`;
    markdown += `- **Warnings**: ${results.warnings}\n`;
    markdown += `- **Skipped**: ${results.skipped}\n`;
    markdown += `- **Duration**: ${results.duration}ms\n\n`;

    // Add issues section
    markdown += `## Issues Found\n\n`;
    
    // Add failed tests
    let issueCount = 1;
    for (const test of results.tests) {
        if (test.status === 'failed') {
            markdown += `### ${issueCount}. ${test.name} Issues\n\n`;
            markdown += `**Status**: Failed\n\n`;
            markdown += `**Problem**: ${test.message}\n\n`;
            
            // Add recommendations based on test name
            markdown += `**Recommendation**:\n`;
            if (test.name.includes('Database Connection')) {
                markdown += `- Check the database manager's \`isConnected\` method or property.\n`;
                markdown += `- Ensure the database connection is properly established.\n`;
                markdown += `- Verify database configuration settings.\n`;
            } else if (test.name.includes('Migration')) {
                markdown += `- Fix the migration module initialization to properly handle being disabled without throwing errors.\n`;
                markdown += `- Update the configuration to enable the migration module if it's needed.\n`;
                markdown += `- Add proper error handling in the migration module's methods.\n`;
            } else {
                markdown += `- Review the test logs for more details on this failure.\n`;
                markdown += `- Check related components and dependencies.\n`;
            }
            markdown += `\n`;
            issueCount++;
        }
    }
    
    // Add warning tests
    for (const test of results.tests) {
        if (test.status === 'warning') {
            markdown += `### ${issueCount}. ${test.name} Issues\n\n`;
            markdown += `**Status**: Warning\n\n`;
            markdown += `**Problem**: ${test.message}\n\n`;
            
            // Add recommendations based on test name
            markdown += `**Recommendation**:\n`;
            if (test.name.includes('Security')) {
                markdown += `- Add a security section to the configuration file.\n`;
                markdown += `- Store sensitive data like tokens in environment variables instead of config files.\n`;
                markdown += `- Implement proper rate limiting and permission checks.\n`;
            } else if (test.name.includes('Migration')) {
                markdown += `- Enable the migration module in the configuration if needed.\n`;
                markdown += `- Check migration files for errors.\n`;
            } else if (test.name.includes('Events')) {
                markdown += `- Check the event files in \`src/events/\` to ensure they have the required \`name\` and \`execute\` properties.\n`;
                markdown += `- Fix any syntax errors in the event files.\n`;
                markdown += `- Ensure the config.json file is properly set up for events.\n`;
            } else {
                markdown += `- Review the test logs for more details on this warning.\n`;
                markdown += `- Address the issues to improve stability and security.\n`;
            }
            markdown += `\n`;
            issueCount++;
        }
    }
    
    // Add detailed recommendations section
    markdown += `## Detailed Recommendations\n\n`;
    
    // Database recommendations
    if (results.tests.some(t => t.name.includes('Database') && (t.status === 'failed' || t.status === 'warning'))) {
        markdown += `### 1. Fix Database Connection\n\n`;
        markdown += `Add or fix the \`isConnected()\` method in the DatabaseManager class:\n\n`;
        markdown += "```javascript\n";
        markdown += `/**
 * Check if the database is connected
 * @returns {boolean} Whether the database is connected
 */
isConnected() {
    return this._connected === true;
}
`;
        markdown += "```\n\n";
    }
    
    // Migration recommendations
    if (results.tests.some(t => t.name.includes('Migration') && (t.status === 'failed' || t.status === 'warning'))) {
        markdown += `### 2. Fix Migration Module\n\n`;
        markdown += `Update the migration module initialization to handle being disabled:\n\n`;
        markdown += "```javascript\n";
        markdown += `async initialize() {
    // Check if module is enabled before calling executeOperation
    if (!this._enabled) {
        this.logger.warn('Migration module is disabled');
        return;
    }
    
    return this.executeOperation('initialize', async () => {
        // ... rest of the initialization code
    });
}
`;
        markdown += "```\n\n";
    }
    
    // Monitor recommendations
    if (results.tests.some(t => t.name.includes('Monitor') && (t.status === 'failed' || t.status === 'warning'))) {
        markdown += `### 3. Fix Monitor Manager\n\n`;
        markdown += `Update the monitor manager to handle missing methods gracefully:\n\n`;
        markdown += "```javascript\n";
        markdown += `// Run a check - handle if method doesn't exist
let metrics = {};
if (typeof monitorManager.check === 'function') {
    metrics = await monitorManager.check();
}

// Test specific metrics - handle if methods don't exist
let cpuUsage = null;
let memoryUsage = null;
let uptime = null;

if (typeof monitorManager.getCpuUsage === 'function') {
    cpuUsage = await monitorManager.getCpuUsage();
} else if (monitorManager.metrics && monitorManager.metrics.cpu) {
    cpuUsage = monitorManager.metrics.cpu;
}
`;
        markdown += "```\n\n";
    }
    
    // Events recommendations
    if (results.tests.some(t => t.name.includes('Events') && (t.status === 'failed' || t.status === 'warning'))) {
        markdown += `### 4. Fix Event Loading\n\n`;
        markdown += `Check your event files to ensure they have the required structure:\n\n`;
        markdown += "```javascript\n";
        markdown += `module.exports = {
    name: 'eventName',
    once: false, // Optional, defaults to false
    execute: async (client, ...args) => {
        // Event handler code
    }
};
`;
        markdown += "```\n\n";
    }
    
    // Security recommendations
    if (results.tests.some(t => t.name.includes('Security') && (t.status === 'failed' || t.status === 'warning'))) {
        markdown += `### 5. Fix Security Configuration\n\n`;
        markdown += `Add a security section to your config.json file:\n\n`;
        markdown += "```json\n";
        markdown += `"security": {
    "rateLimit": {
        "enabled": true,
        "maxRequests": 100,
        "timeWindow": 60000
    },
    "permissions": {
        "strictMode": true
    },
    "tokenStorage": "env" // Use environment variables instead of config file
}
`;
        markdown += "```\n\n";
    }
    
    // Next steps
    markdown += `## Next Steps\n\n`;
    markdown += `1. Fix the critical issues first (${results.failed > 0 ? 'failed tests' : 'warnings'}).\n`;
    markdown += `2. Run the test script again to verify the fixes.\n`;
    markdown += `3. Continue improving the bot based on the test results.\n\n`;
    markdown += `The detailed test results are available in the \`test-results.log\` file.\n`;
    
    return markdown;
}

// Main test function
async function runTests() {
    // Initialize results object
    results = {
        startTime: Date.now(),
        endTime: null,
        duration: null,
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        skipped: 0,
        testResults: []
    };
    
    // Clear logs array
    logs = [];
    
    try {
        logger.section('JMF Hosting Discord Bot - Test Suite');
        logger.info(`Starting tests at ${new Date().toISOString()}`);
        logger.info(`Node.js version: ${process.version}`);
        logger.info(`Platform: ${process.platform} ${process.arch}`);
        logger.info(`Working directory: ${process.cwd()}`);
        
        // Test configuration
        logger.subsection('Configuration Tests');
        await runTest('Config Files', testConfigFiles);
        await runTest('Security Configuration', testSecurityConfig);
        
        // Test directory structure
        logger.subsection('Directory Structure Tests');
        await runTest('Required Directories', testDirectoryStructure);
        
        // Test database
        if (config.components.database) {
            logger.subsection('Database Tests');
            await runTest('Database Connection', testDatabaseConnection);
            await runTest('Migration Module', testMigrationModule);
        } else {
            logger.info('Skipping database tests (disabled in config)');
            results.skipped += 2;
        }
        
        // Test managers
        if (config.components.managers) {
            logger.subsection('Manager Tests');
            await runTest('Logger Manager', testLoggerManager);
            await runTest('Monitor Manager', testMonitorManager);
        } else {
            logger.info('Skipping manager tests (disabled in config)');
            results.skipped += 2;
        }
        
        // Test commands
        if (config.components.commands) {
            logger.subsection('Commands Tests');
            await runTest('Commands Loading', testCommandsLoading);
        } else {
            logger.info('Skipping commands tests (disabled in config)');
            results.skipped += 1;
        }
        
        // Test events
        if (config.components.events) {
            logger.subsection('Events Tests');
            await runTest('Events Loading', testEventsLoading);
        } else {
            logger.info('Skipping events tests (disabled in config)');
            results.skipped += 1;
        }
        
        // Test performance if enabled
        if (config.components.performance) {
            logger.subsection('Performance Tests');
            await runTest('Performance Benchmarks', testPerformance);
        } else {
            logger.info('Skipping performance tests (disabled in config)');
            results.skipped += 1;
        }
        
        // Finalize results
        results.endTime = Date.now();
        results.duration = results.endTime - results.startTime;
        
        // Print summary
        logger.section('Test Results Summary');
        logger.log(`Total tests: ${results.total}`);
        logger.log(`Passed: ${chalk.green(results.passed)}`);
        logger.log(`Failed: ${chalk.red(results.failed)}`);
        logger.log(`Warnings: ${chalk.yellow(results.warnings)}`);
        logger.log(`Skipped: ${chalk.gray(results.skipped)}`);
        logger.log(`Duration: ${results.duration}ms`);
        
        // Save logs to file
        try {
            // Save clean logs to file (without color codes)
            const logContent = cleanLogs.join('\n');
            await fs.writeFile(config.outputFile, logContent);
            logger.info(`Test results saved to ${config.outputFile}`);
            
            // Generate and save markdown summary
            const markdownSummary = await generateMarkdownSummary(results);
            await fs.writeFile(config.summaryFile, markdownSummary);
            logger.info(`Test summary saved to ${config.summaryFile}`);
            
            // Generate JSON report if enabled
            if (config.jsonReport) {
                const jsonReport = {
                    summary: {
                        timestamp: new Date().toISOString(),
                        duration: results.duration,
                        total: results.total,
                        passed: results.passed,
                        failed: results.failed,
                        warnings: results.warnings,
                        skipped: results.skipped
                    },
                    tests: results.testResults
                };
                
                await fs.writeFile(
                    config.jsonReportPath || path.join(process.cwd(), 'test-results.json'),
                    JSON.stringify(jsonReport, null, 2)
                );
                logger.info(`JSON report saved to ${config.jsonReportPath || 'test-results.json'}`);
            }
        } catch (error) {
            logger.error(`Failed to save test results: ${error.message}`);
        }
        
        // Return results
        return results;
    } catch (error) {
        logger.error('Critical error in test suite', error);
        
        // Try to save logs even if tests failed
        try {
            const logContent = logs.join('\n');
            await fs.writeFile(config.outputFile, logContent);
        } catch (saveError) {
            logger.error(`Failed to save test results: ${saveError.message}`);
        }
        
        // Re-throw the error to be caught by the main handler
        throw error;
    }
}

// Run tests
runTests()
    .then(results => {
        // Log completion message
        logger.info(`Test suite completed with ${results.failed} failures and ${results.warnings} warnings`);
        
        // Exit with appropriate code
        if (results.failed > 0) {
            logger.error('Tests failed. Exiting with code 1');
            process.exit(1);
        } else if (results.warnings > 0 && config.failOnWarnings) {
            logger.warn('Tests passed with warnings. Exiting with code 2');
            process.exit(2);
        } else {
            logger.success('All tests passed successfully!');
            process.exit(0);
        }
    })
    .catch(error => {
        logger.error('Unhandled error in test suite', error);
        process.exit(1);
    });