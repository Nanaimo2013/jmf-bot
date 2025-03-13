/**
 * JMF Hosting Discord Bot - Cooldown Manager Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides advanced cooldown management for commands,
 * including user-specific, guild-specific, and global cooldowns.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { Collection } = require('discord.js');

class CooldownManager extends BaseModule {
    /**
     * Create a new cooldown manager
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Cooldown options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'cooldown-manager',
            version: options.version || '1.0.0',
            description: 'Cooldown manager for the bot',
            defaultConfig: {
                defaultCooldown: 3, // Default cooldown in seconds
                cooldownSweepInterval: 300000, // 5 minutes
                exemptOwner: true, // Whether the bot owner is exempt from cooldowns
                exemptAdmins: false, // Whether server admins are exempt from cooldowns
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Cooldown storage
        this.cooldowns = {
            user: new Collection(), // User-specific cooldowns
            guild: new Collection(), // Guild-specific cooldowns
            channel: new Collection(), // Channel-specific cooldowns
            global: new Collection() // Global cooldowns
        };
        
        // Cooldown exemptions
        this.exemptions = {
            users: new Set(),
            roles: new Set(),
            guilds: new Set(),
            commands: new Collection() // Command-specific exemptions
        };
        
        // Cooldown sweep interval
        this.sweepInterval = null;
    }

    /**
     * Initialize the cooldown manager
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Set up cooldown sweep interval
        const sweepInterval = this.getConfig('cooldownSweepInterval');
        if (sweepInterval > 0) {
            this.sweepInterval = setInterval(() => this.sweepCooldowns(), sweepInterval);
        }
        
        this.logger.info(this.name, 'Cooldown manager initialized');
    }

    /**
     * Check if a command is on cooldown
     * @param {Object} interaction - The interaction object
     * @param {Object} command - The command object
     * @returns {Object|null} - Cooldown info or null if not on cooldown
     */
    checkCooldown(interaction, command) {
        // Get cooldown settings
        const cooldownSettings = this._getCooldownSettings(command);
        
        // Check if user is exempt
        if (this._isExempt(interaction, command)) {
            return null;
        }
        
        const now = Date.now();
        const { userId, guildId, channelId } = interaction;
        const commandName = command.name;
        
        // Check user cooldown
        if (cooldownSettings.user > 0) {
            const userCooldowns = this.cooldowns.user.get(commandName) || new Collection();
            const userExpiration = userCooldowns.get(userId);
            
            if (userExpiration && now < userExpiration) {
                return {
                    type: 'user',
                    remaining: (userExpiration - now) / 1000,
                    total: cooldownSettings.user
                };
            }
        }
        
        // Check guild cooldown
        if (cooldownSettings.guild > 0 && guildId) {
            const guildCooldowns = this.cooldowns.guild.get(commandName) || new Collection();
            const guildExpiration = guildCooldowns.get(guildId);
            
            if (guildExpiration && now < guildExpiration) {
                return {
                    type: 'guild',
                    remaining: (guildExpiration - now) / 1000,
                    total: cooldownSettings.guild
                };
            }
        }
        
        // Check channel cooldown
        if (cooldownSettings.channel > 0) {
            const channelCooldowns = this.cooldowns.channel.get(commandName) || new Collection();
            const channelExpiration = channelCooldowns.get(channelId);
            
            if (channelExpiration && now < channelExpiration) {
                return {
                    type: 'channel',
                    remaining: (channelExpiration - now) / 1000,
                    total: cooldownSettings.channel
                };
            }
        }
        
        // Check global cooldown
        if (cooldownSettings.global > 0) {
            const globalCooldowns = this.cooldowns.global;
            const globalExpiration = globalCooldowns.get(commandName);
            
            if (globalExpiration && now < globalExpiration) {
                return {
                    type: 'global',
                    remaining: (globalExpiration - now) / 1000,
                    total: cooldownSettings.global
                };
            }
        }
        
        return null;
    }

    /**
     * Set cooldown for a command
     * @param {Object} interaction - The interaction object
     * @param {Object} command - The command object
     */
    setCooldown(interaction, command) {
        // Get cooldown settings
        const cooldownSettings = this._getCooldownSettings(command);
        
        // Check if user is exempt
        if (this._isExempt(interaction, command)) {
            return;
        }
        
        const now = Date.now();
        const { userId, guildId, channelId } = interaction;
        const commandName = command.name;
        
        // Set user cooldown
        if (cooldownSettings.user > 0) {
            const userCooldowns = this.cooldowns.user.get(commandName) || new Collection();
            const expirationTime = now + (cooldownSettings.user * 1000);
            userCooldowns.set(userId, expirationTime);
            this.cooldowns.user.set(commandName, userCooldowns);
        }
        
        // Set guild cooldown
        if (cooldownSettings.guild > 0 && guildId) {
            const guildCooldowns = this.cooldowns.guild.get(commandName) || new Collection();
            const expirationTime = now + (cooldownSettings.guild * 1000);
            guildCooldowns.set(guildId, expirationTime);
            this.cooldowns.guild.set(commandName, guildCooldowns);
        }
        
        // Set channel cooldown
        if (cooldownSettings.channel > 0) {
            const channelCooldowns = this.cooldowns.channel.get(commandName) || new Collection();
            const expirationTime = now + (cooldownSettings.channel * 1000);
            channelCooldowns.set(channelId, expirationTime);
            this.cooldowns.channel.set(commandName, channelCooldowns);
        }
        
        // Set global cooldown
        if (cooldownSettings.global > 0) {
            const expirationTime = now + (cooldownSettings.global * 1000);
            this.cooldowns.global.set(commandName, expirationTime);
        }
    }

    /**
     * Reset cooldown for a command
     * @param {string} commandName - The command name
     * @param {Object} [options] - Reset options
     * @param {string} [options.userId] - The user ID to reset cooldown for
     * @param {string} [options.guildId] - The guild ID to reset cooldown for
     * @param {string} [options.channelId] - The channel ID to reset cooldown for
     * @param {boolean} [options.global] - Whether to reset global cooldown
     * @returns {boolean} - Whether any cooldowns were reset
     */
    resetCooldown(commandName, options = {}) {
        let reset = false;
        
        // Reset user cooldown
        if (options.userId) {
            const userCooldowns = this.cooldowns.user.get(commandName);
            if (userCooldowns && userCooldowns.has(options.userId)) {
                userCooldowns.delete(options.userId);
                reset = true;
            }
        }
        
        // Reset guild cooldown
        if (options.guildId) {
            const guildCooldowns = this.cooldowns.guild.get(commandName);
            if (guildCooldowns && guildCooldowns.has(options.guildId)) {
                guildCooldowns.delete(options.guildId);
                reset = true;
            }
        }
        
        // Reset channel cooldown
        if (options.channelId) {
            const channelCooldowns = this.cooldowns.channel.get(commandName);
            if (channelCooldowns && channelCooldowns.has(options.channelId)) {
                channelCooldowns.delete(options.channelId);
                reset = true;
            }
        }
        
        // Reset global cooldown
        if (options.global) {
            if (this.cooldowns.global.has(commandName)) {
                this.cooldowns.global.delete(commandName);
                reset = true;
            }
        }
        
        // If no specific options, reset all cooldowns for the command
        if (!options.userId && !options.guildId && !options.channelId && !options.global) {
            this.cooldowns.user.delete(commandName);
            this.cooldowns.guild.delete(commandName);
            this.cooldowns.channel.delete(commandName);
            this.cooldowns.global.delete(commandName);
            reset = true;
        }
        
        return reset;
    }

    /**
     * Add a cooldown exemption
     * @param {string} type - The exemption type ('user', 'role', 'guild', 'command')
     * @param {string} id - The ID to exempt
     * @param {Object} [options] - Exemption options for commands
     * @returns {boolean} - Whether the exemption was added
     */
    addExemption(type, id, options = {}) {
        switch (type) {
            case 'user':
                this.exemptions.users.add(id);
                return true;
            
            case 'role':
                this.exemptions.roles.add(id);
                return true;
            
            case 'guild':
                this.exemptions.guilds.add(id);
                return true;
            
            case 'command':
                const commandExemptions = this.exemptions.commands.get(id) || {
                    users: new Set(),
                    roles: new Set(),
                    guilds: new Set()
                };
                
                if (options.userId) {
                    commandExemptions.users.add(options.userId);
                }
                
                if (options.roleId) {
                    commandExemptions.roles.add(options.roleId);
                }
                
                if (options.guildId) {
                    commandExemptions.guilds.add(options.guildId);
                }
                
                this.exemptions.commands.set(id, commandExemptions);
                return true;
            
            default:
                return false;
        }
    }

    /**
     * Remove a cooldown exemption
     * @param {string} type - The exemption type ('user', 'role', 'guild', 'command')
     * @param {string} id - The ID to remove exemption from
     * @param {Object} [options] - Exemption options for commands
     * @returns {boolean} - Whether the exemption was removed
     */
    removeExemption(type, id, options = {}) {
        switch (type) {
            case 'user':
                return this.exemptions.users.delete(id);
            
            case 'role':
                return this.exemptions.roles.delete(id);
            
            case 'guild':
                return this.exemptions.guilds.delete(id);
            
            case 'command':
                const commandExemptions = this.exemptions.commands.get(id);
                if (!commandExemptions) {
                    return false;
                }
                
                let removed = false;
                
                if (options.userId && commandExemptions.users.has(options.userId)) {
                    commandExemptions.users.delete(options.userId);
                    removed = true;
                }
                
                if (options.roleId && commandExemptions.roles.has(options.roleId)) {
                    commandExemptions.roles.delete(options.roleId);
                    removed = true;
                }
                
                if (options.guildId && commandExemptions.guilds.has(options.guildId)) {
                    commandExemptions.guilds.delete(options.guildId);
                    removed = true;
                }
                
                // If no specific options, remove all exemptions for the command
                if (!options.userId && !options.roleId && !options.guildId) {
                    this.exemptions.commands.delete(id);
                    removed = true;
                }
                
                return removed;
            
            default:
                return false;
        }
    }

    /**
     * Check if a user is exempt from cooldowns
     * @param {Object} interaction - The interaction object
     * @param {Object} command - The command object
     * @returns {boolean} - Whether the user is exempt
     * @private
     */
    _isExempt(interaction, command) {
        const { user, member, guildId } = interaction;
        const commandName = command.name;
        
        // Check if owner is exempt
        if (this.getConfig('exemptOwner') && this._isOwner(user.id)) {
            return true;
        }
        
        // Check if admins are exempt
        if (this.getConfig('exemptAdmins') && member && this._isAdmin(member)) {
            return true;
        }
        
        // Check user exemptions
        if (this.exemptions.users.has(user.id)) {
            return true;
        }
        
        // Check guild exemptions
        if (guildId && this.exemptions.guilds.has(guildId)) {
            return true;
        }
        
        // Check role exemptions
        if (member && member.roles) {
            for (const roleId of member.roles.cache.keys()) {
                if (this.exemptions.roles.has(roleId)) {
                    return true;
                }
            }
        }
        
        // Check command-specific exemptions
        const commandExemptions = this.exemptions.commands.get(commandName);
        if (commandExemptions) {
            // Check user exemptions for this command
            if (commandExemptions.users.has(user.id)) {
                return true;
            }
            
            // Check guild exemptions for this command
            if (guildId && commandExemptions.guilds.has(guildId)) {
                return true;
            }
            
            // Check role exemptions for this command
            if (member && member.roles) {
                for (const roleId of member.roles.cache.keys()) {
                    if (commandExemptions.roles.has(roleId)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * Check if a user is the bot owner
     * @param {string} userId - The user ID
     * @returns {boolean} - Whether the user is the bot owner
     * @private
     */
    _isOwner(userId) {
        const ownerId = this.manager.getConfig('ownerId');
        const ownerIds = this.manager.getConfig('ownerIds') || [];
        
        return userId === ownerId || ownerIds.includes(userId);
    }

    /**
     * Check if a member is an admin
     * @param {Object} member - The member object
     * @returns {boolean} - Whether the member is an admin
     * @private
     */
    _isAdmin(member) {
        return member.permissions.has('Administrator');
    }

    /**
     * Get cooldown settings for a command
     * @param {Object} command - The command object
     * @returns {Object} - The cooldown settings
     * @private
     */
    _getCooldownSettings(command) {
        const defaultCooldown = this.getConfig('defaultCooldown');
        
        // Default cooldown settings
        const settings = {
            user: defaultCooldown,
            guild: 0,
            channel: 0,
            global: 0
        };
        
        // If command has cooldown property
        if (command.cooldown !== undefined) {
            // If cooldown is a number, set user cooldown
            if (typeof command.cooldown === 'number') {
                settings.user = command.cooldown;
            }
            // If cooldown is an object, merge with default settings
            else if (typeof command.cooldown === 'object') {
                Object.assign(settings, command.cooldown);
            }
        }
        
        return settings;
    }

    /**
     * Sweep expired cooldowns
     */
    sweepCooldowns() {
        const now = Date.now();
        let sweptCount = 0;
        
        // Sweep user cooldowns
        for (const [commandName, cooldowns] of this.cooldowns.user.entries()) {
            const expired = cooldowns.filter(expiration => expiration <= now);
            expired.forEach((_, key) => {
                cooldowns.delete(key);
                sweptCount++;
            });
            
            if (cooldowns.size === 0) {
                this.cooldowns.user.delete(commandName);
            }
        }
        
        // Sweep guild cooldowns
        for (const [commandName, cooldowns] of this.cooldowns.guild.entries()) {
            const expired = cooldowns.filter(expiration => expiration <= now);
            expired.forEach((_, key) => {
                cooldowns.delete(key);
                sweptCount++;
            });
            
            if (cooldowns.size === 0) {
                this.cooldowns.guild.delete(commandName);
            }
        }
        
        // Sweep channel cooldowns
        for (const [commandName, cooldowns] of this.cooldowns.channel.entries()) {
            const expired = cooldowns.filter(expiration => expiration <= now);
            expired.forEach((_, key) => {
                cooldowns.delete(key);
                sweptCount++;
            });
            
            if (cooldowns.size === 0) {
                this.cooldowns.channel.delete(commandName);
            }
        }
        
        // Sweep global cooldowns
        const expiredGlobal = this.cooldowns.global.filter(expiration => expiration <= now);
        expiredGlobal.forEach((_, key) => {
            this.cooldowns.global.delete(key);
            sweptCount++;
        });
        
        if (sweptCount > 0) {
            this.logger.debug(this.name, `Swept ${sweptCount} expired cooldowns`);
        }
    }

    /**
     * Format remaining cooldown time
     * @param {number} seconds - The remaining time in seconds
     * @returns {string} - The formatted time
     */
    formatRemainingTime(seconds) {
        if (seconds < 60) {
            return `${Math.ceil(seconds)} second${Math.ceil(seconds) === 1 ? '' : 's'}`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.ceil(seconds % 60);
        
        if (minutes < 60) {
            let result = `${minutes} minute${minutes === 1 ? '' : 's'}`;
            if (remainingSeconds > 0) {
                result += ` and ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`;
            }
            return result;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.floor(minutes % 60);
        
        let result = `${hours} hour${hours === 1 ? '' : 's'}`;
        if (remainingMinutes > 0) {
            result += ` and ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
        }
        
        return result;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.sweepInterval) {
            clearInterval(this.sweepInterval);
            this.sweepInterval = null;
        }
        
        this.cooldowns.user.clear();
        this.cooldowns.guild.clear();
        this.cooldowns.channel.clear();
        this.cooldowns.global.clear();
        
        this.exemptions.users.clear();
        this.exemptions.roles.clear();
        this.exemptions.guilds.clear();
        this.exemptions.commands.clear();
        
        this.logger.info(this.name, 'Cooldown manager cleaned up');
    }
}

module.exports = CooldownManager; 