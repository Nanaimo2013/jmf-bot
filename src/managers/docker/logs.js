const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const logger = new Logger('DockerLogs');

class DockerLogger {
    constructor() {
        this.containerName = 'jmf-bot';
        this.logsDir = path.join('data', 'docker', 'logs');
    }
    
    async isContainerRunning() {
        return new Promise((resolve, reject) => {
            const docker = spawn('docker', ['ps', '-q', '-f', `name=${this.containerName}`]);
            let output = '';
            
            docker.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim().length > 0);
                } else {
                    reject(new Error(`Docker ps failed with code ${code}`));
                }
            });
            
            docker.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async viewLogs(tail = 100) {
        // Check if container exists
        if (!await this.isContainerRunning()) {
            throw new Error('Container is not running');
        }
        
        return new Promise((resolve, reject) => {
            const docker = spawn('docker', [
                'logs',
                '--tail', tail.toString(),
                '--timestamps',
                this.containerName
            ], {
                stdio: 'inherit'
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Docker logs failed with code ${code}`));
                }
            });
            
            docker.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async saveLogs() {
        return new Promise(async (resolve, reject) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logFile = path.join(this.logsDir, `docker-logs-${timestamp}.txt`);
            
            await fs.ensureDir(this.logsDir);
            
            const docker = spawn('docker', [
                'logs',
                '--timestamps',
                this.containerName
            ]);
            
            const writeStream = fs.createWriteStream(logFile);
            
            docker.stdout.pipe(writeStream);
            docker.stderr.pipe(writeStream);
            
            docker.on('close', (code) => {
                writeStream.end();
                if (code === 0) {
                    logger.info(`Logs saved to: ${logFile}`);
                    resolve(logFile);
                } else {
                    reject(new Error(`Docker logs failed with code ${code}`));
                }
            });
            
            docker.on('error', (err) => {
                writeStream.end();
                reject(err);
            });
        });
    }
    
    async cleanupOldLogs() {
        const files = await fs.readdir(this.logsDir);
        const logFiles = files.filter(f => f.startsWith('docker-logs-') && f.endsWith('.txt'));
        
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
        const now = Date.now();
        
        for (const file of logFiles) {
            const filePath = path.join(this.logsDir, file);
            const stats = await fs.stat(filePath);
            
            if (now - stats.mtimeMs > MAX_AGE) {
                await fs.remove(filePath);
                logger.debug(`Removed old log file: ${file}`);
            }
        }
    }
}

export default async function logs() {
    const dockerLogger = new DockerLogger();
    
    try {
        logger.info('Fetching Docker logs...');
        
        // View recent logs
        await dockerLogger.viewLogs();
        
        // Save logs to file
        await dockerLogger.saveLogs();
        
        // Cleanup old logs
        await dockerLogger.cleanupOldLogs();
        
        logger.success('Docker logs processed successfully');
        return true;
    } catch (error) {
        logger.error('Docker logs failed:', error);
        throw error;
    }
} 