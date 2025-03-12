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
const { Client, GatewayIntentBits } = require('discord.js');

// Create a minimal client instance just for token validation
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

console.log('Checking Discord token validity...');
console.log(`Token from .env: ${process.env.DISCORD_TOKEN ? '✅ Found' : '❌ Not found'}`);

if (!process.env.DISCORD_TOKEN) {
  console.error('No Discord token found in .env file. Please set the DISCORD_TOKEN environment variable.');
  process.exit(1);
}

// Try to login with the token
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log(`✅ Token is valid! Logged in as ${client.user.tag}`);
    console.log('Bot information:');
    console.log(`- Username: ${client.user.username}`);
    console.log(`- ID: ${client.user.id}`);
    console.log(`- Created: ${client.user.createdAt}`);
    console.log(`- Verified: ${client.user.verified ? 'Yes' : 'No'}`);
    
    // Destroy the client after validation
    client.destroy();
    process.exit(0);
  })
  .catch(error => {
    console.error(`❌ Token validation failed: ${error.message}`);
    
    if (error.message.includes('invalid token')) {
      console.log('\nPossible reasons for invalid token:');
      console.log('1. The token might be incorrect or expired');
      console.log('2. The token might have been reset in the Discord Developer Portal');
      console.log('3. The bot might have been deleted from the Discord Developer Portal');
      console.log('\nSolutions:');
      console.log('1. Go to Discord Developer Portal (https://discord.com/developers/applications)');
      console.log('2. Select your application');
      console.log('3. Go to the "Bot" section');
      console.log('4. Click "Reset Token" to generate a new token');
      console.log('5. Update your .env file with the new token');
    }
    
    process.exit(1);
  }); 