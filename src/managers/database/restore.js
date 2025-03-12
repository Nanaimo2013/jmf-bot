const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const logger = new Logger('DatabaseRestore');

class DatabaseRestore {
    constructor() {
        this.dbPath = path.join('data', 'bot.sqlite');
        this.backupsDir = path.join('data', 'backups');
        this.tempDir = path.join('data', 'temp');
    }
    
    async init() {
        // Ensure temp directory exists
        await fs.ensureDir(this.tempDir);
    }
    
    async getAvailableBackups() {
        const files = await fs.readdir(this.backupsDir);
        return files
            .filter(f => f.startsWith('backup-') && (f.endsWith('.sqlite') || f.endsWith('.sqlite.gz')))
            .sort()
            .reverse();
    }
    
    async decompressBackup(backupPath) {
        if (!backupPath.endsWith('.gz')) {
            return backupPath;
        }
        
        const decompressedPath = path.join(this.tempDir, path.basename(backupPath, '.gz'));
        
        return new Promise((resolve, reject) => {
            const gunzip = spawn('gunzip', ['-c', backupPath]);
            const writeStream = fs.createWriteStream(decompressedPath);
            
            gunzip.stdout.pipe(writeStream);
            
            gunzip.on('close', (code) => {
                writeStream.end();
                if (code === 0) {
                    resolve(decompressedPath);
                } else {
                    reject(new Error(`Decompression failed with code ${code}`));
                }
            });
            
            gunzip.on('error', (err) => {
                writeStream.end();
                reject(err);
            });
        });
    }
    
    async restoreBackup(backupPath) {
        // Stop any active database connections
        await this.stopDatabase();
        
        // Remove current database
        await fs.remove(this.dbPath);
        
        // Restore from backup using sqlite3
        return new Promise((resolve, reject) => {
            const sqlite = spawn('sqlite3', [this.dbPath, `.restore '${backupPath}'`]);
            
            sqlite.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Restore failed with code ${code}`));
                }
            });
            
            sqlite.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async stopDatabase() {
        // Implementation depends on how your database connections are managed
        // This is a placeholder for any cleanup needed before restore
        logger.info('Stopping active database connections...');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    async verifyRestore() {
        return new Promise((resolve, reject) => {
            const sqlite = spawn('sqlite3', [this.dbPath, '.tables']);
            let output = '';
            
            sqlite.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            sqlite.on('close', (code) => {
                if (code === 0 && output.trim().length > 0) {
                    resolve(true);
                } else {
                    reject(new Error('Database verification failed'));
                }
            });
            
            sqlite.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async cleanup() {
        // Remove temporary files
        await fs.remove(this.tempDir);
    }
}

export default async function restore() {
    const restorer = new DatabaseRestore();
    
    try {
        logger.info('Starting database restore...');
        
        // Initialize restorer
        await restorer.init();
        
        // Get available backups
        const backups = await restorer.getAvailableBackups();
        if (backups.length === 0) {
            throw new Error('No backups found');
        }
        
        // Use latest backup by default
        const backupFile = process.argv[3] || backups[0];
        const backupPath = path.join(restorer.backupsDir, backupFile);
        
        if (!await fs.pathExists(backupPath)) {
            throw new Error(`Backup file not found: ${backupFile}`);
        }
        
        logger.info(`Restoring from backup: ${backupFile}`);
        
        // Decompress backup if needed
        const decompressedPath = await restorer.decompressBackup(backupPath);
        
        // Restore database
        await restorer.restoreBackup(decompressedPath);
        
        // Verify restore
        await restorer.verifyRestore();
        
        // Cleanup
        await restorer.cleanup();
        
        logger.success('Database restore completed successfully');
        return true;
    } catch (error) {
        logger.error('Database restore failed:', error);
        throw error;
    }
} 