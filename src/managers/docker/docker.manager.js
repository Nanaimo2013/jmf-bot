const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');

class DockerManager extends EventEmitter {
    constructor() {
        super();
        this.modulesPath = path.join(__dirname, 'modules');
        this.modules = new Map();
        this.config = null;
    }

    async loadModules() {
        try {
            const files = await fs.readdir(this.modulesPath);
            const moduleFiles = files.filter(file => file.endsWith('.js'));

            for (const file of moduleFiles) {
                const modulePath = path.join(this.modulesPath, file);
                const moduleClass = require(modulePath);
                const moduleInstance = new moduleClass(this);
                this.modules.set(moduleInstance.name, moduleInstance);
                logger.info(`Loaded docker module: ${moduleInstance.name}`);
            }
        } catch (error) {
            logger.error('Error loading docker modules:', error);
            throw error;
        }
    }

    async initialize(config) {
        this.config = config;

        try {
            // Initialize all docker modules
            for (const [name, module] of this.modules) {
                if (typeof module.initialize === 'function') {
                    await module.initialize(config);
                }
            }

            logger.info('Docker manager initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize docker manager:', error);
            throw error;
        }
    }

    async buildImage(options = {}) {
        const module = this.getModuleByType('build');
        if (!module) {
            throw new Error('Docker build module not found');
        }

        try {
            const result = await module.buildImage(options);
            logger.info('Docker image built successfully');
            return result;
        } catch (error) {
            logger.error('Failed to build docker image:', error);
            throw error;
        }
    }

    async runContainer(options = {}) {
        const module = this.getModuleByType('container');
        if (!module) {
            throw new Error('Docker container module not found');
        }

        try {
            const containerId = await module.runContainer(options);
            logger.info(`Docker container started: ${containerId}`);
            return containerId;
        } catch (error) {
            logger.error('Failed to run docker container:', error);
            throw error;
        }
    }

    async stopContainer(containerId, options = {}) {
        const module = this.getModuleByType('container');
        if (!module) {
            throw new Error('Docker container module not found');
        }

        try {
            await module.stopContainer(containerId, options);
            logger.info(`Docker container stopped: ${containerId}`);
        } catch (error) {
            logger.error('Failed to stop docker container:', error);
            throw error;
        }
    }

    async removeContainer(containerId, options = {}) {
        const module = this.getModuleByType('container');
        if (!module) {
            throw new Error('Docker container module not found');
        }

        try {
            await module.removeContainer(containerId, options);
            logger.info(`Docker container removed: ${containerId}`);
        } catch (error) {
            logger.error('Failed to remove docker container:', error);
            throw error;
        }
    }

    async pushImage(options = {}) {
        const module = this.getModuleByType('registry');
        if (!module) {
            throw new Error('Docker registry module not found');
        }

        try {
            await module.pushImage(options);
            logger.info('Docker image pushed successfully');
        } catch (error) {
            logger.error('Failed to push docker image:', error);
            throw error;
        }
    }

    async pullImage(options = {}) {
        const module = this.getModuleByType('registry');
        if (!module) {
            throw new Error('Docker registry module not found');
        }

        try {
            await module.pullImage(options);
            logger.info('Docker image pulled successfully');
        } catch (error) {
            logger.error('Failed to pull docker image:', error);
            throw error;
        }
    }

    async getContainerLogs(containerId, options = {}) {
        const module = this.getModuleByType('logs');
        if (!module) {
            throw new Error('Docker logs module not found');
        }

        try {
            return await module.getContainerLogs(containerId, options);
        } catch (error) {
            logger.error('Failed to get container logs:', error);
            throw error;
        }
    }

    async composeUp(options = {}) {
        const module = this.getModuleByType('compose');
        if (!module) {
            throw new Error('Docker compose module not found');
        }

        try {
            await module.up(options);
            logger.info('Docker compose up completed successfully');
        } catch (error) {
            logger.error('Failed to run docker compose up:', error);
            throw error;
        }
    }

    async composeDown(options = {}) {
        const module = this.getModuleByType('compose');
        if (!module) {
            throw new Error('Docker compose module not found');
        }

        try {
            await module.down(options);
            logger.info('Docker compose down completed successfully');
        } catch (error) {
            logger.error('Failed to run docker compose down:', error);
            throw error;
        }
    }

    getModuleByType(type) {
        return Array.from(this.modules.values()).find(module => module.type === type);
    }

    getModule(name) {
        return this.modules.get(name);
    }
}

module.exports = DockerManager; 