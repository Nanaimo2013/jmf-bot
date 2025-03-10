/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available commands')
    .addStringOption(option => 
      option.setName('category')
        .setDescription('The category of commands to show')
        .setRequired(false)
        .addChoices(
          { name: 'Utility', value: 'utility' },
          { name: 'Moderation', value: 'moderation' },
          { name: 'Tickets', value: 'tickets' },
          { name: 'Game Servers', value: 'gameservers' },
          { name: 'Admin', value: 'admin' }
        )),
  
  async execute(interaction) {
    const category = interaction.options.getString('category');
    
    if (category) {
      // Show commands for a specific category
      await this.showCategoryCommands(interaction, category);
    } else {
      // Show all categories
      await this.showAllCategories(interaction);
    }
  },
  
  async showAllCategories(interaction) {
    const helpEmbed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('JMF Hosting Bot Commands')
      .setDescription('Here are all the command categories available. Use `/help [category]` to see commands in a specific category.')
      .addFields(
        { name: '🛠️ Utility', value: 'General utility commands like ping, server info, etc.', inline: true },
        { name: '🔨 Moderation', value: 'Commands for moderating the server', inline: true },
        { name: '🎫 Tickets', value: 'Commands for managing support tickets', inline: true },
        { name: '🎮 Game Servers', value: 'Commands for managing game servers', inline: true },
        { name: '⚙️ Admin', value: 'Administrative commands for server setup', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: config.footerText });
    
    await interaction.reply({ embeds: [helpEmbed] });
  },
  
  async showCategoryCommands(interaction, category) {
    // Get all commands in the category
    const commandsPath = path.join(__dirname, '..', category);
    let commands = [];
    
    try {
      if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
          const filePath = path.join(commandsPath, file);
          const command = require(filePath);
          
          if ('data' in command && 'execute' in command) {
            commands.push({
              name: command.data.name,
              description: command.data.description
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error reading commands from ${category}: ${error.message}`);
    }
    
    // Create embed with commands
    const categoryTitles = {
      utility: '🛠️ Utility Commands',
      moderation: '🔨 Moderation Commands',
      tickets: '🎫 Ticket Commands',
      gameservers: '🎮 Game Server Commands',
      admin: '⚙️ Admin Commands'
    };
    
    const helpEmbed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(categoryTitles[category] || `${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
      .setDescription(`Here are all the commands in the ${category} category.`)
      .setTimestamp()
      .setFooter({ text: config.footerText });
    
    if (commands.length > 0) {
      for (const cmd of commands) {
        helpEmbed.addFields({ name: `/${cmd.name}`, value: cmd.description });
      }
    } else {
      helpEmbed.setDescription(`No commands found in the ${category} category.`);
    }
    
    await interaction.reply({ embeds: [helpEmbed] });
  }
}; 