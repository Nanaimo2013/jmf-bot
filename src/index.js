/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const logger = require('./utils/logger');
const statusMonitor = require('./utils/statusMonitor');
const { nodeStatusManager } = require('./commands/admin/node');
const database = require('./utils/database');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction
  ]
});

// Initialize collections for commands and cooldowns
client.commands = new Collection();
client.legacyCommands = new Collection();
client.cooldowns = new Collection();

// Load commands
const foldersPath = path.join(__dirname, 'commands');
const commandItems = fs.readdirSync(foldersPath);

for (const item of commandItems) {
  const itemPath = path.join(foldersPath, item);
  const itemStat = fs.statSync(itemPath);
  
  if (itemStat.isDirectory()) {
    // Handle folders
    const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(itemPath, file);
      const command = require(filePath);
      
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.debug(`Loaded command from folder: ${command.data.name}`);
      } else {
        logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  } else if (item.endsWith('.js')) {
    // Handle JS files directly in the commands folder
    const command = require(itemPath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.debug(`Loaded command: ${command.data.name}`);
    } else {
      logger.warn(`The command at ${itemPath} is missing a required "data" or "execute" property.`);
    }
  }
}

// Load legacy commands (if any)
const legacyCommandsPath = path.join(__dirname, 'legacy-commands');
if (fs.existsSync(legacyCommandsPath)) {
  const legacyCommandFiles = fs.readdirSync(legacyCommandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of legacyCommandFiles) {
    const filePath = path.join(legacyCommandsPath, file);
    const command = require(filePath);
    
    if ('name' in command && 'execute' in command) {
      client.legacyCommands.set(command.name, command);
      logger.debug(`Loaded legacy command: ${command.name}`);
    } else {
      logger.warn(`The legacy command at ${filePath} is missing a required "name" or "execute" property.`);
    }
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  
  logger.debug(`Loaded event: ${event.name}`);
}

// Initialize modules
const leveling = require('./modules/leveling');
const economy = require('./modules/economy');
const mining = require('./modules/mining');
const verification = require('./modules/verification');
const tickets = require('./modules/tickets');

// Initialize modules
leveling.init(client);
economy.init(client);
mining.init(client);
verification.init(client);
tickets.init(client);

// Initialize database
(async () => {
  try {
    const dbInitialized = await database.initialize();
    if (dbInitialized) {
      // Attach database to client for easy access
      client.db = database;
      logger.info('Database attached to client');
    }
  } catch (error) {
    logger.error(`Failed to initialize database: ${error.message}`);
  }
  
  // Login to Discord
  client.login(process.env.DISCORD_TOKEN)
    .then(() => {
      logger.info('Bot logged in successfully');
    })
    .catch(error => {
      logger.error(`Error logging in: ${error.message}`);
      process.exit(1);
    });
})();

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down...');
  
  // Close database connection
  if (database.isConnected) {
    await database.close();
  }
  
  // Destroy client
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down...');
  
  // Close database connection
  if (database.isConnected) {
    await database.close();
  }
  
  // Destroy client
  client.destroy();
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error.message}`);
  logger.error(error.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  logger.error(error.stack);
  
  // Close database connection
  if (database.isConnected) {
    database.close().finally(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async (c) => {
  logger.info(`Ready! Logged in as ${c.user.tag}`);
  
  // Initialize status monitor
  await statusMonitor.init(client);
  
  // Initialize node status manager
  await nodeStatusManager.init(client);
}); 