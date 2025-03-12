/**
 * JMF Hosting Discord Bot - Docker Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module handles Docker-related operations during updates,
 * including container management, image building, and deployment.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const execAsync = promisify(exec);
const LoggerManager = require('../../logger/logger.manager');

class DockerModule {
    constructor(manager) {
        this.name = 'docker';
        this.manager = manager;
        this.containerName = 'jmf-bot';
        this.imageName = 'jmf-bot:latest';
        
        // Initialize logger
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'docker')
        });
    }

    async checkForUpdates() {
        try {
            // Check if Docker is installed
            await this._checkDockerInstallation();
            
            // Check if container exists and is running
            const containerInfo = await this._getContainerInfo();
            const imageInfo = await this._getImageInfo();

            return {
                module: this.name,
                hasUpdate: true, // Always true as we rebuild on update
                containerRunning: containerInfo.running,
                containerExists: containerInfo.exists,
                imageExists: imageInfo.exists,
                containerInfo: containerInfo.info,
                imageInfo: imageInfo.info
            };
        } catch (error) {
            this.logger.error('docker', `${this.logger.defaultIcons.error} Docker update check failed:`, error);
            throw error;
        }
    }

    async _checkDockerInstallation() {
        try {
            await execAsync('docker --version');
            const { stdout: composeVersion } = await execAsync('docker-compose --version').catch(() => ({ stdout: '' }));
            this.hasCompose = !!composeVersion;
            this.logger.debug('docker', `${this.logger.defaultIcons.system} Docker installation verified`);
            return true;
        } catch (error) {
            throw new Error('Docker is not installed');
        }
    }

    async _getContainerInfo() {
        try {
            const { stdout: containerId } = await execAsync(`docker ps -q --filter "name=${this.containerName}"`);
            if (!containerId) {
                return { exists: false, running: false };
            }

            const { stdout: info } = await execAsync(`docker inspect ${this.containerName}`);
            const containerInfo = JSON.parse(info)[0];
            
            return {
                exists: true,
                running: containerInfo.State.Running,
                info: {
                    id: containerInfo.Id,
                    created: containerInfo.Created,
                    status: containerInfo.State.Status
                }
            };
        } catch {
            return { exists: false, running: false };
        }
    }

    async _getImageInfo() {
        try {
            const { stdout: info } = await execAsync(`docker image inspect ${this.imageName}`);
            const imageInfo = JSON.parse(info)[0];
            
            return {
                exists: true,
                info: {
                    id: imageInfo.Id,
                    created: imageInfo.Created,
                    size: imageInfo.Size
                }
            };
        } catch {
            return { exists: false };
        }
    }

    async preUpdateCheck() {
        try {
            this.logger.info('docker', `${this.logger.defaultIcons.search} Running Docker pre-update checks...`);
            await this._checkDockerInstallation();
            const status = await this.checkForUpdates();
            this.logger.success('docker', `${this.logger.defaultIcons.success} Docker pre-update checks completed`);
            return status;
        } catch (error) {
            this.logger.error('docker', `${this.logger.defaultIcons.error} Docker pre-update check failed:`, error);
            throw error;
        }
    }

    async backup() {
        try {
            this.logger.info('docker', `${this.logger.defaultIcons.backup} Creating Docker backup...`);
            const containerInfo = await this._getContainerInfo();
            
            if (containerInfo.exists && containerInfo.running) {
                // Save container logs
                const logs = await this.getContainerLogs();
                const logsPath = path.join(process.cwd(), 'backups', 'docker', `${this.containerName}-${Date.now()}.log`);
                await fs.mkdir(path.dirname(logsPath), { recursive: true });
                await fs.writeFile(logsPath, logs);
                this.logger.info('docker', `${this.logger.defaultIcons.save} Container logs saved to ${logsPath}`);
            }

            this.logger.success('docker', `${this.logger.defaultIcons.success} Docker backup completed`);
            return true;
        } catch (error) {
            this.logger.error('docker', `${this.logger.defaultIcons.error} Docker backup failed:`, error);
            throw error;
        }
    }

    async update(options = {}) {
        try {
            const containerInfo = await this._getContainerInfo();
            
            // Stop and remove existing container if running
            if (containerInfo.exists) {
                this.logger.info('docker', `${this.logger.defaultIcons.stop} Stopping existing container...`);
                await execAsync(`docker stop ${this.containerName}`);
                await execAsync(`docker rm ${this.containerName}`);
            }

            if (this.hasCompose) {
                this.logger.info('docker', `${this.logger.defaultIcons.upgrade} Building and starting with Docker Compose...`);
                await execAsync('docker-compose up -d --build');
            } else {
                this.logger.info('docker', `${this.logger.defaultIcons.upgrade} Building Docker image...`);
                await execAsync(`docker build -t ${this.imageName} .`);

                this.logger.info('docker', `${this.logger.defaultIcons.start} Starting container...`);
                await execAsync(`docker run -d --name ${this.containerName} \
                    -v "$(pwd)/.env:/usr/src/app/.env" \
                    -v "$(pwd)/config.json:/usr/src/app/config.json" \
                    -v "$(pwd)/logs:/usr/src/app/logs" \
                    -v "$(pwd)/data:/usr/src/app/data" \
                    ${this.imageName}`);
            }

            // Verify container is running
            const newContainerInfo = await this._getContainerInfo();
            if (!newContainerInfo.running) {
                throw new Error('Container failed to start');
            }

            this.logger.success('docker', `${this.logger.defaultIcons.success} Docker update completed successfully`);
            return {
                success: true,
                containerInfo: newContainerInfo.info
            };
        } catch (error) {
            this.logger.error('docker', `${this.logger.defaultIcons.error} Docker update failed:`, error);
            throw error;
        }
    }

    async rollback() {
        try {
            this.logger.info('docker', `${this.logger.defaultIcons.refresh} Starting Docker rollback...`);
            const containerInfo = await this._getContainerInfo();
            
            if (containerInfo.exists && !containerInfo.running) {
                this.logger.info('docker', `${this.logger.defaultIcons.start} Starting stopped container...`);
                await execAsync(`docker start ${this.containerName}`);
                this.logger.success('docker', `${this.logger.defaultIcons.success} Container started successfully`);
            }

            return true;
        } catch (error) {
            this.logger.error('docker', `${this.logger.defaultIcons.error} Docker rollback failed:`, error);
            throw error;
        }
    }

    async getContainerLogs() {
        try {
            const { stdout: logs } = await execAsync(`docker logs ${this.containerName}`);
            return logs;
        } catch (error) {
            this.logger.error('docker', `${this.logger.defaultIcons.error} Failed to get container logs:`, error);
            throw error;
        }
    }
}

module.exports = DockerModule; 