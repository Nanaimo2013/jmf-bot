/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define the path to the .env file
const envPath = path.join(__dirname, '../.env');

// Check if .env file already exists
const envExists = fs.existsSync(envPath);

console.log('JMF Bot Environment Setup');
console.log('=========================');

if (envExists) {
  console.log('An existing .env file was found.');
  rl.question('Do you want to overwrite it? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      setupEnv();
    } else {
      console.log('Setup cancelled. Existing .env file was not modified.');
      rl.close();
    }
  });
} else {
  setupEnv();
}

function setupEnv() {
  console.log('\nPlease provide the following information:');
  
  // Start with an empty environment configuration
  let envConfig = '';
  
  // Ask for Discord token
  rl.question('\nDiscord Bot Token (required): ', (discordToken) => {
    if (!discordToken) {
      console.log('Error: Discord token is required.');
      rl.close();
      return;
    }
    
    envConfig += `# Discord Bot Token (Required)\nDISCORD_TOKEN=${discordToken}\n\n`;
    
    // Ask for environment
    rl.question('Environment (development/production) [development]: ', (nodeEnv) => {
      nodeEnv = nodeEnv || 'development';
      envConfig += `# Environment (development or production)\nNODE_ENV=${nodeEnv}\n\n`;
      
      // Ask for database type
      rl.question('Database Type (sqlite/mysql) [sqlite]: ', (dbType) => {
        dbType = dbType || 'sqlite';
        envConfig += `# Database Type\nDB_TYPE=${dbType}\n\n`;
        
        // Ask for database path if using SQLite
        if (dbType.toLowerCase() === 'sqlite') {
          rl.question('SQLite Database Path [./data/database.sqlite]: ', (dbPath) => {
            dbPath = dbPath || './data/database.sqlite';
            envConfig += `# SQLite Database Path\nDB_PATH=${dbPath}\n\n`;
            
            // Ask for logging level
            askForLoggingLevel();
          });
        } else {
          // Ask for MySQL connection details
          rl.question('MySQL Host [localhost]: ', (mysqlHost) => {
            mysqlHost = mysqlHost || 'localhost';
            
            rl.question('MySQL Port [3306]: ', (mysqlPort) => {
              mysqlPort = mysqlPort || '3306';
              
              rl.question('MySQL Database Name: ', (mysqlDatabase) => {
                if (!mysqlDatabase) {
                  console.log('Error: MySQL database name is required.');
                  rl.close();
                  return;
                }
                
                rl.question('MySQL Username: ', (mysqlUser) => {
                  if (!mysqlUser) {
                    console.log('Error: MySQL username is required.');
                    rl.close();
                    return;
                  }
                  
                  rl.question('MySQL Password: ', (mysqlPassword) => {
                    envConfig += `# MySQL Connection Details\nMYSQL_HOST=${mysqlHost}\nMYSQL_PORT=${mysqlPort}\nMYSQL_DATABASE=${mysqlDatabase}\nMYSQL_USER=${mysqlUser}\nMYSQL_PASSWORD=${mysqlPassword}\n\n`;
                    
                    // Ask for logging level
                    askForLoggingLevel();
                  });
                });
              });
            });
          });
        }
      });
    });
  });
  
  function askForLoggingLevel() {
    rl.question('Logging Level (debug/info/warn/error) [info]: ', (logLevel) => {
      logLevel = logLevel || 'info';
      envConfig += `# Logging Level (debug, info, warn, error)\nLOG_LEVEL=${logLevel}\n\n`;
      
      // Ask for bot owner ID
      rl.question('Bot Owner ID (your Discord ID): ', (ownerId) => {
        if (ownerId) {
          envConfig += `# Bot Owner ID\nOWNER_ID=${ownerId}\n\n`;
        }
        
        // Ask for guild ID
        rl.question('Guild ID (for development and testing): ', (guildId) => {
          if (guildId) {
            envConfig += `# Guild ID (for development and testing)\nGUILD_ID=${guildId}\n\n`;
          }
          
          // Ask for client ID
          rl.question('Bot Client ID (for slash commands): ', (clientId) => {
            if (clientId) {
              envConfig += `# Bot Client ID (for slash commands)\nCLIENT_ID=${clientId}\n\n`;
            }
            
            // Optional: Ask for Pterodactyl API details
            rl.question('Do you want to configure Pterodactyl API integration? (y/n) [n]: ', (configurePterodactyl) => {
              if (configurePterodactyl.toLowerCase() === 'y') {
                rl.question('Pterodactyl API URL: ', (pterodactylUrl) => {
                  rl.question('Pterodactyl API Key: ', (pterodactylKey) => {
                    envConfig += `# API Keys for Game Server Integration\nPTERODACTYL_API_KEY=${pterodactylKey}\nPTERODACTYL_API_URL=${pterodactylUrl}\n\n`;
                    
                    // Write the .env file
                    writeEnvFile();
                  });
                });
              } else {
                // Write the .env file
                writeEnvFile();
              }
            });
          });
        });
      });
    });
  }
  
  function writeEnvFile() {
    try {
      fs.writeFileSync(envPath, envConfig);
      console.log(`\n✅ Environment configuration has been saved to ${envPath}`);
      console.log('You can now run the bot with: npm run dev');
    } catch (error) {
      console.error(`❌ Error writing .env file: ${error.message}`);
    } finally {
      rl.close();
    }
  }
}

rl.on('close', () => {
  process.exit(0);
}); 