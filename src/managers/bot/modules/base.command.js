/**
 * JMF Hosting Discord Bot - Base Command Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides a base class for all bot commands.
 * It handles command registration, permission checking, and execution.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

class BaseCommand extends BaseModule {
    /**
     * Create a new command
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Command options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'base-command',
            version: options.version || '1.0.0',
            description: options.description || 'Base command module',
            defaultConfig: {
                enabled: true,
                cooldown: 3, // seconds
                guildOnly: false,
                ownerOnly: false,
                permissions: [],
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Command properties
        this.type = 'command';
        this.category = options.category || 'misc';
        this.usage = options.usage || '';
        this.examples = options.examples || [];
        this.aliases = options.aliases || [];
        this.subcommands = new Map();
        
        // Command execution tracking
        this.cooldowns = new Map();
        this.executionCount = 0;
        this.lastExecutionTime = null;
        this.averageExecutionTime = 0;
        
        // Command builder for slash commands
        this._builder = null;
    }

    /**
     * Initialize the command
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Register command with the bot manager
        if (this.manager.commands) {
            this.manager.commands.set(this.name, this);
            
            // Register aliases
            for (const alias of this.aliases) {
                this.manager.aliases.set(alias, this.name);
            }
        }
        
        this.logger.debug(this.name, `Command initialized: ${this.name}`);
    }

    /**
     * Get the slash command builder
     * @returns {SlashCommandBuilder} - The slash command builder
     */
    get builder() {
        if (!this._builder) {
            this._builder = new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description);
                
            // Add default permissions if any
            const permissions = this.getConfig('permissions');
            if (permissions && permissions.length > 0) {
                this._builder.setDefaultMemberPermissions(this.resolvePermissions(permissions));
            }
            
            // Set guild only
            if (this.getConfig('guildOnly')) {
                this._builder.setDMPermission(false);
            }
        }
        
        return this._builder;
    }

    /**
     * Resolve permission strings to permission flags
     * @param {string[]} permissions - Array of permission strings
     * @returns {bigint} - Resolved permission flags
     * @private
     */
    resolvePermissions(permissions) {
        let permissionValue = 0n;
        
        for (const permission of permissions) {
            if (PermissionFlagsBits[permission]) {
                permissionValue |= PermissionFlagsBits[permission];
            }
        }
        
        return permissionValue;
    }

    /**
     * Register a subcommand
     * @param {BaseCommand} subcommand - The subcommand to register
     * @returns {BaseCommand} - The command instance for chaining
     */
    registerSubcommand(subcommand) {
        if (!subcommand || !subcommand.name) {
            throw new Error('Invalid subcommand');
        }
        
        this.subcommands.set(subcommand.name, subcommand);
        
        // Add subcommand to builder
        this.builder.addSubcommand(subcommand.builder);
        
        return this;
    }

    /**
     * Check if the command is on cooldown for a user
     * @param {string} userId - The user ID to check
     * @returns {number} - Remaining cooldown time in seconds, 0 if not on cooldown
     */
    getCooldown(userId) {
        const cooldownAmount = this.getConfig('cooldown') * 1000;
        const now = Date.now();
        const timestamps = this.cooldowns;
        
        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownAmount;
            
            if (now < expirationTime) {
                return Math.round((expirationTime - now) / 1000);
            }
        }
        
        return 0;
    }

    /**
     * Set cooldown for a user
     * @param {string} userId - The user ID to set cooldown for
     */
    setCooldown(userId) {
        this.cooldowns.set(userId, Date.now());
        
        // Clean up cooldowns after expiration
        setTimeout(() => {
            this.cooldowns.delete(userId);
        }, this.getConfig('cooldown') * 1000);
    }

    /**
     * Check if a user has permission to use this command
     * @param {Object} interaction - The interaction object
     * @returns {boolean} - Whether the user has permission
     */
    hasPermission(interaction) {
        // Check if command is enabled
        if (!this.getConfig('enabled')) {
            return false;
        }
        
        // Check if guild only
        if (this.getConfig('guildOnly') && !interaction.guild) {
            return false;
        }
        
        // Check if owner only
        if (this.getConfig('ownerOnly')) {
            const ownerId = this.manager.getConfig('ownerId');
            if (interaction.user.id !== ownerId) {
                return false;
            }
        }
        
        // Check user permissions
        const permissions = this.getConfig('permissions');
        if (permissions && permissions.length > 0 && interaction.member) {
            for (const permission of permissions) {
                if (!interaction.member.permissions.has(PermissionFlagsBits[permission])) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Execute the command
     * @param {Object} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        // Check if command is enabled
        if (!this.getConfig('enabled')) {
            await interaction.reply({
                content: 'This command is currently disabled.',
                ephemeral: true
            });
            return;
        }
        
        // Check if guild only
        if (this.getConfig('guildOnly') && !interaction.guild) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                ephemeral: true
            });
            return;
        }
        
        // Check if owner only
        if (this.getConfig('ownerOnly')) {
            const ownerId = this.manager.getConfig('ownerId');
            if (interaction.user.id !== ownerId) {
                await interaction.reply({
                    content: 'This command can only be used by the bot owner.',
                    ephemeral: true
                });
                return;
            }
        }
        
        // Check user permissions
        const permissions = this.getConfig('permissions');
        if (permissions && permissions.length > 0 && interaction.member) {
            for (const permission of permissions) {
                if (!interaction.member.permissions.has(PermissionFlagsBits[permission])) {
                    await interaction.reply({
                        content: `You need the ${permission} permission to use this command.`,
                        ephemeral: true
                    });
                    return;
                }
            }
        }
        
        // Check cooldown
        const cooldownTime = this.getCooldown(interaction.user.id);
        if (cooldownTime > 0) {
            await interaction.reply({
                content: `Please wait ${cooldownTime} more second${cooldownTime === 1 ? '' : 's'} before using this command again.`,
                ephemeral: true
            });
            return;
        }
        
        // Set cooldown
        this.setCooldown(interaction.user.id);
        
        // Track execution
        this.executionCount++;
        this.lastExecutionTime = Date.now();
        
        // Execute command
        try {
            const startTime = Date.now();
            
            // Check for subcommand
            if (interaction.options && interaction.options.getSubcommand(false)) {
                const subcommandName = interaction.options.getSubcommand();
                const subcommand = this.subcommands.get(subcommandName);
                
                if (subcommand) {
                    await subcommand.execute(interaction);
                } else {
                    await this.run(interaction);
                }
            } else {
                await this.run(interaction);
            }
            
            // Track execution time
            const executionTime = Date.now() - startTime;
            this.averageExecutionTime = (this.averageExecutionTime * (this.executionCount - 1) + executionTime) / this.executionCount;
            
            this.logger.debug(this.name, `Command executed in ${executionTime}ms: ${this.name}`);
        } catch (error) {
            this.logger.error(this.name, `Error executing command ${this.name}: ${error.message}`);
            
            // Reply with error
            try {
                const content = 'An error occurred while executing this command.';
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content,
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                this.logger.error(this.name, `Error replying to command ${this.name}: ${replyError.message}`);
            }
        }
    }

    /**
     * Run the command (to be implemented by subclasses)
     * @param {Object} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async run(interaction) {
        throw new Error('Command run method not implemented');
    }

    /**
     * Get command usage information
     * @returns {Object} - Command usage information
     */
    getUsageInfo() {
        return {
            name: this.name,
            description: this.description,
            category: this.category,
            usage: this.usage,
            examples: this.examples,
            aliases: this.aliases,
            cooldown: this.getConfig('cooldown'),
            guildOnly: this.getConfig('guildOnly'),
            ownerOnly: this.getConfig('ownerOnly'),
            permissions: this.getConfig('permissions'),
            subcommands: Array.from(this.subcommands.keys())
        };
    }

    /**
     * Get command statistics
     * @returns {Object} - Command statistics
     */
    getStatistics() {
        return {
            executionCount: this.executionCount,
            lastExecutionTime: this.lastExecutionTime,
            averageExecutionTime: this.averageExecutionTime
        };
    }
}

module.exports = BaseCommand; 