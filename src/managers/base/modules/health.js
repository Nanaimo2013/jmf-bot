/**
 * JMF Hosting Discord Bot - Health Check Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides health monitoring capabilities for the bot,
 * including system diagnostics, dependency checks, and self-healing
 * mechanisms to ensure the bot remains operational.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../base.module');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class HealthModule extends BaseModule {
    /**
     * Create a new health check module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager);
        this.name = 'health';
        this.healthChecks = new Map();
        this.healthStatus = {
            overall: 'unknown',
            checks: {},
            lastCheck: null,
            history: []
        };
        this.checkInterval = null;
        this.checkFrequency = 300000; // 5 minutes
        this.maxHistorySize = 100;
        this.healthLogFile = path.join(process.cwd(), 'logs', manager.name, 'health.log');
        this.criticalThresholds = {
            memory: 90, // percentage
            cpu: 90, // percentage
            disk: 90, // percentage
            errorRate: 10 // percentage
        };
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Apply configuration
        this.checkFrequency = config.checkFrequency || this.checkFrequency;
        this.maxHistorySize = config.maxHistorySize || this.maxHistorySize;
        this.healthLogFile = config.healthLogFile || this.healthLogFile;
        
        if (config.criticalThresholds) {
            this.criticalThresholds = {
                ...this.criticalThresholds,
                ...config.criticalThresholds
            };
        }
        
        // Register default health checks
        this._registerDefaultChecks();
        
        // Register custom health checks from config
        if (config.checks && Array.isArray(config.checks)) {
            for (const check of config.checks) {
                if (check.name && check.fn && typeof check.fn === 'function') {
                    this.registerHealthCheck(check.name, check.fn, check.category);
                }
            }
        }
        
        // Register hooks
        this.manager.registerHook('beforeShutdown', this._beforeShutdown.bind(this));
        
        // Start health checks
        this._startHealthChecks();
        
        this.log('info', 'Health check module initialized');
    }

    /**
     * Register default health checks
     * @private
     */
    _registerDefaultChecks() {
        // System checks
        this.registerHealthCheck('memory', this._checkMemory.bind(this), 'system');
        this.registerHealthCheck('cpu', this._checkCpu.bind(this), 'system');
        this.registerHealthCheck('disk', this._checkDiskSpace.bind(this), 'system');
        this.registerHealthCheck('network', this._checkNetwork.bind(this), 'system');
        
        // Application checks
        this.registerHealthCheck('modules', this._checkModules.bind(this), 'application');
        this.registerHealthCheck('managers', this._checkManagers.bind(this), 'application');
        this.registerHealthCheck('errorRate', this._checkErrorRate.bind(this), 'application');
        
        // Dependency checks
        this.registerHealthCheck('dependencies', this._checkDependencies.bind(this), 'dependencies');
    }

    /**
     * Register a health check
     * @param {string} name - Name of the health check
     * @param {Function} checkFn - Health check function
     * @param {string} [category='custom'] - Category of the health check
     */
    registerHealthCheck(name, checkFn, category = 'custom') {
        this.healthChecks.set(name, {
            name,
            category,
            fn: checkFn
        });
        
        this.log('debug', `Registered health check: ${name} (${category})`);
    }

    /**
     * Start health checks
     * @private
     */
    _startHealthChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Run initial health check
        this.runHealthCheck();
        
        // Set up interval for regular checks
        this.checkInterval = setInterval(() => {
            this.runHealthCheck();
        }, this.checkFrequency);
        
        this.log('debug', `Health checks started (frequency: ${this.checkFrequency}ms)`);
    }

    /**
     * Run all health checks
     * @returns {Promise<Object>} Health check results
     */
    async runHealthCheck() {
        const timestamp = Date.now();
        const results = {
            timestamp,
            checks: {},
            overall: 'healthy'
        };
        
        try {
            // Run all registered health checks
            for (const [name, check] of this.healthChecks) {
                try {
                    const result = await check.fn();
                    results.checks[name] = {
                        status: result.status,
                        message: result.message,
                        details: result.details,
                        category: check.category
                    };
                    
                    // Update overall status
                    if (result.status === 'critical' && results.overall !== 'critical') {
                        results.overall = 'critical';
                    } else if (result.status === 'warning' && results.overall === 'healthy') {
                        results.overall = 'warning';
                    }
                } catch (error) {
                    this.log('error', `Health check '${name}' failed:`, error);
                    results.checks[name] = {
                        status: 'critical',
                        message: `Check failed: ${error.message}`,
                        details: { error: error.stack },
                        category: check.category
                    };
                    
                    // Update overall status
                    results.overall = 'critical';
                }
            }
            
            // Update health status
            this.healthStatus.overall = results.overall;
            this.healthStatus.checks = results.checks;
            this.healthStatus.lastCheck = timestamp;
            
            // Add to history
            this.healthStatus.history.unshift(results);
            
            // Trim history if needed
            if (this.healthStatus.history.length > this.maxHistorySize) {
                this.healthStatus.history = this.healthStatus.history.slice(0, this.maxHistorySize);
            }
            
            // Log health status
            this._logHealthStatus(results);
            
            // Emit health status event
            this.emitEvent('healthStatus', results);
            
            // Take action if critical
            if (results.overall === 'critical') {
                this._handleCriticalHealth(results);
            }
            
            return results;
        } catch (error) {
            this.log('error', 'Failed to run health checks:', error);
            throw error;
        }
    }

    /**
     * Log health status to file
     * @param {Object} results - Health check results
     * @private
     */
    async _logHealthStatus(results) {
        try {
            const logDir = path.dirname(this.healthLogFile);
            await fs.mkdir(logDir, { recursive: true });
            
            const logEntry = {
                timestamp: new Date(results.timestamp).toISOString(),
                overall: results.overall,
                checks: Object.entries(results.checks).map(([name, check]) => ({
                    name,
                    status: check.status,
                    message: check.message
                }))
            };
            
            await fs.appendFile(
                this.healthLogFile,
                JSON.stringify(logEntry) + '\n',
                'utf8'
            );
        } catch (error) {
            this.log('error', 'Failed to log health status:', error);
        }
    }

    /**
     * Handle critical health status
     * @param {Object} results - Health check results
     * @private
     */
    _handleCriticalHealth(results) {
        this.log('error', `CRITICAL HEALTH STATUS: ${Object.entries(results.checks)
            .filter(([, check]) => check.status === 'critical')
            .map(([name]) => name)
            .join(', ')}`);
        
        // Emit critical health event
        this.emitEvent('criticalHealth', results);
        
        // Attempt self-healing for known issues
        this._attemptSelfHealing(results);
    }

    /**
     * Attempt self-healing for known issues
     * @param {Object} results - Health check results
     * @private
     */
    async _attemptSelfHealing(results) {
        const criticalChecks = Object.entries(results.checks)
            .filter(([, check]) => check.status === 'critical')
            .map(([name]) => name);
        
        for (const check of criticalChecks) {
            this.log('info', `Attempting self-healing for: ${check}`);
            
            try {
                switch (check) {
                    case 'modules':
                        // Reload problematic modules
                        await this._healModules();
                        break;
                    
                    case 'memory':
                        // Force garbage collection if possible
                        this._healMemory();
                        break;
                    
                    default:
                        this.log('debug', `No self-healing strategy for: ${check}`);
                        break;
                }
            } catch (error) {
                this.log('error', `Self-healing failed for ${check}:`, error);
            }
        }
    }

    /**
     * Heal module issues
     * @private
     */
    async _healModules() {
        // Get problematic modules
        const moduleStatus = await this._checkModules();
        
        if (moduleStatus.details && moduleStatus.details.problematicModules) {
            for (const moduleName of moduleStatus.details.problematicModules) {
                try {
                    this.log('info', `Attempting to reload module: ${moduleName}`);
                    await this.manager.reloadModule(moduleName);
                    this.log('success', `Successfully reloaded module: ${moduleName}`);
                } catch (error) {
                    this.log('error', `Failed to reload module ${moduleName}:`, error);
                }
            }
        }
    }

    /**
     * Heal memory issues
     * @private
     */
    _healMemory() {
        this.log('info', 'Attempting to free memory');
        
        // Force garbage collection if available
        if (global.gc) {
            this.log('info', 'Forcing garbage collection');
            global.gc();
        } else {
            this.log('warn', 'Cannot force garbage collection. Run Node.js with --expose-gc flag');
        }
    }

    /**
     * Check memory usage
     * @returns {Promise<Object>} Health check result
     * @private
     */
    async _checkMemory() {
        const memoryUsage = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemoryPercentage = ((totalMemory - freeMemory) / totalMemory) * 100;
        const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        let status = 'healthy';
        let message = 'Memory usage is normal';
        
        if (usedMemoryPercentage > this.criticalThresholds.memory || heapUsedPercentage > this.criticalThresholds.memory) {
            status = 'critical';
            message = `High memory usage: ${usedMemoryPercentage.toFixed(2)}% system, ${heapUsedPercentage.toFixed(2)}% heap`;
        } else if (usedMemoryPercentage > this.criticalThresholds.memory * 0.8 || heapUsedPercentage > this.criticalThresholds.memory * 0.8) {
            status = 'warning';
            message = `Elevated memory usage: ${usedMemoryPercentage.toFixed(2)}% system, ${heapUsedPercentage.toFixed(2)}% heap`;
        }
        
        return {
            status,
            message,
            details: {
                rss: this._formatBytes(memoryUsage.rss),
                heapTotal: this._formatBytes(memoryUsage.heapTotal),
                heapUsed: this._formatBytes(memoryUsage.heapUsed),
                external: this._formatBytes(memoryUsage.external),
                systemTotal: this._formatBytes(totalMemory),
                systemFree: this._formatBytes(freeMemory),
                systemUsedPercentage: usedMemoryPercentage.toFixed(2) + '%',
                heapUsedPercentage: heapUsedPercentage.toFixed(2) + '%'
            }
        };
    }

    /**
     * Check CPU usage
     * @returns {Promise<Object>} Health check result
     * @private
     */
    async _checkCpu() {
        const loadAvg = os.loadavg();
        const cpuCount = os.cpus().length;
        const loadPercentage = (loadAvg[0] / cpuCount) * 100;
        
        let status = 'healthy';
        let message = 'CPU usage is normal';
        
        if (loadPercentage > this.criticalThresholds.cpu) {
            status = 'critical';
            message = `High CPU usage: ${loadPercentage.toFixed(2)}%`;
        } else if (loadPercentage > this.criticalThresholds.cpu * 0.8) {
            status = 'warning';
            message = `Elevated CPU usage: ${loadPercentage.toFixed(2)}%`;
        }
        
        return {
            status,
            message,
            details: {
                loadAvg1m: loadAvg[0].toFixed(2),
                loadAvg5m: loadAvg[1].toFixed(2),
                loadAvg15m: loadAvg[2].toFixed(2),
                cpuCount,
                loadPercentage: loadPercentage.toFixed(2) + '%'
            }
        };
    }

    /**
     * Check disk space
     * @returns {Promise<Object>} Health check result
     * @private
     */
    async _checkDiskSpace() {
        try {
            // This is platform-specific and might need adjustments
            let diskInfo;
            
            if (process.platform === 'win32') {
                // Windows
                const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
                const lines = stdout.trim().split('\n').slice(1);
                const drives = [];
                
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 3) {
                        const drive = parts[0];
                        const freeSpace = parseInt(parts[1], 10);
                        const totalSize = parseInt(parts[2], 10);
                        
                        if (!isNaN(freeSpace) && !isNaN(totalSize) && totalSize > 0) {
                            const usedPercentage = ((totalSize - freeSpace) / totalSize) * 100;
                            drives.push({
                                drive,
                                freeSpace: this._formatBytes(freeSpace),
                                totalSize: this._formatBytes(totalSize),
                                usedPercentage: usedPercentage.toFixed(2) + '%'
                            });
                        }
                    }
                }
                
                diskInfo = { drives };
            } else {
                // Unix-like
                const { stdout } = await execAsync('df -k / | tail -1');
                const parts = stdout.trim().split(/\s+/);
                
                if (parts.length >= 5) {
                    const totalSize = parseInt(parts[1], 10) * 1024;
                    const usedSize = parseInt(parts[2], 10) * 1024;
                    const freeSpace = parseInt(parts[3], 10) * 1024;
                    const usedPercentage = (usedSize / totalSize) * 100;
                    
                    diskInfo = {
                        drives: [{
                            drive: parts[0],
                            freeSpace: this._formatBytes(freeSpace),
                            totalSize: this._formatBytes(totalSize),
                            usedPercentage: usedPercentage.toFixed(2) + '%'
                        }]
                    };
                }
            }
            
            // Determine status
            let status = 'healthy';
            let message = 'Disk space is adequate';
            
            // Check if any drive is critically low on space
            const criticalDrives = [];
            const warningDrives = [];
            
            for (const drive of diskInfo.drives) {
                const usedPercentage = parseFloat(drive.usedPercentage);
                
                if (usedPercentage > this.criticalThresholds.disk) {
                    criticalDrives.push(drive.drive);
                } else if (usedPercentage > this.criticalThresholds.disk * 0.8) {
                    warningDrives.push(drive.drive);
                }
            }
            
            if (criticalDrives.length > 0) {
                status = 'critical';
                message = `Low disk space on: ${criticalDrives.join(', ')}`;
            } else if (warningDrives.length > 0) {
                status = 'warning';
                message = `Disk space running low on: ${warningDrives.join(', ')}`;
            }
            
            return {
                status,
                message,
                details: diskInfo
            };
        } catch (error) {
            return {
                status: 'warning',
                message: `Could not check disk space: ${error.message}`,
                details: { error: error.stack }
            };
        }
    }

    /**
     * Check network connectivity
     * @returns {Promise<Object>} Health check result
     * @private
     */
    async _checkNetwork() {
        try {
            // Simple ping to check internet connectivity
            const hosts = ['google.com', 'cloudflare.com', 'github.com'];
            const results = [];
            
            for (const host of hosts) {
                try {
                    const pingCmd = process.platform === 'win32' 
                        ? `ping -n 1 -w 1000 ${host}` 
                        : `ping -c 1 -W 1 ${host}`;
                    
                    const { stdout } = await execAsync(pingCmd);
                    const success = stdout.includes('TTL=') || stdout.includes('ttl=') || stdout.includes('time=');
                    
                    results.push({
                        host,
                        success,
                        details: success ? 'Reachable' : 'Unreachable'
                    });
                } catch (error) {
                    results.push({
                        host,
                        success: false,
                        details: `Error: ${error.message}`
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            
            let status = 'healthy';
            let message = 'Network connectivity is good';
            
            if (successCount === 0) {
                status = 'critical';
                message = 'No network connectivity';
            } else if (successCount < hosts.length) {
                status = 'warning';
                message = 'Partial network connectivity';
            }
            
            return {
                status,
                message,
                details: { pingResults: results }
            };
        } catch (error) {
            return {
                status: 'warning',
                message: `Could not check network: ${error.message}`,
                details: { error: error.stack }
            };
        }
    }

    /**
     * Check modules health
     * @returns {Promise<Object>} Health check result
     * @private
     */
    async _checkModules() {
        const modules = this.manager.modules;
        const problematicModules = [];
        
        for (const [name, module] of modules) {
            if (!module.isInitialized()) {
                problematicModules.push(name);
            }
        }
        
        let status = 'healthy';
        let message = 'All modules are healthy';
        
        if (problematicModules.length > 0) {
            status = 'critical';
            message = `Problematic modules: ${problematicModules.join(', ')}`;
        }
        
        return {
            status,
            message,
            details: {
                totalModules: modules.size,
                problematicModules
            }
        };
    }

    /**
     * Check managers health
     * @returns {Promise<Object>} Health check result
     * @private
     */
    async _checkManagers() {
        const managerNames = this.manager.getManagerNames();
        const problematicManagers = [];
        
        for (const name of managerNames) {
            try {
                const manager = await this.manager.getManager(name);
                if (!manager.isInitialized() || manager.isShuttingDown()) {
                    problematicManagers.push(name);
                }
            } catch (error) {
                problematicManagers.push(name);
            }
        }
        
        let status = 'healthy';
        let message = 'All managers are healthy';
        
        if (problematicManagers.length > 0) {
            status = 'critical';
            message = `Problematic managers: ${problematicManagers.join(', ')}`;
        }
        
        return {
            status,
            message,
            details: {
                totalManagers: managerNames.length,
                problematicManagers
            }
        };
    }

    /**
     * Check error rate
     * @returns {Promise<Object>} Health check result
     * @private
     */
    async _checkErrorRate() {
        const metrics = this.manager._metrics;
        const errorRate = metrics.operations > 0 
            ? (metrics.errors / metrics.operations) * 100 
            : 0;
        
        let status = 'healthy';
        let message = 'Error rate is acceptable';
        
        if (errorRate > this.criticalThresholds.errorRate) {
            status = 'critical';
            message = `High error rate: ${errorRate.toFixed(2)}%`;
        } else if (errorRate > this.criticalThresholds.errorRate * 0.5) {
            status = 'warning';
            message = `Elevated error rate: ${errorRate.toFixed(2)}%`;
        }
        
        return {
            status,
            message,
            details: {
                operations: metrics.operations,
                errors: metrics.errors,
                errorRate: errorRate.toFixed(2) + '%'
            }
        };
    }

    /**
     * Check dependencies
     * @returns {Promise<Object>} Health check result
     * @private
     */
    async _checkDependencies() {
        const dependencies = this.manager._dependencies;
        const missingDependencies = [];
        
        for (const dependency of dependencies) {
            try {
                await this.manager.getManager(dependency);
            } catch (error) {
                missingDependencies.push(dependency);
            }
        }
        
        let status = 'healthy';
        let message = 'All dependencies are available';
        
        if (missingDependencies.length > 0) {
            status = 'critical';
            message = `Missing dependencies: ${missingDependencies.join(', ')}`;
        }
        
        return {
            status,
            message,
            details: {
                totalDependencies: dependencies.length,
                missingDependencies
            }
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
     * Get health status
     * @returns {Object} Health status
     */
    getHealthStatus() {
        return {
            overall: this.healthStatus.overall,
            lastCheck: this.healthStatus.lastCheck 
                ? new Date(this.healthStatus.lastCheck).toISOString() 
                : null,
            checks: this.healthStatus.checks
        };
    }

    /**
     * Get health history
     * @param {number} [limit=10] - Maximum number of history entries to return
     * @returns {Array} Health history
     */
    getHealthHistory(limit = 10) {
        return this.healthStatus.history
            .slice(0, limit)
            .map(entry => ({
                timestamp: new Date(entry.timestamp).toISOString(),
                overall: entry.overall
            }));
    }

    /**
     * Hook called before manager shutdown
     * @private
     */
    async _beforeShutdown() {
        // Run final health check
        await this.runHealthCheck();
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down health check module');
        
        // Stop health checks
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
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
            health: {
                overall: this.healthStatus.overall,
                lastCheck: this.healthStatus.lastCheck
            }
        };
    }
}

module.exports = HealthModule; 