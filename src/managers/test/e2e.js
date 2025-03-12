const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { Client, GatewayIntentBits } = require('discord.js');

const logger = new Logger('E2ETest');

class E2ETestRunner {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
        
        this.testGuildId = process.env.TEST_GUILD_ID;
        this.testChannelId = process.env.TEST_CHANNEL_ID;
    }
    
    async setup() {
        // Load test configuration
        const testConfig = await fs.readJson(path.join('config', 'test.json'));
        
        // Setup test Discord client
        await this.client.login(testConfig.discord.token);
        logger.info('Test Discord client connected');
        
        // Ensure test guild and channel exist
        const guild = await this.client.guilds.fetch(this.testGuildId);
        const channel = await guild.channels.fetch(this.testChannelId);
        
        if (!guild || !channel) {
            throw new Error('Test guild or channel not found');
        }
        
        logger.info('Test environment verified');
    }
    
    async teardown() {
        // Cleanup any test messages or data
        const channel = this.client.channels.cache.get(this.testChannelId);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 100 });
            await channel.bulkDelete(messages);
        }
        
        // Disconnect client
        this.client.destroy();
        logger.info('Test environment cleaned up');
    }
    
    async runPlaywright() {
        return new Promise((resolve, reject) => {
            const playwright = spawn('npx', [
                'playwright',
                'test',
                path.join('src', '__tests__', 'e2e'),
                '--config=playwright.config.js'
            ], {
                stdio: 'inherit',
                env: {
                    ...process.env,
                    NODE_ENV: 'test',
                    TEST_GUILD_ID: this.testGuildId,
                    TEST_CHANNEL_ID: this.testChannelId
                }
            });
            
            playwright.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`E2E tests failed with code ${code}`));
                }
            });
            
            playwright.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    async validateE2ETests() {
        const testDir = path.join('src', '__tests__', 'e2e');
        await fs.ensureDir(testDir);
        
        const files = await fs.readdir(testDir);
        const testFiles = files.filter(f => f.endsWith('.spec.js'));
        
        if (testFiles.length === 0) {
            logger.warn('No E2E test files found');
            return false;
        }
        
        let allValid = true;
        for (const file of testFiles) {
            try {
                const testPath = path.join(testDir, file);
                const content = await fs.readFile(testPath, 'utf8');
                
                // Check for Playwright test patterns
                if (!content.includes('test.describe(') || 
                    !content.includes('test.beforeAll(') || 
                    !content.includes('page.goto(')) {
                    logger.warn(`E2E test file ${file} may not be properly formatted`);
                    allValid = false;
                }
            } catch (error) {
                logger.error(`Error validating E2E test file ${file}:`, error);
                allValid = false;
            }
        }
        
        return allValid;
    }
}

export default async function e2e() {
    const runner = new E2ETestRunner();
    
    try {
        logger.info('Starting end-to-end tests...');
        
        // Validate tests
        const isValid = await runner.validateE2ETests();
        if (!isValid) {
            logger.warn('Some E2E tests may have issues');
        }
        
        // Setup test environment
        await runner.setup();
        
        // Run tests
        await runner.runPlaywright();
        
        logger.success('End-to-end tests completed successfully');
        return true;
    } catch (error) {
        logger.error('End-to-end tests failed:', error);
        throw error;
    } finally {
        await runner.teardown();
    }
} 