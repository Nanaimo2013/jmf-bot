/**
 * JMF Hosting Discord Bot - Config Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command handles configuration management for the bot.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { Command } = require('./base.command');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class ConfigCommand extends Command {
    /**
     * Create a new config command
     */
    constructor() {
        super({
            name: 'config',
            description: 'Manage bot configuration',
            cooldown: 5,
            adminOnly: true,
            requiredPermissions: [PermissionFlagsBits.Administrator],
            guildOnly: true
        });
        
        // Add subcommands to the slash command data
        this.data
            .addSubcommand(subcommand =>
                subcommand
                    .setName('view')
                    .setDescription('View bot configuration')
                    .addStringOption(option =>
                        option
                            .setName('section')
                            .setDescription('Configuration section to view')
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('set')
                    .setDescription('Set a configuration value')
                    .addStringOption(option =>
                        option
                            .setName('path')
                            .setDescription('Configuration path (e.g., "bot.prefix")')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option
                            .setName('value')
                            .setDescription('New value')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('reload')
                    .setDescription('Reload configuration from file')
            );
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            // Get config manager
            const configManager = global.managers.config;
            
            if (!configManager) {
                return interaction.reply({
                    content: '❌ Configuration manager is not available.',
                    ephemeral: true
                });
            }
            
            // Handle subcommands
            switch (subcommand) {
                case 'view':
                    await this.viewConfig(interaction, configManager);
                    break;
                case 'set':
                    await this.setConfig(interaction, configManager);
                    break;
                case 'reload':
                    await this.reloadConfig(interaction, configManager);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            this.handleError('execute', error);
            
            // Reply to the interaction if not already replied
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while executing this command.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * View configuration
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Object} configManager - The configuration manager
     * @returns {Promise<void>}
     */
    async viewConfig(interaction, configManager) {
        try {
            const section = interaction.options.getString('section');
            const config = configManager.getAll();
            
            if (section) {
                // View specific section
                if (!config[section]) {
                    return interaction.reply({
                        content: `❌ Configuration section '${section}' not found.`,
                        ephemeral: true
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(this.config.embedColor || '#0099ff')
                    .setTitle(`${this.capitalizeFirstLetter(section)} Configuration`)
                    .setDescription(this.formatConfigSection(config[section], section))
                    .setTimestamp()
                    .setFooter({ text: 'JMF Hosting Bot Configuration' });
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                // View all sections
                const embed = new EmbedBuilder()
                    .setColor(this.config.embedColor || '#0099ff')
                    .setTitle('Bot Configuration')
                    .setDescription('Here is the current bot configuration:')
                    .setTimestamp()
                    .setFooter({ text: 'JMF Hosting Bot Configuration' });
                
                // Add fields for each section
                Object.keys(config).forEach(section => {
                    if (typeof config[section] === 'object' && !Array.isArray(config[section])) {
                        embed.addFields({ 
                            name: this.capitalizeFirstLetter(section), 
                            value: this.formatConfigSection(config[section], section).substring(0, 1024) 
                        });
                    }
                });
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            this.handleError('viewConfig', error);
            
            await interaction.reply({
                content: 'An error occurred while viewing the configuration.',
                ephemeral: true
            }).catch(() => {});
        }
    }
    
    /**
     * Set configuration value
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Object} configManager - The configuration manager
     * @returns {Promise<void>}
     */
    async setConfig(interaction, configManager) {
        try {
            const path = interaction.options.getString('path');
            const value = interaction.options.getString('value');
            
            // Parse the path
            const pathParts = path.split('.');
            
            if (pathParts.length < 2) {
                return interaction.reply({
                    content: '❌ Invalid path format. Use format like "section.key".',
                    ephemeral: true
                });
            }
            
            // Get the current value
            const currentValue = configManager.get(path);
            
            if (currentValue === undefined) {
                return interaction.reply({
                    content: `❌ Configuration path '${path}' not found.`,
                    ephemeral: true
                });
            }
            
            // Parse value based on current type
            let parsedValue;
            try {
                const currentType = typeof currentValue;
                
                if (currentType === 'boolean') {
                    parsedValue = value.toLowerCase() === 'true';
                } else if (currentType === 'number') {
                    parsedValue = Number(value);
                    
                    if (isNaN(parsedValue)) {
                        throw new Error('Invalid number');
                    }
                } else if (currentType === 'object' && Array.isArray(currentValue)) {
                    parsedValue = JSON.parse(value);
                    
                    if (!Array.isArray(parsedValue)) {
                        throw new Error('Value must be an array');
                    }
                } else if (currentType === 'object') {
                    parsedValue = JSON.parse(value);
                    
                    if (typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
                        throw new Error('Value must be an object');
                    }
                } else {
                    parsedValue = value;
                }
            } catch (error) {
                return interaction.reply({
                    content: `❌ Invalid value format: ${error.message}`,
                    ephemeral: true
                });
            }
            
            // Update config
            configManager.set(path, parsedValue);
            
            // Save config
            await configManager.save();
            
            // Log the change
            this.logger.info(this.name, `Config updated by ${interaction.user.tag}: ${path} = ${JSON.stringify(parsedValue)}`);
            
            return interaction.reply({
                content: `✅ Configuration updated: \`${path}\` = \`${JSON.stringify(parsedValue)}\``,
                ephemeral: true
            });
        } catch (error) {
            this.handleError('setConfig', error);
            
            await interaction.reply({
                content: 'An error occurred while setting the configuration.',
                ephemeral: true
            }).catch(() => {});
        }
    }
    
    /**
     * Reload configuration
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Object} configManager - The configuration manager
     * @returns {Promise<void>}
     */
    async reloadConfig(interaction, configManager) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Reload the config
            await configManager.reload();
            
            this.logger.info(this.name, `Config reloaded by ${interaction.user.tag}`);
            
            return interaction.editReply({
                content: '✅ Configuration reloaded successfully.',
                ephemeral: true
            });
        } catch (error) {
            this.handleError('reloadConfig', error);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ Error reloading configuration: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: `❌ Error reloading configuration: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Format a configuration section for display
     * @param {Object} section - Configuration section
     * @param {string} sectionName - Section name
     * @returns {string} Formatted section
     */
    formatConfigSection(section, sectionName) {
        if (!section || typeof section !== 'object') {
            return 'No configuration available';
        }
        
        let formatted = '';
        
        Object.keys(section).forEach(key => {
            const value = section[key];
            
            if (typeof value === 'object' && value !== null) {
                formatted += `**${key}**: \`${JSON.stringify(value)}\`\n`;
            } else {
                formatted += `**${key}**: \`${value}\`\n`;
            }
        });
        
        return formatted || 'No configuration available';
    }
    
    /**
     * Capitalize the first letter of a string
     * @param {string} string - The string to capitalize
     * @returns {string} The capitalized string
     */
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

module.exports = new ConfigCommand(); 