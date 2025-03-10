/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script registers slash commands with Discord's API.
 * It can register commands globally or for specific guilds.
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');

// Command line arguments
const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isGuild = args.includes('--guild') || args.includes('-s'); // s for server
const isAll = args.includes('--all') || args.includes('-a');
const isHelp = args.includes('--help') || args.includes('-h');
const isForce = args.includes('--force') || args.includes('-f');
const isVerbose = args.includes('--verbose') || args.includes('-v');

// Get guild ID from arguments
let guildId = process.env.GUILD_ID;
const guildIdArg = args.find(arg => arg.startsWith('--guild-id=') || arg.startsWith('--server-id='));
if (guildIdArg) {
  guildId = guildIdArg.split('=')[1];
}

// Get client ID from arguments or environment
const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;

// Show help message
if (isHelp) {
  console.log(`
JMF Bot Command Registration Script
===================================

Usage: node register-commands.js [options]

Options:
  --global, -g       Register commands globally (takes up to an hour to propagate)
  --guild, -s        Register commands for a specific guild (instant)
  --all, -a          Register commands both globally and for the guild
  --guild-id=ID      Specify a guild ID (overrides .env)
  --force, -f        Force registration even if no changes are detected
  --verbose, -v      Show detailed logging
  --help, -h         Show this help message

Examples:
  node register-commands.js --global
  node register-commands.js --guild
  node register-commands.js --guild --guild-id=123456789012345678
  node register-commands.js --all --verbose
  `);
  process.exit(0);
}

// Validate required parameters
if (!clientId) {
  logger.error('CLIENT_ID is not defined in .env file');
  process.exit(1);
}

if (!token) {
  logger.error('DISCORD_TOKEN is not defined in .env file');
  process.exit(1);
}

if ((isGuild || isAll) && !guildId) {
  logger.error('GUILD_ID is not defined in .env file or command line arguments');
  process.exit(1);
}

// If no registration type is specified, show help
if (!isGlobal && !isGuild && !isAll) {
  logger.error('No registration type specified. Use --global, --guild, or --all');
  logger.info('Use --help for more information');
  process.exit(1);
}

// Initialize REST client
const rest = new REST({ version: '10' }).setToken(token);

// Function to recursively load commands from directories
function loadCommands(dir) {
  const commands = [];
  const commandNames = new Set();
  const commandsPath = path.join(__dirname, dir);
  
  function processDirectory(currentPath, relativePath = '') {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Process subdirectory
        processDirectory(itemPath, path.join(relativePath, item));
      } else if (item.endsWith('.js') && item !== 'index.js') {
        // Process JS file
        try {
          const command = require(itemPath);
          
          if ('data' in command && 'execute' in command) {
            const commandName = command.data.name;
            
            // Check for duplicate command names
            if (commandNames.has(commandName)) {
              logger.warn(`Duplicate command name found: ${commandName} in ${itemPath}. Skipping.`);
              continue;
            }
            
            commandNames.add(commandName);
            commands.push(command.data.toJSON());
            
            if (isVerbose) {
              logger.info(`Loaded command: ${commandName} from ${path.join(relativePath, item)}`);
            }
          } else {
            logger.warn(`The command at ${itemPath} is missing required "data" or "execute" property.`);
          }
        } catch (error) {
          logger.error(`Error loading command from ${itemPath}: ${error.message}`);
        }
      }
    }
  }
  
  processDirectory(commandsPath);
  return commands;
}

// Load commands
const commands = loadCommands('src/commands');

logger.info(`Loaded ${commands.length} commands`);

// Function to register commands
async function registerCommands() {
  try {
    logger.info('Started refreshing application commands.');
    
    // Register commands globally if specified
    if (isGlobal || isAll) {
      logger.info(`Registering ${commands.length} commands globally...`);
      
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      
      logger.info(`Successfully registered ${data.length} global commands.`);
      logger.info('Global commands may take up to an hour to propagate to all servers.');
    }
    
    // Register commands for a specific guild if specified
    if (isGuild || isAll) {
      logger.info(`Registering ${commands.length} commands for guild ${guildId}...`);
      
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      
      logger.info(`Successfully registered ${data.length} guild commands.`);
      logger.info('Guild commands are available immediately.');
    }
    
    logger.info('Command registration completed successfully.');
  } catch (error) {
    logger.error(`Error registering commands: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

// Execute command registration
registerCommands(); 