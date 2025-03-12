const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const { spawn } = require('child_process');

const logger = new Logger('UpdateBackup');

async function createDatabaseBackup() {
    const backupDir = path.join('backups', 'database');
    await fs.ensureDir(backupDir);
    
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const backupFile = path.join(backupDir, `backup_${timestamp}.sqlite`);
    
    // Get database path from env
    const dbPath = process.env.DB_PATH || './data/database.sqlite';
    
    if (!await fs.pathExists(dbPath)) {
        logger.warn('No database file found to backup');
        return;
    }
    
    await fs.copy(dbPath, backupFile);
    logger.info(`Database backed up to: ${backupFile}`);
}

async function createConfigBackup() {
    const backupDir = path.join('backups', 'config');
    await fs.ensureDir(backupDir);
    
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const backupDir2 = path.join(backupDir, `backup_${timestamp}`);
    await fs.ensureDir(backupDir2);
    
    // Backup .env file
    if (await fs.pathExists('.env')) {
        await fs.copy('.env', path.join(backupDir2, '.env'));
    }
    
    // Backup config directory
    if (await fs.pathExists('config')) {
        await fs.copy('config', path.join(backupDir2, 'config'));
    }
    
    logger.info(`Config files backed up to: ${backupDir2}`);
}

async function createGitBackup() {
    try {
        // Create a git stash if there are changes
        const stashResult = await new Promise((resolve, reject) => {
            const proc = spawn('git', ['stash', 'save', `Backup before update ${moment().format('YYYY-MM-DD HH:mm:ss')}`]);
            
            let output = '';
            proc.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            proc.stderr.on('data', (data) => {
                output += data.toString();
            });
            
            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Git stash failed with code ${code}: ${output}`));
                }
            });
        });
        
        if (stashResult.includes('No local changes')) {
            logger.info('No local changes to backup');
        } else {
            logger.info('Local changes backed up to git stash');
        }
    } catch (error) {
        logger.error('Failed to create git backup:', error);
        throw error;
    }
}

async function pruneOldBackups() {
    const MAX_BACKUPS = 5;
    
    for (const type of ['database', 'config']) {
        const backupDir = path.join('backups', type);
        if (!await fs.pathExists(backupDir)) continue;
        
        const files = await fs.readdir(backupDir);
        const sortedFiles = files
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);
        
        if (sortedFiles.length > MAX_BACKUPS) {
            for (const file of sortedFiles.slice(MAX_BACKUPS)) {
                await fs.remove(path.join(backupDir, file.name));
                logger.info(`Removed old backup: ${file.name}`);
            }
        }
    }
}

export default async function backup() {
    try {
        logger.info('Creating backup before update...');
        
        await createDatabaseBackup();
        await createConfigBackup();
        await createGitBackup();
        await pruneOldBackups();
        
        logger.success('Backup completed successfully');
        return true;
    } catch (error) {
        logger.error('Backup failed:', error);
        throw error;
    }
} 