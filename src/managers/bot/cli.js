#!/usr/bin/env node

/**
 * JMF Hosting Discord Bot - CLI
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file provides a command-line interface for the bot manager,
 * allowing for operations like starting the bot, deploying commands,
 * and checking status.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BotManager = require('./index');
const LoggerManager = require('../logger');
const DatabaseManager = require('../database');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

// Set up version from package.json
let version = '1.0.0';
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    version = packageJson.version;
} catch (error) {
    // Use default version if package.json not found
}

// Create logger
const logger = new LoggerManager();

/**
 * Initialize managers
 * @returns {Promise<{botManager: BotManager, dbManager: DatabaseManager}>}
 */
async function initializeManagers() {
    // Initialize logger
    await logger.initialize({
        level: 'info',
        directory: path.join(process.cwd(), 'logs', 'bot')
    });
    
    // Initialize database manager
    const dbManager = new DatabaseManager();
    await dbManager.initialize();
    
    // Initialize bot manager
    const botManager = new BotManager();
    botManager.registerManager('logger', logger);
    botManager.registerManager('database', dbManager);
    await botManager.initialize();
    
    return { botManager, dbManager };
}

/**
 * Shutdown managers
 * @param {BotManager} botManager - The bot manager
 * @param {DatabaseManager} dbManager - The database manager
 * @returns {Promise<void>}
 */
async function shutdownManagers(botManager, dbManager) {
    try {
        if (botManager) {
            await botManager.stop();
        }
        
        if (dbManager) {
            await dbManager.shutdown();
        }
        
        logger.info('cli', 'Managers shut down successfully');
    } catch (error) {
        logger.error('cli', `Error shutting down managers: ${error.message}`);
    }
}

// Set up CLI
program
    .name('bot-cli')
    .description('JMF Hosting Discord Bot CLI')
    .version(version);

// Start command
program
    .command('start')
    .description('Start the Discord bot')
    .option('-d, --dev', 'Start in development mode')
    .action(async (options) => {
        try {
            logger.info('cli', 'Starting Discord bot...');
            
            const { botManager, dbManager } = await initializeManagers();
            
            // Set development mode if specified
            if (options.dev) {
                botManager.setConfig('devMode', true);
                logger.info('cli', 'Running in development mode');
            }
            
            // Start the bot
            await botManager.start();
            
            // Handle shutdown
            process.on('SIGINT', async () => {
                logger.info('cli', 'Shutting down...');
                await shutdownManagers(botManager, dbManager);
                process.exit(0);
            });
            
            logger.success('cli', 'Bot is now online. Press Ctrl+C to stop.');
        } catch (error) {
            logger.error('cli', `Failed to start bot: ${error.message}`);
            process.exit(1);
        }
    });

// Deploy commands
program
    .command('deploy')
    .description('Deploy slash commands')
    .option('-g, --guild', 'Deploy to guild only (for testing)')
    .action(async (options) => {
        try {
            logger.info('cli', 'Deploying slash commands...');
            
            const { botManager, dbManager } = await initializeManagers();
            
            // Start the bot (required to deploy commands)
            await botManager.start();
            
            // Deploy commands
            await botManager.deployCommands(options.guild);
            
            // Shutdown
            await shutdownManagers(botManager, dbManager);
            
            logger.success('cli', 'Commands deployed successfully');
            process.exit(0);
        } catch (error) {
            logger.error('cli', `Failed to deploy commands: ${error.message}`);
            process.exit(1);
        }
    });

// Status command
program
    .command('status')
    .description('Show bot status')
    .action(async () => {
        try {
            logger.info('cli', 'Getting bot status...');
            
            const { botManager, dbManager } = await initializeManagers();
            
            // Get status without starting the bot
            const moduleStatus = botManager.moduleRegistry.getModuleStatus();
            
            // Display status
            console.log('\nBot Manager Status:');
            console.log('-------------------');
            console.log(`Name: ${botManager.name}`);
            console.log(`Version: ${botManager.version}`);
            console.log(`Modules: ${moduleStatus.total} (${moduleStatus.initialized} initialized)`);
            console.log(`Commands: ${botManager.commands.size}`);
            console.log(`Events: ${botManager.events.size}`);
            
            // Module breakdown
            console.log('\nModules by Type:');
            for (const [type, count] of Object.entries(moduleStatus.byType)) {
                console.log(`  ${type}: ${count}`);
            }
            
            console.log('\nModules by Category:');
            for (const [category, count] of Object.entries(moduleStatus.byCategory)) {
                console.log(`  ${category}: ${count}`);
            }
            
            // Shutdown
            await shutdownManagers(botManager, dbManager);
            
            process.exit(0);
        } catch (error) {
            logger.error('cli', `Failed to get status: ${error.message}`);
            process.exit(1);
        }
    });

// Reload command
program
    .command('reload')
    .description('Reload commands and events')
    .action(async () => {
        try {
            logger.info('cli', 'Reloading bot modules...');
            
            const { botManager, dbManager } = await initializeManagers();
            
            // Reload commands and events
            await botManager.loadCommands();
            await botManager.loadEvents();
            
            // Shutdown
            await shutdownManagers(botManager, dbManager);
            
            logger.success('cli', 'Bot modules reloaded successfully');
            process.exit(0);
        } catch (error) {
            logger.error('cli', `Failed to reload modules: ${error.message}`);
            process.exit(1);
        }
    });

// Generate command
program
    .command('generate')
    .description('Generate a new command or event')
    .argument('<type>', 'Type of file to generate (command or event)')
    .argument('<name>', 'Name of the command or event')
    .option('-c, --category <category>', 'Category for the command or event')
    .action(async (type, name, options) => {
        try {
            logger.info('cli', `Generating ${type}: ${name}`);
            
            const { botManager, dbManager } = await initializeManagers();
            
            const category = options.category || 'misc';
            let result;
            
            if (type === 'command') {
                // Create command template
                const command = botManager.createCommand({
                    name,
                    description: `The ${name} command`,
                    category
                });
                
                // Save command to file
                const dir = path.join(process.cwd(), botManager.getConfig('commandsPath'), category);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                const filePath = path.join(dir, `${name}.js`);
                
                // Generate command file content
                const content = `/**
 * ${name} Command
 * Category: ${category}
 */

const BaseCommand = require('../../managers/bot/modules/base.command');

class ${name.charAt(0).toUpperCase() + name.slice(1)}Command extends BaseCommand {
    constructor(manager) {
        super(manager, {
            name: '${name}',
            description: 'The ${name} command',
            category: '${category}',
            cooldown: 3
        });
        
        // Add command options here if needed
        // this.builder.addStringOption(option =>
        //     option.setName('option')
        //         .setDescription('An option')
        //         .setRequired(false)
        // );
    }
    
    async run(interaction) {
        await interaction.reply({
            content: 'Command executed successfully!',
            ephemeral: false
        });
    }
}

module.exports = ${name.charAt(0).toUpperCase() + name.slice(1)}Command;`;
                
                fs.writeFileSync(filePath, content);
                result = filePath;
            } else if (type === 'event') {
                // Create event template
                const event = botManager.createEvent({
                    name: `${name}-handler`,
                    eventName: name,
                    once: false
                });
                
                // Save event to file
                const dir = path.join(process.cwd(), botManager.getConfig('eventsPath'), category);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                const filePath = path.join(dir, `${name}.js`);
                
                // Generate event file content
                const content = `/**
 * ${name} Event
 * Category: ${category}
 */

const BaseEvent = require('../../managers/bot/modules/base.event');
const { Events } = require('discord.js');

class ${name.charAt(0).toUpperCase() + name.slice(1)}Event extends BaseEvent {
    constructor(manager) {
        super(manager, {
            name: '${name}-handler',
            eventName: Events.${name.charAt(0).toUpperCase() + name.slice(1)},
            once: false
        });
    }
    
    async run(...args) {
        this.logger.debug(this.name, '${name} event triggered');
        // Implement event handling logic here
    }
}

module.exports = ${name.charAt(0).toUpperCase() + name.slice(1)}Event;`;
                
                fs.writeFileSync(filePath, content);
                result = filePath;
            } else {
                throw new Error(`Invalid type: ${type}. Must be 'command' or 'event'`);
            }
            
            // Shutdown
            await shutdownManagers(botManager, dbManager);
            
            logger.success('cli', `Generated ${type} at: ${result}`);
            process.exit(0);
        } catch (error) {
            logger.error('cli', `Failed to generate ${type}: ${error.message}`);
            process.exit(1);
        }
    });

// Parse arguments
program.parse();

// If no arguments, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
} 