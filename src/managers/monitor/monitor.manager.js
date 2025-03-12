const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');

class MonitorManager extends EventEmitter {
    constructor() {
        super();
        this.modulesPath = path.join(__dirname, 'modules');
        this.modules = new Map();
        this.isMonitoring = false;
        this.monitoringInterval = null;
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
                logger.info(`Loaded monitoring module: ${moduleInstance.name}`);
            }
        } catch (error) {
            logger.error('Error loading monitoring modules:', error);
            throw error;
        }
    }

    async startMonitoring(options = {}) {
        if (this.isMonitoring) {
            logger.warn('Monitoring is already running');
            return;
        }

        try {
            this.isMonitoring = true;
            
            // Initialize all modules
            for (const [name, module] of this.modules) {
                if (typeof module.initialize === 'function') {
                    await module.initialize(options);
                }
            }

            // Start monitoring loop
            const interval = options.interval || 60000; // Default to 1 minute
            this.monitoringInterval = setInterval(async () => {
                await this.checkAll();
            }, interval);

            // Do initial check
            await this.checkAll();

            logger.info('Monitoring started successfully');
        } catch (error) {
            this.isMonitoring = false;
            logger.error('Failed to start monitoring:', error);
            throw error;
        }
    }

    async stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        try {
            // Clear monitoring interval
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }

            // Cleanup all modules
            for (const [name, module] of this.modules) {
                if (typeof module.cleanup === 'function') {
                    await module.cleanup();
                }
            }

            this.isMonitoring = false;
            logger.info('Monitoring stopped successfully');
        } catch (error) {
            logger.error('Error stopping monitoring:', error);
            throw error;
        }
    }

    async checkAll() {
        const results = [];
        
        for (const [name, module] of this.modules) {
            try {
                const status = await module.check();
                results.push({
                    module: name,
                    status,
                    timestamp: new Date().toISOString()
                });

                // Emit events based on status
                this.emit(`${name}:status`, status);
                if (status.alerts && status.alerts.length > 0) {
                    this.emit(`${name}:alert`, status.alerts);
                }
            } catch (error) {
                logger.error(`Error checking module ${name}:`, error);
                results.push({
                    module: name,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return results;
    }

    getModule(moduleName) {
        return this.modules.get(moduleName);
    }

    isModuleActive(moduleName) {
        const module = this.getModule(moduleName);
        return module && module.isActive ? module.isActive() : false;
    }
}

module.exports = MonitorManager; 