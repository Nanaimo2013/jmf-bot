/**
 * JMF Hosting Discord Bot - Bot Monitor
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script monitors the bot's status, database health, and other critical components.
 * It can be run as a standalone script or as a scheduled task.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const { promisify } = require('util');
const { Client, GatewayIntentBits } = require('discord.js');
const os = require('os');
const { exec } = require('child_process');
const logger = require('../../src/utils/logger');

// Command line arguments
const args = process.argv.slice(2);
const options = {
  checkBot: args.includes('--bot') || args.includes('-b') || args.length === 0,
  checkDatabase: args.includes('--db') || args.includes('-d') || args.length === 0,
  checkSystem: args.includes('--system') || args.includes('-s') || args.length === 0,
  checkDiscord: args.includes('--discord') || args.includes('-c') || args.length === 0,
  fix: args.includes('--fix') || args.includes('-f'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h'),
  json: args.includes('--json') || args.includes('-j'),
};

// Configuration
const config = {
  dbType: process.env.DB_TYPE || 'sqlite',
  dbPath: process.env.DB_PATH || './data/database.sqlite',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: process.env.DB_PORT || 3306,
  dbName: process.env.DB_DATABASE || 'jmf_bot',
  dbUser: process.env.DB_USERNAME || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  botToken: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  processName: 'node src/index.js',
  apiPort: process.env.API_PORT || 3000,
  apiEndpoint: process.env.API_ENDPOINT || 'http://localhost:3000/health',
};

// Results object
const results = {
  timestamp: new Date().toISOString(),
  status: 'unknown',
  bot: {
    running: false,
    uptime: null,
    memory: null,
    cpu: null,
    errors: [],
  },
  database: {
    connected: false,
    type: config.dbType,
    tables: 0,
    errors: [],
    missingColumns: [],
  },
  system: {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpuUsage: null,
    memoryUsage: null,
    diskUsage: null,
    errors: [],
  },
  discord: {
    connected: false,
    ping: null,
    guilds: 0,
    errors: [],
  },
};

// Show help message
function showHelp() {
  console.log(`
JMF Bot Monitor
==============

Usage: node bot-monitor.js [options]

Options:
  --bot, -b         Check bot status (default: enabled)
  --db, -d          Check database health (default: enabled)
  --system, -s      Check system health (default: enabled)
  --discord, -c     Check Discord connection (default: enabled)
  --fix, -f         Attempt to fix issues
  --verbose, -v     Show detailed output
  --json, -j        Output results as JSON
  --help, -h        Show this help message

Examples:
  node bot-monitor.js
  node bot-monitor.js --bot --db
  node bot-monitor.js --fix --verbose
  `);
  process.exit(0);
}

// Check if the bot process is running
async function checkBotProcess() {
  return new Promise((resolve) => {
    const command = process.platform === 'win32'
      ? `tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH`
      : `ps aux | grep "${config.processName}" | grep -v grep`;
    
    exec(command, (error, stdout, stderr) => {
      if (error && !stdout) {
        results.bot.running = false;
        results.bot.errors.push('Bot process not found');
        resolve(false);
        return;
      }
      
      const isRunning = process.platform === 'win32'
        ? stdout.toLowerCase().includes('node.exe')
        : stdout.includes(config.processName);
      
      results.bot.running = isRunning;
      
      if (!isRunning) {
        results.bot.errors.push('Bot process not found');
        resolve(false);
        return;
      }
      
      // Get process details
      const pidCommand = process.platform === 'win32'
        ? `tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH`
        : `ps aux | grep "${config.processName}" | grep -v grep | awk '{print $2}'`;
      
      exec(pidCommand, (pidError, pidStdout) => {
        if (pidError || !pidStdout) {
          resolve(true);
          return;
        }
        
        const pid = process.platform === 'win32'
          ? pidStdout.split(',')[1].replace(/"/g, '')
          : pidStdout.trim();
        
        // Get process stats
        const statsCommand = process.platform === 'win32'
          ? `wmic process where ProcessId=${pid} get WorkingSetSize,UserModeTime`
          : `ps -p ${pid} -o %cpu,%mem,etime`;
        
        exec(statsCommand, (statsError, statsStdout) => {
          if (statsError || !statsStdout) {
            resolve(true);
            return;
          }
          
          if (process.platform === 'win32') {
            const lines = statsStdout.trim().split('\n');
            if (lines.length > 1) {
              const [memory, cpu] = lines[1].trim().split(/\s+/);
              results.bot.memory = parseInt(memory) / (1024 * 1024) + ' MB';
              results.bot.cpu = parseInt(cpu) / 10000000 + '%';
            }
          } else {
            const stats = statsStdout.trim().split(/\s+/);
            if (stats.length >= 3) {
              results.bot.cpu = stats[0] + '%';
              results.bot.memory = stats[1] + '%';
              results.bot.uptime = stats[2];
            }
          }
          
          resolve(true);
        });
      });
    });
  });
}

// Check bot health via API
async function checkBotHealth() {
  try {
    const response = await axios.get(config.apiEndpoint, { timeout: 5000 });
    
    if (response.status === 200) {
      if (options.verbose) {
        logger.info('Bot API health check successful');
      }
      return true;
    } else {
      results.bot.errors.push(`API returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    results.bot.errors.push(`API health check failed: ${error.message}`);
    return false;
  }
}

// Check SQLite database health
async function checkSQLiteDatabase() {
  return new Promise((resolve) => {
    try {
      // Check if database file exists
      if (!fs.existsSync(config.dbPath)) {
        results.database.errors.push(`Database file not found: ${config.dbPath}`);
        results.database.connected = false;
        resolve(false);
        return;
      }
      
      // Connect to the database
      const db = new sqlite3.Database(config.dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          results.database.errors.push(`Failed to connect to database: ${err.message}`);
          results.database.connected = false;
          resolve(false);
          return;
        }
        
        results.database.connected = true;
        
        // Promisify database methods
        db.allAsync = promisify(db.all.bind(db));
        
        // Check tables
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
          if (err) {
            results.database.errors.push(`Failed to get tables: ${err.message}`);
            db.close();
            resolve(false);
            return;
          }
          
          results.database.tables = tables.length;
          
          // Check for required tables
          const requiredTables = [
            'users', 'guilds', 'command_usage', 'button_usage', 'select_menu_usage',
            'account_links', 'leveling', 'mining_data'
          ];
          
          const missingTables = requiredTables.filter(
            table => !tables.some(t => t.name === table)
          );
          
          if (missingTables.length > 0) {
            results.database.errors.push(`Missing tables: ${missingTables.join(', ')}`);
          }
          
          // Check for required columns in tables
          const tableChecks = [
            { table: 'command_usage', columns: ['command', 'timestamp'] },
            { table: 'button_usage', columns: ['button_id'] },
            { table: 'select_menu_usage', columns: ['menu_id', 'selected_values'] },
            { table: 'account_links', columns: ['created_at', 'token', 'expires_at'] }
          ];
          
          const checkColumns = async () => {
            for (const check of tableChecks) {
              if (tables.some(t => t.name === check.table)) {
                try {
                  const columns = await db.allAsync(`PRAGMA table_info(${check.table})`);
                  const columnNames = columns.map(col => col.name);
                  
                  const missingColumns = check.columns.filter(
                    col => !columnNames.includes(col)
                  );
                  
                  if (missingColumns.length > 0) {
                    results.database.missingColumns.push({
                      table: check.table,
                      columns: missingColumns
                    });
                  }
                } catch (error) {
                  results.database.errors.push(`Failed to check columns for ${check.table}: ${error.message}`);
                }
              }
            }
            
            // Close the database connection
            db.close();
            
            // Determine overall status
            if (results.database.errors.length === 0 && results.database.missingColumns.length === 0) {
              if (options.verbose) {
                logger.info('Database health check successful');
              }
              resolve(true);
            } else {
              resolve(false);
            }
          };
          
          checkColumns();
        });
      });
    } catch (error) {
      results.database.errors.push(`Database check failed: ${error.message}`);
      results.database.connected = false;
      resolve(false);
    }
  });
}

// Check MySQL database health
async function checkMySQLDatabase() {
  try {
    // Connect to the database
    const connection = await mysql.createConnection({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName
    });
    
    results.database.connected = true;
    
    // Check tables
    const [tables] = await connection.query('SHOW TABLES');
    results.database.tables = tables.length;
    
    // Check for required tables
    const requiredTables = [
      'users', 'guilds', 'command_usage', 'button_usage', 'select_menu_usage',
      'account_links', 'leveling', 'mining_data'
    ];
    
    const tableNames = tables.map(table => Object.values(table)[0]);
    
    const missingTables = requiredTables.filter(
      table => !tableNames.includes(table)
    );
    
    if (missingTables.length > 0) {
      results.database.errors.push(`Missing tables: ${missingTables.join(', ')}`);
    }
    
    // Check for required columns in tables
    const tableChecks = [
      { table: 'command_usage', columns: ['command', 'timestamp'] },
      { table: 'button_usage', columns: ['button_id'] },
      { table: 'select_menu_usage', columns: ['menu_id', 'selected_values'] },
      { table: 'account_links', columns: ['created_at', 'token', 'expires_at'] }
    ];
    
    for (const check of tableChecks) {
      if (tableNames.includes(check.table)) {
        try {
          const [columns] = await connection.query(`SHOW COLUMNS FROM ${check.table}`);
          const columnNames = columns.map(col => col.Field);
          
          const missingColumns = check.columns.filter(
            col => !columnNames.includes(col)
          );
          
          if (missingColumns.length > 0) {
            results.database.missingColumns.push({
              table: check.table,
              columns: missingColumns
            });
          }
        } catch (error) {
          results.database.errors.push(`Failed to check columns for ${check.table}: ${error.message}`);
        }
      }
    }
    
    // Close the connection
    await connection.end();
    
    // Determine overall status
    if (results.database.errors.length === 0 && results.database.missingColumns.length === 0) {
      if (options.verbose) {
        logger.info('Database health check successful');
      }
      return true;
    } else {
      return false;
    }
  } catch (error) {
    results.database.errors.push(`Database check failed: ${error.message}`);
    results.database.connected = false;
    return false;
  }
}

// Check system health
async function checkSystemHealth() {
  return new Promise((resolve) => {
    try {
      // Get CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }
      
      const idlePercent = totalIdle / totalTick * 100;
      results.system.cpuUsage = (100 - idlePercent).toFixed(2) + '%';
      
      // Get memory usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      results.system.memoryUsage = {
        total: (totalMemory / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        used: (usedMemory / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        free: (freeMemory / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        percent: (usedMemory / totalMemory * 100).toFixed(2) + '%'
      };
      
      // Get disk usage
      const command = process.platform === 'win32'
        ? `wmic logicaldisk get size,freespace,caption`
        : `df -h / | tail -n 1`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          results.system.errors.push(`Failed to get disk usage: ${error.message}`);
        } else {
          if (process.platform === 'win32') {
            const lines = stdout.trim().split('\n');
            if (lines.length > 1) {
              const disks = [];
              
              for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].trim().split(/\s+/);
                if (parts.length >= 3) {
                  const caption = parts[0];
                  const freeSpace = parseInt(parts[1]);
                  const size = parseInt(parts[2]);
                  
                  if (!isNaN(freeSpace) && !isNaN(size) && size > 0) {
                    const usedSpace = size - freeSpace;
                    disks.push({
                      drive: caption,
                      total: (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
                      used: (usedSpace / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
                      free: (freeSpace / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
                      percent: (usedSpace / size * 100).toFixed(2) + '%'
                    });
                  }
                }
              }
              
              results.system.diskUsage = disks;
            }
          } else {
            const parts = stdout.trim().split(/\s+/);
            if (parts.length >= 5) {
              results.system.diskUsage = {
                filesystem: parts[0],
                total: parts[1],
                used: parts[2],
                free: parts[3],
                percent: parts[4]
              };
            }
          }
        }
        
        if (results.system.errors.length === 0) {
          if (options.verbose) {
            logger.info('System health check successful');
          }
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      results.system.errors.push(`System check failed: ${error.message}`);
      resolve(false);
    }
  });
}

// Check Discord connection
async function checkDiscordConnection() {
  return new Promise((resolve) => {
    try {
      if (!config.botToken) {
        results.discord.errors.push('Bot token not provided');
        resolve(false);
        return;
      }
      
      const client = new Client({
        intents: [GatewayIntentBits.Guilds]
      });
      
      client.on('ready', () => {
        results.discord.connected = true;
        results.discord.ping = client.ws.ping + 'ms';
        results.discord.guilds = client.guilds.cache.size;
        
        if (options.verbose) {
          logger.info('Discord connection successful');
          logger.info(`Connected to ${client.guilds.cache.size} guilds`);
          logger.info(`Ping: ${client.ws.ping}ms`);
        }
        
        client.destroy();
        resolve(true);
      });
      
      client.on('error', (error) => {
        results.discord.errors.push(`Discord client error: ${error.message}`);
        client.destroy();
        resolve(false);
      });
      
      // Set a timeout in case the client doesn't connect
      const timeout = setTimeout(() => {
        results.discord.errors.push('Discord connection timed out');
        client.destroy();
        resolve(false);
      }, 10000);
      
      client.login(config.botToken).catch((error) => {
        clearTimeout(timeout);
        results.discord.errors.push(`Discord login failed: ${error.message}`);
        client.destroy();
        resolve(false);
      });
    } catch (error) {
      results.discord.errors.push(`Discord check failed: ${error.message}`);
      resolve(false);
    }
  });
}

// Fix database issues
async function fixDatabaseIssues() {
  logger.info('Attempting to fix database issues...');
  
  try {
    // Run the fix-schema.js script
    const fixSchemaPath = path.join(__dirname, '../database/fix-schema.js');
    
    if (!fs.existsSync(fixSchemaPath)) {
      logger.error(`Fix schema script not found: ${fixSchemaPath}`);
      return false;
    }
    
    const { execSync } = require('child_process');
    execSync(`node ${fixSchemaPath}`, { stdio: 'inherit' });
    
    logger.info('Database fix completed');
    return true;
  } catch (error) {
    logger.error(`Failed to fix database issues: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  if (options.help) {
    showHelp();
    return;
  }
  
  if (options.verbose) {
    logger.info('Starting bot monitor...');
  }
  
  // Check bot status
  if (options.checkBot) {
    if (options.verbose) {
      logger.info('Checking bot status...');
    }
    
    const botRunning = await checkBotProcess();
    const botHealthy = await checkBotHealth();
    
    if (!botRunning && options.fix) {
      logger.info('Bot is not running. Attempting to start...');
      
      try {
        const startCommand = process.platform === 'win32'
          ? `start cmd /c "cd ${process.cwd()} && npm start"`
          : `cd ${process.cwd()} && npm start &`;
        
        exec(startCommand, (error) => {
          if (error) {
            logger.error(`Failed to start bot: ${error.message}`);
          } else {
            logger.info('Bot started successfully');
          }
        });
      } catch (error) {
        logger.error(`Failed to start bot: ${error.message}`);
      }
    }
  }
  
  // Check database health
  if (options.checkDatabase) {
    if (options.verbose) {
      logger.info('Checking database health...');
    }
    
    const dbHealthy = config.dbType === 'sqlite'
      ? await checkSQLiteDatabase()
      : await checkMySQLDatabase();
    
    if (!dbHealthy && options.fix) {
      await fixDatabaseIssues();
    }
  }
  
  // Check system health
  if (options.checkSystem) {
    if (options.verbose) {
      logger.info('Checking system health...');
    }
    
    await checkSystemHealth();
  }
  
  // Check Discord connection
  if (options.checkDiscord) {
    if (options.verbose) {
      logger.info('Checking Discord connection...');
    }
    
    await checkDiscordConnection();
  }
  
  // Determine overall status
  if (results.bot.errors.length === 0 &&
      results.database.errors.length === 0 &&
      results.database.missingColumns.length === 0 &&
      results.system.errors.length === 0 &&
      results.discord.errors.length === 0) {
    results.status = 'healthy';
  } else if (results.bot.errors.length > 0 ||
             results.discord.errors.length > 0) {
    results.status = 'critical';
  } else {
    results.status = 'warning';
  }
  
  // Output results
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('\n=== JMF Bot Monitor Results ===');
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`Status: ${results.status.toUpperCase()}`);
    
    console.log('\n--- Bot Status ---');
    console.log(`Running: ${results.bot.running}`);
    if (results.bot.uptime) console.log(`Uptime: ${results.bot.uptime}`);
    if (results.bot.memory) console.log(`Memory: ${results.bot.memory}`);
    if (results.bot.cpu) console.log(`CPU: ${results.bot.cpu}`);
    if (results.bot.errors.length > 0) {
      console.log('Errors:');
      results.bot.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n--- Database Status ---');
    console.log(`Connected: ${results.database.connected}`);
    console.log(`Type: ${results.database.type}`);
    console.log(`Tables: ${results.database.tables}`);
    if (results.database.errors.length > 0) {
      console.log('Errors:');
      results.database.errors.forEach(error => console.log(`  - ${error}`));
    }
    if (results.database.missingColumns.length > 0) {
      console.log('Missing Columns:');
      results.database.missingColumns.forEach(item => {
        console.log(`  - Table: ${item.table}, Columns: ${item.columns.join(', ')}`);
      });
    }
    
    console.log('\n--- System Status ---');
    console.log(`Hostname: ${results.system.hostname}`);
    console.log(`Platform: ${results.system.platform}`);
    console.log(`Architecture: ${results.system.arch}`);
    if (results.system.cpuUsage) console.log(`CPU Usage: ${results.system.cpuUsage}`);
    if (results.system.memoryUsage) {
      console.log('Memory Usage:');
      console.log(`  Total: ${results.system.memoryUsage.total}`);
      console.log(`  Used: ${results.system.memoryUsage.used} (${results.system.memoryUsage.percent})`);
      console.log(`  Free: ${results.system.memoryUsage.free}`);
    }
    if (results.system.diskUsage) {
      console.log('Disk Usage:');
      if (Array.isArray(results.system.diskUsage)) {
        results.system.diskUsage.forEach(disk => {
          console.log(`  ${disk.drive}:`);
          console.log(`    Total: ${disk.total}`);
          console.log(`    Used: ${disk.used} (${disk.percent})`);
          console.log(`    Free: ${disk.free}`);
        });
      } else {
        console.log(`  Filesystem: ${results.system.diskUsage.filesystem}`);
        console.log(`  Total: ${results.system.diskUsage.total}`);
        console.log(`  Used: ${results.system.diskUsage.used} (${results.system.diskUsage.percent})`);
        console.log(`  Free: ${results.system.diskUsage.free}`);
      }
    }
    if (results.system.errors.length > 0) {
      console.log('Errors:');
      results.system.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n--- Discord Status ---');
    console.log(`Connected: ${results.discord.connected}`);
    if (results.discord.ping) console.log(`Ping: ${results.discord.ping}`);
    if (results.discord.guilds) console.log(`Guilds: ${results.discord.guilds}`);
    if (results.discord.errors.length > 0) {
      console.log('Errors:');
      results.discord.errors.forEach(error => console.log(`  - ${error}`));
    }
  }
  
  // Exit with appropriate code
  process.exit(results.status === 'healthy' ? 0 : 1);
}

// Run the main function
main(); 