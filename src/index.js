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
const readline = require('node:readline');
const logger = require('./utils/logger');
const statusMonitor = require('./utils/statusMonitor');
const { nodeStatusManager } = require('./commands/admin/node');
const database = require('./utils/database');

// Function to prompt for Discord token if missing
async function promptForDiscordToken() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n=== Discord Token Setup ===');
    console.log('Your Discord token is missing or invalid in the .env file.');
    console.log('You can enter it manually now, or press Ctrl+C to exit and set it in the .env file.');
    console.log('The token will be saved to your .env file for future use.');
    
    rl.question('\nPlease enter your Discord bot token: ', (token) => {
      if (!token || token.trim() === '') {
        console.log('No token provided. Exiting...');
        process.exit(1);
      }
      
      // Save the token to .env file
      try {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = '';
        
        // Read existing .env file if it exists
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
          
          // Check if DISCORD_TOKEN already exists in the file
          if (envContent.includes('DISCORD_TOKEN=')) {
            // Replace the existing token
            envContent = envContent.replace(/DISCORD_TOKEN=.*(\r?\n|$)/g, `DISCORD_TOKEN=${token}$1`);
          } else {
            // Add the token to the file
            envContent += `\nDISCORD_TOKEN=${token}\n`;
          }
        } else {
          // Create a new .env file with the token
          envContent = `# Discord Bot Token (Required)\nDISCORD_TOKEN=${token}\n`;
        }
        
        // Write the updated content back to the .env file
        fs.writeFileSync(envPath, envContent);
        console.log('Token saved to .env file successfully!');
        
        // Set the token in the environment
        process.env.DISCORD_TOKEN = token;
        
        rl.close();
        resolve(token);
      } catch (error) {
        console.error(`Error saving token to .env file: ${error.message}`);
        console.log('Continuing with the provided token for this session only...');
        process.env.DISCORD_TOKEN = token;
        rl.close();
        resolve(token);
      }
    });
  });
}

// Check if Discord token is available
if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN.trim() === '') {
  logger.error('DISCORD_TOKEN is missing or empty in your .env file');
  logger.info('You will be prompted to enter your Discord token manually');
}

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

logger.info(`Loading commands from ${foldersPath}`);

for (const item of commandItems) {
  const itemPath = path.join(foldersPath, item);
  
  try {
    const itemStat = fs.statSync(itemPath);
    
    if (itemStat.isDirectory()) {
      // Handle folders
      logger.debug(`Processing command directory: ${item}`);
      const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const filePath = path.join(itemPath, file);
        try {
          // Check for BOM and other invalid characters at the beginning of the file
          let fileContent = fs.readFileSync(filePath, 'utf8');
          if (fileContent.charCodeAt(0) === 0xFEFF || fileContent.charCodeAt(0) < 32) {
            logger.warn(`Found invalid characters at the beginning of ${filePath}, attempting to fix...`);
            // Remove BOM and any other control characters at the beginning
            fileContent = fileContent.replace(/^\uFEFF/, ''); // Remove BOM
            fileContent = fileContent.replace(/^[\x00-\x1F\x7F-\x9F]+/, ''); // Remove control characters
            
            // Write the fixed content back to the file
            fs.writeFileSync(filePath, fileContent, 'utf8');
            logger.info(`Fixed invalid characters in ${filePath}`);
          }
          
          const command = require(filePath);
          
          // Set a new item in the Collection with the key as the command name and the value as the exported module
          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.debug(`Loaded command from folder: ${command.data.name}`);
          } else {
            logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
          }
        } catch (error) {
          logger.error(`Error loading command at ${filePath}: ${error.message}`);
          logger.error(error.stack);
        }
      }
    } else if (item.endsWith('.js')) {
      // Handle JS files directly in the commands folder
      logger.debug(`Processing command file: ${item}`);
      try {
        const command = require(itemPath);
        
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          logger.debug(`Loaded command: ${command.data.name}`);
        } else {
          logger.warn(`The command at ${itemPath} is missing a required "data" or "execute" property.`);
        }
      } catch (error) {
        logger.error(`Error loading command at ${itemPath}: ${error.message}`);
        logger.error(error.stack);
      }
    }
  } catch (error) {
    logger.error(`Error processing item ${item} in commands folder: ${error.message}`);
    logger.error(error.stack);
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

// Flag to track if shutdown is in progress
let isShuttingDown = false;

// Function to gracefully shutdown the bot
async function gracefulShutdown(signal) {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  try {
    // Set bot status to offline before disconnecting
    if (client && client.user) {
      logger.info('Setting bot status to offline...');
      await client.user.setStatus('invisible');
      await client.user.setActivity(null);
    }
    
    // Close database connection
    if (database && database.isConnected) {
      logger.info('Closing database connection...');
      await database.close();
      logger.info('Database connection closed.');
    }
    
    // Destroy the client connection to Discord
    if (client) {
      logger.info('Destroying Discord client connection...');
      await client.destroy();
      logger.info('Discord client connection destroyed.');
    }
    
    logger.info('Shutdown complete. Exiting process.');
    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Initialize database
(async () => {
  try {
    // Create database schema directories if they don't exist
    const schemaDir = path.join(__dirname, 'database', 'schema');
    if (!fs.existsSync(schemaDir)) {
      logger.info(`Creating schema directory: ${schemaDir}`);
      fs.mkdirSync(schemaDir, { recursive: true });
    }
    
    // Check for schema files
    const unifiedSchemaPath = path.join(schemaDir, 'unified-schema.sql');
    const sqliteSchemaPath = path.join(schemaDir, 'sqlite-schema.sql');
    
    if (!fs.existsSync(unifiedSchemaPath) && !fs.existsSync(sqliteSchemaPath)) {
      logger.warn('Schema files not found. Creating empty schema files.');
      
      // Create basic unified schema file if it doesn't exist
      fs.writeFileSync(unifiedSchemaPath, '-- JMF Hosting Discord Bot Unified Schema\n-- © 2025 JMFHosting\n\n-- Add your schema here\n', 'utf8');
      logger.info(`Created empty schema file: ${unifiedSchemaPath}`);
    }
    
    const dbInitialized = await database.initialize();
    if (dbInitialized) {
      // Attach database to client for easy access
      client.db = database;
      logger.info('Database attached to client');
    }
  } catch (error) {
    logger.error(`Failed to initialize database: ${error.message}`);
  }
  
  // Check if Discord token is missing and prompt for it
  if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN.trim() === '') {
    try {
      await promptForDiscordToken();
    } catch (error) {
      logger.error(`Error during token prompt: ${error.message}`);
      process.exit(1);
    }
  }
  
  // Log token status (without revealing the token)
  logger.info(`Discord token status: ${process.env.DISCORD_TOKEN ? 'Present' : 'Missing'} (length: ${process.env.DISCORD_TOKEN?.length || 0})`);
  
  // Login to Discord with error handling
  try {
    await client.login(process.env.DISCORD_TOKEN);
    logger.info('Bot logged in successfully');
  } catch (error) {
    logger.error(`Error logging in: ${error.message}`);
    
    // If login fails, prompt for a new token
    logger.info('Login failed. You will be prompted to enter a new Discord token.');
    try {
      await promptForDiscordToken();
      // Try logging in again with the new token
      await client.login(process.env.DISCORD_TOKEN);
      logger.info('Bot logged in successfully with the new token');
    } catch (retryError) {
      logger.error(`Error logging in with new token: ${retryError.message}`);
      logger.error('Please check that your DISCORD_TOKEN is correct and properly formatted');
      logger.error('Make sure there are no spaces, quotes, or special characters around the token');
      process.exit(1);
    }
  }
})();

// Handle process termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error.message}`);
  logger.error(error.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  logger.error(error.stack);
  
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async (c) => {
  logger.info(`Ready! Logged in as ${c.user.tag}`);
  
  // Initialize status monitor
  await statusMonitor.init(client);
  
  // Initialize node status manager
  await nodeStatusManager.init(client);
}); 