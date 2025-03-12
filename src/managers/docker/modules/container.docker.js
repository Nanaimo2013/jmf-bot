const Docker = require('dockerode');
const logger = require('../../../utils/logger');

class ContainerDocker {
    constructor(manager) {
        this.manager = manager;
        this.name = 'container';
        this.type = 'container';
        this.docker = null;
    }

    async initialize(config) {
        try {
            this.docker = new Docker(config.docker || {});
            await this.docker.ping();
            logger.info('Docker container module initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Docker container module:', error);
            throw error;
        }
    }

    async runContainer(options = {}) {
        try {
            const containerOptions = {
                Image: options.image,
                name: options.name,
                Env: this._formatEnvVars(options.env),
                HostConfig: {
                    PortBindings: this._formatPortBindings(options.ports),
                    Binds: this._formatVolumes(options.volumes),
                    RestartPolicy: {
                        Name: options.restart || 'no'
                    },
                    NetworkMode: options.network
                },
                ...options.containerConfig
            };

            // Create container
            const container = await this.docker.createContainer(containerOptions);
            
            // Start container
            await container.start();
            
            const info = await container.inspect();
            logger.info(`Container started: ${info.Id}`);
            
            return info.Id;
        } catch (error) {
            logger.error('Failed to run container:', error);
            throw error;
        }
    }

    async stopContainer(containerId, options = {}) {
        try {
            const container = this.docker.getContainer(containerId);
            
            if (options.timeout) {
                await container.stop({ t: options.timeout });
            } else {
                await container.stop();
            }
            
            logger.info(`Container stopped: ${containerId}`);
        } catch (error) {
            logger.error(`Failed to stop container ${containerId}:`, error);
            throw error;
        }
    }

    async removeContainer(containerId, options = {}) {
        try {
            const container = this.docker.getContainer(containerId);
            
            // Force remove if specified
            if (options.force) {
                await container.remove({ force: true });
            } else {
                await container.remove();
            }
            
            logger.info(`Container removed: ${containerId}`);
        } catch (error) {
            logger.error(`Failed to remove container ${containerId}:`, error);
            throw error;
        }
    }

    async listContainers(options = {}) {
        try {
            const containers = await this.docker.listContainers({
                all: options.all || false,
                ...options.filters
            });
            
            return containers;
        } catch (error) {
            logger.error('Failed to list containers:', error);
            throw error;
        }
    }

    async inspectContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            return await container.inspect();
        } catch (error) {
            logger.error(`Failed to inspect container ${containerId}:`, error);
            throw error;
        }
    }

    async execCommand(containerId, command, options = {}) {
        try {
            const container = this.docker.getContainer(containerId);
            
            const exec = await container.exec({
                Cmd: Array.isArray(command) ? command : command.split(' '),
                AttachStdout: true,
                AttachStderr: true,
                ...options
            });
            
            const stream = await exec.start();
            
            return new Promise((resolve, reject) => {
                let output = '';
                
                stream.on('data', (chunk) => {
                    output += chunk.toString();
                });
                
                stream.on('end', () => {
                    resolve(output);
                });
                
                stream.on('error', (error) => {
                    reject(error);
                });
            });
        } catch (error) {
            logger.error(`Failed to execute command in container ${containerId}:`, error);
            throw error;
        }
    }

    _formatEnvVars(env = {}) {
        return Object.entries(env).map(([key, value]) => `${key}=${value}`);
    }

    _formatPortBindings(ports = {}) {
        const bindings = {};
        
        for (const [containerPort, hostPort] of Object.entries(ports)) {
            const key = containerPort.includes('/') ? containerPort : `${containerPort}/tcp`;
            bindings[key] = [{ HostPort: hostPort.toString() }];
        }
        
        return bindings;
    }

    _formatVolumes(volumes = []) {
        return volumes.map(volume => {
            if (typeof volume === 'string') {
                return volume;
            }
            return `${volume.host}:${volume.container}:${volume.mode || 'rw'}`;
        });
    }
}

module.exports = ContainerDocker; 