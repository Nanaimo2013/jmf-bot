const { InstallBaseModule } = require('./base.module');
const { LoggerManager } = require('../logger/manager');
const path = require('path');
const fs = require('fs-extra');
const dotenv = require('dotenv');

const logger = LoggerManager.getLogger('InstallConfig');

class ConfigSetup extends InstallBaseModule {
    constructor() {
        super('ConfigSetup');
        this.configDir = 'config';
        this.configFiles = {
            '.env': '.env.example',
            'config.json': 'config.example.json'
        };
    }
    
    async validateConfigFiles() {
        for (const [target, source] of Object.entries(this.configFiles)) {
            if (!await fs.pathExists(source)) {
                throw new Error(`Template file not found: ${source}`);
            }
        }
    }
    
    async backupConfigs() {
        const backups = {};
        
        for (const target of Object.keys(this.configFiles)) {
            if (await fs.pathExists(target)) {
                backups[target] = await this.backupFile(target);
            }
        }
        
        return backups;
    }
    
    async setupEnvFile() {
        const envExample = await fs.readFile('.env.example', 'utf8');
        const envVars = dotenv.parse(envExample);
        
        // Generate random values for sensitive fields
        const sensitiveFields = ['BOT_TOKEN', 'API_KEY', 'SECRET_KEY'];
        for (const field of sensitiveFields) {
            if (field in envVars) {
                envVars[field] = this.generateRandomString(32);
            }
        }
        
        // Create .env file
        const envContent = Object.entries(envVars)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        await fs.writeFile('.env', envContent);
        logger.info('Created .env file with secure defaults');
    }
    
    generateRandomString(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    async setupConfigFiles() {
        // Create config directory if it doesn't exist
        await fs.ensureDir(this.configDir);
        
        for (const [target, source] of Object.entries(this.configFiles)) {
            if (target === '.env') continue; // Handled separately
            
            const targetPath = path.join(this.configDir, target);
            const sourcePath = path.join(this.configDir, source);
            
            // Copy example config to actual config
            await fs.copy(sourcePath, targetPath, { overwrite: false });
            logger.info(`Created config file: ${target}`);
        }
    }
    
    async verifyConfig() {
        // Verify .env file
        if (!await fs.pathExists('.env')) {
            throw new Error('.env file not created');
        }
        
        // Verify other config files
        for (const target of Object.keys(this.configFiles)) {
            if (target === '.env') continue;
            
            const targetPath = path.join(this.configDir, target);
            if (!await fs.pathExists(targetPath)) {
                throw new Error(`Config file not created: ${target}`);
            }
        }
        
        return true;
    }
}

export default async function config() {
    const configSetup = new ConfigSetup();
    let backups = {};
    
    try {
        logger.info('Starting configuration setup...');
        
        // Validate template files
        await configSetup.validateConfigFiles();
        
        // Backup existing configs
        backups = await configSetup.backupConfigs();
        
        // Setup .env file
        await configSetup.setupEnvFile();
        
        // Setup other config files
        await configSetup.setupConfigFiles();
        
        // Verify configuration
        await configSetup.verifyConfig();
        
        logger.success('Configuration setup completed successfully');
        return true;
    } catch (error) {
        logger.error('Configuration setup failed:', error);
        
        // Rollback on failure
        await configSetup.rollback(backups);
        
        throw error;
    }
} 