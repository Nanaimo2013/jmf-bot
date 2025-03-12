const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const moment = require('moment');

const logger = new Logger('DatabaseBackup');

class DatabaseBackup {
    constructor() {
        this.dbPath = path.join('data', 'bot.sqlite');
        this.backupsDir = path.join('data', 'backups');
        this.maxBackups = 10; // Keep last 10 backups
    }
    
    async init() {
        // Ensure backups directory exists
        await fs.ensureDir(this.backupsDir);
    }
    
    async createBackup() {
        const timestamp = moment().format('YYYY-MM-DD-HH-mm-ss');
        const backupPath = path.join(this.backupsDir, `backup-${timestamp}.sqlite`);
        
        // Check if source database exists
        if (!await fs.pathExists(this.dbPath)) {
            throw new Error('Source database does not exist');
        }
        
        // Create backup using sqlite3 .backup command
        return new Promise((resolve, reject) => {
            const sqlite = spawn('sqlite3', [this.dbPath, `.backup '${backupPath}'`]);
            
            sqlite.on('close', (code) => {
                if (code === 0) {
                    resolve(backupPath);
                } else {
                    reject(new Error(`Backup failed with code ${code}`));
                }
            });
            
            sqlite.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async compressBackup(backupPath) {
        const compressedPath = `${backupPath}.gz`;
        
        return new Promise((resolve, reject) => {
            const gzip = spawn('gzip', ['-f', backupPath]);
            
            gzip.on('close', (code) => {
                if (code === 0) {
                    resolve(compressedPath);
                } else {
                    reject(new Error(`Compression failed with code ${code}`));
                }
            });
            
            gzip.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async saveBackupInfo(backupPath) {
        const stats = await fs.stat(backupPath);
        const info = {
            filename: path.basename(backupPath),
            createdAt: new Date().toISOString(),
            size: stats.size,
            compressed: backupPath.endsWith('.gz')
        };
        
        const infoPath = path.join(this.backupsDir, 'backups.json');
        let backups = [];
        
        if (await fs.pathExists(infoPath)) {
            backups = await fs.readJson(infoPath);
        }
        
        backups.push(info);
        await fs.writeJson(infoPath, backups, { spaces: 2 });
        
        logger.info('Backup info saved');
    }
    
    async cleanupOldBackups() {
        const files = await fs.readdir(this.backupsDir);
        const backupFiles = files
            .filter(f => f.startsWith('backup-') && (f.endsWith('.sqlite') || f.endsWith('.sqlite.gz')))
            .sort()
            .reverse();
        
        // Keep only the most recent backups
        if (backupFiles.length > this.maxBackups) {
            const filesToDelete = backupFiles.slice(this.maxBackups);
            
            for (const file of filesToDelete) {
                const filePath = path.join(this.backupsDir, file);
                await fs.remove(filePath);
                logger.debug(`Removed old backup: ${file}`);
            }
        }
    }
}

export default async function backup() {
    const backuper = new DatabaseBackup();
    
    try {
        logger.info('Starting database backup...');
        
        // Initialize backup system
        await backuper.init();
        
        // Create backup
        const backupPath = await backuper.createBackup();
        logger.success(`Backup created: ${path.basename(backupPath)}`);
        
        // Compress backup
        const compressedPath = await backuper.compressBackup(backupPath);
        logger.success(`Backup compressed: ${path.basename(compressedPath)}`);
        
        // Save backup info
        await backuper.saveBackupInfo(compressedPath);
        
        // Cleanup old backups
        await backuper.cleanupOldBackups();
        
        logger.success('Database backup completed successfully');
        return true;
    } catch (error) {
        logger.error('Database backup failed:', error);
        throw error;
    }
} 