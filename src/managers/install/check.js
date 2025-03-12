const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');

const logger = new Logger('InstallCheck');

async function checkNodeVersion() {
    const requiredVersion = '16.9.0';
    const currentVersion = process.version.slice(1); // Remove 'v' prefix
    
    if (currentVersion < requiredVersion) {
        throw new Error(`Node.js version ${requiredVersion} or higher is required. Current version: ${currentVersion}`);
    }
    logger.info(`Node.js version check passed: ${currentVersion}`);
}

async function checkRequiredFiles() {
    const requiredFiles = [
        '.env.example',
        'package.json',
        'src/index.js'
    ];

    for (const file of requiredFiles) {
        if (!await fs.pathExists(file)) {
            throw new Error(`Required file not found: ${file}`);
        }
    }
    logger.info('Required files check passed');
}

async function checkWritePermissions() {
    const writeDirs = [
        'logs',
        'data',
        'config'
    ];

    for (const dir of writeDirs) {
        try {
            await fs.ensureDir(dir);
            const testFile = path.join(dir, '.write-test');
            await fs.writeFile(testFile, 'test');
            await fs.remove(testFile);
        } catch (error) {
            throw new Error(`No write permission in directory: ${dir}`);
        }
    }
    logger.info('Write permissions check passed');
}

export default async function check() {
    logger.info('Running installation checks...');
    
    try {
        await checkNodeVersion();
        await checkRequiredFiles();
        await checkWritePermissions();
        
        logger.success('All pre-installation checks passed');
        return true;
    } catch (error) {
        logger.error('Pre-installation check failed:', error);
        throw error;
    }
} 