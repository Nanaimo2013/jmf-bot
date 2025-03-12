/**
 * JMF Hosting Discord Bot - Permissions Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module handles file permissions during updates, ensuring
 * proper access rights are maintained and security is preserved.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const LoggerManager = require('../../logger/logger.manager');

class PermissionsModule {
    constructor(manager) {
        this.name = 'permissions';
        this.manager = manager;
        this.logger = new LoggerManager();
        this.logger.initialize({
            level: 'info',
            directory: path.join(process.cwd(), 'logs', 'permissions')
        });

        // Default permissions for different file types
        this.defaultPermissions = {
            scripts: 0o755,  // rwxr-xr-x
            configs: 0o644,  // rw-r--r--
            data: 0o644,     // rw-r--r--
            logs: 0o644      // rw-r--r--
        };

        // Critical paths that need specific permissions
        this.criticalPaths = [
            { path: 'src/scripts', permission: 0o755 },
            { path: '.env', permission: 0o600 },
            { path: 'config.json', permission: 0o644 },
            { path: 'data', permission: 0o755 },
            { path: 'logs', permission: 0o755 }
        ];
    }

    async checkForUpdates() {
        try {
            this.logger.info('permissions', '🔍 Checking file permissions...');
            
            const issues = await this._checkPermissions();
            
            return {
                module: this.name,
                hasUpdate: issues.length > 0,
                issues
            };
        } catch (error) {
            this.logger.error('permissions', '❌ Permission check failed:', error);
            throw error;
        }
    }

    async _checkPermissions() {
        const issues = [];

        for (const item of this.criticalPaths) {
            try {
                const fullPath = path.join(process.cwd(), item.path);
                const stats = await fs.stat(fullPath);
                const currentPermissions = stats.mode & 0o777;

                if (currentPermissions !== item.permission) {
                    issues.push({
                        path: item.path,
                        current: currentPermissions.toString(8),
                        required: item.permission.toString(8)
                    });
                }
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    this.logger.warn('permissions', `⚠️ Error checking ${item.path}:`, error);
                }
            }
        }

        return issues;
    }

    async preUpdateCheck() {
        try {
            this.logger.info('permissions', '🔍 Running pre-update permission checks...');
            
            // Check write permissions in critical directories
            const criticalDirs = ['src', 'data', 'logs', 'backups'];
            const writeChecks = await Promise.all(
                criticalDirs.map(async dir => {
                    const fullPath = path.join(process.cwd(), dir);
                    try {
                        const testFile = path.join(fullPath, '.write-test');
                        await fs.writeFile(testFile, '');
                        await fs.unlink(testFile);
                        return { dir, writable: true };
                    } catch {
                        return { dir, writable: false };
                    }
                })
            );

            const nonWritable = writeChecks.filter(check => !check.writable);
            if (nonWritable.length > 0) {
                throw new Error(`No write permission in directories: ${nonWritable.map(c => c.dir).join(', ')}`);
            }

            return await this.checkForUpdates();
        } catch (error) {
            this.logger.error('permissions', '❌ Permission pre-update check failed:', error);
            throw error;
        }
    }

    async backup() {
        // Permissions module doesn't need to backup anything
        return { success: true };
    }

    async update() {
        try {
            this.logger.info('permissions', '🔧 Updating file permissions...');
            const updates = [];

            // Update permissions for critical paths
            for (const item of this.criticalPaths) {
                try {
                    const fullPath = path.join(process.cwd(), item.path);
                    await fs.chmod(fullPath, item.permission);
                    updates.push({
                        path: item.path,
                        permission: item.permission.toString(8)
                    });
                    this.logger.info('permissions', `✅ Updated permissions for ${item.path}`);
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        this.logger.error('permissions', `❌ Failed to update permissions for ${item.path}:`, error);
                    }
                }
            }

            // Recursively update permissions for scripts
            await this._updateScriptPermissions();

            return {
                success: true,
                updates
            };
        } catch (error) {
            this.logger.error('permissions', '❌ Permission update failed:', error);
            throw error;
        }
    }

    async _updateScriptPermissions() {
        const scriptsDir = path.join(process.cwd(), 'src');
        
        async function walk(dir) {
            const files = await fs.readdir(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.isDirectory()) {
                    await walk(filePath);
                } else if (file.endsWith('.js') || file.endsWith('.sh')) {
                    await fs.chmod(filePath, 0o755);
                }
            }
        }

        await walk(scriptsDir);
    }

    async rollback() {
        // Permissions don't need rollback as they're updated in real-time
        return { success: true };
    }

    // Helper methods
    async checkFilePermissions(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.mode & 0o777;
        } catch (error) {
            this.logger.error('permissions', `❌ Failed to check permissions for ${filePath}:`, error);
            throw error;
        }
    }

    async setFilePermissions(filePath, permissions) {
        try {
            await fs.chmod(filePath, permissions);
            return true;
        } catch (error) {
            this.logger.error('permissions', `❌ Failed to set permissions for ${filePath}:`, error);
            throw error;
        }
    }

    async isWritable(filePath) {
        try {
            const testFile = path.join(path.dirname(filePath), '.write-test');
            await fs.writeFile(testFile, '');
            await fs.unlink(testFile);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = PermissionsModule; 