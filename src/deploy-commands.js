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

// Load all commands
logger.info('Loading commands from src/commands');
loadCommands('commands');

// Create and configure REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Function to register commands
async function deployCommands() {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);
    
    // Check if CLIENT_ID is defined
    if (!process.env.CLIENT_ID) {
      logger.error('CLIENT_ID is not defined in .env file. Please add it and try again.');
      return;
    }

    // The put method is used to fully refresh all commands
    const data = await rest.put(
      // For global commands (all servers)
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(`Error deploying commands: ${error}`);
  }
}

deployCommands(); 