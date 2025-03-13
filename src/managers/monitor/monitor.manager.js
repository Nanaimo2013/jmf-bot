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

const BaseManager = require('../base.manager');
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
        await super.initialize(config);
        this.logger.info('monitor', 'Monitor manager initialized');
    }

    /**
     * Start monitoring
     * @returns {Promise<void>}
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('monitor', 'Monitoring is already running');
            return;
        }

        if (!this.config.enabled) {
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
        }, this.config.interval);

        this.logger.success('monitor', `Monitoring started with interval of ${this.config.interval}ms`);
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
            // Collect system metrics
            if (this.config.metrics.system) {
                await this.collectSystemMetrics();
            }

            // Collect database metrics
            if (this.config.metrics.database && global.managers?.database) {
                await this.collectDatabaseMetrics();
            }

            // Collect API metrics
            if (this.config.metrics.api && global.managers?.api) {
                await this.collectApiMetrics();
            }

            // Collect bot metrics
            if (this.config.metrics.bot && global.managers?.bot) {
                await this.collectBotMetrics();
            }

            // Check for alerts
            if (this.config.alerts.enabled) {
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
     * @returns {Promise<void>}
     */
    async collectSystemMetrics() {
        // System uptime
        this.metrics.system.uptime = os.uptime();
        this.metrics.system.processUptime = process.uptime();
        this.metrics.system.timestamp = Date.now();

        // Memory metrics
        if (this.config.metrics.memory) {
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;

            this.metrics.memory = {
                total: totalMem,
                free: freeMem,
                used: usedMem,
                percentUsed: (usedMem / totalMem) * 100,
                processMemory: process.memoryUsage()
            };
        }

        // CPU metrics
        if (this.config.metrics.cpu) {
            const cpus = os.cpus();
            let totalIdle = 0;
            let totalTick = 0;

            for (const cpu of cpus) {
                for (const type in cpu.times) {
                    totalTick += cpu.times[type];
                }
                totalIdle += cpu.times.idle;
            }

            const percentUsed = 100 - (totalIdle / totalTick) * 100;

            this.metrics.cpu = {
                cores: cpus.length,
                model: cpus[0].model,
                speed: cpus[0].speed,
                percentUsed: percentUsed,
                loadAvg: os.loadavg()
            };
        }
    }

    /**
     * Collect database metrics
     * @returns {Promise<void>}
     */
    async collectDatabaseMetrics() {
        try {
            const database = global.managers.database;
            const status = await database.getStatus();

            this.metrics.database = {
                type: status.type,
                connected: status.connected,
                ...status
            };
        } catch (error) {
            this.logger.error('monitor', `Failed to collect database metrics: ${error.message}`);
            this.metrics.database = {
                error: error.message
            };
        }
    }

    /**
     * Collect API metrics
     * @returns {Promise<void>}
     */
    async collectApiMetrics() {
        try {
            const api = global.managers.api;
            const status = await api.getStatus();

            this.metrics.api = {
                running: status.running,
                port: status.port,
                ...status
            };
        } catch (error) {
            this.logger.error('monitor', `Failed to collect API metrics: ${error.message}`);
            this.metrics.api = {
                error: error.message
            };
        }
    }

    /**
     * Collect bot metrics
     * @returns {Promise<void>}
     */
    async collectBotMetrics() {
        try {
            const bot = global.managers.bot;
            const status = await bot.getStatus();

            this.metrics.bot = {
                online: status.online,
                ping: status.ping,
                ...status
            };
        } catch (error) {
            this.logger.error('monitor', `Failed to collect bot metrics: ${error.message}`);
            this.metrics.bot = {
                error: error.message
            };
        }
    }

    /**
     * Check for alerts based on metrics
     * @returns {Promise<void>}
     */
    async checkAlerts() {
        const alerts = [];
        const thresholds = this.config.alerts.thresholds;

        // Check CPU usage
        if (this.metrics.cpu && this.metrics.cpu.percentUsed > thresholds.cpu) {
            alerts.push({
                type: 'cpu',
                message: `CPU usage is high: ${this.metrics.cpu.percentUsed.toFixed(2)}%`,
                value: this.metrics.cpu.percentUsed,
                threshold: thresholds.cpu
            });
        }

        // Check memory usage
        if (this.metrics.memory && this.metrics.memory.percentUsed > thresholds.memory) {
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
            interval: this.config.interval,
            enabled: this.config.enabled,
            lastCheck: this.metrics.system.timestamp,
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