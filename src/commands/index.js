/**
 * JMF Hosting Discord Bot - Command Registry
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This file manages the loading and registration of all commands.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

class CommandRegistry {
    /**
     * Create a new command registry
     * @param {Object} options - Registry options
     * @param {Object} options.logger - The logger to use
     */
    constructor(options = {}) {
        this.commands = new Collection();
        this.categories = new Collection();
        this.logger = options.logger || console;
        this.name = 'CommandRegistry';
    }
    
    /**
     * Load all commands from the commands directory
     * @returns {Promise<boolean>}
     */
    async loadCommands() {
        try {
            // Get the commands directory
            const commandsDir = path.join(__dirname);
            
            // Get all category directories
            const categories = fs.readdirSync(commandsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            this.logger.info(this.name, `Found ${categories.length} command categories`);
            
            // Load commands from each category
            for (const category of categories) {
                const categoryPath = path.join(commandsDir, category);
                
                // Skip if not a directory
                if (!fs.statSync(categoryPath).isDirectory()) {
                    continue;
                }
                
                // Get all command files in the category
                const commandFiles = fs.readdirSync(categoryPath)
                    .filter(file => file.endsWith('.js') && !file.startsWith('index.') && !file.startsWith('base.'));
                
                this.logger.info(this.name, `Found ${commandFiles.length} commands in category ${category}`);
                
                // Create category in collection if it doesn't exist
                if (!this.categories.has(category)) {
                    this.categories.set(category, new Collection());
                }
                
                // Load each command
                for (const file of commandFiles) {
                    try {
                        const filePath = path.join(categoryPath, file);
                        
                        // Delete cache to ensure we get the latest version
                        delete require.cache[require.resolve(filePath)];
                        
                        // Require the command file
                        const CommandClass = require(filePath);
                        
                        // Create a new instance of the command
                        const command = new CommandClass();
                        
                        // Set the category
                        command.category = category;
                        
                        // Add to collections
                        this.commands.set(command.name, command);
                        this.categories.get(category).set(command.name, command);
                        
                        this.logger.debug(this.name, `Loaded command: ${command.name} (${category})`);
                    } catch (error) {
                        this.logger.error(this.name, `Error loading command file ${file}: ${error.message}`);
                    }
                }
            }
            
            this.logger.info(this.name, `Loaded ${this.commands.size} commands in total`);
            return true;
        } catch (error) {
            this.logger.error(this.name, `Error loading commands: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Initialize all commands
     * @param {Client} client - The Discord.js client
     * @returns {Promise<boolean>}
     */
    async initializeCommands(client) {
        try {
            let initializedCount = 0;
            
            for (const [name, command] of this.commands) {
                try {
                    if (await command.initialize(client)) {
                        initializedCount++;
                    }
                } catch (error) {
                    this.logger.error(this.name, `Error initializing command ${name}: ${error.message}`);
                }
            }
            
            this.logger.info(this.name, `Initialized ${initializedCount}/${this.commands.size} commands`);
            return true;
        } catch (error) {
            this.logger.error(this.name, `Error initializing commands: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Get a command by name
     * @param {string} name - The name of the command
     * @returns {Command|undefined}
     */
    getCommand(name) {
        return this.commands.get(name);
    }
    
    /**
     * Get all commands
     * @returns {Collection<string, Command>}
     */
    getAllCommands() {
        return this.commands;
    }
    
    /**
     * Get all commands in a category
     * @param {string} category - The category name
     * @returns {Collection<string, Command>}
     */
    getCommandsByCategory(category) {
        return this.categories.get(category) || new Collection();
    }
    
    /**
     * Get all categories
     * @returns {Collection<string, Collection<string, Command>>}
     */
    getAllCategories() {
        return this.categories;
    }
    
    /**
     * Shutdown all commands
     * @returns {Promise<boolean>}
     */
    async shutdownCommands() {
        try {
            let shutdownCount = 0;
            
            for (const [name, command] of this.commands) {
                try {
                    if (command.shutdown && typeof command.shutdown === 'function') {
                        await command.shutdown();
                        shutdownCount++;
                    }
                } catch (error) {
                    this.logger.error(this.name, `Error shutting down command ${name}: ${error.message}`);
                }
            }
            
            this.logger.info(this.name, `Shut down ${shutdownCount}/${this.commands.size} commands`);
            return true;
        } catch (error) {
            this.logger.error(this.name, `Error shutting down commands: ${error.message}`);
            return false;
        }
    }
}

// Export the CommandRegistry class
module.exports = CommandRegistry;

// For testing purposes, also export a mock command
const { SlashCommandBuilder } = require('discord.js');

const mockCommand = {
    data: new SlashCommandBuilder()
        .setName('registry')
        .setDescription('Command registry manager'),
    execute: async () => {
        return { content: 'This is a command registry, not a command.' };
    }
};

module.exports.data = mockCommand.data;
module.exports.execute = mockCommand.execute; 