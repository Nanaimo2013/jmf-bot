const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { Client, GatewayIntentBits } = require('discord.js');

const logger = new Logger('MonitorWorker');

class MonitorWorker {
    constructor() {
        this.metricsDir = path.join('data', 'metrics');
        this.interval = 60000; // 1 minute
        this.isRunning = false;
        
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages
            ]
        });
    }
    
    async start() {
        logger.info('Starting monitor worker...');
        
        // Setup cleanup handlers
        process.on('SIGTERM', () => this.stop());
        process.on('SIGINT', () => this.stop());
        
        // Create metrics directory
        await fs.ensureDir(this.metricsDir);
        
        // Start Discord client
        await this.setupDiscordClient();
        
        // Start monitoring loop
        this.isRunning = true;
        this.monitorLoop();
        
        logger.success('Monitor worker started');
    }
    
    async stop() {
        logger.info('Stopping monitor worker...');
        
        this.isRunning = false;
        
        // Save final metrics
        await this.collectMetrics('shutdown');
        
        // Disconnect Discord client
        if (this.client) {
            this.client.destroy();
        }
        
        logger.success('Monitor worker stopped');
        process.exit(0);
    }
    
    async setupDiscordClient() {
        // Load bot token from env
        const token = process.env.DISCORD_TOKEN;
        if (!token) {
            throw new Error('Discord token not found in environment');
        }
        
        // Setup event handlers
        this.client.on('ready', () => {
            logger.info(`Logged in as ${this.client.user.tag}`);
        });
        
        this.client.on('error', (error) => {
            logger.error('Discord client error:', error);
        });
        
        // Login
        await this.client.login(token);
    }
    
    async monitorLoop() {
        while (this.isRunning) {
            try {
                await this.collectMetrics('periodic');
            } catch (error) {
                logger.error('Error collecting metrics:', error);
            }
            
            await new Promise(resolve => setTimeout(resolve, this.interval));
        }
    }
    
    async collectMetrics(type = 'periodic') {
        const timestamp = new Date().toISOString();
        const metrics = {
            timestamp,
            type,
            system: {
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem()
                },
                loadAvg: os.loadavg()
            },
            process: {
                pid: process.pid,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            },
            discord: {
                status: this.client.ws.status,
                ping: this.client.ws.ping,
                guilds: this.client.guilds.cache.size,
                users: this.client.users.cache.size
            }
        };
        
        const metricsFile = path.join(
            this.metricsDir,
            `metrics_${timestamp.replace(/[:.]/g, '-')}.json`
        );
        
        await fs.writeJson(metricsFile, metrics, { spaces: 2 });
        logger.debug(`Metrics collected: ${path.basename(metricsFile)}`);
        
        // Cleanup old metrics files (keep last 24 hours)
        await this.cleanupOldMetrics();
    }
    
    async cleanupOldMetrics() {
        const files = await fs.readdir(this.metricsDir);
        const metricsFiles = files.filter(f => f.startsWith('metrics_') && f.endsWith('.json'));
        
        const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        
        for (const file of metricsFiles) {
            const filePath = path.join(this.metricsDir, file);
            const stats = await fs.stat(filePath);
            
            if (now - stats.mtimeMs > MAX_AGE) {
                await fs.remove(filePath);
                logger.debug(`Removed old metrics file: ${file}`);
            }
        }
    }
}

// Start the worker
const worker = new MonitorWorker();
worker.start().catch(error => {
    logger.error('Failed to start monitor worker:', error);
    process.exit(1);
}); 