const { BaseManager } = require('../base.manager');
const { LoggerManager } = require('../logger/manager');
const path = require('path');
const fs = require('fs-extra');

class InstallBaseModule extends BaseManager {
    constructor(name) {
        super(name || 'InstallBaseModule');
        this.logger = LoggerManager.getLogger(name || 'InstallBaseModule');
        this.rootDir = process.cwd();
    }

    async validateEnvironment() {
        const nodeVersion = process.version.slice(1);
        const requiredVersion = '16.9.0';

        if (nodeVersion < requiredVersion) {
            throw new Error(`Node.js version ${requiredVersion} or higher is required`);
        }
        return true;
    }

    async ensureDirectories(dirs) {
        for (const dir of dirs) {
            const dirPath = path.join(this.rootDir, dir);
            await fs.ensureDir(dirPath);
            this.logger.info(`Ensured directory exists: ${dir}`);
        }
    }

    async validatePermissions(paths) {
        for (const p of paths) {
            try {
                const testFile = path.join(p, '.write-test');
                await fs.writeFile(testFile, 'test');
                await fs.remove(testFile);
            } catch (error) {
                throw new Error(`No write permission in: ${p}`);
            }
        }
        return true;
    }

    async validateFiles(files) {
        for (const file of files) {
            if (!await fs.pathExists(file)) {
                throw new Error(`Required file not found: ${file}`);
            }
        }
        return true;
    }

    async copyTemplate(source, dest, replacements = {}) {
        let content = await fs.readFile(source, 'utf8');
        
        for (const [key, value] of Object.entries(replacements)) {
            content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
        }
        
        await fs.writeFile(dest, content);
        this.logger.info(`Created file from template: ${dest}`);
    }

    async backupFile(filePath) {
        if (await fs.pathExists(filePath)) {
            const backupPath = `${filePath}.backup-${Date.now()}`;
            await fs.copy(filePath, backupPath);
            this.logger.info(`Created backup: ${backupPath}`);
            return backupPath;
        }
        return null;
    }

    async rollback(backups) {
        for (const [original, backup] of Object.entries(backups)) {
            if (backup && await fs.pathExists(backup)) {
                await fs.copy(backup, original);
                await fs.remove(backup);
                this.logger.info(`Rolled back: ${original}`);
            }
        }
    }
}

module.exports = { InstallBaseModule }; 