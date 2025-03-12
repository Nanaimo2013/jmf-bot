const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../utils/logger');

const execAsync = promisify(exec);

class DependenciesInstaller {
    constructor(manager) {
        this.manager = manager;
        this.name = 'dependencies';
        this.installedDependencies = new Set();
    }

    async preInstallCheck() {
        try {
            // Check if npm is installed
            await execAsync('npm --version');
            
            // Check if package.json exists
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            await fs.access(packageJsonPath);
            
            return true;
        } catch (error) {
            throw new Error('Pre-install check failed: npm not found or package.json missing');
        }
    }

    async install(options = {}) {
        try {
            logger.info('Installing dependencies...');
            
            // Install production dependencies
            const installCmd = options.dev ? 'npm install' : 'npm install --production';
            const { stdout, stderr } = await execAsync(installCmd);
            
            if (stderr) {
                logger.warn('Warnings during dependency installation:', stderr);
            }
            
            logger.info('Dependencies installed successfully');
            
            // Store installed packages for potential rollback
            const packageJson = JSON.parse(
                await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8')
            );
            
            this.installedDependencies = new Set([
                ...Object.keys(packageJson.dependencies || {}),
                ...(options.dev ? Object.keys(packageJson.devDependencies || {}) : [])
            ]);
            
            return true;
        } catch (error) {
            logger.error('Failed to install dependencies:', error);
            throw error;
        }
    }

    async rollback() {
        try {
            logger.info('Rolling back dependency installation...');
            
            // Remove node_modules directory
            await fs.rm(path.join(process.cwd(), 'node_modules'), { recursive: true, force: true });
            
            logger.info('Dependencies rollback completed');
        } catch (error) {
            logger.error('Failed to rollback dependencies:', error);
            throw error;
        }
    }
}

module.exports = DependenciesInstaller; 