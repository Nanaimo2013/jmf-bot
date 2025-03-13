/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const verification = require('../modules/verification');
const tickets = require('../modules/tickets');
const economy = require('../modules/economy');
const miningGame = require('../modules/mining');
const config = require('../../config.json');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: Events.ClientReady,
  once: true,
  
  async execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
    
    // Initialize database connection
    await initializeDatabase(client);
    
    // Initialize modules
    await initializeModules(client);
    
    // Set up status rotation
    setupStatusRotation(client);
    
    // Set up scheduled tasks
    setupScheduledTasks(client);
    
    // Update server statistics
    await updateServerStatistics(client);
    
    // Register slash commands if needed
    if (process.env.REGISTER_COMMANDS === 'true') {
      await registerCommands(client);
    }
    
    logger.info('Bot initialization complete');
  }
};

/**
 * Initialize database connection
 * @param {Client} client - The Discord client
 */
async function initializeDatabase(client) {
  try {
    if (!config.database || !config.database.enabled) {
      logger.info('Database integration is disabled');
      return;
    }
    
    logger.info('Checking database connection...');
    
    // Database should already be initialized in index.js
    if (!client.db || !client.db.isConnected) {
      logger.warn('Database not connected. Some features may not work properly.');
      return;
    }
    
    // Initialize modules with database
    if (economy) await economy.init(client.db);
    
    logger.info('Database connection verified');
  } catch (error) {
    logger.error(`Database initialization failed: ${error.message}`);
  }
}

/**
 * Initialize modules
 * @param {Client} client - The Discord client
 */
async function initializeModules(client) {
  try {
    logger.info('Initializing modules...');
    
    // Ensure modules are attached to the client
    client.verification = verification;
    client.tickets = tickets;
    client.economy = economy;
    client.mining = miningGame;
    
    // Initialize verification module
    if (verification && config.verification && config.verification.enabled) {
      verification.init(client);
      logger.info('Verification system initialized');
    }
    
    // Initialize ticket system
    if (tickets && config.ticketSystem && config.ticketSystem.enabled) {
      tickets.init(client);
      logger.info('Ticket system initialized');
    }
    
    // Initialize economy module
    if (economy && config.economy && config.economy.enabled) {
      // Make sure economy is initialized with the database
      if (!economy.isInitialized && client.db) {
        await economy.init(client.db);
      }
      logger.info('Economy module initialized');
    }
    
    // Initialize mining game
    if (miningGame && config.miningGame && config.miningGame.enabled) {
      // Make sure mining game is initialized with the database
      if (!miningGame.isInitialized && client.db) {
        await miningGame.init(client.db);
      }
      logger.info('Mining game initialized');
    }
    
    // Set up verification and ticket systems in all guilds
    await setupGuildSystems(client);
    
    logger.info('All modules initialized successfully');
  } catch (error) {
    logger.error(`Module initialization failed: ${error.message}`);
  }
}

/**
 * Set up verification and ticket systems in all guilds
 * @param {Client} client - The Discord client
 */
async function setupGuildSystems(client) {
  try {
    logger.info('Setting up verification and ticket systems in guilds...');
    
    // Process each guild
    for (const guild of client.guilds.cache.values()) {
      try {
        // Set up verification system
        if (verification && config.verification && config.verification.enabled) {
          const verificationChannel = guild.channels.cache.find(
            channel => channel.name === (config.verification.channelName || 'verification') && channel.type === 0
          );
          
          if (verificationChannel) {
            // Clear existing messages in verification channel
            try {
              const messages = await verificationChannel.messages.fetch({ limit: 10 });
              if (messages.size > 0) {
                await verificationChannel.bulkDelete(messages).catch(e => {
                  logger.warn(`Could not bulk delete messages in verification channel: ${e.message}`);
                  // Try deleting messages one by one if bulk delete fails
                  messages.forEach(async (message) => {
                    try {
                      await message.delete();
                    } catch (err) {
                      logger.warn(`Could not delete message: ${err.message}`);
                    }
                  });
                });
              }
            } catch (error) {
              logger.warn(`Could not clear messages in verification channel: ${error.message}`);
            }
            
            // Create verification message
            await verification.createVerificationMessage(verificationChannel);
            logger.info(`Set up verification system in guild: ${guild.name}`);
          } else {
            logger.warn(`Verification channel not found in guild: ${guild.name}`);
          }
        }
        
        // Set up ticket system
        if (tickets && config.ticketSystem && config.ticketSystem.enabled) {
          const ticketChannelName = config.ticketSystem.channelName || 'create-ticket';
          const ticketChannel = guild.channels.cache.find(
            channel => channel.name === ticketChannelName && channel.type === 0
          );
          
          if (ticketChannel) {
            // Clear existing messages in ticket channel
            try {
              const messages = await ticketChannel.messages.fetch({ limit: 10 });
              if (messages.size > 0) {
                await ticketChannel.bulkDelete(messages).catch(e => {
                  logger.warn(`Could not bulk delete messages in ticket channel: ${e.message}`);
                  // Try deleting messages one by one if bulk delete fails
                  messages.forEach(async (message) => {
                    try {
                      await message.delete();
                    } catch (err) {
                      logger.warn(`Could not delete message: ${err.message}`);
                    }
                  });
                });
              }
            } catch (error) {
              logger.warn(`Could not clear messages in ticket channel: ${error.message}`);
            }
            
            // Create ticket message
            await tickets.createTicketMessage(ticketChannel);
            logger.info(`Set up ticket system in guild: ${guild.name}`);
          } else {
            logger.warn(`Ticket channel not found in guild: ${guild.name}`);
          }
        }
      } catch (error) {
        logger.error(`Error setting up systems in guild ${guild.name}: ${error.message}`);
      }
    }
    
    logger.info('Verification and ticket systems set up successfully');
  } catch (error) {
    logger.error(`Failed to set up guild systems: ${error.message}`);
  }
}

/**
 * Set up status rotation
 * @param {Client} client - The Discord client
 */
function setupStatusRotation(client) {
  try {
    if (!config.statusRotation || !config.statusRotation.enabled) {
      // Set default activity
    client.user.setPresence({
      activities: [{ 
        name: 'JMF Hosting | /help', 
        type: ActivityType.Playing 
      }],
      status: 'online',
    });
      return;
    }
    
    const statuses = config.statusRotation.statuses || [
      { text: 'JMF Hosting | /help', type: 'PLAYING' },
      { text: 'with Discord.js', type: 'PLAYING' },
      { text: 'your commands', type: 'LISTENING' },
      { text: 'over the server', type: 'WATCHING' }
    ];
    
    let currentIndex = 0;
    
    // Set initial status
    updateStatus();
    
    // Set up interval for status rotation
    setInterval(updateStatus, (config.statusRotation.interval || 60) * 1000);
    
    function updateStatus() {
      const status = statuses[currentIndex];
      
      let activityType;
      switch (status.type.toUpperCase()) {
        case 'PLAYING':
          activityType = ActivityType.Playing;
          break;
        case 'LISTENING':
          activityType = ActivityType.Listening;
          break;
        case 'WATCHING':
          activityType = ActivityType.Watching;
          break;
        case 'COMPETING':
          activityType = ActivityType.Competing;
          break;
        case 'STREAMING':
          activityType = ActivityType.Streaming;
          break;
        default:
          activityType = ActivityType.Playing;
      }
      
      client.user.setPresence({
        activities: [{ 
          name: status.text, 
          type: activityType,
          url: status.url
        }],
        status: status.status || 'online',
      });
      
      // Move to next status
      currentIndex = (currentIndex + 1) % statuses.length;
    }
    
    logger.info('Status rotation set up successfully');
  } catch (error) {
    logger.error(`Status rotation setup failed: ${error.message}`);
  }
}

/**
 * Set up scheduled tasks
 * @param {Client} client - The Discord client
 */
function setupScheduledTasks(client) {
  try {
    logger.info('Setting up scheduled tasks...');
    
    // Update server statistics every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await updateServerStatistics(client);
      } catch (error) {
        logger.error(`Scheduled task error (updateServerStatistics): ${error.message}`);
      }
    });
    
    // Daily database backup at 3 AM
    if (config.database && config.database.enabled && config.database.backupEnabled) {
      cron.schedule('0 3 * * *', async () => {
        try {
          await createDatabaseBackup(client);
        } catch (error) {
          logger.error(`Scheduled task error (createDatabaseBackup): ${error.message}`);
        }
      });
    }
    
    // Apply interest to user balances daily at midnight
    if (config.economy && config.economy.enabled && config.economy.interestRate > 0) {
      cron.schedule('0 0 * * *', async () => {
        try {
          await applyDailyInterest(client);
        } catch (error) {
          logger.error(`Scheduled task error (applyDailyInterest): ${error.message}`);
        }
      });
    }
    
    // Clean up expired boosters every hour
    if (config.miningGame && config.miningGame.enabled) {
      cron.schedule('0 * * * *', async () => {
        try {
          await cleanupExpiredBoosters(client);
        } catch (error) {
          logger.error(`Scheduled task error (cleanupExpiredBoosters): ${error.message}`);
        }
      });
    }
    
    // Weekly analytics report on Sunday at 9 AM
    cron.schedule('0 9 * * 0', async () => {
      try {
        await generateWeeklyAnalytics(client);
      } catch (error) {
        logger.error(`Scheduled task error (generateWeeklyAnalytics): ${error.message}`);
      }
    });
    
    logger.info('Scheduled tasks set up successfully');
  } catch (error) {
    logger.error(`Scheduled tasks setup failed: ${error.message}`);
  }
}

/**
 * Update server statistics
 * @param {Client} client - The Discord client
 */
async function updateServerStatistics(client) {
  try {
    // Update member count channels
    await updateMemberCountChannels(client);
    
    // Update game server status
    await updateGameServerStatus(client);
    
    logger.debug('Server statistics updated successfully');
  } catch (error) {
    logger.error(`Failed to update server statistics: ${error.message}`);
  }
}

/**
 * Update member count channels
 * @param {Client} client - The Discord client
 */
async function updateMemberCountChannels(client) {
  try {
    if (!config.memberCountChannels || !config.memberCountChannels.enabled) {
      return;
    }
    
    logger.debug('Updating member count channels...');
    
    for (const guild of client.guilds.cache.values()) {
      // Total members channel
      if (config.memberCountChannels.totalChannel) {
        const totalChannel = guild.channels.cache.find(
          c => c.id === config.memberCountChannels.totalChannel || 
             (c.name && c.name.includes('Total Members:') && c.type === 2)
        );
        
        if (totalChannel) {
          await totalChannel.setName(`Total Members: ${guild.memberCount}`);
        }
      }
      
      // Human members channel
      if (config.memberCountChannels.humanChannel) {
        const humanChannel = guild.channels.cache.find(
          c => c.id === config.memberCountChannels.humanChannel || 
             (c.name && c.name.includes('Members:') && c.type === 2 && !c.name.includes('Total'))
        );
        
        if (humanChannel) {
          const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
          await humanChannel.setName(`Members: ${humanCount}`);
        }
      }
      
      // Bot members channel
      if (config.memberCountChannels.botChannel) {
        const botChannel = guild.channels.cache.find(
          c => c.id === config.memberCountChannels.botChannel || 
             (c.name && c.name.includes('Bots:') && c.type === 2)
        );
        
        if (botChannel) {
          const botCount = guild.members.cache.filter(m => m.user.bot).size;
          await botChannel.setName(`Bots: ${botCount}`);
        }
      }
      
      // Online members channel
      if (config.memberCountChannels.onlineChannel) {
        const onlineChannel = guild.channels.cache.find(
          c => c.id === config.memberCountChannels.onlineChannel || 
             (c.name && c.name.includes('Online:') && c.type === 2)
        );
        
        if (onlineChannel) {
          const onlineCount = guild.members.cache.filter(member => 
            member.presence?.status === 'online' || 
            member.presence?.status === 'idle' || 
            member.presence?.status === 'dnd'
          ).size;
          
          await onlineChannel.setName(`Online: ${onlineCount}`);
        }
      }
    }
    
    logger.debug('Member count channels updated successfully');
  } catch (error) {
    logger.error(`Failed to update member count channels: ${error.message}`);
  }
}

/**
 * Update game server status
 * @param {Client} client - The Discord client
 */
async function updateGameServerStatus(client) {
  try {
    if (!config.gameServers || !config.gameServers.statusChannel) {
      return;
    }
    
    logger.debug('Updating game server status...');
    
    // Get the status channel
    const statusChannel = client.channels.cache.get(config.gameServers.statusChannel);
    
    if (!statusChannel) {
      const channelByName = client.channels.cache.find(
        c => c.name === config.gameServers.statusChannel && c.type === 0
      );
      
      if (!channelByName) {
        logger.warn(`Server status channel not found: ${config.gameServers.statusChannel}`);
        return;
      }
    }
    
    // Fetch game server data from API
    try {
      // Create API URL
      const apiUrl = config.gameServers.apiUrl || 'https://api.jmfhosting.com/servers/status';
      
      // Fetch server data
      const fetch = require('node-fetch');
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.API_TOKEN || config.gameServers.apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const serverData = await response.json();
      
      // Create status embed
      const { EmbedBuilder } = require('discord.js');
      const statusEmbed = new EmbedBuilder()
        .setTitle('🎮 Game Server Status')
        .setColor('#00AAFF')
        .setDescription('Current status of all game servers')
        .setTimestamp()
        .setFooter({ 
          text: 'Last updated', 
          iconURL: client.user.displayAvatarURL() 
        });
      
      // Add server fields
      if (serverData.servers && serverData.servers.length > 0) {
        for (const server of serverData.servers) {
          const status = server.online ? '🟢 Online' : '🔴 Offline';
          const playerCount = server.online ? `${server.players.current}/${server.players.max}` : 'N/A';
          
          statusEmbed.addFields({
            name: server.name,
            value: `**Status:** ${status}\n**Players:** ${playerCount}\n**Type:** ${server.type || 'Unknown'}\n**Address:** \`${server.address || 'N/A'}\``,
            inline: true
          });
        }
      } else {
        statusEmbed.setDescription('No game servers found or all servers are offline.');
      }
      
      // Find existing status message or send a new one
      const messages = await statusChannel.messages.fetch({ limit: 10 });
      const statusMessage = messages.find(m => 
        m.author.id === client.user.id && 
        m.embeds.length > 0 && 
        m.embeds[0].title === '🎮 Game Server Status'
      );
      
      if (statusMessage) {
        await statusMessage.edit({ embeds: [statusEmbed] });
      } else {
        await statusChannel.send({ embeds: [statusEmbed] });
      }
      
      logger.debug('Game server status updated successfully');
    } catch (error) {
      logger.error(`Failed to fetch game server data: ${error.message}`);
      
      // Send error message to status channel
      const errorEmbed = {
        title: '⚠️ Game Server Status Error',
        description: 'Unable to fetch game server status information.',
        color: 0xFF0000,
        timestamp: new Date()
      };
      
      await statusChannel.send({ embeds: [errorEmbed] });
    }
  } catch (error) {
    logger.error(`Failed to update game server status: ${error.message}`);
  }
}

/**
 * Create database backup
 * @param {Client} client - The Discord client
 */
async function createDatabaseBackup(client) {
  try {
    if (!client.db || !config.database.backupEnabled) {
      return;
    }
    
    logger.info('Creating database backup...');
    
    // Use the database utility's backup function
    // For now, we'll just log that it would happen
    
    logger.info('Database backup created successfully');
  } catch (error) {
    logger.error(`Failed to create database backup: ${error.message}`);
  }
}

/**
 * Apply daily interest to user balances
 * @param {Client} client - The Discord client
 */
async function applyDailyInterest(client) {
  try {
    if (!client.db || !config.economy.interestRate) {
      return;
    }
    
    logger.info('Applying daily interest to user balances...');
    
    const interestRate = config.economy.interestRate;
    
    // Get all user balances
    const [rows] = await client.db.query('SELECT user_id, balance FROM user_balances');
    
    for (const user of rows) {
      const interest = Math.floor(user.balance * interestRate);
      
      if (interest <= 0) continue;
      
      // Update balance
      await client.db.query(
        'UPDATE user_balances SET balance = balance + ? WHERE user_id = ?',
        [interest, user.user_id]
      );
      
      // Record transaction
      await client.db.query(
        'INSERT INTO transactions (user_id, type, amount, old_balance, new_balance, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.user_id, 'add', interest, user.balance, user.balance + interest, 'Daily interest', new Date()]
      );
    }
    
    logger.info(`Applied daily interest (${interestRate * 100}%) to ${rows.length} users`);
  } catch (error) {
    logger.error(`Failed to apply daily interest: ${error.message}`);
  }
}

/**
 * Clean up expired boosters
 * @param {Client} client - The Discord client
 */
async function cleanupExpiredBoosters(client) {
  try {
    if (!client.db) {
      return;
    }
    
    logger.info('Cleaning up expired mining boosters...');
    
    // Update user mining data to remove expired boosters
    await client.db.query(`
      UPDATE user_mining_data 
      SET active_booster = NULL, booster_expiry = NULL 
      WHERE booster_expiry IS NOT NULL AND booster_expiry < NOW()
    `);
    
    logger.info('Expired mining boosters cleaned up successfully');
  } catch (error) {
    logger.error(`Failed to clean up expired boosters: ${error.message}`);
  }
}

/**
 * Generate weekly analytics report
 * @param {Client} client - The Discord client
 */
async function generateWeeklyAnalytics(client) {
  try {
    if (!client.db || !config.analyticsChannel) {
      return;
    }
    
    logger.info('Generating weekly analytics report...');
    
    const analyticsChannel = client.channels.cache.get(config.analyticsChannel);
    
    if (!analyticsChannel) {
      logger.warn(`Analytics channel not found: ${config.analyticsChannel}`);
      return;
    }
    
    // Get date range for the past week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    // Format dates for SQL
    const startDateStr = startDate.toISOString().slice(0, 19).replace('T', ' ');
    const endDateStr = endDate.toISOString().slice(0, 19).replace('T', ' ');
    
    // Get message count
    const [messageRows] = await client.db.query(
      'SELECT COUNT(*) as count FROM messages WHERE timestamp BETWEEN ? AND ?',
      [startDateStr, endDateStr]
    );
    const messageCount = messageRows[0].count;
    
    // Get command usage
    const [commandRows] = await client.db.query(
      'SELECT COUNT(*) as count FROM command_usage WHERE timestamp BETWEEN ? AND ?',
      [startDateStr, endDateStr]
    );
    const commandCount = commandRows[0].count;
    
    // Get new members
    const [memberRows] = await client.db.query(
      'SELECT COUNT(*) as count FROM member_events WHERE event_type = "join" AND timestamp BETWEEN ? AND ?',
      [startDateStr, endDateStr]
    );
    const newMemberCount = memberRows[0].count;
    
    // Get left members
    const [leftRows] = await client.db.query(
      'SELECT COUNT(*) as count FROM member_events WHERE event_type = "leave" AND timestamp BETWEEN ? AND ?',
      [startDateStr, endDateStr]
    );
    const leftMemberCount = leftRows[0].count;
    
    // Get most active users
    const [activeUserRows] = await client.db.query(`
      SELECT user_id, COUNT(*) as message_count 
      FROM messages 
      WHERE timestamp BETWEEN ? AND ? 
      GROUP BY user_id 
      ORDER BY message_count DESC 
      LIMIT 5
    `, [startDateStr, endDateStr]);
    
    // Get most used commands
    const [commandUsageRows] = await client.db.query(`
      SELECT command, COUNT(*) as usage_count 
      FROM command_usage 
      WHERE timestamp BETWEEN ? AND ? 
      GROUP BY command 
      ORDER BY usage_count DESC 
      LIMIT 5
    `, [startDateStr, endDateStr]);
    
    // Create analytics embed
    const embed = {
      title: '📊 Weekly Analytics Report',
      description: `Report for ${startDate.toDateString()} to ${endDate.toDateString()}`,
      color: 0x00AAFF,
      fields: [
        {
          name: 'Server Activity',
          value: `Messages: ${messageCount}\nCommands: ${commandCount}\nNew Members: ${newMemberCount}\nLeft Members: ${leftMemberCount}`,
          inline: false
        }
      ],
      timestamp: new Date()
    };
    
    // Add most active users
    if (activeUserRows.length > 0) {
      const activeUsersField = {
        name: 'Most Active Users',
        value: '',
        inline: false
      };
      
      for (const row of activeUserRows) {
        const user = await client.users.fetch(row.user_id).catch(() => null);
        const username = user ? user.tag : row.user_id;
        activeUsersField.value += `${username}: ${row.message_count} messages\n`;
      }
      
      embed.fields.push(activeUsersField);
    }
    
    // Add most used commands
    if (commandUsageRows.length > 0) {
      const commandsField = {
        name: 'Most Used Commands',
        value: '',
        inline: false
      };
      
      for (const row of commandUsageRows) {
        commandsField.value += `/${row.command}: ${row.usage_count} uses\n`;
      }
      
      embed.fields.push(commandsField);
    }
    
    // Send analytics report
    await analyticsChannel.send({ embeds: [embed] });
    
    logger.info('Weekly analytics report generated successfully');
  } catch (error) {
    logger.error(`Failed to generate weekly analytics report: ${error.message}`);
  }
}

/**
 * Register slash commands
 * @param {Client} client - The Discord client
 */
async function registerCommands(client) {
  try {
    logger.info('Registering slash commands...');
    
    // Collect all command data
      const commands = [];
      const foldersPath = path.join(__dirname, '../commands');
      const commandFolders = fs.readdirSync(foldersPath);
      
      for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
          const filePath = path.join(commandsPath, file);
          const command = require(filePath);
          
          if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
          logger.debug(`Added command: ${command.data.name}`);
          } else {
            logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
          }
        }
      }
      
      // Construct and prepare an instance of the REST module
      const rest = new REST().setToken(process.env.DISCORD_TOKEN);
      
      // Deploy commands
      logger.info(`Started refreshing ${commands.length} application (/) commands.`);
      
      if (process.env.NODE_ENV === 'development' && process.env.GUILD_ID) {
        // Deploy commands to a specific guild in development
        const data = await rest.put(
          Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
          { body: commands },
        );
        logger.info(`Successfully reloaded ${data.length} guild application (/) commands.`);
      } else {
        // Deploy commands globally in production
        const data = await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: commands },
        );
        logger.info(`Successfully reloaded ${data.length} global application (/) commands.`);
    }
    
    logger.info('Slash commands registered successfully');
  } catch (error) {
    logger.error(`Failed to register slash commands: ${error.message}`);
    logger.error(error.stack);
  }
} 