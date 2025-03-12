const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const moment = require('moment');

const logger = new Logger('MonitorStatus');

class MonitorStatus {
    constructor() {
        this.pidFile = path.join('data', 'monitor.pid');
        this.metricsDir = path.join('data', 'metrics');
    }
    
    async getProcessStatus() {
        try {
            if (!await fs.pathExists(this.pidFile)) {
                return {
                    running: false,
                    message: 'Monitor system is not running'
                };
            }
            
            const pid = parseInt(await fs.readFile(this.pidFile, 'utf8'));
            
            try {
                process.kill(pid, 0);
                return {
                    running: true,
                    pid,
                    message: 'Monitor system is running'
                };
            } catch (error) {
                await fs.remove(this.pidFile);
                return {
                    running: false,
                    message: 'Monitor process has died'
                };
            }
        } catch (error) {
            logger.error('Error checking process status:', error);
            return {
                running: false,
                message: 'Error checking monitor status'
            };
        }
    }
    
    async getMetricsStatus() {
        try {
            const files = await fs.readdir(this.metricsDir);
            const metricsFiles = files.filter(f => f.endsWith('.json'));
            
            const metrics = [];
            for (const file of metricsFiles) {
                const content = await fs.readJson(path.join(this.metricsDir, file));
                metrics.push({
                    file,
                    timestamp: content.timestamp,
                    ...content
                });
            }
            
            return {
                totalFiles: metricsFiles.length,
                latestMetric: metrics.sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                )[0]
            };
        } catch (error) {
            logger.error('Error checking metrics status:', error);
            return {
                totalFiles: 0,
                error: error.message
            };
        }
    }
    
    async getSystemStatus() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            uptime: os.uptime(),
            loadAvg: os.loadavg()
        };
    }
    
    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
    
    formatUptime(seconds) {
        return moment.duration(seconds, 'seconds').humanize();
    }
    
    async printStatus(status) {
        const { process, metrics, system } = status;
        
        logger.info('=== Monitor Status ===');
        logger.info(`Process: ${process.message}`);
        if (process.running) {
            logger.info(`PID: ${process.pid}`);
        }
        
        logger.info('\n=== Metrics ===');
        logger.info(`Total metric files: ${metrics.totalFiles}`);
        if (metrics.latestMetric) {
            logger.info(`Latest metric: ${moment(metrics.latestMetric.timestamp).fromNow()}`);
        }
        
        logger.info('\n=== System ===');
        logger.info(`Platform: ${system.platform} (${system.arch})`);
        logger.info(`CPUs: ${system.cpus}`);
        logger.info(`Memory: ${this.formatBytes(system.memory.used)} used of ${this.formatBytes(system.memory.total)}`);
        logger.info(`Uptime: ${this.formatUptime(system.uptime)}`);
        logger.info(`Load Average: ${system.loadAvg.map(load => load.toFixed(2)).join(', ')}`);
    }
}

export default async function status() {
    const monitor = new MonitorStatus();
    
    try {
        logger.info('Checking monitor status...');
        
        const status = {
            process: await monitor.getProcessStatus(),
            metrics: await monitor.getMetricsStatus(),
            system: await monitor.getSystemStatus()
        };
        
        await monitor.printStatus(status);
        
        return status;
    } catch (error) {
        logger.error('Status check failed:', error);
        throw error;
    }
} 