/**
 * JMF Hosting Discord Bot - Help Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command shows all available commands or commands in a specific category.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

class HelpCommand extends Command {
    /**
     * Create a new help command
     */
    constructor() {
        super({
            name: 'help',
            description: 'Shows all available commands',
            cooldown: 5
        });
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            const category = interaction.options.getString('category');
            
            if (category) {
                // Show commands for a specific category
                await this.showCategoryCommands(interaction, category);
            } else {
                // Show all categories
                await this.showAllCategories(interaction);
            }
        } catch (error) {
            this.handleError('execute', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ An error occurred: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Show all command categories
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async showAllCategories(interaction) {
        try {
            const helpEmbed = new EmbedBuilder()
                .setColor(this.config.embedColor || '#0099ff')
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
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            await interaction.reply({ embeds: [helpEmbed] });
            
            // Log command usage
            this.logger.debug(this.name, `Help command executed by ${interaction.user.tag} (${interaction.user.id})`);
        } catch (error) {
            this.handleError('showAllCategories', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ An error occurred: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Show commands for a specific category
     * @param {CommandInteraction} interaction - The interaction object
     * @param {string} category - The category to show commands for
     * @returns {Promise<void>}
     */
    async showCategoryCommands(interaction, category) {
        try {
            // Get command registry from bot manager
            const commandRegistry = global.managers?.bot?.commandRegistry;
            let commands = [];
            
            if (commandRegistry) {
                // Get commands from registry
                commands = Array.from(commandRegistry.getCommandsByCategory(category).values())
                    .map(cmd => ({
                        name: cmd.name,
                        description: cmd.description
                    }));
            } else {
                // Fallback to file system if registry not available
                const commandsPath = path.join(__dirname, '..', category);
                
                if (fs.existsSync(commandsPath)) {
                    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
                    
                    for (const file of commandFiles) {
                        try {
                            const filePath = path.join(commandsPath, file);
                            delete require.cache[require.resolve(filePath)];
                            const commandModule = require(filePath);
                            
                            if (commandModule.prototype instanceof Command) {
                                const command = new commandModule();
                                commands.push({
                                    name: command.name,
                                    description: command.description
                                });
                            } else if ('data' in commandModule && 'execute' in commandModule) {
                                commands.push({
                                    name: commandModule.data.name,
                                    description: commandModule.data.description
                                });
                            }
                        } catch (error) {
                            this.logger.warn(this.name, `Error loading command file ${file}: ${error.message}`);
                        }
                    }
                }
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
                .setColor(this.config.embedColor || '#0099ff')
                .setTitle(categoryTitles[category] || `${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
                .setDescription(`Here are all the commands in the ${category} category.`)
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            if (commands.length > 0) {
                for (const cmd of commands) {
                    helpEmbed.addFields({ name: `/${cmd.name}`, value: cmd.description });
                }
            } else {
                helpEmbed.setDescription(`No commands found in the ${category} category.`);
            }
            
            await interaction.reply({ embeds: [helpEmbed] });
            
            // Log command usage
            this.logger.debug(this.name, `Help command executed for category ${category} by ${interaction.user.tag} (${interaction.user.id})`);
        } catch (error) {
            this.handleError('showCategoryCommands', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ An error occurred: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
}

module.exports = HelpCommand; 