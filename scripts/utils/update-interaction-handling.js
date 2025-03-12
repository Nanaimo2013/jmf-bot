/**
 * JMF Hosting Discord Bot - Update Interaction Handling
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script updates all command files to use the safe interaction handling utility.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../src/utils/logger');

// Path to commands directory
const commandsDir = path.join(__dirname, '../../src/commands');

// Function to process a file
function processFile(filePath) {
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file already imports the interaction handler
    if (content.includes('interactionHandler')) {
      logger.info(`File ${filePath} already imports interaction handler, skipping.`);
      return;
    }
    
    // Add the import
    const requireRegex = /const\s+{[^}]+}\s+=\s+require\('discord\.js'\);/;
    const loggerImport = "const logger = require('../../utils/logger');";
    
    if (requireRegex.test(content)) {
      // Add import after discord.js import
      content = content.replace(
        requireRegex,
        (match) => `${match}\nconst { safeReply, safeDeferReply, isValidInteraction } = require('../../utils/interactionHandler');`
      );
    } else if (content.includes(loggerImport)) {
      // Add import after logger import
      content = content.replace(
        loggerImport,
        `${loggerImport}\nconst { safeReply, safeDeferReply, isValidInteraction } = require('../../utils/interactionHandler');`
      );
    } else {
      // Add import at the top of the file after the license comment
      const licenseEndIndex = content.indexOf('*/');
      if (licenseEndIndex !== -1) {
        content = content.slice(0, licenseEndIndex + 2) + 
                 '\n\nconst { safeReply, safeDeferReply, isValidInteraction } = require(\'../../utils/interactionHandler\');' + 
                 content.slice(licenseEndIndex + 2);
      } else {
        // Just add at the top
        content = `const { safeReply, safeDeferReply, isValidInteraction } = require('../../utils/interactionHandler');\n\n${content}`;
      }
    }
    
    // Replace interaction.deferReply with safeDeferReply
    content = content.replace(
      /await\s+interaction\.deferReply\(\s*{?\s*ephemeral\s*:\s*(true|false)\s*}?\s*\)/g,
      (match, ephemeral) => `await safeDeferReply(interaction, ${ephemeral})`
    );
    
    content = content.replace(
      /await\s+interaction\.deferReply\(\s*\)/g,
      'await safeDeferReply(interaction, false)'
    );
    
    // Replace interaction.reply with safeReply
    content = content.replace(
      /await\s+interaction\.reply\(\s*{([^}]*)}\s*\)/g,
      (match, options) => {
        // Check if options include ephemeral
        const hasEphemeral = options.includes('ephemeral');
        if (hasEphemeral) {
          // Remove ephemeral from options
          const newOptions = options.replace(/,?\s*ephemeral\s*:\s*(true|false)\s*,?/, '');
          return `await safeReply(interaction, {${newOptions}}, ${options.includes('ephemeral: true') ? 'true' : 'false'})`;
        } else {
          return `await safeReply(interaction, {${options}}, false)`;
        }
      }
    );
    
    // Replace interaction.editReply with safeReply
    content = content.replace(
      /await\s+interaction\.editReply\(\s*{([^}]*)}\s*\)/g,
      (match, options) => `await safeReply(interaction, {${options}}, true)`
    );
    
    // Replace return interaction.reply with return safeReply
    content = content.replace(
      /return\s+interaction\.reply\(\s*{([^}]*)}\s*\)/g,
      (match, options) => {
        // Check if options include ephemeral
        const hasEphemeral = options.includes('ephemeral');
        if (hasEphemeral) {
          // Remove ephemeral from options
          const newOptions = options.replace(/,?\s*ephemeral\s*:\s*(true|false)\s*,?/, '');
          return `return safeReply(interaction, {${newOptions}}, ${options.includes('ephemeral: true') ? 'true' : 'false'})`;
        } else {
          return `return safeReply(interaction, {${options}}, false)`;
        }
      }
    );
    
    // Replace return interaction.editReply with return safeReply
    content = content.replace(
      /return\s+interaction\.editReply\(\s*{([^}]*)}\s*\)/g,
      (match, options) => `return safeReply(interaction, {${options}}, true)`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    logger.info(`Updated interaction handling in ${filePath}`);
    
  } catch (error) {
    logger.error(`Error processing file ${filePath}: ${error.message}`);
  }
}

// Function to recursively process all files in a directory
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      processDirectory(filePath);
    } else if (stats.isFile() && file.endsWith('.js')) {
      processFile(filePath);
    }
  }
}

// Main function
function main() {
  logger.info('Starting to update interaction handling in command files...');
  
  // Process all command files
  processDirectory(commandsDir);
  
  logger.info('Finished updating interaction handling in command files.');
}

// Run the script
main(); 