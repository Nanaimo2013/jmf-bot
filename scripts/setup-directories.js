#!/usr/bin/env node

/**
 * Script to set up required directories for the bot
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

// Load configuration
let config;
try {
  config = require('../config/install/config.json');
} catch (error) {
  console.error('Error loading install configuration:', error.message);
  process.exit(1);
}

/**
 * Create a directory if it doesn't exist
 * @param {string} dirPath - Path to the directory
 * @param {string} description - Description of the directory
 * @returns {Promise<boolean>} - True if directory was created, false if it already existed
 */
async function createDirectory(dirPath, description) {
  const fullPath = path.resolve(process.cwd(), dirPath);
  
  try {
    if (await existsAsync(fullPath)) {
      console.log(`✓ ${description} already exists: ${dirPath}`);
      return false;
    }
    
    await mkdirAsync(fullPath, { recursive: true });
    console.log(`✓ Created ${description}: ${dirPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to create ${description}: ${dirPath}`, error.message);
    return false;
  }
}

/**
 * Main function to create all required directories
 */
async function setupDirectories() {
  console.log('=== Setting up directories ===');
  
  if (!config.directories || !Array.isArray(config.directories)) {
    console.error('No directories defined in configuration');
    return;
  }
  
  let created = 0;
  let existing = 0;
  let failed = 0;
  
  for (const dir of config.directories) {
    if (!dir.path) continue;
    
    const result = await createDirectory(dir.path, dir.description || dir.path);
    if (result === true) {
      created++;
    } else if (result === false) {
      existing++;
    } else {
      failed++;
    }
  }
  
  console.log('\n=== Directory setup complete ===');
  console.log(`Created: ${created}`);
  console.log(`Already existing: ${existing}`);
  console.log(`Failed: ${failed}`);
}

// Run the setup
setupDirectories().catch(error => {
  console.error('Error setting up directories:', error);
  process.exit(1);
}); 