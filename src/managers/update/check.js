const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const logger = new Logger('UpdateCheck');

async function getLocalVersion() {
    const packageJson = await fs.readJson('package.json');
    return packageJson.version;
}

async function getRemoteVersion() {
    try {
        const { stdout } = await execAsync('git ls-remote --tags origin');
        const tags = stdout.split('\n')
            .filter(line => line.includes('refs/tags/v'))
            .map(line => line.split('refs/tags/v')[1])
            .filter(tag => /^\d+\.\d+\.\d+$/.test(tag))
            .sort((a, b) => {
                const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
                const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
                
                if (aMajor !== bMajor) return bMajor - aMajor;
                if (aMinor !== bMinor) return bMinor - aMinor;
                return bPatch - aPatch;
            });
            
        return tags[0] || '0.0.0';
    } catch (error) {
        logger.error('Failed to fetch remote version:', error);
        return '0.0.0';
    }
}

async function checkDependencyUpdates() {
    try {
        const { stdout } = await execAsync('npm outdated --json');
        const outdated = JSON.parse(stdout);
        
        if (Object.keys(outdated).length > 0) {
            logger.info('Outdated dependencies found:');
            for (const [pkg, info] of Object.entries(outdated)) {
                logger.info(`  ${pkg}: ${info.current} -> ${info.latest}`);
            }
            return true;
        }
        
        return false;
    } catch (error) {
        if (error.stdout) {
            return false; // No outdated packages
        }
        logger.error('Failed to check dependencies:', error);
        return false;
    }
}

async function checkConfigUpdates() {
    const configFiles = [
        '.env.example',
        'config/bot.json',
        'config/permissions.json'
    ];
    
    let hasUpdates = false;
    
    for (const file of configFiles) {
        try {
            const { stdout } = await execAsync(`git diff --name-only origin/main -- ${file}`);
            if (stdout.trim()) {
                logger.info(`Config file ${file} has updates available`);
                hasUpdates = true;
            }
        } catch (error) {
            logger.warn(`Failed to check updates for ${file}:`, error);
        }
    }
    
    return hasUpdates;
}

export default async function check() {
    try {
        logger.info('Checking for updates...');
        
        const localVersion = await getLocalVersion();
        const remoteVersion = await getRemoteVersion();
        
        logger.info(`Current version: ${localVersion}`);
        logger.info(`Latest version: ${remoteVersion}`);
        
        const hasVersionUpdate = remoteVersion > localVersion;
        const hasDependencyUpdates = await checkDependencyUpdates();
        const hasConfigUpdates = await checkConfigUpdates();
        
        const hasUpdates = hasVersionUpdate || hasDependencyUpdates || hasConfigUpdates;
        
        if (hasUpdates) {
            logger.info('Updates are available!');
        } else {
            logger.info('No updates available');
        }
        
        return hasUpdates;
    } catch (error) {
        logger.error('Update check failed:', error);
        throw error;
    }
} 