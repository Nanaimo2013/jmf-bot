const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');

class InstallManager extends EventEmitter {
    constructor() {
        super();
        this.modulesPath = path.join(__dirname, 'modules');
        this.modules = new Map();
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
                logger.info(`Loaded install module: ${moduleInstance.name}`);
            }
        } catch (error) {
            logger.error('Error loading install modules:', error);
            throw error;
        }
    }

    async runPreInstallChecks() {
        for (const [name, module] of this.modules) {
            if (typeof module.preInstallCheck === 'function') {
                await module.preInstallCheck();
            }
        }
    }

    async install(options = {}) {
        try {
            await this.runPreInstallChecks();

            for (const [name, module] of this.modules) {
                logger.info(`Running installation for module: ${name}`);
                await module.install(options);
            }

            logger.info('Installation completed successfully');
        } catch (error) {
            logger.error('Installation failed:', error);
            throw error;
        }
    }

    async rollback() {
        for (const [name, module] of this.modules) {
            if (typeof module.rollback === 'function') {
                try {
                    await module.rollback();
                } catch (error) {
                    logger.error(`Rollback failed for module ${name}:`, error);
                }
            }
        }
    }
}

module.exports = InstallManager; 