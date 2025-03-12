/**
 * JMF Hosting Discord Bot - Update Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles all update-related operations including Git updates,
 * database migrations, configuration updates, and Docker container updates.
 * It coordinates with other managers to ensure smooth updates and provides
 * rollback capabilities in case of failures.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base.manager');
const path = require('path');
const fs = require('fs').promises;
const LoggerManager = require('../logger/logger.manager');

class UpdateManager extends BaseManager {
    constructor() {
        super('update');
        this.modulesPath = path.join(__dirname, 'modules');
        this.modules = new Map();
        this.updateOrder = ['backup', 'database', 'git', 'docker'];
        this.options = {
            branch: 'main',
            force: false,
            skipBackup: false,
            skipDocker: false,
            runTests: true
        };

        // Initialize logger
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'update')
        });
    }

    async loadModules() {
        try {
            this.logger.info('update', '🔌 Loading update modules...');
            const files = await fs.readdir(this.modulesPath);
            const moduleFiles = files.filter(file => file.endsWith('.js'));

            for (const file of moduleFiles) {
                const modulePath = path.join(this.modulesPath, file);
                const moduleClass = require(modulePath);
                const moduleInstance = new moduleClass(this);
                this.modules.set(moduleInstance.name, moduleInstance);
                this.logger.info('update', `${this.logger.defaultIcons.load} Loaded module: ${moduleInstance.name}`);
            }

            // Verify all required modules are loaded
            for (const moduleName of this.updateOrder) {
                if (!this.modules.has(moduleName)) {
                    throw new Error(`Required module '${moduleName}' not found`);
                }
            }

            this.logger.success('update', `${this.logger.defaultIcons.success} All update modules loaded successfully`);
        } catch (error) {
            this.logger.error('update', `${this.logger.defaultIcons.error} Error loading update modules:`, error);
            throw error;
        }
    }

    async initialize(config = {}) {
        try {
            this.logger.info('update', `${this.logger.defaultIcons.start} Initializing Update Manager...`);
            
            // Initialize base functionality
            await super.initialize(config);

            // Load required managers
            await this._loadRequiredManagers();

            // Set up options
            this.options = {
                ...this.options,
                ...config
            };

            this.logger.success('update', `${this.logger.defaultIcons.success} Update Manager initialized successfully`);
        } catch (error) {
            this.logger.error('update', `${this.logger.defaultIcons.error} Update Manager initialization failed:`, error);
            throw error;
        }
    }

    async _loadRequiredManagers() {
        try {
            this.logger.info('update', `${this.logger.defaultIcons.load} Loading required managers...`);
            
            // Load managers we'll need
            this.databaseManager = await this.getManager('database');
            this.testManager = await this.getManager('test');
            this.monitorManager = await this.getManager('monitor');
            this.dockerManager = await this.getManager('docker');

            // Initialize them if they haven't been
            await Promise.all([
                this.databaseManager.initialize(),
                this.testManager.initialize(),
                this.monitorManager.initialize(),
                this.dockerManager.initialize()
            ]);

            this.logger.success('update', `${this.logger.defaultIcons.success} Required managers loaded successfully`);
        } catch (error) {
            this.logger.error('update', `${this.logger.defaultIcons.error} Failed to load required managers:`, error);
            throw error;
        }
    }

    async checkForUpdates() {
        try {
            this.logger.info('update', `${this.logger.defaultIcons.search} Checking for updates...`);
            
            const results = await Promise.all(
                Array.from(this.modules.values()).map(module => 
                    module.checkForUpdates().catch(error => ({
                        module: module.name,
                        error: error.message,
                        hasUpdate: false
                    }))
                )
            );

            const updates = results.filter(result => !result.error && result.hasUpdate);
            const errors = results.filter(result => result.error);

            if (errors.length > 0) {
                this.logger.warn('update', `${this.logger.defaultIcons.alert} Some update checks failed:`);
                errors.forEach(({ module, error }) => {
                    this.logger.warn('update', `  - ${module}: ${error}`);
                });
            }

            if (updates.length > 0) {
                this.logger.info('update', `${this.logger.defaultIcons.upgrade} Updates available for:`);
                updates.forEach(update => {
                    this.logger.info('update', `  - ${update.module}`);
                });
            } else {
                this.logger.info('update', `${this.logger.defaultIcons.success} System is up to date`);
            }

            return {
                hasUpdates: updates.length > 0,
                updates,
                errors
            };
        } catch (error) {
            this.logger.error('update', `${this.logger.defaultIcons.error} Update check failed:`, error);
            throw error;
        }
    }

    async preUpdateCheck() {
        try {
            this.logger.info('update', `${this.logger.defaultIcons.search} Running pre-update checks...`);
            
            // Check database status
            const dbStatus = await this.databaseManager.checkStatus();
            if (!dbStatus.healthy) {
                throw new Error('Database is not healthy');
            }

            // Run system tests
            if (this.options.runTests) {
                const testResults = await this.testManager.runPreUpdateTests();
                if (!testResults.success) {
                    throw new Error('Pre-update tests failed');
                }
            }

            // Check system resources
            const systemStatus = await this.monitorManager.checkSystemResources();
            if (!systemStatus.sufficient) {
                throw new Error('Insufficient system resources for update');
            }

            // Run module checks
            for (const moduleName of this.updateOrder) {
                const module = this.modules.get(moduleName);
                if (typeof module.preUpdateCheck === 'function') {
                    this.logger.info('update', `  - Checking ${moduleName}...`);
                    await module.preUpdateCheck();
                }
            }

            this.logger.success('update', `${this.logger.defaultIcons.success} Pre-update checks completed`);
            return true;
        } catch (error) {
            this.logger.error('update', `${this.logger.defaultIcons.error} Pre-update check failed:`, error);
            throw error;
        }
    }

    async backup() {
        if (this.options.skipBackup) {
            this.logger.warn('update', `${this.logger.defaultIcons.alert} Skipping backup as requested`);
            return true;
        }

        try {
            this.logger.info('update', `${this.logger.defaultIcons.backup} Creating backups...`);
            
            // Create database backup
            await this.databaseManager.createBackup();

            // Run module backups
            for (const moduleName of this.updateOrder) {
                const module = this.modules.get(moduleName);
                if (typeof module.backup === 'function') {
                    this.logger.info('update', `  - Backing up ${moduleName}...`);
                    await module.backup();
                }
            }

            this.logger.success('update', `${this.logger.defaultIcons.success} Backups completed`);
            return true;
        } catch (error) {
            this.logger.error('update', `${this.logger.defaultIcons.error} Backup failed:`, error);
            throw error;
        }
    }

    async update(options = {}) {
        try {
            this.options = { ...this.options, ...options };
            
            // Start monitoring the update process
            const monitoring = await this.monitorManager.startUpdateMonitoring();
            
            // Check for updates
            const { hasUpdates } = await this.checkForUpdates();
            if (!hasUpdates && !this.options.force) {
                this.logger.info('update', `${this.logger.defaultIcons.success} No updates needed`);
                return { success: true, updated: false };
            }

            // Run pre-update checks
            await this.preUpdateCheck();

            // Create backups
            await this.backup();

            // Run updates in order
            this.logger.info('update', `${this.logger.defaultIcons.upgrade} Starting update process...`);
            const results = [];

            for (const moduleName of this.updateOrder) {
                if (moduleName === 'docker' && this.options.skipDocker) {
                    this.logger.warn('update', `${this.logger.defaultIcons.alert} Skipping Docker updates as requested`);
                    continue;
                }

                const module = this.modules.get(moduleName);
                this.logger.info('update', `  - Updating ${moduleName}...`);
                
                try {
                    const result = await module.update(this.options);
                    results.push({ module: moduleName, ...result });
                    this.logger.success('update', `${this.logger.defaultIcons.success} ${moduleName} update completed`);
                } catch (error) {
                    this.logger.error('update', `${this.logger.defaultIcons.error} ${moduleName} update failed:`, error);
                    throw error;
                }
            }

            // Run post-update tests if enabled
            if (this.options.runTests) {
                this.logger.info('update', `${this.logger.defaultIcons.test} Running post-update tests...`);
                const testResults = await this.testManager.runPostUpdateTests();
                if (!testResults.success) {
                    throw new Error('Post-update tests failed');
                }
            }

            // Stop monitoring
            await monitoring.stop();

            this.logger.success('update', `${this.logger.defaultIcons.success} Update process completed successfully`);
            return {
                success: true,
                updated: true,
                results,
                monitoring: monitoring.getResults()
            };
        } catch (error) {
            this.logger.error('update', `${this.logger.defaultIcons.error} Update process failed:`, error);
            
            // Attempt rollback
            await this.rollback().catch(rollbackError => {
                this.logger.error('update', `${this.logger.defaultIcons.error} Rollback failed:`, rollbackError);
            });
            
            throw error;
        }
    }

    async rollback() {
        try {
            this.logger.info('update', `${this.logger.defaultIcons.refresh} Starting rollback process...`);
            
            // Start monitoring the rollback process
            const monitoring = await this.monitorManager.startRollbackMonitoring();
            
            // Rollback in reverse order
            for (const moduleName of [...this.updateOrder].reverse()) {
                const module = this.modules.get(moduleName);
                if (typeof module.rollback === 'function') {
                    this.logger.info('update', `  - Rolling back ${moduleName}...`);
                    await module.rollback();
                }
            }

            // Verify database integrity after rollback
            await this.databaseManager.verifyIntegrity();

            // Run tests after rollback if enabled
            if (this.options.runTests) {
                await this.testManager.runPostRollbackTests();
            }

            // Stop monitoring
            await monitoring.stop();

            this.logger.success('update', `${this.logger.defaultIcons.success} Rollback completed`);
            return {
                success: true,
                monitoring: monitoring.getResults()
            };
        } catch (error) {
            this.logger.error('update', `${this.logger.defaultIcons.error} Rollback failed:`, error);
            throw error;
        }
    }

    async getDetailedStatus() {
        try {
            this.logger.info('update', `${this.logger.defaultIcons.search} Getting detailed status...`);
            const status = await super.getStatus();
            
            // Add status from other managers
            status.database = await this.databaseManager.getStatus();
            status.docker = await this.dockerManager.getStatus();
            status.monitoring = await this.monitorManager.getStatus();
            status.tests = await this.testManager.getStatus();

            return status;
        } catch (error) {
            this.logger.error('update', `${this.logger.defaultIcons.error} Failed to get detailed status:`, error);
            throw error;
        }
    }
}

module.exports = UpdateManager;
