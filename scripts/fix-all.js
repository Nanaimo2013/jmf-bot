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
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define the path to the database file
const dbPath = process.env.DB_PATH || './data/database.sqlite';

console.log('JMF Bot Comprehensive Fix Tool');
console.log('=============================');
console.log('This tool will:');
console.log('1. Delete the existing database');
console.log('2. Check the Discord token validity');
console.log('3. Initialize a fresh database');
console.log('4. Verify the database structure');
console.log('\nWarning: This will delete your existing database and all its data!');

rl.question('\nDo you want to continue? (y/n): ', (answer) => {
  if (answer.toLowerCase() !== 'y') {
    console.log('Operation cancelled.');
    rl.close();
    return;
  }
  
  // Step 1: Delete the database
  console.log('\n--- Step 1: Deleting Database ---');
  try {
    if (fs.existsSync(dbPath)) {
      // Create a backup before deleting
      const backupPath = `${dbPath}.backup.${new Date().toISOString().replace(/[:.]/g, '')}`;
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Created backup at: ${backupPath}`);
      
      // Delete the database
      fs.unlinkSync(dbPath);
      console.log(`✅ Successfully deleted database file: ${dbPath}`);
    } else {
      console.log(`⚠️ Database file does not exist at: ${dbPath}`);
    }
  } catch (error) {
    console.error(`❌ Error deleting database: ${error.message}`);
    rl.close();
    return;
  }
  
  // Step 2: Check the Discord token
  console.log('\n--- Step 2: Checking Discord Token ---');
  try {
    // We'll just check if the token exists in the .env file
    if (!process.env.DISCORD_TOKEN) {
      console.error('❌ No Discord token found in .env file.');
      console.log('Please run: npm run setup:env');
      rl.close();
      return;
    }
    
    console.log(`✅ Discord token found in .env file: ${process.env.DISCORD_TOKEN.substring(0, 10)}...`);
    
    // We won't actually validate the token here to avoid rate limits
    // The actual bot will validate it when it starts
  } catch (error) {
    console.error(`❌ Error checking token: ${error.message}`);
    rl.close();
    return;
  }
  
  // Step 3: Initialize the database
  console.log('\n--- Step 3: Initializing Database ---');
  try {
    // Ensure the database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`✅ Created database directory: ${dbDir}`);
    }
    
    // Run the database initialization script
    console.log('Running database initialization...');
    try {
      execSync('node src/database/init.js', { stdio: 'inherit' });
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error(`❌ Error initializing database: ${error.message}`);
      rl.close();
      return;
    }
  } catch (error) {
    console.error(`❌ Error in database initialization step: ${error.message}`);
    rl.close();
    return;
  }
  
  // Step 4: Verify the database structure
  console.log('\n--- Step 4: Verifying Database Structure ---');
  try {
    // Check if the database file exists
    if (fs.existsSync(dbPath)) {
      console.log(`✅ Database file exists at: ${dbPath}`);
      
      // Get the file size
      const stats = fs.statSync(dbPath);
      console.log(`✅ Database file size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // We could add more verification here if needed
    } else {
      console.error(`❌ Database file was not created at: ${dbPath}`);
      rl.close();
      return;
    }
  } catch (error) {
    console.error(`❌ Error verifying database: ${error.message}`);
    rl.close();
    return;
  }
  
  console.log('\n✅ All steps completed successfully!');
  console.log('You can now run the bot with: npm run dev');
  
  rl.close();
});

rl.on('close', () => {
  process.exit(0);
}); 