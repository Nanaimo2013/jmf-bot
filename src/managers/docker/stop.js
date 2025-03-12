const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const logger = new Logger('DockerStop');

class DockerStopper {
    constructor() {
        this.containerName = 'jmf-bot';
        this.containerInfoPath = path.join('data', 'docker', 'container-info.json');
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
    
    async stop() {
        // Check if container is running
        if (!await this.isContainerRunning()) {
            throw new Error('Container is not running');
        }
        
        return new Promise((resolve, reject) => {
            const docker = spawn('docker', ['stop', this.containerName], {
                stdio: 'inherit'
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Docker stop failed with code ${code}`));
                }
            });
            
            docker.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async remove() {
        return new Promise((resolve, reject) => {
            const docker = spawn('docker', ['rm', this.containerName], {
                stdio: 'inherit'
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Docker remove failed with code ${code}`));
                }
            });
            
            docker.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async saveStopInfo() {
        const stopInfo = {
            containerName: this.containerName,
            stoppedAt: new Date().toISOString(),
            reason: 'manual_stop'
        };
        
        const stopInfoPath = path.join('data', 'docker', 'stop-info.json');
        await fs.ensureDir(path.dirname(stopInfoPath));
        await fs.writeJson(stopInfoPath, stopInfo, { spaces: 2 });
        
        // Remove container info since it's no longer running
        if (await fs.pathExists(this.containerInfoPath)) {
            await fs.remove(this.containerInfoPath);
        }
        
        logger.info('Stop info saved');
    }
}

export default async function stop() {
    const stopper = new DockerStopper();
    
    try {
        logger.info('Stopping Docker container...');
        
        // Stop container
        await stopper.stop();
        
        // Remove container
        await stopper.remove();
        
        // Save stop info
        await stopper.saveStopInfo();
        
        logger.success('Docker container stopped successfully');
        return true;
    } catch (error) {
        logger.error('Docker stop failed:', error);
        throw error;
    }
} 