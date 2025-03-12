const { InstallBaseModule } = require('./base.module');
const { LoggerManager } = require('../logger/manager');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

const logger = LoggerManager.getLogger('InstallDependencies');

class DependencyInstaller extends InstallBaseModule {
    constructor() {
        super('DependencyInstaller');
        this.packageManager = 'npm';
        this.packageFile = 'package.json';
        this.lockFile = 'package-lock.json';
    }
    
    async checkPackageManager() {
        const hasYarn = await this.checkCommand('yarn');
        if (hasYarn) {
            this.packageManager = 'yarn';
            this.lockFile = 'yarn.lock';
        }
    }
    
    async checkCommand(command) {
        return new Promise((resolve) => {
            const isWindows = process.platform === 'win32';
            const cmd = isWindows ? 'where' : 'which';
            const args = isWindows ? [command] : [command];
            
            const proc = spawn(cmd, args);
            
            proc.on('close', (code) => {
                resolve(code === 0);
            });
            
            proc.on('error', () => {
                resolve(false);
            });
        });
    }
    
    async backupDependencyFiles() {
        const backups = {};
        
        // Backup package.json
        if (await fs.pathExists(this.packageFile)) {
            backups[this.packageFile] = await this.backupFile(this.packageFile);
        }
        
        // Backup lock file
        if (await fs.pathExists(this.lockFile)) {
            backups[this.lockFile] = await this.backupFile(this.lockFile);
        }
        
        return backups;
    }
    
    async installDependencies() {
        return new Promise((resolve, reject) => {
            const command = this.packageManager;
            const args = ['install'];
            
            if (this.packageManager === 'npm') {
                args.push('--no-audit');
            }
            
            const install = spawn(command, args, {
                stdio: 'inherit'
            });
            
            install.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`${command} install failed with code ${code}`));
                }
            });
            
            install.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async verifyInstallation() {
        try {
            const packageJson = await fs.readJson(this.packageFile);
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            for (const [pkg, version] of Object.entries(deps)) {
                const pkgPath = path.join('node_modules', pkg);
                if (!await fs.pathExists(pkgPath)) {
                    throw new Error(`Failed to install: ${pkg}@${version}`);
                }
            }
            
            return true;
        } catch (error) {
            throw new Error(`Verification failed: ${error.message}`);
        }
    }
}

export default async function dependencies() {
    const installer = new DependencyInstaller();
    let backups = {};
    
    try {
        logger.info('Starting dependency installation...');
        
        // Check package manager
        await installer.checkPackageManager();
        logger.info(`Using package manager: ${installer.packageManager}`);
        
        // Backup dependency files
        backups = await installer.backupDependencyFiles();
        
        // Install dependencies
        await installer.installDependencies();
        
        // Verify installation
        await installer.verifyInstallation();
        
        logger.success('Dependencies installed successfully');
        return true;
    } catch (error) {
        logger.error('Dependency installation failed:', error);
        
        // Rollback on failure
        await installer.rollback(backups);
        
        throw error;
    }
} 