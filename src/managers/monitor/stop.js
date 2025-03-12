const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');

const logger = new Logger('MonitorStop');

class MonitorStopper {
    constructor() {
        this.pidFile = path.join('data', 'monitor.pid');
    }
    
    async stop() {
        try {
            if (!await fs.pathExists(this.pidFile)) {
                throw new Error('Monitor system is not running');
            }
            
            const pid = parseInt(await fs.readFile(this.pidFile, 'utf8'));
            
            try {
                // Send SIGTERM to gracefully stop the process
                process.kill(pid, 'SIGTERM');
                
                // Wait for process to exit
                await this.waitForProcessExit(pid);
                
                // Remove PID file
                await fs.remove(this.pidFile);
                
                logger.success('Monitor system stopped successfully');
            } catch (error) {
                if (error.code === 'ESRCH') {
                    logger.warn('Monitor process was not running');
                    await fs.remove(this.pidFile);
                } else {
                    throw error;
                }
            }
        } catch (error) {
            logger.error('Failed to stop monitor system:', error);
            throw error;
        }
    }
    
    async waitForProcessExit(pid) {
        const maxAttempts = 10;
        const interval = 500; // 500ms
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                process.kill(pid, 0);
                await new Promise(resolve => setTimeout(resolve, interval));
            } catch (error) {
                if (error.code === 'ESRCH') {
                    return; // Process has exited
                }
                throw error;
            }
        }
        
        // Force kill if still running
        try {
            process.kill(pid, 'SIGKILL');
            logger.warn('Monitor process was force killed');
        } catch (error) {
            if (error.code !== 'ESRCH') {
                throw error;
            }
        }
    }
    
    async saveStopMetrics() {
        const metricsDir = path.join('data', 'metrics');
        const metricsFile = path.join(metricsDir, 'stop.json');
        
        const metrics = {
            timestamp: new Date().toISOString(),
            reason: 'manual_stop',
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };
        
        await fs.writeJson(metricsFile, metrics, { spaces: 2 });
        logger.info('Stop metrics saved');
    }
}

export default async function stop() {
    const stopper = new MonitorStopper();
    
    try {
        logger.info('Stopping monitor system...');
        
        // Save metrics before stopping
        await stopper.saveStopMetrics();
        
        // Stop the monitor
        await stopper.stop();
        
        return true;
    } catch (error) {
        logger.error('Stop operation failed:', error);
        throw error;
    }
} 