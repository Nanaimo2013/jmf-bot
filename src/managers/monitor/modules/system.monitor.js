const os = require('os');
const logger = require('../../../utils/logger');

class SystemMonitor {
    constructor(manager) {
        this.manager = manager;
        this.name = 'system';
        this.thresholds = {
            cpu: 80, // 80% CPU usage threshold
            memory: 90, // 90% memory usage threshold
            disk: 90 // 90% disk usage threshold
        };
    }

    async initialize(options = {}) {
        // Override default thresholds with user options
        this.thresholds = {
            ...this.thresholds,
            ...options.thresholds
        };

        logger.info('System monitor initialized with thresholds:', this.thresholds);
    }

    async check() {
        try {
            const cpuUsage = await this.getCPUUsage();
            const memoryUsage = this.getMemoryUsage();
            const diskUsage = await this.getDiskUsage();

            const alerts = [];

            // Check CPU usage
            if (cpuUsage > this.thresholds.cpu) {
                alerts.push({
                    type: 'cpu',
                    message: `High CPU usage: ${cpuUsage.toFixed(2)}%`,
                    level: 'warning'
                });
            }

            // Check memory usage
            if (memoryUsage > this.thresholds.memory) {
                alerts.push({
                    type: 'memory',
                    message: `High memory usage: ${memoryUsage.toFixed(2)}%`,
                    level: 'warning'
                });
            }

            // Check disk usage
            if (diskUsage > this.thresholds.disk) {
                alerts.push({
                    type: 'disk',
                    message: `High disk usage: ${diskUsage.toFixed(2)}%`,
                    level: 'warning'
                });
            }

            return {
                metrics: {
                    cpu: cpuUsage,
                    memory: memoryUsage,
                    disk: diskUsage
                },
                alerts,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error checking system metrics:', error);
            throw error;
        }
    }

    async getCPUUsage() {
        return new Promise((resolve) => {
            const startMeasure = os.cpus().map(cpu => ({
                idle: cpu.times.idle,
                total: Object.values(cpu.times).reduce((acc, time) => acc + time, 0)
            }));

            setTimeout(() => {
                const endMeasure = os.cpus().map(cpu => ({
                    idle: cpu.times.idle,
                    total: Object.values(cpu.times).reduce((acc, time) => acc + time, 0)
                }));

                const cpuUsage = startMeasure.map((start, i) => {
                    const end = endMeasure[i];
                    const idleDiff = end.idle - start.idle;
                    const totalDiff = end.total - start.total;
                    return 100 - (100 * idleDiff / totalDiff);
                });

                // Average CPU usage across all cores
                resolve(cpuUsage.reduce((acc, usage) => acc + usage, 0) / cpuUsage.length);
            }, 1000);
        });
    }

    getMemoryUsage() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        return ((totalMem - freeMem) / totalMem) * 100;
    }

    async getDiskUsage() {
        // This is a simplified version. In a real implementation,
        // you would want to use a package like 'disk-space' to get actual disk usage
        return new Promise((resolve) => {
            // Simulate disk usage check
            const usage = Math.random() * 100;
            resolve(usage);
        });
    }

    cleanup() {
        // No cleanup needed for this module
        return Promise.resolve();
    }

    isActive() {
        return true;
    }
}

module.exports = SystemMonitor; 