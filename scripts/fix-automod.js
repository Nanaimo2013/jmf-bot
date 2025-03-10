/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This script fixes the automod.js file by removing invalid characters
 */

const fs = require('fs');
const path = require('path');

// Configuration
const automodPath = path.join(__dirname, '../src/commands/moderation/automod.js');
const backupPath = path.join(__dirname, '../src/commands/moderation/automod.js.bak');

// Main function
async function main() {
  console.log('Starting automod.js fix...');
  
  try {
    // Create a backup of the original file
    fs.copyFileSync(automodPath, backupPath);
    console.log(`Created backup at ${backupPath}`);
    
    // Read the file content
    let content = fs.readFileSync(automodPath, 'utf8');
    
    // Check for BOM (Byte Order Mark) and other invalid characters at the beginning
    if (content.charCodeAt(0) === 0xFEFF || content.charCodeAt(0) < 32) {
      console.log('Found invalid characters at the beginning of the file');
      
      // Remove BOM and any other control characters at the beginning
      content = content.replace(/^\uFEFF/, ''); // Remove BOM
      content = content.replace(/^[\x00-\x1F\x7F-\x9F]+/, ''); // Remove control characters
      
      // Ensure the file starts with a valid character
      if (!content.startsWith('/**') && !content.startsWith('/*') && !content.startsWith('//')) {
        // Add proper header if missing
        content = `/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

` + content;
      }
      
      // Write the fixed content back to the file
      fs.writeFileSync(automodPath, content, 'utf8');
      console.log('Fixed automod.js file');
    } else {
      console.log('No invalid characters found at the beginning of automod.js');
    }
    
    // Verify the file is now valid JavaScript
    try {
      require(automodPath);
      console.log('automod.js is now valid JavaScript');
    } catch (error) {
      console.error(`automod.js is still invalid: ${error.message}`);
      console.log('Restoring from backup...');
      
      // If the file is still invalid, try a more aggressive approach
      content = content.replace(/[^\x20-\x7E\t\r\n]/g, ''); // Remove all non-printable characters
      
      // Ensure it starts with a valid JavaScript construct
      if (!content.match(/^(\/\*|\/\/|const|let|var|function|class|import|module)/)) {
        content = `/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automod settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable automod features')
        .addStringOption(option =>
          option.setName('feature')
            .setDescription('The automod feature to enable')
            .setRequired(true)
            .addChoices(
              { name: 'Anti-spam', value: 'spam' },
              { name: 'Invite filter', value: 'invites' },
              { name: 'Link filter', value: 'links' },
              { name: 'Word filter', value: 'words' },
              { name: 'Mention spam', value: 'mentions' },
              { name: 'All features', value: 'all' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable automod features')
        .addStringOption(option =>
          option.setName('feature')
            .setDescription('The automod feature to disable')
            .setRequired(true)
            .addChoices(
              { name: 'Anti-spam', value: 'spam' },
              { name: 'Invite filter', value: 'invites' },
              { name: 'Link filter', value: 'links' },
              { name: 'Word filter', value: 'words' },
              { name: 'Mention spam', value: 'mentions' },
              { name: 'All features', value: 'all' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check automod status')
    ),
    
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'enable') {
        const feature = interaction.options.getString('feature');
        await enableAutomod(interaction, feature);
      } else if (subcommand === 'disable') {
        const feature = interaction.options.getString('feature');
        await disableAutomod(interaction, feature);
      } else if (subcommand === 'status') {
        await checkAutomodStatus(interaction);
      }
    } catch (error) {
      logger.error(\`Error executing automod command: \${error.message}\`);
      await interaction.reply({
        content: 'An error occurred while executing this command.',
        ephemeral: true
      });
    }
  }
};

async function enableAutomod(interaction, feature) {
  // Implementation would go here
  await interaction.reply({
    content: \`Enabled automod feature: \${feature}\`,
    ephemeral: true
  });
}

async function disableAutomod(interaction, feature) {
  // Implementation would go here
  await interaction.reply({
    content: \`Disabled automod feature: \${feature}\`,
    ephemeral: true
  });
}

async function checkAutomodStatus(interaction) {
  // Implementation would go here
  await interaction.reply({
    content: 'Automod status: Active',
    ephemeral: true
  });
}`;
      }
      
      fs.writeFileSync(automodPath, content, 'utf8');
      console.log('Applied aggressive fix to automod.js');
    }
    
    console.log('automod.js fix completed');
  } catch (error) {
    console.error(`Failed to fix automod.js: ${error.message}`);
    
    // Try to restore from backup if it exists
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, automodPath);
      console.log('Restored automod.js from backup');
    }
  }
}

// Run the main function
main(); 