/**
 * JMF Hosting Discord Bot - Command Tester
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script tests the bot's commands by simulating command interactions.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, ApplicationCommandType, InteractionType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../../src/utils/logger');

// Command line arguments
const args = process.argv.slice(2);
const commandToTest = args[0];
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h'),
  list: args.includes('--list') || args.includes('-l'),
  guild: args.find(arg => arg.startsWith('--guild='))?.split('=')[1] || process.env.GUILD_ID,
  user: args.find(arg => arg.startsWith('--user='))?.split('=')[1] || process.env.OWNER_ID,
};

// Show help message
function showHelp() {
  console.log(`
JMF Bot Command Tester
=====================

Usage: node test-commands.js [command] [options]

Arguments:
  command               The command to test (e.g., 'ping', 'help')

Options:
  --list, -l           List all available commands
  --verbose, -v        Show detailed output
  --help, -h           Show this help message
  --guild=ID           Specify a guild ID (overrides .env)
  --user=ID            Specify a user ID (overrides .env)

Examples:
  node test-commands.js ping
  node test-commands.js help --verbose
  node test-commands.js --list
  node test-commands.js ping --guild=123456789012345678
  `);
  process.exit(0);
}

// Create a mock interaction
function createMockInteraction(client, command, guildId, userId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error(`Guild with ID ${guildId} not found`);
  }
  
  const user = client.users.cache.get(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }
  
  const member = guild.members.cache.get(userId);
  if (!member) {
    throw new Error(`Member with ID ${userId} not found in guild ${guild.name}`);
  }
  
  // Create a mock channel
  const channel = guild.channels.cache.find(c => c.type === 0); // 0 is GUILD_TEXT
  if (!channel) {
    throw new Error(`No text channels found in guild ${guild.name}`);
  }
  
  // Create a mock interaction
  return {
    id: Date.now().toString(),
    applicationId: client.user.id,
    type: InteractionType.ApplicationCommand,
    commandType: ApplicationCommandType.ChatInput,
    commandId: Date.now().toString(),
    commandName: command.name,
    commandGuildId: guildId,
    user,
    member,
    guild,
    channel,
    guildId,
    channelId: channel.id,
    deferred: false,
    replied: false,
    ephemeral: false,
    options: {
      getSubcommand: () => null,
      getSubcommandGroup: () => null,
      getString: () => null,
      getInteger: () => null,
      getBoolean: () => null,
      getUser: () => null,
      getMember: () => null,
      getChannel: () => null,
      getRole: () => null,
      getMentionable: () => null,
      getNumber: () => null,
      getAttachment: () => null,
      getFocused: () => null,
      data: [],
    },
    deferReply: async (options) => {
      logger.info(`Command ${command.name} deferred reply with options: ${JSON.stringify(options)}`);
      interaction.deferred = true;
      return interaction;
    },
    editReply: async (options) => {
      logger.info(`Command ${command.name} edited reply with options: ${JSON.stringify(options)}`);
      interaction.replied = true;
      return interaction;
    },
    reply: async (options) => {
      logger.info(`Command ${command.name} replied with options: ${JSON.stringify(options)}`);
      interaction.replied = true;
      return interaction;
    },
    followUp: async (options) => {
      logger.info(`Command ${command.name} followed up with options: ${JSON.stringify(options)}`);
      return interaction;
    },
    deleteReply: async () => {
      logger.info(`Command ${command.name} deleted reply`);
      return interaction;
    },
    client,
  };
}

// Load commands
function loadCommands(client) {
  const commands = new Map();
  const commandsPath = path.join(__dirname, '../../src/commands');
  
  function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        processDirectory(itemPath);
      } else if (item.endsWith('.js') && item !== 'index.js') {
        try {
          const command = require(itemPath);
          
          if ('data' in command && 'execute' in command) {
            const commandName = command.data.name;
            commands.set(commandName, command);
            
            if (options.verbose) {
              logger.info(`Loaded command: ${commandName} from ${path.relative(commandsPath, itemPath)}`);
            }
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

// List all commands
function listCommands(commands) {
  console.log('\nAvailable Commands:');
  console.log('===================\n');
  
  const commandList = Array.from(commands.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, command]) => {
      const description = command.data.description || 'No description';
      return `${name.padEnd(15)} - ${description}`;
    });
  
  console.log(commandList.join('\n'));
  console.log('\n');
}

// Test a command
async function testCommand(client, commandName, commands, guildId, userId) {
  const command = commands.get(commandName);
  
  if (!command) {
    logger.error(`Command "${commandName}" not found`);
    console.log(`Available commands: ${Array.from(commands.keys()).join(', ')}`);
    return false;
  }
  
  try {
    logger.info(`Testing command: ${commandName}`);
    
    // Create a mock interaction
    const interaction = createMockInteraction(client, command, guildId, userId);
    
    // Execute the command
    await command.execute(interaction);
    
    logger.info(`Command ${commandName} executed successfully`);
    return true;
  } catch (error) {
    logger.error(`Error testing command ${commandName}: ${error.message}`);
    if (options.verbose && error.stack) {
      logger.error(error.stack);
    }
    return false;
  }
}

// Main function
async function main() {
  if (options.help) {
    showHelp();
    return;
  }
  
  // Check if token is provided
  if (!process.env.DISCORD_TOKEN) {
    logger.error('DISCORD_TOKEN is not defined in .env file');
    process.exit(1);
  }
  
  // Check if guild ID is provided
  if (!options.guild) {
    logger.error('GUILD_ID is not defined in .env file or command line arguments');
    process.exit(1);
  }
  
  // Check if user ID is provided
  if (!options.user) {
    logger.error('OWNER_ID is not defined in .env file or command line arguments');
    process.exit(1);
  }
  
  // Create a new client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages
    ]
  });
  
  // Load commands
  logger.info('Loading commands...');
  
  // Login to Discord
  try {
    await client.login(process.env.DISCORD_TOKEN);
    logger.info('Logged in to Discord');
    
    // Wait for the client to be ready
    await new Promise(resolve => {
      if (client.isReady()) {
        resolve();
      } else {
        client.once('ready', resolve);
      }
    });
    
    // Load commands
    const commands = loadCommands(client);
    logger.info(`Loaded ${commands.size} commands`);
    
    // List commands if requested
    if (options.list) {
      listCommands(commands);
      client.destroy();
      return;
    }
    
    // Check if a command is specified
    if (!commandToTest) {
      logger.error('No command specified');
      console.log('Use --list to see available commands');
      client.destroy();
      return;
    }
    
    // Test the command
    const success = await testCommand(client, commandToTest, commands, options.guild, options.user);
    
    // Destroy the client
    client.destroy();
    logger.info('Disconnected from Discord');
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    if (options.verbose && error.stack) {
      logger.error(error.stack);
    }
    
    // Destroy the client if it's logged in
    if (client.isReady()) {
      client.destroy();
    }
    
    process.exit(1);
  }
}

// Run the main function
main(); 