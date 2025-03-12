/**
 * JMF Hosting Discord Bot - Git Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module handles all Git-related operations during updates,
 * including detailed change tracking, permissions verification,
 * and comprehensive logging of all operations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const execAsync = promisify(exec);
const LoggerManager = require('../../logger/logger.manager');

class GitModule {
    constructor(manager) {
        this.name = 'git';
        this.manager = manager;
        this.branch = 'main';
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'git')
        });
        
        // Track changed files during update
        this.changedFiles = new Set();
    }

    async _execCommand(command, options = {}) {
        const timer = this.logger.startTimer('git', command);
        try {
            const { stdout, stderr } = await execAsync(command, options);
            timer.end();
            if (stderr && !options.ignoreStderr) {
                this.logger.warn('git', `Command produced stderr: ${stderr}`);
            }
            return stdout.trim();
        } catch (error) {
            timer.end();
            this.logger.error('git', `Command failed: ${command}`, { error: error.message });
            throw error;
        }
    }

    async _trackChangedFiles() {
        const output = await this._execCommand('git diff --name-status HEAD@{1} HEAD');
        const changes = {
            added: [],
            modified: [],
            deleted: [],
            renamed: []
        };

        output.split('\n').forEach(line => {
            if (!line) return;
            const [status, ...paths] = line.split('\t');
            const file = paths.join('\t');
            this.changedFiles.add(file);

            switch (status[0]) {
                case 'A': changes.added.push(file); break;
                case 'M': changes.modified.push(file); break;
                case 'D': changes.deleted.push(file); break;
                case 'R': changes.renamed.push({ from: paths[0], to: paths[1] }); break;
            }
        });

        return changes;
    }

    async _verifyFilePermissions() {
        const permissionsModule = await this.manager.getModule('permissions');
        const issues = [];

        for (const file of this.changedFiles) {
            try {
                const fullPath = path.join(process.cwd(), file);
                if (await permissionsModule.isWritable(fullPath)) {
                    const currentPerms = await permissionsModule.checkFilePermissions(fullPath);
                    if (file.endsWith('.js') || file.endsWith('.sh')) {
                        if (currentPerms !== 0o755) {
                            await permissionsModule.setFilePermissions(fullPath, 0o755);
                            this.logger.info('git', `📝 Updated permissions for ${file} to 755`);
                        }
                    }
                } else {
                    issues.push(file);
                }
            } catch (error) {
                this.logger.warn('git', `⚠️ Could not verify permissions for ${file}:`, error);
            }
        }

        return issues;
    }

    async checkForUpdates() {
        try {
            this.logger.info('git', '🔍 Checking for Git updates...');
            
            // Fetch latest changes
            await this._execCommand('git fetch origin', { ignoreStderr: true });
            
            // Get current and remote HEADs
            const [localHead, remoteHead] = await Promise.all([
                this._execCommand('git rev-parse HEAD'),
                this._execCommand(`git rev-parse origin/${this.branch}`)
            ]);
            
            const hasUpdates = localHead !== remoteHead;
            let updateInfo = {
                module: this.name,
                hasUpdate: hasUpdates,
                currentCommit: localHead,
                targetCommit: remoteHead
            };

            if (hasUpdates) {
                // Get number of commits behind
                const behindCount = await this._execCommand(`git rev-list HEAD..origin/${this.branch} --count`);
                updateInfo.updateCount = parseInt(behindCount);

                // Get detailed commit information
                const commits = await this._execCommand(
                    `git log HEAD..origin/${this.branch} --pretty=format:"%h|%s|%an|%ad|%b" --date=iso`
                );
                
                updateInfo.pendingCommits = commits.split('\n').map(commit => {
                    const [hash, subject, author, date, body] = commit.split('|');
                    return { hash, subject, author, date, body };
                });

                // Get file changes summary
                const diffSummary = await this._execCommand(
                    `git diff --stat HEAD..origin/${this.branch}`
                );
                updateInfo.changeSummary = diffSummary;

                this.logger.info('git', `🆕 Updates available: ${updateInfo.updateCount} commits behind`);
                this.logger.info('git', '📊 Change summary:\n' + diffSummary);
                
                updateInfo.pendingCommits.forEach(commit => {
                    this.logger.debug('git', `  - ${commit.hash}: ${commit.subject}`);
                    this.logger.debug('git', `    Author: ${commit.author}, Date: ${commit.date}`);
                    if (commit.body) {
                        this.logger.debug('git', `    Details: ${commit.body}`);
                    }
                });
            } else {
                this.logger.info('git', '✅ Repository is up to date');
            }

            return updateInfo;
        } catch (error) {
            this.logger.error('git', '❌ Git update check failed:', error);
            throw error;
        }
    }

    async validateRepository() {
        try {
            this.logger.info('git', '🔍 Validating Git repository...');

            // Check if git is installed
            await this._execCommand('git --version');
            this.logger.debug('git', '✅ Git is installed');

            // Check if it's a git repository
            try {
                await this._execCommand('git rev-parse --git-dir');
                this.logger.debug('git', '✅ Valid Git repository');
            } catch {
                this.logger.warn('git', '⚠️ Not a git repository. Initializing...');
                await this._execCommand('git init');
                await this._execCommand('git remote add origin https://github.com/Nanaimo2013/jmf-bot.git');
                this.logger.success('git', '✅ Repository initialized');
            }

            // Verify and update remote if needed
            const remoteUrl = await this._execCommand('git config --get remote.origin.url');
            if (!remoteUrl.includes('github.com') || !remoteUrl.includes('jmf-bot')) {
                this.logger.warn('git', '⚠️ Incorrect remote. Updating...');
                await this._execCommand('git remote set-url origin https://github.com/Nanaimo2013/jmf-bot.git');
                this.logger.success('git', '✅ Remote URL updated');
            }

            // Verify branch exists
            const branches = await this._execCommand('git branch -r');
            if (!branches.includes(`origin/${this.branch}`)) {
                throw new Error(`Branch '${this.branch}' does not exist on remote`);
            }

            return true;
        } catch (error) {
            this.logger.error('git', '❌ Git validation failed:', error);
            throw error;
        }
    }

    async preUpdateCheck() {
        try {
            this.logger.info('git', '🔍 Running pre-update checks...');
            
            // Validate repository
            await this.validateRepository();

            // Check for uncommitted changes
            const status = await this._execCommand('git status --porcelain');
            if (status) {
                this.logger.warn('git', '⚠️ Uncommitted changes detected');
            }

            // Check for unpushed commits
            const unpushedCommits = await this._execCommand(`git log origin/${this.branch}..HEAD --oneline`);
            if (unpushedCommits) {
                this.logger.warn('git', '⚠️ Unpushed local commits detected');
            }

            const updates = await this.checkForUpdates();
            return {
                ...updates,
                hasUncommittedChanges: !!status,
                hasUnpushedCommits: !!unpushedCommits
            };
        } catch (error) {
            this.logger.error('git', '❌ Pre-update check failed:', error);
            throw error;
        }
    }

    async backup() {
        try {
            this.logger.info('git', '💾 Creating Git backup...');

            // Create a backup branch with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupBranch = `backup/${timestamp}`;

            // Stash any changes
            const status = await this._execCommand('git status --porcelain');
            if (status) {
                await this._execCommand('git stash');
                this.logger.info('git', '📦 Local changes stashed');
            }

            // Create backup branch
            await this._execCommand(`git branch ${backupBranch}`);
            this.logger.success('git', `✅ Backup branch created: ${backupBranch}`);

            return {
                success: true,
                backupBranch,
                hasStashedChanges: !!status
            };
        } catch (error) {
            this.logger.error('git', '❌ Git backup failed:', error);
            throw error;
        }
    }

    async update(options = {}) {
        try {
            const branch = options.branch || this.branch;
            this.logger.info('git', `🚀 Starting Git update to ${branch}...`);

            // Clear tracked files
            this.changedFiles.clear();

            // Verify branch exists
            const branches = await this._execCommand('git branch -r');
            if (!branches.includes(`origin/${branch}`)) {
                throw new Error(`Branch '${branch}' does not exist on remote`);
            }

            // Store the current HEAD for tracking changes
            const oldHead = await this._execCommand('git rev-parse HEAD');

            // Reset to the specified branch
            await this._execCommand(`git reset --hard origin/${branch}`);

            // Track what files changed
            const changes = await this._trackChangedFiles();
            
            // Verify and fix permissions for changed files
            const permissionIssues = await this._verifyFilePermissions();
            if (permissionIssues.length > 0) {
                this.logger.warn('git', '⚠️ Permission issues found:', permissionIssues);
            }

            // Get update information
            const [commitHash, commitDate, commitMsg, commitAuthor] = await Promise.all([
                this._execCommand('git rev-parse --short HEAD'),
                this._execCommand('git log -1 --format=%cd --date=iso'),
                this._execCommand('git log -1 --format=%s'),
                this._execCommand('git log -1 --format=%an')
            ]);

            const updateInfo = {
                success: true,
                commitHash,
                commitDate,
                commitMessage: commitMsg,
                commitAuthor,
                changes,
                permissionIssues
            };

            // Log detailed update information
            this.logger.success('git', `✅ Updated to commit: ${commitHash}`);
            this.logger.info('git', `📝 Commit message: ${commitMsg}`);
            this.logger.info('git', `👤 Author: ${commitAuthor}`);
            this.logger.info('git', `🕒 Date: ${commitDate}`);
            
            if (changes.added.length > 0) {
                this.logger.info('git', '➕ Added files:', changes.added);
            }
            if (changes.modified.length > 0) {
                this.logger.info('git', '📝 Modified files:', changes.modified);
            }
            if (changes.deleted.length > 0) {
                this.logger.info('git', '🗑️ Deleted files:', changes.deleted);
            }
            if (changes.renamed.length > 0) {
                this.logger.info('git', '📋 Renamed files:', changes.renamed);
            }

            return updateInfo;
        } catch (error) {
            this.logger.error('git', '❌ Git update failed:', error);
            throw error;
        }
    }

    async rollback() {
        try {
            this.logger.info('git', '⏮️ Starting Git rollback...');

            // Check for backup branch
            const branches = await this._execCommand('git branch');
            const backupBranches = branches
                .split('\n')
                .map(b => b.trim())
                .filter(b => b.startsWith('backup/'))
                .sort()
                .reverse();

            if (backupBranches.length > 0) {
                const latestBackup = backupBranches[0];
                await this._execCommand(`git checkout ${latestBackup}`);
                this.logger.success('git', `✅ Rolled back to backup branch: ${latestBackup}`);
            }

            // Check for stashed changes
            const stashList = await this._execCommand('git stash list');
            if (stashList) {
                await this._execCommand('git stash pop');
                this.logger.info('git', '📦 Restored stashed changes');
            }

            return {
                success: true,
                restoredBranch: backupBranches[0],
                restoredStash: !!stashList
            };
        } catch (error) {
            this.logger.error('git', '❌ Git rollback failed:', error);
            throw error;
        }
    }

    // Helper methods
    async getCurrentBranch() {
        return this._execCommand('git rev-parse --abbrev-ref HEAD');
    }

    async getRemoteUrl() {
        return this._execCommand('git config --get remote.origin.url');
    }

    async getLastCommitInfo() {
        const [hash, message, author, date] = await Promise.all([
            this._execCommand('git rev-parse --short HEAD'),
            this._execCommand('git log -1 --format=%s'),
            this._execCommand('git log -1 --format=%an'),
            this._execCommand('git log -1 --format=%cd --date=local')
        ]);

        return { hash, message, author, date };
    }
}

module.exports = GitModule; 