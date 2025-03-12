/**
 * JMF Hosting Discord Bot - Config Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module handles configuration file updates and management,
 * including .env files, JSON configs, and YAML configurations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const dotenv = require('dotenv');
const LoggerManager = require('../../logger/logger.manager');

class ConfigModule {
    constructor(manager) {
        this.name = 'config';
        this.manager = manager;
        this.configDir = path.join(process.cwd(), 'config');
        this.backupDir = path.join(process.cwd(), 'backups', 'config');

        // Initialize logger
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'config')
        });
    }

    async _ensureDirectories() {
        await fs.mkdir(this.configDir, { recursive: true });
        await fs.mkdir(this.backupDir, { recursive: true });
    }

    async _loadConfigFiles() {
        try {
            const files = await fs.readdir(this.configDir);
            return files.filter(f => 
                f.endsWith('.json') || 
                f.endsWith('.yaml') || 
                f.endsWith('.yml') || 
                f === '.env'
            );
        } catch (error) {
            this.logger.error('config', `${this.logger.defaultIcons.error} Failed to load config files:`, error);
            throw error;
        }
    }

    async checkForUpdates() {
        try {
            this.logger.info('config', `${this.logger.defaultIcons.search} Checking for configuration updates...`);
            await this._ensureDirectories();

            const localFiles = await this._loadConfigFiles();
            const templateFiles = localFiles.map(f => f + '.template');
            const updates = [];

            for (const template of templateFiles) {
                const templatePath = path.join(this.configDir, template);
                const configPath = path.join(this.configDir, template.replace('.template', ''));

                try {
                    const [templateStat, configStat] = await Promise.all([
                        fs.stat(templatePath),
                        fs.stat(configPath).catch(() => null)
                    ]);

                    if (!configStat || templateStat.mtime > configStat.mtime) {
                        updates.push(template.replace('.template', ''));
                    }
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        this.logger.debug('config', `${this.logger.defaultIcons.info} Template file not found: ${template}`);
                        continue;
                    }
                    throw err;
                }
            }

            if (updates.length > 0) {
                this.logger.info('config', `${this.logger.defaultIcons.upgrade} Found ${updates.length} configuration files needing updates`);
            } else {
                this.logger.info('config', `${this.logger.defaultIcons.success} All configuration files are up to date`);
            }

            return {
                module: this.name,
                hasUpdate: updates.length > 0,
                updates
            };
        } catch (error) {
            this.logger.error('config', `${this.logger.defaultIcons.error} Configuration update check failed:`, error);
            throw error;
        }
    }

    async preUpdateCheck() {
        try {
            this.logger.info('config', `${this.logger.defaultIcons.search} Running configuration pre-update checks...`);
            const updates = await this.checkForUpdates();

            // Check write permissions
            for (const file of updates.updates) {
                const filePath = path.join(this.configDir, file);
                try {
                    await fs.access(filePath, fs.constants.W_OK).catch(() => null);
                    this.logger.debug('config', `${this.logger.defaultIcons.check} Write permission verified for ${file}`);
                } catch {
                    this.logger.warn('config', `${this.logger.defaultIcons.alert} No write permission for ${file}`);
                }
            }

            this.logger.success('config', `${this.logger.defaultIcons.success} Configuration pre-update checks completed`);
            return updates;
        } catch (error) {
            this.logger.error('config', `${this.logger.defaultIcons.error} Configuration pre-update check failed:`, error);
            throw error;
        }
    }

    async backup() {
        try {
            this.logger.info('config', `${this.logger.defaultIcons.backup} Creating configuration backup...`);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `backup_${timestamp}`);
            await fs.mkdir(backupPath, { recursive: true });

            const files = await this._loadConfigFiles();
            for (const file of files) {
                const sourcePath = path.join(this.configDir, file);
                const destPath = path.join(backupPath, file);

                try {
                    await fs.copyFile(sourcePath, destPath);
                    this.logger.debug('config', `${this.logger.defaultIcons.success} Backed up ${file}`);
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        this.logger.debug('config', `${this.logger.defaultIcons.info} Skipping backup of non-existent file: ${file}`);
                        continue;
                    }
                    throw err;
                }
            }

            this.logger.success('config', `${this.logger.defaultIcons.success} Configuration backed up to ${backupPath}`);
            return true;
        } catch (error) {
            this.logger.error('config', `${this.logger.defaultIcons.error} Configuration backup failed:`, error);
            throw error;
        }
    }

    async update() {
        try {
            const updates = await this.checkForUpdates();
            if (!updates.hasUpdate) {
                this.logger.info('config', `${this.logger.defaultIcons.success} No configuration updates needed`);
                return { success: true, updated: false };
            }

            this.logger.info('config', `${this.logger.defaultIcons.upgrade} Updating configuration files...`);
            const updatedFiles = [];

            for (const file of updates.updates) {
                const templatePath = path.join(this.configDir, file + '.template');
                const configPath = path.join(this.configDir, file);

                try {
                    let templateContent = await fs.readFile(templatePath, 'utf8');
                    let currentContent = await fs.readFile(configPath, 'utf8').catch(() => '');

                    if (file === '.env') {
                        // Handle .env files
                        const templateEnv = dotenv.parse(templateContent);
                        const currentEnv = currentContent ? dotenv.parse(currentContent) : {};
                        
                        // Merge while preserving existing values
                        const mergedEnv = { ...templateEnv, ...currentEnv };
                        const newContent = Object.entries(mergedEnv)
                            .map(([key, value]) => `${key}=${value}`)
                            .join('\n');
                        
                        await fs.writeFile(configPath, newContent);
                    } else if (file.endsWith('.json')) {
                        // Handle JSON files
                        const templateJson = JSON.parse(templateContent);
                        const currentJson = currentContent ? JSON.parse(currentContent) : {};
                        const mergedJson = { ...templateJson, ...currentJson };
                        await fs.writeFile(configPath, JSON.stringify(mergedJson, null, 2));
                    } else if (file.endsWith('.yml') || file.endsWith('.yaml')) {
                        // Handle YAML files
                        const templateYaml = yaml.load(templateContent);
                        const currentYaml = currentContent ? yaml.load(currentContent) : {};
                        const mergedYaml = { ...templateYaml, ...currentYaml };
                        await fs.writeFile(configPath, yaml.dump(mergedYaml));
                    }

                    updatedFiles.push(file);
                    this.logger.info('config', `${this.logger.defaultIcons.success} Updated ${file}`);
                } catch (err) {
                    this.logger.error('config', `${this.logger.defaultIcons.error} Failed to update ${file}:`, err);
                    throw err;
                }
            }

            this.logger.success('config', `${this.logger.defaultIcons.success} Configuration update completed`);
            return {
                success: true,
                updated: true,
                updatedFiles
            };
        } catch (error) {
            this.logger.error('config', `${this.logger.defaultIcons.error} Configuration update failed:`, error);
            throw error;
        }
    }

    async rollback() {
        try {
            this.logger.info('config', `${this.logger.defaultIcons.refresh} Starting configuration rollback...`);
            
            // Find latest backup
            const backups = await fs.readdir(this.backupDir);
            const latestBackup = backups
                .filter(f => !f.includes('.'))
                .sort()
                .pop();

            if (!latestBackup) {
                this.logger.warn('config', `${this.logger.defaultIcons.alert} No configuration backup found for rollback`);
                return false;
            }

            const backupPath = path.join(this.backupDir, latestBackup);
            const files = await fs.readdir(backupPath);

            for (const file of files) {
                const sourcePath = path.join(backupPath, file);
                const destPath = path.join(this.configDir, file);
                await fs.copyFile(sourcePath, destPath);
                this.logger.debug('config', `${this.logger.defaultIcons.success} Restored ${file}`);
            }

            this.logger.success('config', `${this.logger.defaultIcons.success} Configuration restored from ${backupPath}`);
            return true;
        } catch (error) {
            this.logger.error('config', `${this.logger.defaultIcons.error} Configuration rollback failed:`, error);
            throw error;
        }
    }
}

module.exports = ConfigModule; 