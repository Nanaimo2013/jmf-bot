const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

const logger = new Logger('MonitorStart');

class MonitorSystem {
    constructor() {
        this.pidFile = path.join('data', 'monitor.pid');
        this.metricsDir = path.join('data', 'metrics');
        this.interval = 60000; // 1 minute
    }
    
    async start() {
        // Check if already running
        if (await this.isRunning()) {
            throw new Error('Monitor system is already running');
        }
        
        // Create required directories
        await fs.ensureDir(this.metricsDir);
        
        // Start monitoring process
        const monitor = spawn('node', ['src/managers/monitor/worker.js'], {
            detached: true,
            stdio: 'ignore'
        });
        
        // Save PID
        await fs.writeFile(this.pidFile, monitor.pid.toString());
        
        // Unref the process to allow the parent to exit
        monitor.unref();
        
        logger.success(`Monitor system started with PID ${monitor.pid}`);
    }
    
    async isRunning() {
        try {
            if (await fs.pathExists(this.pidFile)) {
                const pid = parseInt(await fs.readFile(this.pidFile, 'utf8'));
                
                try {
                    // Check if process is running
                    process.kill(pid, 0);
                    return true;
                } catch (error) {
                    // Process not running, clean up PID file
                    await fs.remove(this.pidFile);
                    return false;
                }
            }
            return false;
        } catch (error) {
            logger.error('Error checking monitor status:', error);
            return false;
        }
    }
    
    async collectInitialMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            system: {
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                totalMemory: os.totalmem(),
                freeMemory: os.freemem()
            },
            process: {
                pid: process.pid,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            }
        };
        
        const metricsFile = path.join(this.metricsDir, 'initial.json');
        await fs.writeJson(metricsFile, metrics, { spaces: 2 });
        
        logger.info('Initial metrics collected');
    }
}

export default async function start() {
    const monitor = new MonitorSystem();
    
    try {
        logger.info('Starting monitor system...');
        
        // Start monitoring
        await monitor.start();
        
        // Collect initial metrics
        await monitor.collectInitialMetrics();
        
        logger.success('Monitor system started successfully');
        return true;
    } catch (error) {
        logger.error('Failed to start monitor system:', error);
        throw error;
    }
} 