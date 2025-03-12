const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const logger = new Logger('DockerBuild');

class DockerBuilder {
    constructor() {
        this.dockerfilePath = 'Dockerfile';
        this.contextPath = '.';
        this.imageName = 'jmf-bot';
        this.imageTag = 'latest';
    }
    
    async validateDockerfile() {
        if (!await fs.pathExists(this.dockerfilePath)) {
            throw new Error('Dockerfile not found');
        }
        
        const content = await fs.readFile(this.dockerfilePath, 'utf8');
        const requiredInstructions = ['FROM', 'WORKDIR', 'COPY', 'RUN', 'CMD'];
        
        for (const instruction of requiredInstructions) {
            if (!content.includes(instruction)) {
                logger.warn(`Dockerfile missing recommended instruction: ${instruction}`);
            }
        }
        
        return true;
    }
    
    async build() {
        return new Promise((resolve, reject) => {
            const buildArgs = [
                'build',
                '-t',
                `${this.imageName}:${this.imageTag}`,
                '-f',
                this.dockerfilePath,
                this.contextPath
            ];
            
            const docker = spawn('docker', buildArgs, {
                stdio: 'inherit'
            });
            
            docker.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Docker build failed with code ${code}`));
                }
            });
            
            docker.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async saveImageInfo() {
        const imageInfo = {
            name: this.imageName,
            tag: this.imageTag,
            builtAt: new Date().toISOString(),
            context: this.contextPath
        };
        
        const infoPath = path.join('data', 'docker', 'image-info.json');
        await fs.ensureDir(path.dirname(infoPath));
        await fs.writeJson(infoPath, imageInfo, { spaces: 2 });
        
        logger.info('Image info saved');
    }
}

export default async function build() {
    const builder = new DockerBuilder();
    
    try {
        logger.info('Starting Docker build process...');
        
        // Validate Dockerfile
        await builder.validateDockerfile();
        
        // Build image
        await builder.build();
        
        // Save image info
        await builder.saveImageInfo();
        
        logger.success('Docker image built successfully');
        return true;
    } catch (error) {
        logger.error('Docker build failed:', error);
        throw error;
    }
} 