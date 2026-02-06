/**
 * JMF Hosting Discord Bot - Monitor Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles monitoring of the bot and its services,
 * including health checks, performance metrics, and alerts.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base/base.manager');
const path = require('path');
const os = require('os');

class MonitorManager extends BaseManager {
    /**
     * Create a new Monitor manager
     * @param {Object} [options] - Manager options
     */
    constructor(options = {}) {
        super('monitor', {
            version: '1.0.0',
            defaultConfig: {
                interval: 60000, // 1 minute
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
                },
                alerts: {
                    enabled: true,
                    thresholds: {
                        cpu: 80, // percent
                        memory: 80, // percent
                        disk: 80, // percent
                        responseTime: 1000 // ms
                    }
                }
            },
            ...options
        });

        this.metrics = {
            system: {},
            memory: {},
            cpu: {},
            disk: {},
            network: {},
            database: {},
            api: {},
            bot: {}
        };

        this.monitorInterval = null;
        this.isRunning = false;
    }

    /**
     * Initialize the Monitor manager
     * @param {Object} [config] - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        try {
            // Initialize base manager first
            await super.initialize(config);
            
            // Ensure metrics structure exists
            this.metrics = {
                system: {},
                memory: {},
                cpu: {},
                disk: {},
                network: {},
                database: {},
                api: {},
                bot: {}
            };

            // Ensure config exists with defaults
            this.config = {
                interval: 60000, // 1 minute
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
                },
                alerts: {
                    enabled: true,
                    thresholds: {
                        cpu: 80, // percent
                        memory: 80, // percent
                        disk: 80, // percent
                        responseTime: 1000 // ms
                    }
                },
                ...config // Override defaults with provided config
            };

            // Initialize monitoring state
            this.monitorInterval = null;
            this.isRunning = false;

            this.logger.info('monitor', 'Monitor manager initialized successfully');
        } catch (error) {
            this.logger.error('monitor', `Failed to initialize monitor manager: ${error.message}`);
            throw error;
        }
    }

    /**
     * Start monitoring
     * @returns {Promise<void>}
     */
    async start() {
        try {
            // Check initialization
            if (!this._initialized) {
                throw new Error('Monitor manager must be initialized before starting');
            }

            if (this.isRunning) {
                this.logger.warn('monitor', 'Monitoring is already running');
                return;
            }

            if (this.config.enabled === false) {
                this.logger.info('monitor', 'Monitoring is disabled in configuration');
                return;
            }

            this.logger.info('monitor', 'Starting monitoring...');
            this.isRunning = true;

            // Run initial check
            await this.check();

            // Set up interval
            this.monitorInterval = setInterval(() => {
                this.check().catch(error => {
                    this.logger.error('monitor', `Monitoring check failed: ${error.message}`);
                });
            }, this.config.interval || 60000);

            this.logger.success('monitor', `Monitoring started with interval of ${this.config.interval || 60000}ms`);
        } catch (error) {
            this.isRunning = false;
            this.logger.error('monitor', `Failed to start monitoring: ${error.message}`);
            throw error;
        }
    }

    /**
     * Stop monitoring
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.isRunning) {
            this.logger.warn('monitor', 'Monitoring is not running');
            return;
        }

        this.logger.info('monitor', 'Stopping monitoring...');

        // Clear interval
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }

        this.isRunning = false;
        this.logger.success('monitor', 'Monitoring stopped');
    }

    /**
     * Run a monitoring check
     * @returns {Promise<Object>} Monitoring metrics
     */
    async check() {
        this.logger.debug('monitor', 'Running monitoring check...');

        try {
            // Ensure config and metrics are initialized
            if (!this.config) {
                this.config = this.defaultConfig || {
                    interval: 60000,
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
                    },
                    alerts: {
                        enabled: true,
                        thresholds: {
                            cpu: 80, // percent
                            memory: 80, // percent
                            disk: 80, // percent
                            responseTime: 1000 // ms
                        }
                    }
                };
            }

            if (!this.metrics) {
                this.metrics = {
                    system: {},
                    memory: {},
                    cpu: {},
                    disk: {},
                    network: {},
                    database: {},
                    api: {},
                    bot: {}
                };
            }

            // Collect metrics
            if (this.config.metrics.system) {
                this.metrics.system = await this.collectSystemMetrics();
            }

            if (this.config.metrics.database) {
                this.metrics.database = await this.collectDatabaseMetrics();
            }

            if (this.config.metrics.api) {
                this.metrics.api = await this.collectApiMetrics();
            }

            if (this.config.metrics.bot) {
                this.metrics.bot = await this.collectBotMetrics();
            }

            // Check for alerts
            if (this.config.alerts && this.config.alerts.enabled) {
                await this.checkAlerts();
            }

            this.logger.debug('monitor', 'Monitoring check completed');
            return this.metrics;
        } catch (error) {
            this.logger.error('monitor', `Monitoring check failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Collect system metrics
     * @returns {Promise<Object>} System metrics
     */
    async collectSystemMetrics() {
        try {
            // CPU metrics
            const cpuUsage = process.cpuUsage();
            const cpuInfo = os.cpus();
            const cpuCount = cpuInfo.length;
            const cpuModel = cpuInfo[0].model;
            const cpuSpeed = cpuInfo[0].speed;
            
            // Memory metrics
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const memoryUsagePercent = (usedMemory / totalMemory) * 100;
            
            // System metrics
            const uptime = os.uptime();
            const platform = os.platform();
            const release = os.release();
            const hostname = os.hostname();
            
            // Process metrics
            const processUptime = process.uptime();
            const processMemoryUsage = process.memoryUsage();
            
            // Combine metrics
            const metrics = {
                cpu: {
                    count: cpuCount,
                    model: cpuModel,
                    speed: cpuSpeed,
                    usage: {
                        user: cpuUsage.user,
                        system: cpuUsage.system
                    }
                },
                memory: {
                    total: totalMemory,
                    free: freeMemory,
                    used: usedMemory,
                    usagePercent: memoryUsagePercent
                },
                system: {
                    uptime,
                    platform,
                    release,
                    hostname
                },
                process: {
                    uptime: processUptime,
                    memory: processMemoryUsage
                },
                timestamp: new Date().toISOString()
            };
            
            return metrics;
        } catch (error) {
            this.logger.error('monitor', `Failed to collect system metrics: ${error.message}`);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Collect database metrics
     * @returns {Promise<Object>} Database metrics
     */
    async collectDatabaseMetrics() {
        if (!this.config.metrics.database) {
            return {};
        }

        try {
            const database = await this.getManager('database');
            
            if (!database) {
                this.logger.debug('Database manager not available, skipping metrics collection');
                return {
                    status: 'unavailable',
                    message: 'Database manager not available'
                };
            }
            
            // Check if database is initialized
            if (!database.isInitialized()) {
                this.logger.debug('Database manager not initialized, skipping metrics collection');
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
                this.logger.warn(`Failed to get database status: ${error.message}`);
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
                this.logger.warn(`Failed to get database stats: ${error.message}`);
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
                                enabled: typeof module.isEnabled === 'function' ? module.isEnabled() : false,
                                initialized: typeof module.isInitialized === 'function' ? module.isInitialized() : false
                            };
                        }
                    } catch (error) {
                        this.logger.warn(`Failed to get status for module ${name}: ${error.message}`);
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
            this.logger.error(`Error collecting database metrics: ${error.message}`);
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get database file statistics
     * @param {string} dbPath - Path to the database file
     * @returns {Promise<Object>} Database statistics
     * @private
     */
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

    /**
     * Collect API metrics
     * @returns {Promise<Object>} API metrics
     */
    async collectApiMetrics() {
        if (!this.config.metrics.api) {
            return {};
        }

        try {
            const api = await this.getManager('api');
            
            if (!api) {
                this.logger.debug('API manager not available, skipping metrics collection');
                return {
                    status: 'unavailable',
                    message: 'API manager not available'
                };
            }
            
            // Check if server and config exist
            if (!api.server || !api.config) {
                return {
                    status: 'not_running',
                    message: 'API server not running or not configured'
                };
            }
            
            // Safely access port
            const port = api.config && api.config.port ? api.config.port : 'unknown';
            
            return {
                status: api.server ? 'running' : 'stopped',
                port: port,
                uptime: api.server ? Math.floor(process.uptime()) : 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('monitor', `Failed to collect API metrics: ${error.message}`);
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Collect bot metrics
     * @returns {Promise<Object>} Bot metrics
     */
    async collectBotMetrics() {
        try {
            const manager = this.getManager('bot');
            if (!manager) {
                this.logger.error('monitor', 'Failed to load bot manager');
                return {
                    status: 'error',
                    error: 'Bot manager not found',
                    metrics: {}
                };
            }

            // Check if bot manager is initialized
            if (!manager.isInitialized()) {
                return {
                    status: 'not_initialized',
                    error: 'Bot manager not initialized',
                    metrics: {}
                };
            }

            // Get bot client
            const client = manager.client;
            if (!client) {
                return {
                    status: 'error',
                    error: 'Bot client not found',
                    metrics: {}
                };
            }

            // Collect metrics
            const metrics = {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                guilds: client.guilds.cache.size,
                users: client.users.cache.size,
                channels: client.channels.cache.size,
                emojis: client.emojis.cache.size,
                ping: client.ws.ping,
                shardCount: client.shard?.count || 1,
                shardId: client.shard?.ids?.[0] || 0,
                readyTimestamp: client.readyTimestamp,
                process: {
                    pid: process.pid,
                    platform: process.platform,
                    version: process.version,
                    arch: process.arch,
                    cpuUsage: process.cpuUsage(),
                    resourceUsage: process.resourceUsage()
                }
            };

            return {
                status: 'ok',
                metrics
            };
        } catch (error) {
            this.logger.error('monitor', `Failed to collect bot metrics: ${error.message}`);
            return {
                status: 'error',
                error: error.message,
                metrics: {}
            };
        }
    }

    /**
     * Check for alerts based on metrics
     * @returns {Promise<void>}
     */
    async checkAlerts() {
        const alerts = [];
        
        // Ensure alerts config exists
        if (!this.config.alerts) {
            this.config.alerts = {
                enabled: true,
                thresholds: {
                    cpu: 80,
                    memory: 80,
                    disk: 80,
                    responseTime: 1000
                }
            };
        }
        
        // Ensure thresholds exist
        if (!this.config.alerts.thresholds) {
            this.config.alerts.thresholds = {
                cpu: 80,
                memory: 80,
                disk: 80,
                responseTime: 1000
            };
        }
        
        const thresholds = this.config.alerts.thresholds;

        // Check CPU usage
        if (this.metrics?.cpu?.percentUsed !== undefined && 
            thresholds?.cpu !== undefined && 
            this.metrics.cpu.percentUsed > thresholds.cpu) {
            alerts.push({
                type: 'cpu',
                message: `CPU usage is high: ${this.metrics.cpu.percentUsed.toFixed(2)}%`,
                value: this.metrics.cpu.percentUsed,
                threshold: thresholds.cpu
            });
        }

        // Check memory usage
        if (this.metrics?.memory?.percentUsed !== undefined && 
            thresholds?.memory !== undefined && 
            this.metrics.memory.percentUsed > thresholds.memory) {
            alerts.push({
                type: 'memory',
                message: `Memory usage is high: ${this.metrics.memory.percentUsed.toFixed(2)}%`,
                value: this.metrics.memory.percentUsed,
                threshold: thresholds.memory
            });
        }

        // Log alerts
        for (const alert of alerts) {
            this.logger.warn('monitor', `ALERT: ${alert.message}`);
            this.emit('alert', alert);
        }

        return alerts;
    }

    /**
     * Get monitoring metrics
     * @returns {Object} Current metrics
     */
    getMetrics() {
        return this.metrics;
    }

    /**
     * Get monitoring status
     * @returns {Object} Monitoring status
     */
    getStatus() {
        return {
            running: this.isRunning,
            interval: this.config?.interval || 60000,
            enabled: this.config?.enabled !== false,
            lastCheck: this.metrics?.system?.timestamp || null,
            metrics: this.getMetrics()
        };
    }

    /**
     * Shut down the Monitor manager
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.logger.info('monitor', 'Shutting down Monitor manager');
        await this.stop();
        await super.shutdown();
    }
}

module.exports = MonitorManager; 