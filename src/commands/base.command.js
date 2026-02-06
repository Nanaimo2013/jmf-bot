/**
 * JMF Hosting Discord Bot - Base Command Class
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This class serves as the foundation for all bot commands.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

class Command {
    /**
     * Create a new command
     * @param {Object} options - Command options
     * @param {string} options.name - The name of the command
     * @param {string} options.description - The description of the command
     * @param {boolean} options.enabled - Whether the command is enabled
     * @param {number} options.cooldown - The cooldown in seconds
     * @param {string[]} options.requiredPermissions - The permissions required to use the command
     * @param {string[]} options.requiredRoles - The roles required to use the command
     * @param {boolean} options.ownerOnly - Whether the command is owner-only
     * @param {boolean} options.adminOnly - Whether the command is admin-only
     * @param {boolean} options.modOnly - Whether the command is mod-only
     * @param {boolean} options.guildOnly - Whether the command is guild-only
     * @param {boolean} options.dmOnly - Whether the command is DM-only
     */
    constructor(options = {}) {
        this.name = options.name || 'unnamed';
        this.description = options.description || 'No description provided';
        this.enabled = options.enabled !== false;
        this.cooldown = options.cooldown || 0;
        this.requiredPermissions = options.requiredPermissions || [];
        this.requiredRoles = options.requiredRoles || [];
        this.ownerOnly = options.ownerOnly || false;
        this.adminOnly = options.adminOnly || false;
        this.modOnly = options.modOnly || false;
        this.guildOnly = options.guildOnly || false;
        this.dmOnly = options.dmOnly || false;
        
        // Get logger from global managers
        this.logger = global.managers?.logger || console;
        
        // Create the slash command data
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }
    
    /**
     * Initialize the command
     * @param {Client} client - The Discord.js client
     * @returns {Promise<boolean>}
     */
    async initialize(client) {
        try {
            this.client = client;
            
            // Get bot configuration
            this.config = global.managers?.config?.get('bot') || {};
            
            // Get database manager
            this.database = global.managers?.database;
            
            this.logger.info(this.name, `Command ${this.name} initialized`);
            return true;
        } catch (error) {
            this.handleError('initialize', error);
            return false;
        }
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        throw new Error(`Command ${this.name} does not have an execute method`);
    }
    
    /**
     * Handle autocomplete for the command
     * @param {AutocompleteInteraction} interaction - The autocomplete interaction
     * @returns {Promise<void>}
     */
    async autocomplete(interaction) {
        // Default implementation does nothing
        return;
    }
    
    /**
     * Check if the user has permission to use the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<boolean>}
     */
    async hasPermission(interaction) {
        try {
            // Check if command is guild-only
            if (this.guildOnly && !interaction.guild) {
                return false;
            }
            
            // Check if command is DM-only
            if (this.dmOnly && interaction.guild) {
                return false;
            }
            
            // Check if user is the bot owner
            if (this.ownerOnly) {
                const ownerId = this.config.ownerId;
                if (!ownerId || interaction.user.id !== ownerId) {
                    return false;
                }
            }
            
            // If not in a guild, skip guild-specific checks
            if (!interaction.guild) {
                return true;
            }
            
            // Check if user is an admin
            if (this.adminOnly) {
                const adminRoles = this.config.adminRoles || [];
                const hasAdminRole = interaction.member.roles.cache.some(role => 
                    adminRoles.includes(role.id) || adminRoles.includes(role.name)
                );
                
                const hasAdminPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
                
                if (!hasAdminRole && !hasAdminPermission) {
                    return false;
                }
            }
            
            // Check if user is a moderator
            if (this.modOnly) {
                const modRoles = [
                    ...(this.config.adminRoles || []), 
                    ...(this.config.modRoles || [])
                ];
                
                const hasModRole = interaction.member.roles.cache.some(role => 
                    modRoles.includes(role.id) || modRoles.includes(role.name)
                );
                
                const hasModPermission = interaction.member.permissions.has([
                    PermissionFlagsBits.KickMembers, 
                    PermissionFlagsBits.BanMembers, 
                    PermissionFlagsBits.ManageMessages
                ]);
                
                if (!hasModRole && !hasModPermission) {
                    return false;
                }
            }
            
            // Check required permissions
            if (this.requiredPermissions.length > 0) {
                const hasPermissions = interaction.member.permissions.has(this.requiredPermissions);
                if (!hasPermissions) {
                    return false;
                }
            }
            
            // Check required roles
            if (this.requiredRoles.length > 0) {
                const hasRoles = interaction.member.roles.cache.some(role => 
                    this.requiredRoles.includes(role.id) || this.requiredRoles.includes(role.name)
                );
                
                if (!hasRoles) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            this.handleError('hasPermission', error);
            return false;
        }
    }
    
    /**
     * Handle an error
     * @param {string} method - The method where the error occurred
     * @param {Error} error - The error object
     */
    handleError(method, error) {
        this.logger.error(this.name, `Error in ${method}: ${error.message}`);
        
        // Record error in database if available
        if (this.database) {
            try {
                this.database.query(
                    'INSERT INTO command_errors (command, method, error_message, stack_trace, timestamp) VALUES (?, ?, ?, ?, ?)',
                    [
                        this.name,
                        method,
                        error.message,
                        error.stack,
                        new Date()
                    ]
                ).catch(() => {});
            } catch (dbError) {
                this.logger.error(this.name, `Failed to record command error in database: ${dbError.message}`);
            }
        }
    }
}

// Export a default instance for testing
const defaultCommand = new Command({
    name: 'test',
    description: 'Test command'
});

module.exports = defaultCommand;
module.exports.Command = Command;