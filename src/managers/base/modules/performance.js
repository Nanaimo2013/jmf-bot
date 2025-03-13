/**
 * JMF Hosting Discord Bot - Performance Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides performance monitoring capabilities for the bot,
 * tracking metrics like memory usage, operation times, and system load.
 * It helps identify bottlenecks and optimize performance.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../base.module');
const os = require('os');
const v8 = require('v8');
const fs = require('fs').promises;
const path = require('path');

class PerformanceModule extends BaseModule {
    /**
     * Create a new performance module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager);
        this.name = 'performance';
        this.metrics = {
            memory: [],
            cpu: [],
            operations: new Map(),
            slowOperations: []
        };
        this.maxMetricsHistory = 100;
        this.maxSlowOperations = 50;
        this.slowOperationThreshold = 1000; // ms
        this.monitoringInterval = null;
        this.monitoringFrequency = 60000; // 1 minute
        this.metricsFile = path.join(process.cwd(), 'data', manager.name, 'performance.json');
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Apply configuration
        this.maxMetricsHistory = config.maxMetricsHistory || this.maxMetricsHistory;
        this.maxSlowOperations = config.maxSlowOperations || this.maxSlowOperations;
        this.slowOperationThreshold = config.slowOperationThreshold || this.slowOperationThreshold;
        this.monitoringFrequency = config.monitoringFrequency || this.monitoringFrequency;
        this.metricsFile = config.metricsFile || this.metricsFile;
        
        // Register event listeners
        this.manager.on('operationComplete', this._onOperationComplete.bind(this));
        
        // Register hooks
        this.manager.registerHook('beforeShutdown', this._beforeShutdown.bind(this));
        
        // Start monitoring
        this._startMonitoring();
        
        // Load previous metrics if available
        await this._loadMetrics();
        
        this.log('info', 'Performance module initialized');
    }

    /**
     * Start performance monitoring
     * @private
     */
    _startMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        // Collect initial metrics
        this._collectMetrics();
        
        // Set up interval for regular collection
        this.monitoringInterval = setInterval(() => {
            this._collectMetrics();
        }, this.monitoringFrequency);
        
        this.log('debug', `Performance monitoring started (frequency: ${this.monitoringFrequency}ms)`);
    }

    /**
     * Collect performance metrics
     * @private
     */
    _collectMetrics() {
        const timestamp = Date.now();
        
        // Memory metrics
        const memoryUsage = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();
        
        this.metrics.memory.push({
            timestamp,
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
            heapSizeLimit: heapStats.heap_size_limit,
            mallocedMemory: heapStats.malloced_memory,
            peakMallocedMemory: heapStats.peak_malloced_memory
        });
        
        // CPU metrics
        const cpuUsage = process.cpuUsage();
        const loadAvg = os.loadavg();
        
        this.metrics.cpu.push({
            timestamp,
            user: cpuUsage.user,
            system: cpuUsage.system,
            loadAvg1m: loadAvg[0],
            loadAvg5m: loadAvg[1],
            loadAvg15m: loadAvg[2],
            cpuCount: os.cpus().length
        });
        
        // Trim history if needed
        if (this.metrics.memory.length > this.maxMetricsHistory) {
            this.metrics.memory = this.metrics.memory.slice(-this.maxMetricsHistory);
        }
        
        if (this.metrics.cpu.length > this.maxMetricsHistory) {
            this.metrics.cpu = this.metrics.cpu.slice(-this.maxMetricsHistory);
        }
        
        // Save metrics periodically
        this._saveMetrics();
    }

    /**
     * Handle operation completion event
     * @param {Object} data - Event data
     * @private
     */
    _onOperationComplete({ operation, duration }) {
        // Track operation times
        if (!this.metrics.operations.has(operation)) {
            this.metrics.operations.set(operation, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                avgTime: 0,
                lastTime: 0
            });
        }
        
        const stats = this.metrics.operations.get(operation);
        stats.count++;
        stats.totalTime += duration;
        stats.minTime = Math.min(stats.minTime, duration);
        stats.maxTime = Math.max(stats.maxTime, duration);
        stats.avgTime = stats.totalTime / stats.count;
        stats.lastTime = duration;
        
        // Track slow operations
        if (duration > this.slowOperationThreshold) {
            this.metrics.slowOperations.unshift({
                timestamp: Date.now(),
                operation,
                duration
            });
            
            // Trim slow operations list if needed
            if (this.metrics.slowOperations.length > this.maxSlowOperations) {
                this.metrics.slowOperations = this.metrics.slowOperations.slice(0, this.maxSlowOperations);
            }
            
            this.log('warn', `Slow operation detected: ${operation} (${duration}ms)`);
        }
    }

    /**
     * Save metrics to file
     * @private
     */
    async _saveMetrics() {
        try {
            const metricsDir = path.dirname(this.metricsFile);
            await fs.mkdir(metricsDir, { recursive: true });
            
            const data = {
                timestamp: Date.now(),
                memory: this.metrics.memory.slice(-5), // Save only the most recent memory metrics
                cpu: this.metrics.cpu.slice(-5), // Save only the most recent CPU metrics
                operations: Array.from(this.metrics.operations.entries()).map(([name, stats]) => ({
                    name,
                    ...stats
                })),
                slowOperations: this.metrics.slowOperations.slice(0, 10) // Save only the 10 most recent slow operations
            };
            
            await fs.writeFile(this.metricsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            this.log('error', 'Failed to save performance metrics:', error);
        }
    }

    /**
     * Load metrics from file
     * @private
     */
    async _loadMetrics() {
        try {
            const data = await fs.readFile(this.metricsFile, 'utf8');
            const metrics = JSON.parse(data);
            
            // Restore operations map
            if (metrics.operations) {
                for (const op of metrics.operations) {
                    this.metrics.operations.set(op.name, {
                        count: op.count,
                        totalTime: op.totalTime,
                        minTime: op.minTime,
                        maxTime: op.maxTime,
                        avgTime: op.avgTime,
                        lastTime: op.lastTime
                    });
                }
            }
            
            // Restore slow operations
            if (metrics.slowOperations) {
                this.metrics.slowOperations = metrics.slowOperations;
            }
            
            this.log('debug', 'Loaded performance metrics from file');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.log('error', 'Failed to load performance metrics:', error);
            }
        }
    }

    /**
     * Get current memory usage
     * @returns {Object} Memory usage statistics
     */
    getMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();
        
        return {
            rss: this._formatBytes(memoryUsage.rss),
            heapTotal: this._formatBytes(memoryUsage.heapTotal),
            heapUsed: this._formatBytes(memoryUsage.heapUsed),
            external: this._formatBytes(memoryUsage.external),
            arrayBuffers: this._formatBytes(memoryUsage.arrayBuffers),
            heapSizeLimit: this._formatBytes(heapStats.heap_size_limit),
            heapUsedPercentage: ((memoryUsage.heapUsed / heapStats.heap_size_limit) * 100).toFixed(2) + '%'
        };
    }

    /**
     * Get CPU usage statistics
     * @returns {Object} CPU usage statistics
     */
    getCpuUsage() {
        const cpuUsage = process.cpuUsage();
        const loadAvg = os.loadavg();
        const cpuCount = os.cpus().length;
        
        return {
            user: this._formatTime(cpuUsage.user),
            system: this._formatTime(cpuUsage.system),
            loadAvg1m: loadAvg[0].toFixed(2),
            loadAvg5m: loadAvg[1].toFixed(2),
            loadAvg15m: loadAvg[2].toFixed(2),
            cpuCount,
            loadPercentage: ((loadAvg[0] / cpuCount) * 100).toFixed(2) + '%'
        };
    }

    /**
     * Get operation statistics
     * @returns {Array} Operation statistics
     */
    getOperationStats() {
        return Array.from(this.metrics.operations.entries()).map(([name, stats]) => ({
            name,
            count: stats.count,
            totalTime: this._formatTime(stats.totalTime),
            minTime: this._formatTime(stats.minTime),
            maxTime: this._formatTime(stats.maxTime),
            avgTime: this._formatTime(stats.avgTime),
            lastTime: this._formatTime(stats.lastTime)
        }));
    }

    /**
     * Get slow operations
     * @returns {Array} Slow operations
     */
    getSlowOperations() {
        return this.metrics.slowOperations.map(op => ({
            timestamp: new Date(op.timestamp).toISOString(),
            operation: op.operation,
            duration: this._formatTime(op.duration)
        }));
    }

    /**
     * Get system information
     * @returns {Object} System information
     */
    getSystemInfo() {
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            uptime: this._formatDuration(process.uptime() * 1000),
            systemUptime: this._formatDuration(os.uptime() * 1000),
            hostname: os.hostname(),
            totalMemory: this._formatBytes(os.totalmem()),
            freeMemory: this._formatBytes(os.freemem()),
            cpus: os.cpus().map(cpu => ({
                model: cpu.model,
                speed: cpu.speed + ' MHz'
            }))
        };
    }

    /**
     * Format bytes to human-readable string
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     * @private
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format time to human-readable string
     * @param {number} time - Time in milliseconds
     * @returns {string} Formatted string
     * @private
     */
    _formatTime(time) {
        if (time < 1) return time.toFixed(2) + ' μs';
        if (time < 1000) return time.toFixed(2) + ' ms';
        if (time < 60000) return (time / 1000).toFixed(2) + ' s';
        
        return (time / 60000).toFixed(2) + ' min';
    }

    /**
     * Format duration to human-readable string
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted string
     * @private
     */
    _formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        
        return `${seconds}s`;
    }

    /**
     * Hook called before manager shutdown
     * @private
     */
    async _beforeShutdown() {
        // Save metrics before shutdown
        await this._saveMetrics();
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down performance module');
        
        // Stop monitoring
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        // Save final metrics
        await this._saveMetrics();
        
        await super.shutdown();
    }

    /**
     * Get the status of the module
     * @returns {Promise<Object>} Status object
     */
    async getStatus() {
        const baseStatus = await super.getStatus();
        
        return {
            ...baseStatus,
            metrics: {
                memoryUsage: this.getMemoryUsage(),
                cpuUsage: this.getCpuUsage(),
                operationCount: this.metrics.operations.size,
                slowOperationCount: this.metrics.slowOperations.length
            }
        };
    }
}

module.exports = PerformanceModule; 