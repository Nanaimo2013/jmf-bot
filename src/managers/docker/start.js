const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const logger = new Logger('DockerStart');

class DockerStarter {
    constructor() {
        this.containerName = 'jmf-bot';
        this.imageName = 'jmf-bot';
        this.imageTag = 'latest';
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
    
    async start() {
        // Check if container is already running
        if (await this.isContainerRunning()) {
            throw new Error('Container is already running');
        }
        
        return new Promise((resolve, reject) => {
            const startArgs = [
                'run',
                '-d',
                '--name', this.containerName,
                '--restart', 'unless-stopped',
                '-v', `${process.cwd()}/data:/app/data`,
                '-v', `${process.cwd()}/config:/app/config`,
                '--env-file', '.env',
                `${this.imageName}:${this.imageTag}`
            ];
            
            const docker = spawn('docker', startArgs, {
                stdio: 'inherit'
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Docker start failed with code ${code}`));
                }
            });
            
            docker.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async saveContainerInfo() {
        return new Promise(async (resolve, reject) => {
            const docker = spawn('docker', ['inspect', this.containerName]);
            let output = '';
            
            docker.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            docker.on('close', async (code) => {
                if (code === 0) {
                    try {
                        const containerInfo = JSON.parse(output)[0];
                        const info = {
                            id: containerInfo.Id,
                            name: this.containerName,
                            image: `${this.imageName}:${this.imageTag}`,
                            startedAt: containerInfo.State.StartedAt,
                            mounts: containerInfo.Mounts,
                            network: containerInfo.NetworkSettings
                        };
                        
                        await fs.ensureDir(path.dirname(this.containerInfoPath));
                        await fs.writeJson(this.containerInfoPath, info, { spaces: 2 });
                        
                        logger.info('Container info saved');
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error(`Docker inspect failed with code ${code}`));
                }
            });
            
            docker.on('error', (err) => {
                reject(err);
            });
        });
    }
}

export default async function start() {
    const starter = new DockerStarter();
    
    try {
        logger.info('Starting Docker container...');
        
        // Start container
        await starter.start();
        
        // Save container info
        await starter.saveContainerInfo();
        
        logger.success('Docker container started successfully');
        return true;
    } catch (error) {
        logger.error('Docker start failed:', error);
        throw error;
    }
} 