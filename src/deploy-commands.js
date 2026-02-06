/**
 * JMF Hosting Discord Bot - Command Deployment
 * Version: 1.2.0
 * Last Updated: 03/16/2025
 * 
 * This script registers slash commands with Discord's API.
 * It uses the command registry to load all commands and deploy them.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

// Core modules
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { REST, Routes } = require('discord.js');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Import Bot class
const Bot = require('./bot');

// Parse command line arguments
const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || !args.includes('--guild');
const isGuild = args.includes('--guild');
const isDev = args.includes('--dev');

// CLI overrides
const tokenArg = args.find(arg => arg.startsWith('--token='));
if (tokenArg) {
    process.env.DISCORD_TOKEN = tokenArg.split('=')[1];
    console.log('[Override] Using token from CLI argument');
}

const clientArg = args.find(arg => arg.startsWith('--client='));
if (clientArg) {
    process.env.CLIENT_ID = clientArg.split('=')[1];
    console.log('[Override] Using client ID from CLI argument');
}

const guildArg = args.find(arg => arg.startsWith('--guildId='));
if (guildArg) {
    process.env.GUILD_ID = guildArg.split('=')[1];
    console.log('[Override] Using guild ID from CLI argument');
}

// Global managers object
global.managers = {};

/**
 * Main function to deploy commands
 */
async function deployCommands() {
    const bot = new Bot();

    try {
        console.log('Starting command deployment...');

        // Validate environment variables
        if (!process.env.DISCORD_TOKEN) {
            console.error('DISCORD_TOKEN is not defined. Please provide it via .env or --token CLI argument.');
            process.exit(1);
        }

        if (!process.env.CLIENT_ID) {
            console.error('CLIENT_ID is not defined. Please provide it via .env or --client CLI argument.');
            process.exit(1);
        }

        // Initialize the bot
        await bot.initialize({
            logLevel: process.env.LOG_LEVEL || 'info',
            logDirectory: process.env.LOG_DIRECTORY || './logs',
            configPath: process.env.CONFIG_PATH || './config'
        });

        const logger = global.managers.logger;
        logger.info('deploy', 'Loading commands from command registry...');

        const commandRegistry = bot.commandRegistry;
        await commandRegistry.loadCommands();
        const allCommands = commandRegistry.getAllCommands();

        logger.info('deploy', `Found ${allCommands.size} commands to register`);

        const commandsToRegister = [];
        for (const [name, command] of allCommands) {
            if (command.hidden || !command.enabled || (command.dev && !isDev)) continue;
            commandsToRegister.push(command.data.toJSON());
        }

        if (!commandsToRegister.length) {
            logger.error('deploy', 'No commands found to register.');
            process.exit(1);
        }

        // Configure REST instance
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        let data;
        if (isGuild) {
            if (!process.env.GUILD_ID) {
                logger.error('deploy', 'GUILD_ID is required for guild deployment.');
                process.exit(1);
            }
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commandsToRegister },
            );
            logger.success('deploy', `Reloaded ${data.length} commands for guild ${process.env.GUILD_ID}`);
        } else {
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commandsToRegister },
            );
            logger.success('deploy', `Reloaded ${data.length} commands globally`);
        }

        await gracefulShutdown('COMPLETION', bot);

    } catch (error) {
        const logger = global.managers?.logger || console;
        logger.error('deploy', `Error deploying commands: ${error.message}`, error.stack);
        await gracefulShutdown('ERROR', bot);
    }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal, bot) {
    const logger = global.managers?.logger || console;
    try {
        if (bot) await bot.stop();
        logger.log(`Shutting down due to ${signal}`);
        process.exit(signal === 'ERROR' ? 1 : 0);
    } catch (err) {
        logger.error(`Error during shutdown: ${err.message}`, err.stack);
        process.exit(1);
    }
}

// Execute
deployCommands();
