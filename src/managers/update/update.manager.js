/**
 * JMF Hosting Discord Bot - Update Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles all update-related operations for the bot,
 * including checking for updates, downloading updates from GitHub,
 * applying updates, and managing update history.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base/base.manager');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class UpdateManager extends BaseManager {
    /**
     * Create a new update manager
     * @param {Object} [options] - Manager options
     */
    constructor(options = {}) {
        super('update', {
            version: '1.0.0',
            configPath: options.configPath || 'config/update/config.json',
            defaultConfig: {
                enabled: true,
                autoUpdate: false,
                checkInterval: 86400000,
                notifyOnUpdate: true,
                github: {
                    enabled: true,
                    owner: "JMFHosting",
                    repo: "discord-bot",
                    branch: "main"
                },
                backup: {
                    enabled: true,
                    location: "./backups",
                    maxBackups: 5
                }
            },
            dependencies: [],
            optionalDependencies: ['logger'],
            ...options
        });

        this.updateHistory = [];
        this.updateHistoryPath = path.join(process.cwd(), 'data', 'updates', 'history.json');
        this.isUpdating = false;
        this.lastCheckTime = null;
        this.updateInterval = null;

        // Update check intervals
        this._updateIntervals = new Map();
    }

    /**
     * Initialize the update manager
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Set up a fallback logger if the logger dependency is not available
        if (!this.logger) {
            this.logger = {
                debug: (module, message) => console.debug(`[${module}] DEBUG: ${message}`),
                info: (module, message) => console.info(`[${module}] INFO: ${message}`),
                warn: (module, message) => console.warn(`[${module}] WARN: ${message}`),
                error: (module, message, error) => console.error(`[${module}] ERROR: ${message}`, error || '')
            };
            console.warn('[update] Logger dependency not found, using fallback console logger');
        }
        
        // Create necessary directories
        const backupDir = this.getConfig('backup.location') || './backups';
        await fs.mkdir(path.join(process.cwd(), backupDir), { recursive: true });
        
        // Load update history
        await this._loadUpdateHistory();
        
        this.logger.info('update', 'Update manager initialized');
    }

    /**
     * Set up automatic update checks based on configuration
     * @private
     */
    async _setupAutoUpdateChecks() {
        const repositories = this.getConfig('repositories');
        
        // Clear any existing intervals
        for (const intervalId of this._updateIntervals.values()) {
            clearInterval(intervalId);
        }
        this._updateIntervals.clear();
        
        // Set up new intervals
        for (const [repoName, repoConfig] of Object.entries(repositories)) {
            if (repoConfig.autoUpdate && repoConfig.checkInterval > 0) {
                const intervalId = setInterval(async () => {
                    try {
                        const updateInfo = await this.checkForUpdates(repoName);
                        if (updateInfo.updateAvailable) {
                            this.emitEvent('updateAvailable', {
                                repository: repoName,
                                currentVersion: updateInfo.currentVersion,
                                newVersion: updateInfo.latestVersion
                            });
                            
                            // Auto-update if configured
                            if (repoConfig.autoUpdate) {
                                await this.update(repoName);
                            }
                        }
                    } catch (error) {
                        this.logger.error('update', `Error checking for updates for ${repoName}:`, error);
                    }
                }, repoConfig.checkInterval);
                
                this._updateIntervals.set(repoName, intervalId);
                this.logger.debug('update', `Set up auto-update check for ${repoName} every ${repoConfig.checkInterval / 1000} seconds`);
            }
        }
    }

    /**
     * Load update history from file
     * @private
     */
    async _loadUpdateHistory() {
        // Create data/updates directory if it doesn't exist
        const updatesDir = path.join(process.cwd(), 'data', 'updates');
        await fs.mkdir(updatesDir, { recursive: true });
        
        // Use a default path if the config value is not available
        const historyPath = this.updateHistoryPath;
        
        try {
            const historyData = await fs.readFile(historyPath, 'utf8');
            this.updateHistory = JSON.parse(historyData);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.logger.error('update', 'Error loading update history:', error);
            }
            
            // Initialize empty history if file doesn't exist
            this.updateHistory = [];
            await this._saveUpdateHistory();
        }
    }

    /**
     * Save update history to file
     * @private
     */
    async _saveUpdateHistory() {
        try {
            await fs.writeFile(this.updateHistoryPath, JSON.stringify(this.updateHistory, null, 2), 'utf8');
        } catch (error) {
            this.logger.error('update', 'Error saving update history:', error);
        }
    }

    /**
     * Add an entry to the update history
     * @param {Object} entry - Update history entry
     * @private
     */
    async _addUpdateHistoryEntry(entry) {
        entry.timestamp = new Date().toISOString();
        this.updateHistory.push(entry);
        await this._saveUpdateHistory();
    }

    /**
     * Check if a repository is a Git repository
     * @param {string} repoPath - Path to the repository
     * @returns {boolean} Whether the path is a Git repository
     * @private
     */
    _isGitRepository(repoPath) {
        try {
            execSync('git rev-parse --is-inside-work-tree', { cwd: repoPath, stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the current version of a repository
     * @param {string} repoName - Name of the repository
     * @returns {Promise<string>} Current version
     */
    async getCurrentVersion(repoName = 'main') {
        return this.executeOperation('getCurrentVersion', async () => {
            const repoConfig = this.getConfig(`repositories.${repoName}`);
            if (!repoConfig) {
                throw new Error(`Repository ${repoName} not found in configuration`);
            }
            
            const repoPath = process.cwd();
            
            if (!this._isGitRepository(repoPath)) {
                throw new Error(`${repoPath} is not a Git repository`);
            }
            
            try {
                // Get the current commit hash
                const commitHash = execSync('git rev-parse HEAD', { cwd: repoPath }).toString().trim();
                
                // Get the current tag if available
                let tag = '';
                try {
                    tag = execSync('git describe --tags --exact-match 2> /dev/null || echo ""', { cwd: repoPath }).toString().trim();
                } catch (error) {
                    // No tag found, use commit hash
                }
                
                return tag || commitHash.substring(0, 8);
        } catch (error) {
                throw new Error(`Failed to get current version: ${error.message}`);
            }
        });
    }

    /**
     * Check for updates for a repository
     * @param {string} repoName - Name of the repository
     * @returns {Promise<Object>} Update information
     */
    async checkForUpdates(repoName = 'main') {
        return this.executeOperation('checkForUpdates', async () => {
            const repoConfig = this.getConfig(`repositories.${repoName}`);
            if (!repoConfig) {
                throw new Error(`Repository ${repoName} not found in configuration`);
            }
            
            const repoPath = process.cwd();
            
            if (!this._isGitRepository(repoPath)) {
                throw new Error(`${repoPath} is not a Git repository`);
            }
            
            try {
                // Fetch the latest changes
                execSync(`git fetch origin ${repoConfig.branch}`, { cwd: repoPath });
                
                // Get the current commit hash
                const currentCommit = execSync('git rev-parse HEAD', { cwd: repoPath }).toString().trim();
                
                // Get the latest commit hash from the remote
                const latestCommit = execSync(`git rev-parse origin/${repoConfig.branch}`, { cwd: repoPath }).toString().trim();
                
                // Get the current tag if available
                let currentTag = '';
                try {
                    currentTag = execSync('git describe --tags --exact-match 2> /dev/null || echo ""', { cwd: repoPath }).toString().trim();
                } catch (error) {
                    // No tag found, use commit hash
                }
                
                // Get the latest tag if available
                let latestTag = '';
                try {
                    execSync('git fetch --tags', { cwd: repoPath });
                    latestTag = execSync('git describe --tags $(git rev-list --tags --max-count=1) 2> /dev/null || echo ""', { cwd: repoPath }).toString().trim();
                } catch (error) {
                    // No tag found, use commit hash
                }
                
                const currentVersion = currentTag || currentCommit.substring(0, 8);
                const latestVersion = latestTag || latestCommit.substring(0, 8);
                
                // Check if there are any changes between current and latest
                const behindCount = parseInt(
                    execSync(`git rev-list --count HEAD..origin/${repoConfig.branch}`, { cwd: repoPath }).toString().trim(),
                    10
                );
                
                const updateAvailable = currentCommit !== latestCommit && behindCount > 0;
                
                // Get the list of changed files
                let changedFiles = [];
                if (updateAvailable) {
                    changedFiles = execSync(
                        `git diff --name-only HEAD..origin/${repoConfig.branch}`,
                        { cwd: repoPath }
                    ).toString().trim().split('\n').filter(Boolean);
                }
                
                // Get the commit messages
                let commitMessages = [];
                if (updateAvailable) {
                    commitMessages = execSync(
                        `git log --pretty=format:"%h - %s" HEAD..origin/${repoConfig.branch}`,
                        { cwd: repoPath }
                    ).toString().trim().split('\n').filter(Boolean);
                }
                
                return {
                    repository: repoName,
                    currentVersion,
                    latestVersion,
                    updateAvailable,
                    behindCount,
                    changedFiles,
                    commitMessages
                };
            } catch (error) {
                throw new Error(`Failed to check for updates: ${error.message}`);
            }
        });
    }

    /**
     * Create a backup before updating
     * @param {string} repoName - Name of the repository
     * @returns {Promise<string>} Backup path
     * @private
     */
    async _createBackup(repoName) {
        const backupConfig = this.getConfig('backups');
        if (!backupConfig.enabled) {
            return null;
        }
        
        const backupDir = path.join(process.cwd(), backupConfig.directory);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `${repoName}-${timestamp}`;
        const backupPath = path.join(backupDir, backupName);
        
        try {
            // Create backup directory
            await fs.mkdir(backupPath, { recursive: true });
            
            // Get the current version
            const currentVersion = await this.getCurrentVersion(repoName);
            
            // Create a backup info file
            const backupInfo = {
                repository: repoName,
                version: currentVersion,
                timestamp: new Date().toISOString(),
                files: []
            };
            
            // Get list of tracked files
            const trackedFiles = execSync('git ls-files', { cwd: process.cwd() })
                .toString().trim().split('\n').filter(Boolean);
            
            // Copy each file to the backup
            for (const file of trackedFiles) {
                try {
                    const sourcePath = path.join(process.cwd(), file);
                    const destPath = path.join(backupPath, file);
                    
                    // Create directory if it doesn't exist
                    await fs.mkdir(path.dirname(destPath), { recursive: true });
                    
                    // Copy the file
                    await fs.copyFile(sourcePath, destPath);
                    
                    backupInfo.files.push(file);
                } catch (error) {
                    this.logger.warn('update', `Failed to backup file ${file}: ${error.message}`);
                }
            }
            
            // Save backup info
            await fs.writeFile(
                path.join(backupPath, 'backup-info.json'),
                JSON.stringify(backupInfo, null, 2),
                'utf8'
            );
            
            // Clean up old backups
            await this._cleanupOldBackups();
            
            this.logger.info('update', `Created backup at ${backupPath}`);
            return backupPath;
        } catch (error) {
            this.logger.error('update', `Failed to create backup: ${error.message}`);
            return null;
        }
    }

    /**
     * Clean up old backups
     * @private
     */
    async _cleanupOldBackups() {
        const backupConfig = this.getConfig('backups');
        const backupDir = path.join(process.cwd(), backupConfig.directory);
        
        try {
            const backups = await fs.readdir(backupDir);
            
            if (backups.length <= backupConfig.maxBackups) {
                return;
            }
            
            // Get backup directories with their creation time
            const backupDirs = await Promise.all(
                backups.map(async (dir) => {
                    const dirPath = path.join(backupDir, dir);
                    const stats = await fs.stat(dirPath);
                    return { dir, path: dirPath, time: stats.birthtime.getTime() };
                })
            );
            
            // Sort by creation time (oldest first)
            backupDirs.sort((a, b) => a.time - b.time);
            
            // Delete oldest backups
            const toDelete = backupDirs.slice(0, backupDirs.length - backupConfig.maxBackups);
            
            for (const backup of toDelete) {
                await this._removeDirectory(backup.path);
                this.logger.debug('update', `Removed old backup: ${backup.dir}`);
            }
        } catch (error) {
            this.logger.error('update', `Failed to clean up old backups: ${error.message}`);
        }
    }

    /**
     * Recursively remove a directory
     * @param {string} dirPath - Directory path
     * @private
     */
    async _removeDirectory(dirPath) {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    await this._removeDirectory(entryPath);
                } else {
                    await fs.unlink(entryPath);
                }
            }
            
            await fs.rmdir(dirPath);
        } catch (error) {
            this.logger.error('update', `Failed to remove directory ${dirPath}: ${error.message}`);
        }
    }

    /**
     * Update a repository to the latest version
     * @param {string} repoName - Name of the repository
     * @param {Object} [options] - Update options
     * @param {boolean} [options.force=false] - Force update even if no updates are available
     * @param {boolean} [options.backup=true] - Create a backup before updating
     * @returns {Promise<Object>} Update result
     */
    async update(repoName = 'main', options = {}) {
        return this.executeOperation('update', async () => {
            const repoConfig = this.getConfig(`repositories.${repoName}`);
            if (!repoConfig) {
                throw new Error(`Repository ${repoName} not found in configuration`);
            }
            
            const repoPath = process.cwd();
            
            if (!this._isGitRepository(repoPath)) {
                throw new Error(`${repoPath} is not a Git repository`);
            }
            
            // Check for updates first
            const updateInfo = await this.checkForUpdates(repoName);
            
            if (!updateInfo.updateAvailable && !options.force) {
            return {
                    repository: repoName,
                success: true,
                    message: 'Already up to date',
                    updateInfo
                };
            }
            
            // Emit update started event
            this.emitEvent('updateStarted', {
                repository: repoName,
                version: updateInfo.latestVersion,
                updateInfo
            });
            
            try {
                // Create backup if enabled
                let backupPath = null;
                if (options.backup !== false && this.getConfig('backups.enabled')) {
                    backupPath = await this._createBackup(repoName);
                }
                
                // Pull the latest changes
                execSync(`git pull origin ${repoConfig.branch}`, { cwd: repoPath });
                
                // Get the new version
                const newVersion = await this.getCurrentVersion(repoName);
                
                // Add to update history
                await this._addUpdateHistoryEntry({
                    repository: repoName,
                    fromVersion: updateInfo.currentVersion,
                    toVersion: newVersion,
                    changedFiles: updateInfo.changedFiles,
                    commitMessages: updateInfo.commitMessages,
                    backupPath
                });
                
                // Emit update completed event
                this.emitEvent('updateCompleted', {
                    repository: repoName,
                    version: newVersion,
                    previousVersion: updateInfo.currentVersion,
                    changedFiles: updateInfo.changedFiles,
                    commitMessages: updateInfo.commitMessages,
                    backupPath
                });
                
                return {
                    repository: repoName,
                    success: true,
                    message: `Updated from ${updateInfo.currentVersion} to ${newVersion}`,
                    previousVersion: updateInfo.currentVersion,
                    newVersion,
                    changedFiles: updateInfo.changedFiles,
                    commitMessages: updateInfo.commitMessages,
                    backupPath
                };
            } catch (error) {
                // Emit update failed event
                this.emitEvent('updateFailed', {
                    repository: repoName,
                    error: error.message,
                    updateInfo
                });
                
                throw new Error(`Failed to update repository: ${error.message}`);
            }
        });
    }

    /**
     * Get update history
     * @param {Object} [options] - Options
     * @param {number} [options.limit] - Maximum number of entries to return
     * @param {string} [options.repository] - Filter by repository name
     * @returns {Promise<Array>} Update history
     */
    async getUpdateHistory(options = {}) {
        return this.executeOperation('getUpdateHistory', async () => {
            let history = [...this.updateHistory];
            
            // Filter by repository if specified
            if (options.repository) {
                history = history.filter(entry => entry.repository === options.repository);
            }
            
            // Sort by timestamp (newest first)
            history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Limit the number of entries if specified
            if (options.limit && options.limit > 0) {
                history = history.slice(0, options.limit);
            }
            
            return history;
        });
    }

    /**
     * Restore from a backup
     * @param {string} backupName - Name of the backup
     * @returns {Promise<Object>} Restore result
     */
    async restoreFromBackup(backupName) {
        return this.executeOperation('restoreFromBackup', async () => {
            const backupDir = path.join(process.cwd(), this.getConfig('backups.directory'));
            const backupPath = path.join(backupDir, backupName);
            
            try {
                // Check if backup exists
                await fs.access(backupPath);
                
                // Read backup info
                const backupInfoPath = path.join(backupPath, 'backup-info.json');
                const backupInfoData = await fs.readFile(backupInfoPath, 'utf8');
                const backupInfo = JSON.parse(backupInfoData);
                
                // Create a backup of the current state before restoring
                const currentBackupPath = await this._createBackup('pre-restore');
                
                // Restore each file from the backup
                for (const file of backupInfo.files) {
                    try {
                        const sourcePath = path.join(backupPath, file);
                        const destPath = path.join(process.cwd(), file);
                        
                        // Create directory if it doesn't exist
                        await fs.mkdir(path.dirname(destPath), { recursive: true });
                        
                        // Copy the file
                        await fs.copyFile(sourcePath, destPath);
                    } catch (error) {
                        this.logger.warn('update', `Failed to restore file ${file}: ${error.message}`);
                    }
                }
                
                this.logger.success('update', `Restored from backup: ${backupName}`);
                
            return {
                success: true,
                    message: `Restored from backup: ${backupName}`,
                    backupInfo,
                    currentBackupPath
                };
            } catch (error) {
                this.logger.error('update', `Failed to restore from backup: ${error.message}`);
                throw new Error(`Failed to restore from backup: ${error.message}`);
            }
        });
    }

    /**
     * List available backups
     * @returns {Promise<Array>} List of backups
     */
    async listBackups() {
        return this.executeOperation('listBackups', async () => {
            const backupDir = path.join(process.cwd(), this.getConfig('backups.directory'));
            
            try {
                const backups = await fs.readdir(backupDir);
                
                // Get backup info for each backup
                const backupInfos = await Promise.all(
                    backups.map(async (dir) => {
                        try {
                            const backupInfoPath = path.join(backupDir, dir, 'backup-info.json');
                            const backupInfoData = await fs.readFile(backupInfoPath, 'utf8');
                            const backupInfo = JSON.parse(backupInfoData);
                            
                            const stats = await fs.stat(path.join(backupDir, dir));
                            
                            return {
                                name: dir,
                                path: path.join(backupDir, dir),
                                info: backupInfo,
                                size: await this._getDirectorySize(path.join(backupDir, dir)),
                                created: stats.birthtime
            };
        } catch (error) {
                            return {
                                name: dir,
                                path: path.join(backupDir, dir),
                                error: error.message
                            };
                        }
                    })
                );
                
                // Sort by creation time (newest first)
                backupInfos.sort((a, b) => {
                    if (a.created && b.created) {
                        return b.created.getTime() - a.created.getTime();
                    }
                    return 0;
                });
                
                return backupInfos;
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return [];
                }
                throw new Error(`Failed to list backups: ${error.message}`);
            }
        });
    }

    /**
     * Get the size of a directory
     * @param {string} dirPath - Directory path
     * @returns {Promise<number>} Size in bytes
     * @private
     */
    async _getDirectorySize(dirPath) {
        let size = 0;
        
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    size += await this._getDirectorySize(entryPath);
                } else {
                    const stats = await fs.stat(entryPath);
                    size += stats.size;
                }
            }
        } catch (error) {
            this.logger.error('update', `Failed to get directory size for ${dirPath}: ${error.message}`);
        }
        
        return size;
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        // Clear update check intervals
        for (const intervalId of this._updateIntervals.values()) {
            clearInterval(intervalId);
        }
        this._updateIntervals.clear();
        
        await super.shutdown();
    }
}

module.exports = UpdateManager;
