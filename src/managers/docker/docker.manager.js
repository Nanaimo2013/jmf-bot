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

const BaseManager = require('../base.manager');
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
        this.logger.info('docker', 'Docker manager initialized');
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
        
        try {
            const { stdout, stderr } = await execPromise(
                `docker build -t ${imageName}:${imageTag} ${buildArgsString} .`
            );
            
            this.logger.debug('docker', `Build stdout: ${stdout}`);
            if (stderr) {
                this.logger.warn('docker', `Build stderr: ${stderr}`);
            }
            
            this.logger.success('docker', `Docker image built: ${imageName}:${imageTag}`);
        } catch (error) {
            this.logger.error('docker', `Failed to build Docker image: ${error.message}`);
            throw error;
        }
    }

    /**
     * Start the Docker container
     * @param {Object} [options] - Start options
     * @returns {Promise<void>}
     */
    async start(options = {}) {
        const { containerName, imageName, imageTag, ports, volumes, env } = { ...this.config, ...options };
        
        // Format ports
        const portsString = Object.entries(ports)
            .map(([host, container]) => `-p ${host}:${container}`)
            .join(' ');
        
        // Format volumes
        const volumesString = Object.entries(volumes)
            .map(([host, container]) => `-v ${host}:${container}`)
            .join(' ');
        
        // Format environment variables
        const envString = Object.entries(env)
            .map(([key, value]) => `-e ${key}=${value}`)
            .join(' ');
        
        this.logger.info('docker', `Starting Docker container: ${containerName}`);
        
        try {
            // Check if container exists
            const { stdout: containerList } = await execPromise(
                `docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`
            );
            
            if (containerList.includes(containerName)) {
                // Container exists, start it
                await execPromise(`docker start ${containerName}`);
            } else {
                // Container doesn't exist, create and start it
                await execPromise(
                    `docker run -d --name ${containerName} ${portsString} ${volumesString} ${envString} ${imageName}:${imageTag}`
                );
            }
            
            this.logger.success('docker', `Docker container started: ${containerName}`);
        } catch (error) {
            this.logger.error('docker', `Failed to start Docker container: ${error.message}`);
            throw error;
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
        
        try {
            await execPromise(`docker stop ${containerName}`);
            this.logger.success('docker', `Docker container stopped: ${containerName}`);
        } catch (error) {
            this.logger.error('docker', `Failed to stop Docker container: ${error.message}`);
            throw error;
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
        
        try {
            const { stdout } = await execPromise(`docker logs --tail ${tail} ${containerName}`);
            return stdout;
        } catch (error) {
            this.logger.error('docker', `Failed to get Docker logs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get the status of the Docker container
     * @param {Object} [options] - Status options
     * @returns {Promise<Object>} Container status
     */
    async getStatus(options = {}) {
        const { containerName } = { ...this.config, ...options };
        
        try {
            // Check if container exists
            const { stdout: containerList } = await execPromise(
                `docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`
            );
            
            if (!containerList.includes(containerName)) {
                return { exists: false, running: false };
            }
            
            // Check if container is running
            const { stdout: runningList } = await execPromise(
                `docker ps --filter "name=${containerName}" --format "{{.Names}}"`
            );
            
            return {
                exists: true,
                running: runningList.includes(containerName)
            };
        } catch (error) {
            this.logger.error('docker', `Failed to get Docker status: ${error.message}`);
            return { exists: false, running: false, error: error.message };
        }
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