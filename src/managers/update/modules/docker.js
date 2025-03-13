/**
 * JMF Hosting Discord Bot - Docker Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides Docker container management for the update manager,
 * including building images, managing containers, and handling Docker-related updates.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const { execSync, spawn } = require('child_process');
const os = require('os');

class DockerModule extends BaseModule {
    /**
     * Create a new Docker module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager, {
            name: 'docker',
            version: '1.0.0',
            defaultConfig: {
                dockerfilePath: 'Dockerfile',
                composeFilePath: 'docker-compose.yml',
                imagePrefix: 'jmf-bot',
                containerPrefix: 'jmf-bot',
                registry: {
                    url: '',
                    username: '',
                    password: '',
                    enabled: false
                },
                buildArgs: {},
                autoRestart: true,
                updateTimeout: 300000, // 5 minutes
                healthCheckInterval: 5000, // 5 seconds
                healthCheckTimeout: 30000, // 30 seconds
                volumes: {
                    dataDir: './data',
                    configDir: './config',
                    logsDir: './logs'
                }
            }
        });
        
        this._containers = new Map();
        this._images = new Map();
        this._isDockerAvailable = false;
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Check if Docker is available
        this._isDockerAvailable = await this._checkDockerAvailability();
        
        if (!this._isDockerAvailable) {
            this.log('warn', 'Docker is not available on this system');
            return;
        }
        
        // Load container and image information
        await this._loadContainerInfo();
        await this._loadImageInfo();
        
        this.log('info', 'Docker module initialized');
    }

    /**
     * Check if Docker is available on the system
     * @returns {Promise<boolean>} Whether Docker is available
     * @private
     */
    async _checkDockerAvailability() {
        try {
            execSync('docker --version', { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Load container information
     * @private
     */
    async _loadContainerInfo() {
        return this.executeOperation('loadContainerInfo', async () => {
            if (!this._isDockerAvailable) {
                return;
            }
            
            try {
                const output = execSync('docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"').toString();
                const lines = output.trim().split('\n');
                
                this._containers.clear();
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    const [id, name, image, status, ports] = line.split('|');
                    
                    // Only track containers with our prefix
                    if (name.startsWith(this.getConfig('containerPrefix'))) {
                        this._containers.set(name, {
                            id,
                            name,
                            image,
                            status,
                            ports,
                            isRunning: status.toLowerCase().includes('up')
                        });
                    }
                }
                
                this.log('debug', `Loaded information for ${this._containers.size} containers`);
            } catch (error) {
                this.log('error', `Failed to load container information: ${error.message}`);
            }
        });
    }

    /**
     * Load image information
     * @private
     */
    async _loadImageInfo() {
        return this.executeOperation('loadImageInfo', async () => {
            if (!this._isDockerAvailable) {
                return;
            }
            
            try {
                const output = execSync('docker images --format "{{.Repository}}|{{.Tag}}|{{.ID}}|{{.CreatedAt}}|{{.Size}}"').toString();
                const lines = output.trim().split('\n');
                
                this._images.clear();
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    const [repository, tag, id, createdAt, size] = line.split('|');
                    
                    // Only track images with our prefix
                    if (repository.startsWith(this.getConfig('imagePrefix'))) {
                        const imageName = `${repository}:${tag}`;
                        this._images.set(imageName, {
                            repository,
                            tag,
                            id,
                            createdAt,
                            size
                        });
                    }
                }
                
                this.log('debug', `Loaded information for ${this._images.size} images`);
            } catch (error) {
                this.log('error', `Failed to load image information: ${error.message}`);
            }
        });
    }

    /**
     * Execute a Docker command
     * @param {string} command - Command to execute
     * @param {Array} args - Command arguments
     * @param {Object} [options] - Command options
     * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>} Command result
     * @private
     */
    async _executeDockerCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const fullCommand = ['docker', command, ...args].join(' ');
            this.log('debug', `Executing Docker command: ${fullCommand}`);
            
            const childProcess = spawn('docker', [command, ...args], {
                stdio: options.stdio || 'pipe',
                cwd: options.cwd || process.cwd(),
                env: { ...process.env, ...options.env }
            });
            
            let stdout = '';
            let stderr = '';
            
            if (childProcess.stdout) {
                childProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                    if (options.onStdout) {
                        options.onStdout(data.toString());
                    }
                });
            }
            
            if (childProcess.stderr) {
                childProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                    if (options.onStderr) {
                        options.onStderr(data.toString());
                    }
                });
            }
            
            childProcess.on('error', (error) => {
                reject(error);
            });
            
            childProcess.on('close', (exitCode) => {
                resolve({ stdout, stderr, exitCode });
            });
        });
    }

    /**
     * Build a Docker image
     * @param {Object} options - Build options
     * @param {string} [options.tag] - Image tag
     * @param {string} [options.dockerfile] - Path to Dockerfile
     * @param {string} [options.context] - Build context
     * @param {Object} [options.buildArgs] - Build arguments
     * @param {boolean} [options.pull=false] - Whether to pull base images
     * @param {boolean} [options.noCache=false] - Whether to use cache
     * @returns {Promise<Object>} Build result
     */
    async buildImage(options = {}) {
        return this.executeOperation('buildImage', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            const tag = options.tag || `${this.getConfig('imagePrefix')}:latest`;
            const dockerfile = options.dockerfile || this.getConfig('dockerfilePath');
            const context = options.context || '.';
            const buildArgs = { ...this.getConfig('buildArgs'), ...options.buildArgs };
            
            // Build command arguments
            const args = ['build', '--tag', tag];
            
            if (options.pull) {
                args.push('--pull');
            }
            
            if (options.noCache) {
                args.push('--no-cache');
            }
            
            // Add build arguments
            for (const [key, value] of Object.entries(buildArgs)) {
                args.push('--build-arg', `${key}=${value}`);
            }
            
            // Add Dockerfile path
            args.push('--file', dockerfile);
            
            // Add context
            args.push(context);
            
            this.log('info', `Building Docker image: ${tag}`);
            
            try {
                const result = await this._executeDockerCommand('build', args, {
                    onStdout: (data) => this.log('debug', `[BUILD] ${data.trim()}`),
                    onStderr: (data) => this.log('debug', `[BUILD] ${data.trim()}`)
                });
                
                if (result.exitCode !== 0) {
                    throw new Error(`Build failed with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                // Reload image information
                await this._loadImageInfo();
                
                this.log('success', `Built Docker image: ${tag}`);
                
                return {
                    success: true,
                    tag,
                    image: this._images.get(tag)
                };
            } catch (error) {
                this.log('error', `Failed to build Docker image: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Push a Docker image to a registry
     * @param {string} tag - Image tag
     * @returns {Promise<Object>} Push result
     */
    async pushImage(tag) {
        return this.executeOperation('pushImage', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            const registry = this.getConfig('registry');
            
            if (!registry.enabled) {
                throw new Error('Registry is not enabled in configuration');
            }
            
            // Login to registry if credentials are provided
            if (registry.url && registry.username && registry.password) {
                try {
                    await this._executeDockerCommand('login', [
                        '--username', registry.username,
                        '--password-stdin',
                        registry.url
                    ], {
                        stdio: ['pipe', 'pipe', 'pipe']
                    });
                    
                    this.log('debug', `Logged in to registry: ${registry.url}`);
                } catch (error) {
                    throw new Error(`Failed to login to registry: ${error.message}`);
                }
            }
            
            this.log('info', `Pushing Docker image: ${tag}`);
            
            try {
                const result = await this._executeDockerCommand('push', [tag], {
                    onStdout: (data) => this.log('debug', `[PUSH] ${data.trim()}`),
                    onStderr: (data) => this.log('debug', `[PUSH] ${data.trim()}`)
                });
                
                if (result.exitCode !== 0) {
                    throw new Error(`Push failed with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                this.log('success', `Pushed Docker image: ${tag}`);
                
                return {
                    success: true,
                    tag
                };
            } catch (error) {
                this.log('error', `Failed to push Docker image: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Pull a Docker image from a registry
     * @param {string} tag - Image tag
     * @returns {Promise<Object>} Pull result
     */
    async pullImage(tag) {
        return this.executeOperation('pullImage', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            this.log('info', `Pulling Docker image: ${tag}`);
            
            try {
                const result = await this._executeDockerCommand('pull', [tag], {
                    onStdout: (data) => this.log('debug', `[PULL] ${data.trim()}`),
                    onStderr: (data) => this.log('debug', `[PULL] ${data.trim()}`)
                });
                
                if (result.exitCode !== 0) {
                    throw new Error(`Pull failed with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                // Reload image information
                await this._loadImageInfo();
                
                this.log('success', `Pulled Docker image: ${tag}`);
                
                return {
                    success: true,
                    tag,
                    image: this._images.get(tag)
                };
            } catch (error) {
                this.log('error', `Failed to pull Docker image: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Run a Docker container
     * @param {Object} options - Run options
     * @param {string} options.image - Image to run
     * @param {string} [options.name] - Container name
     * @param {Array} [options.command] - Command to run
     * @param {Array} [options.ports] - Ports to expose
     * @param {Array} [options.volumes] - Volumes to mount
     * @param {Object} [options.env] - Environment variables
     * @param {boolean} [options.detach=true] - Whether to run in detached mode
     * @param {boolean} [options.remove=false] - Whether to remove the container when it exits
     * @returns {Promise<Object>} Run result
     */
    async runContainer(options) {
        return this.executeOperation('runContainer', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            if (!options.image) {
                throw new Error('Image is required');
            }
            
            const name = options.name || `${this.getConfig('containerPrefix')}-${Date.now()}`;
            const args = ['run'];
            
            if (options.detach !== false) {
                args.push('--detach');
            }
            
            if (options.remove) {
                args.push('--rm');
            }
            
            if (options.name) {
                args.push('--name', options.name);
            }
            
            // Add ports
            if (options.ports && options.ports.length > 0) {
                for (const port of options.ports) {
                    args.push('--publish', port);
                }
            }
            
            // Add volumes
            if (options.volumes && options.volumes.length > 0) {
                for (const volume of options.volumes) {
                    args.push('--volume', volume);
                }
            }
            
            // Add environment variables
            if (options.env) {
                for (const [key, value] of Object.entries(options.env)) {
                    args.push('--env', `${key}=${value}`);
                }
            }
            
            // Add image
            args.push(options.image);
            
            // Add command
            if (options.command && options.command.length > 0) {
                args.push(...options.command);
            }
            
            this.log('info', `Running Docker container: ${name} (${options.image})`);
            
            try {
                const result = await this._executeDockerCommand('run', args, {
                    onStdout: (data) => this.log('debug', `[RUN] ${data.trim()}`),
                    onStderr: (data) => this.log('debug', `[RUN] ${data.trim()}`)
                });
                
                if (result.exitCode !== 0) {
                    throw new Error(`Run failed with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                // Reload container information
                await this._loadContainerInfo();
                
                this.log('success', `Started Docker container: ${name}`);
                
                return {
                    success: true,
                    name,
                    containerId: result.stdout.trim(),
                    container: this._containers.get(name)
                };
            } catch (error) {
                this.log('error', `Failed to run Docker container: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Stop a Docker container
     * @param {string} nameOrId - Container name or ID
     * @param {number} [timeout=10] - Timeout in seconds
     * @returns {Promise<Object>} Stop result
     */
    async stopContainer(nameOrId, timeout = 10) {
        return this.executeOperation('stopContainer', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            this.log('info', `Stopping Docker container: ${nameOrId}`);
            
            try {
                const result = await this._executeDockerCommand('stop', [
                    '--time', timeout.toString(),
                    nameOrId
                ]);
                
                if (result.exitCode !== 0) {
                    throw new Error(`Stop failed with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                // Reload container information
                await this._loadContainerInfo();
                
                this.log('success', `Stopped Docker container: ${nameOrId}`);
                
                return {
                    success: true,
                    nameOrId
                };
            } catch (error) {
                this.log('error', `Failed to stop Docker container: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Remove a Docker container
     * @param {string} nameOrId - Container name or ID
     * @param {boolean} [force=false] - Whether to force removal
     * @returns {Promise<Object>} Remove result
     */
    async removeContainer(nameOrId, force = false) {
        return this.executeOperation('removeContainer', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            this.log('info', `Removing Docker container: ${nameOrId}`);
            
            const args = ['rm'];
            
            if (force) {
                args.push('--force');
            }
            
            args.push(nameOrId);
            
            try {
                const result = await this._executeDockerCommand('rm', args);
                
                if (result.exitCode !== 0) {
                    throw new Error(`Remove failed with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                // Reload container information
                await this._loadContainerInfo();
                
                this.log('success', `Removed Docker container: ${nameOrId}`);
                
                return {
                    success: true,
                    nameOrId
                };
            } catch (error) {
                this.log('error', `Failed to remove Docker container: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Get logs from a Docker container
     * @param {string} nameOrId - Container name or ID
     * @param {Object} [options] - Log options
     * @param {number} [options.tail=100] - Number of lines to show
     * @param {boolean} [options.follow=false] - Whether to follow logs
     * @param {boolean} [options.timestamps=false] - Whether to show timestamps
     * @returns {Promise<string>} Container logs
     */
    async getContainerLogs(nameOrId, options = {}) {
        return this.executeOperation('getContainerLogs', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            const args = ['logs'];
            
            if (options.tail) {
                args.push('--tail', options.tail.toString());
            }
            
            if (options.follow) {
                args.push('--follow');
            }
            
            if (options.timestamps) {
                args.push('--timestamps');
            }
            
            args.push(nameOrId);
            
            try {
                const result = await this._executeDockerCommand('logs', args);
                
                if (result.exitCode !== 0) {
                    throw new Error(`Failed to get logs with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                return result.stdout;
            } catch (error) {
                this.log('error', `Failed to get container logs: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Get Docker container information
     * @param {string} nameOrId - Container name or ID
     * @returns {Promise<Object>} Container information
     */
    async inspectContainer(nameOrId) {
        return this.executeOperation('inspectContainer', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            try {
                const result = await this._executeDockerCommand('inspect', [nameOrId]);
                
                if (result.exitCode !== 0) {
                    throw new Error(`Inspect failed with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                return JSON.parse(result.stdout)[0];
            } catch (error) {
                this.log('error', `Failed to inspect container: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Get Docker image information
     * @param {string} nameOrId - Image name or ID
     * @returns {Promise<Object>} Image information
     */
    async inspectImage(nameOrId) {
        return this.executeOperation('inspectImage', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            try {
                const result = await this._executeDockerCommand('inspect', [nameOrId]);
                
                if (result.exitCode !== 0) {
                    throw new Error(`Inspect failed with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                return JSON.parse(result.stdout)[0];
            } catch (error) {
                this.log('error', `Failed to inspect image: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Run Docker Compose
     * @param {string} command - Compose command
     * @param {Array} [args=[]] - Command arguments
     * @param {Object} [options={}] - Command options
     * @returns {Promise<Object>} Command result
     */
    async runCompose(command, args = [], options = {}) {
        return this.executeOperation('runCompose', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            const composeFile = options.composeFile || this.getConfig('composeFilePath');
            const composeArgs = ['--file', composeFile, command, ...args];
            
            this.log('info', `Running Docker Compose command: ${command}`);
            
            try {
                const result = await this._executeDockerCommand('compose', composeArgs, {
                    onStdout: (data) => this.log('debug', `[COMPOSE] ${data.trim()}`),
                    onStderr: (data) => this.log('debug', `[COMPOSE] ${data.trim()}`),
                    cwd: options.cwd || process.cwd()
                });
                
                if (result.exitCode !== 0) {
                    throw new Error(`Compose command failed with exit code ${result.exitCode}: ${result.stderr}`);
                }
                
                // Reload container information
                await this._loadContainerInfo();
                
                this.log('success', `Docker Compose command completed: ${command}`);
                
                return {
                    success: true,
                    command,
                    stdout: result.stdout,
                    stderr: result.stderr
                };
            } catch (error) {
                this.log('error', `Failed to run Docker Compose command: ${error.message}`);
                throw error;
            }
        });
    }

    /**
     * Update a service using Docker Compose
     * @param {string} service - Service name
     * @param {Object} [options={}] - Update options
     * @returns {Promise<Object>} Update result
     */
    async updateService(service, options = {}) {
        return this.executeOperation('updateService', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            const composeFile = options.composeFile || this.getConfig('composeFilePath');
            
            // Pull latest images
            if (options.pull !== false) {
                await this.runCompose('pull', [service], { composeFile });
            }
            
            // Stop the service
            await this.runCompose('stop', [service], { composeFile });
            
            // Remove the service containers
            await this.runCompose('rm', ['--force', service], { composeFile });
            
            // Start the service
            await this.runCompose('up', ['--detach', service], { composeFile });
            
            this.log('success', `Updated service: ${service}`);
            
            return {
                success: true,
                service
            };
        });
    }

    /**
     * Get list of containers
     * @param {Object} [options={}] - Filter options
     * @returns {Promise<Array>} List of containers
     */
    async getContainers(options = {}) {
        return this.executeOperation('getContainers', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            // Reload container information
            await this._loadContainerInfo();
            
            let containers = Array.from(this._containers.values());
            
            // Filter by running state
            if (options.running === true) {
                containers = containers.filter(container => container.isRunning);
            } else if (options.running === false) {
                containers = containers.filter(container => !container.isRunning);
            }
            
            // Filter by name
            if (options.name) {
                const namePattern = new RegExp(options.name);
                containers = containers.filter(container => namePattern.test(container.name));
            }
            
            // Filter by image
            if (options.image) {
                const imagePattern = new RegExp(options.image);
                containers = containers.filter(container => imagePattern.test(container.image));
            }
            
            return containers;
        });
    }

    /**
     * Get list of images
     * @param {Object} [options={}] - Filter options
     * @returns {Promise<Array>} List of images
     */
    async getImages(options = {}) {
        return this.executeOperation('getImages', async () => {
            if (!this._isDockerAvailable) {
                throw new Error('Docker is not available on this system');
            }
            
            // Reload image information
            await this._loadImageInfo();
            
            let images = Array.from(this._images.values());
            
            // Filter by repository
            if (options.repository) {
                const repoPattern = new RegExp(options.repository);
                images = images.filter(image => repoPattern.test(image.repository));
            }
            
            // Filter by tag
            if (options.tag) {
                const tagPattern = new RegExp(options.tag);
                images = images.filter(image => tagPattern.test(image.tag));
            }
            
            return images;
        });
    }

    /**
     * Check if Docker is available
     * @returns {boolean} Whether Docker is available
     */
    isDockerAvailable() {
        return this._isDockerAvailable;
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down Docker module');
        await super.shutdown();
    }
}

module.exports = DockerModule; 