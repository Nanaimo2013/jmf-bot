/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script registers slash commands with Discord's API.
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const isGlobal = args.includes('--global');
const isGuild = args.includes('--guild');

// Initialize an array to hold command data
const commands = [];
// Track command names to prevent duplicates
const commandNames = new Set();

// Function to recursively load commands from directories
function loadCommands(dir) {
  const commandsPath = path.join(__dirname, dir);
  const items = fs.readdirSync(commandsPath);

  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // If it's a directory, check for index.js or load recursively
      const indexPath = path.join(itemPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        const command = require(indexPath);
        if ('data' in command && 'execute' in command) {
          const commandName = command.data.name;
          
          // Check for duplicate command names
          if (commandNames.has(commandName)) {
            logger.warn(`Duplicate command name found: ${commandName} in ${indexPath}. Skipping.`);
            continue;
          }
          
          commandNames.add(commandName);
          commands.push(command.data.toJSON());
          logger.debug(`Loaded command from folder: ${item}`);
        } else {
          logger.warn(`The command at ${indexPath} is missing required "data" or "execute" property.`);
        }
      } else {
        // Recursively load commands from subdirectory
        loadCommands(path.join(dir, item));
      }
    } else if (item.endsWith('.js') && item !== 'index.js') {
      // If it's a JS file (not index.js), try to load it as a command
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
        logger.debug(`Loaded command: ${item.slice(0, -3)}`);
      } else {
        logger.warn(`The command at ${itemPath} is missing required "data" or "execute" property.`);
      }
    }
  }
}

// Load all commands from main commands directory
logger.info('Loading commands from src/commands');
loadCommands('commands');

// Check if we have any commands to register
if (commands.length === 0) {
  logger.error('No commands found to register. Check your commands directory structure.');
  process.exit(1);
}

// Log the commands that will be registered
logger.info(`Found ${commands.length} commands to register:`);
commands.forEach(cmd => {
  logger.debug(`- ${cmd.name}: ${cmd.description.substring(0, 50)}${cmd.description.length > 50 ? '...' : ''}`);
});

// Create and configure REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Function to register commands
async function deployCommands() {
  try {
    // Validate environment variables
    if (!process.env.DISCORD_TOKEN) {
      logger.error('DISCORD_TOKEN is not defined in .env file. Please add it and try again.');
      process.exit(1);
    }

    if (!process.env.CLIENT_ID) {
      logger.error('CLIENT_ID is not defined in .env file. Please add it and try again.');
      process.exit(1);
    }

    logger.info(`Started refreshing ${commands.length} application (/) commands.`);
    
    let data;
    
    // Determine where to deploy commands based on arguments
    if (isGuild) {
      // Guild-specific deployment
      if (!process.env.GUILD_ID) {
        logger.error('GUILD_ID is not defined in .env file. Required for guild-specific deployment.');
        process.exit(1);
      }
      
      logger.info(`Deploying commands to guild: ${process.env.GUILD_ID}`);
      data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      
      logger.info(`Successfully reloaded ${data.length} application (/) commands for guild ${process.env.GUILD_ID}.`);
    } else {
      // Global deployment (default)
      logger.info('Deploying commands globally. This may take up to an hour to propagate to all servers.');
      data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      
      logger.info(`Successfully reloaded ${data.length} application (/) commands globally.`);
    }
    
    // Log the registered commands
    if (data && data.length > 0) {
      logger.debug('Registered commands:');
      data.forEach(cmd => {
        logger.debug(`- ${cmd.name} (ID: ${cmd.id})`);
      });
    }
  } catch (error) {
    logger.error(`Error deploying commands: ${error.message}`);
    logger.debug(error.stack);
    process.exit(1);
  }
}

// Execute the deployment
deployCommands(); 