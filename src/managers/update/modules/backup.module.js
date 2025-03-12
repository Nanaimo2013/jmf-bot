/**
 * JMF Hosting Discord Bot - Backup Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module handles backup operations during updates,
 * including file backups, database dumps, and configuration snapshots.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const LoggerManager = require('../../logger/logger.manager');

class BackupModule {
    constructor(manager) {
        this.name = 'backup';
        this.manager = manager;
        this.backupDir = path.join(process.cwd(), 'backups');
        this.excludeDirs = ['node_modules', '.git', 'logs', 'backups'];

        // Initialize logger
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'backup')
        });
    }

    async _ensureDirectories() {
        await fs.mkdir(this.backupDir, { recursive: true });
    }

    async _getDirectorySize(dirPath) {
        let size = 0;
        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (this.excludeDirs.includes(file.name)) continue;

            if (file.isDirectory()) {
                size += await this._getDirectorySize(filePath);
            } else {
                const stats = await fs.stat(filePath);
                size += stats.size;
            }
        }

        return size;
    }

    async checkForUpdates() {
        try {
            this.logger.info('backup', `${this.logger.defaultIcons.search} Checking backup requirements...`);
            await this._ensureDirectories();

            // Check available disk space
            const backupSize = await this._getDirectorySize(process.cwd());
            const backupStats = await fs.statfs(this.backupDir);
            const availableSpace = backupStats.bavail * backupStats.bsize;

            const needsBackup = backupSize * 2 < availableSpace;
            if (!needsBackup) {
                this.logger.warn('backup', `${this.logger.defaultIcons.alert} Insufficient disk space for backup`);
            } else {
                this.logger.info('backup', `${this.logger.defaultIcons.success} Sufficient disk space available for backup`);
            }

            return {
                module: this.name,
                hasUpdate: needsBackup,
                requiredSpace: backupSize,
                availableSpace
            };
        } catch (error) {
            this.logger.error('backup', `${this.logger.defaultIcons.error} Backup check failed:`, error);
            throw error;
        }
    }

    async preUpdateCheck() {
        try {
            this.logger.info('backup', `${this.logger.defaultIcons.search} Running backup pre-checks...`);
            const updates = await this.checkForUpdates();

            // Check write permissions
            try {
                const testFile = path.join(this.backupDir, '.test');
                await fs.writeFile(testFile, 'test');
                await fs.unlink(testFile);
                this.logger.debug('backup', `${this.logger.defaultIcons.check} Write permission verified for backup directory`);
            } catch {
                this.logger.warn('backup', `${this.logger.defaultIcons.alert} No write permission for backup directory`);
                throw new Error('No write permission for backup directory');
            }

            this.logger.success('backup', `${this.logger.defaultIcons.success} Backup pre-checks completed`);
            return updates;
        } catch (error) {
            this.logger.error('backup', `${this.logger.defaultIcons.error} Backup pre-check failed:`, error);
            throw error;
        }
    }

    async backup() {
        try {
            this.logger.info('backup', `${this.logger.defaultIcons.backup} Creating system backup...`);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `backup_${timestamp}`);
            await fs.mkdir(backupPath, { recursive: true });

            // Create backup of all files
            const files = await this._getAllFiles(process.cwd());
            for (const file of files) {
                const relativePath = path.relative(process.cwd(), file);
                const targetPath = path.join(backupPath, relativePath);
                
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
                await fs.copyFile(file, targetPath);
                this.logger.debug('backup', `${this.logger.defaultIcons.success} Backed up ${relativePath}`);
            }

            this.logger.success('backup', `${this.logger.defaultIcons.success} System backup completed at ${backupPath}`);
            return true;
        } catch (error) {
            this.logger.error('backup', `${this.logger.defaultIcons.error} System backup failed:`, error);
            throw error;
        }
    }

    async _getAllFiles(dirPath) {
        const files = [];
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (this.excludeDirs.includes(entry.name)) continue;

            if (entry.isDirectory()) {
                const subFiles = await this._getAllFiles(fullPath);
                files.push(...subFiles);
            } else {
                files.push(fullPath);
            }
        }

        return files;
    }

    async update() {
        try {
            const updates = await this.checkForUpdates();
            if (!updates.hasUpdate) {
                this.logger.info('backup', `${this.logger.defaultIcons.success} No backup needed`);
                return { success: true, updated: false };
            }

            await this.backup();
            return {
                success: true,
                updated: true
            };
        } catch (error) {
            this.logger.error('backup', `${this.logger.defaultIcons.error} Backup update failed:`, error);
            throw error;
        }
    }

    async rollback() {
        try {
            this.logger.info('backup', `${this.logger.defaultIcons.refresh} Starting system rollback...`);
            
            // Find latest backup
            const backups = await fs.readdir(this.backupDir);
            const latestBackup = backups
                .filter(f => f.startsWith('backup_'))
                .sort()
                .pop();

            if (!latestBackup) {
                this.logger.warn('backup', `${this.logger.defaultIcons.alert} No system backup found for rollback`);
                return false;
            }

            const backupPath = path.join(this.backupDir, latestBackup);
            const files = await this._getAllFiles(backupPath);

            for (const file of files) {
                const relativePath = path.relative(backupPath, file);
                const targetPath = path.join(process.cwd(), relativePath);
                
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
                await fs.copyFile(file, targetPath);
                this.logger.debug('backup', `${this.logger.defaultIcons.success} Restored ${relativePath}`);
            }

            this.logger.success('backup', `${this.logger.defaultIcons.success} System restored from ${backupPath}`);
            return true;
        } catch (error) {
            this.logger.error('backup', `${this.logger.defaultIcons.error} System rollback failed:`, error);
            throw error;
        }
    }
}

module.exports = BackupModule; 