/**
 * JMF Hosting Discord Bot - Docker Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles Docker operations for the bot, including
 * building, starting, stopping, and viewing logs for Docker containers.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base/base.manager');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class DockerManager extends BaseManager {
    /**
     * Create a new Docker manager
     * @param {Object} [options] - Manager options
     */
    constructor(options = {}) {
        super('docker', {
            version: '1.0.0',
            defaultConfig: {
                socketPath: '/var/run/docker.sock',
                containerName: 'jmf-bot',
                imageName: 'jmf-bot',
                imageTag: 'latest',
                buildArgs: {},
                ports: {
                    '3000': '3000'
                },
                volumes: {
                    './data': '/app/data',
                    './logs': '/app/logs',
                    './config': '/app/config'
                },
                env: {
                    NODE_ENV: 'production'
                }
            },
            ...options
        });
    }

    /**
     * Initialize the Docker manager
     * @param {Object} [config] - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Check if Docker is available
        try {
            await execPromise('docker --version');
            this.dockerAvailable = true;
        } catch (error) {
            this.dockerAvailable = false;
            this.logger.warn('docker', 'Docker is not available or not properly configured. Docker functionality will be limited.');
            
            // Check if we're on Windows and provide more specific guidance
            if (process.platform === 'win32') {
                this.logger.warn('docker', 'On Windows, Docker requires elevated privileges or Docker Desktop to be running.');
                this.logger.warn('docker', 'Please start Docker Desktop or run the bot with administrator privileges if you need Docker functionality.');
            }
        }
        
        this.logger.info('docker', 'Docker manager initialized');
    }

    /**
     * Execute a Docker command safely
     * @param {string} command - The command to execute
     * @param {string} operation - Description of the operation for logging
     * @returns {Promise<string>} Command output
     * @private
     */
    async _safeDockerCommand(command, operation) {
        if (!this.dockerAvailable) {
            this.logger.debug('docker', `Skipping Docker operation (${operation}) as Docker is not available`);
            return '';
        }
        
        try {
            const { stdout } = await execPromise(command);
            return stdout;
        } catch (error) {
            // Only log as error for non-connection issues
            if (!error.message.includes('connect') && !error.message.includes('pipe')) {
                this.logger.error('docker', `Failed to ${operation}: ${error.message}`);
            } else {
                this.logger.debug('docker', `Docker connection issue during ${operation}: ${error.message}`);
            }
            return '';
        }
    }

    /**
     * Build the Docker image
     * @param {Object} [options] - Build options
     * @returns {Promise<void>}
     */
    async build(options = {}) {
        const { imageName, imageTag, buildArgs } = { ...this.config, ...options };
        const buildArgsString = Object.entries(buildArgs)
            .map(([key, value]) => `--build-arg ${key}=${value}`)
            .join(' ');
        
        this.logger.info('docker', `Building Docker image: ${imageName}:${imageTag}`);
        
        const command = `docker build -t ${imageName}:${imageTag} ${buildArgsString} .`;
        const output = await this._safeDockerCommand(command, 'build Docker image');
        
        if (output) {
            this.logger.success('docker', `Docker image built successfully: ${imageName}:${imageTag}`);
        }
    }

    /**
     * Start the Docker container
     * @param {Object} [options] - Start options
     * @returns {Promise<void>}
     */
    async start(options = {}) {
        const { containerName, imageName, imageTag, ports, volumes, env } = { ...this.config, ...options };
        
        // Check if container already exists
        const containerExists = await this._safeDockerCommand(
            `docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`,
            'check if container exists'
        );
        
        if (containerExists.trim() === containerName) {
            this.logger.info('docker', `Container ${containerName} already exists, starting it...`);
            await this._safeDockerCommand(`docker start ${containerName}`, 'start existing container');
            this.logger.success('docker', `Container ${containerName} started`);
            return;
        }
        
        // Build port mappings
        const portMappings = Object.entries(ports)
            .map(([host, container]) => `-p ${host}:${container}`)
            .join(' ');
        
        // Build volume mappings
        const volumeMappings = Object.entries(volumes)
            .map(([host, container]) => `-v ${host}:${container}`)
            .join(' ');
        
        // Build environment variables
        const envVars = Object.entries(env)
            .map(([key, value]) => `-e ${key}=${value}`)
            .join(' ');
        
        this.logger.info('docker', `Starting Docker container: ${containerName}`);
        
        const command = `docker run -d --name ${containerName} ${portMappings} ${volumeMappings} ${envVars} ${imageName}:${imageTag}`;
        const output = await this._safeDockerCommand(command, 'start Docker container');
        
        if (output) {
            this.logger.success('docker', `Container ${containerName} started`);
        }
    }

    /**
     * Stop the Docker container
     * @param {Object} [options] - Stop options
     * @returns {Promise<void>}
     */
    async stop(options = {}) {
        const { containerName } = { ...this.config, ...options };
        
        this.logger.info('docker', `Stopping Docker container: ${containerName}`);
        
        const output = await this._safeDockerCommand(`docker stop ${containerName}`, 'stop Docker container');
        
        if (output) {
            this.logger.success('docker', `Container ${containerName} stopped`);
        }
    }

    /**
     * Get logs from the Docker container
     * @param {Object} [options] - Log options
     * @returns {Promise<string>} Container logs
     */
    async logs(options = {}) {
        const { containerName, tail = 100 } = { ...this.config, ...options };
        
        this.logger.info('docker', `Getting logs from Docker container: ${containerName}`);
        
        return await this._safeDockerCommand(
            `docker logs --tail ${tail} ${containerName}`,
            'get Docker container logs'
        );
    }

    /**
     * Get the status of the Docker container
     * @param {Object} [options] - Status options
     * @returns {Promise<Object>} Container status
     */
    async getStatus(options = {}) {
        const { containerName } = { ...this.config, ...options };
        
        if (!this.dockerAvailable) {
            return { 
                exists: false, 
                running: false, 
                dockerAvailable: false,
                message: 'Docker is not available on this system'
            };
        }
        
        // Check if container exists
        const containerExists = await this._safeDockerCommand(
            `docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`,
            'check if container exists'
        );
        
        if (!containerExists.includes(containerName)) {
            return { 
                exists: false, 
                running: false,
                dockerAvailable: true
            };
        }
        
        // Check if container is running
        const containerRunning = await this._safeDockerCommand(
            `docker ps --filter "name=${containerName}" --format "{{.Names}}"`,
            'check if container is running'
        );
        
        // Get container info
        const containerInfo = await this._safeDockerCommand(
            `docker inspect ${containerName} --format "{{json .}}"`,
            'get container info'
        );
        
        let info = {};
        try {
            if (containerInfo) {
                info = JSON.parse(containerInfo);
            }
        } catch (error) {
            this.logger.debug('docker', `Failed to parse container info: ${error.message}`);
        }
        
        return {
            exists: true,
            running: containerRunning.includes(containerName),
            dockerAvailable: true,
            info: info
        };
    }

    /**
     * Shut down the Docker manager
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.logger.info('docker', 'Shutting down Docker manager');
        await super.shutdown();
    }
}

module.exports = DockerManager; 