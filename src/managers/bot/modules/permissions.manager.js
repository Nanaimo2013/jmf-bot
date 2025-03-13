/**
 * JMF Hosting Discord Bot - Permissions Manager Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides advanced permission management for the bot,
 * including role-based permissions, command permissions, and custom permission levels.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;

class PermissionsManager extends BaseModule {
    /**
     * Create a new permissions manager
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Permissions options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'permissions-manager',
            version: options.version || '1.0.0',
            description: 'Permissions manager for the bot',
            defaultConfig: {
                permissionsPath: path.join(process.cwd(), 'config', 'permissions.json'),
                autoSave: true,
                defaultPermissionLevel: 0,
                permissionLevels: [
                    { level: 0, name: 'User', check: () => true },
                    { level: 1, name: 'Moderator', check: (member) => this.hasModeratorPermissions(member) },
                    { level: 2, name: 'Administrator', check: (member) => this.hasAdministratorPermissions(member) },
                    { level: 3, name: 'Server Owner', check: (member) => member.id === member.guild.ownerId },
                    { level: 4, name: 'Bot Owner', check: (member) => this.isBotOwner(member.id) }
                ],
                moderatorPermissions: [
                    'KickMembers',
                    'BanMembers',
                    'ManageMessages',
                    'ManageThreads'
                ],
                administratorPermissions: [
                    'Administrator',
                    'ManageGuild',
                    'ManageRoles',
                    'ManageChannels'
                ],
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Permissions storage
        this.permissions = {
            users: new Map(),
            roles: new Map(),
            commands: new Map(),
            channels: new Map()
        };
        
        // Permission cache
        this.permissionCache = new Map();
        
        // Permission levels
        this.permissionLevels = this.getConfig('permissionLevels');
    }

    /**
     * Initialize the permissions manager
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Load permissions from file
        await this.loadPermissions();
        
        this.logger.info(this.name, 'Permissions manager initialized');
    }

    /**
     * Load permissions from file
     * @returns {Promise<void>}
     */
    async loadPermissions() {
        const permissionsPath = this.getConfig('permissionsPath');
        
        try {
            // Check if permissions file exists
            try {
                await fs.access(permissionsPath);
            } catch (error) {
                this.logger.warn(this.name, `Permissions file not found: ${permissionsPath}`);
                return;
            }
            
            // Read permissions file
            const permissionsData = await fs.readFile(permissionsPath, 'utf8');
            const permissions = JSON.parse(permissionsData);
            
            // Load user permissions
            if (permissions.users) {
                for (const [userId, userPerms] of Object.entries(permissions.users)) {
                    this.permissions.users.set(userId, userPerms);
                }
            }
            
            // Load role permissions
            if (permissions.roles) {
                for (const [roleId, rolePerms] of Object.entries(permissions.roles)) {
                    this.permissions.roles.set(roleId, rolePerms);
                }
            }
            
            // Load command permissions
            if (permissions.commands) {
                for (const [commandName, commandPerms] of Object.entries(permissions.commands)) {
                    this.permissions.commands.set(commandName, commandPerms);
                }
            }
            
            // Load channel permissions
            if (permissions.channels) {
                for (const [channelId, channelPerms] of Object.entries(permissions.channels)) {
                    this.permissions.channels.set(channelId, channelPerms);
                }
            }
            
            this.logger.info(this.name, `Loaded permissions from ${permissionsPath}`);
        } catch (error) {
            this.logger.error(this.name, `Failed to load permissions: ${error.message}`);
        }
    }

    /**
     * Save permissions to file
     * @returns {Promise<void>}
     */
    async savePermissions() {
        const permissionsPath = this.getConfig('permissionsPath');
        
        try {
            // Create permissions directory if it doesn't exist
            const permissionsDir = path.dirname(permissionsPath);
            try {
                await fs.access(permissionsDir);
            } catch (error) {
                await fs.mkdir(permissionsDir, { recursive: true });
            }
            
            // Convert permissions to JSON
            const permissions = {
                users: Object.fromEntries(this.permissions.users),
                roles: Object.fromEntries(this.permissions.roles),
                commands: Object.fromEntries(this.permissions.commands),
                channels: Object.fromEntries(this.permissions.channels)
            };
            
            // Write permissions file
            const permissionsData = JSON.stringify(permissions, null, 2);
            await fs.writeFile(permissionsPath, permissionsData, 'utf8');
            
            this.logger.info(this.name, `Saved permissions to ${permissionsPath}`);
        } catch (error) {
            this.logger.error(this.name, `Failed to save permissions: ${error.message}`);
        }
    }

    /**
     * Check if a user has permission to use a command
     * @param {Object} interaction - The interaction object
     * @param {string} commandName - The command name
     * @returns {boolean} - Whether the user has permission
     */
    hasCommandPermission(interaction, commandName) {
        // Get command permissions
        const commandPerms = this.permissions.commands.get(commandName);
        
        if (!commandPerms) {
            return true; // No specific permissions set for this command
        }
        
        // Check if command is enabled
        if (commandPerms.enabled === false) {
            return false;
        }
        
        // Check if command is guild-only
        if (commandPerms.guildOnly && !interaction.guild) {
            return false;
        }
        
        // Check if command is owner-only
        if (commandPerms.ownerOnly && !this.isBotOwner(interaction.user.id)) {
            return false;
        }
        
        // Check permission level
        if (commandPerms.permissionLevel !== undefined) {
            const userLevel = this.getUserPermissionLevel(interaction.member || interaction.user);
            if (userLevel < commandPerms.permissionLevel) {
                return false;
            }
        }
        
        // Check required permissions
        if (commandPerms.permissions && interaction.member) {
            const requiredPerms = new PermissionsBitField(this._resolvePermissions(commandPerms.permissions));
            if (!interaction.member.permissions.has(requiredPerms)) {
                return false;
            }
        }
        
        // Check allowed users
        if (commandPerms.allowedUsers && commandPerms.allowedUsers.length > 0) {
            if (!commandPerms.allowedUsers.includes(interaction.user.id)) {
                return false;
            }
        }
        
        // Check allowed roles
        if (commandPerms.allowedRoles && commandPerms.allowedRoles.length > 0 && interaction.member) {
            const hasRole = interaction.member.roles.cache.some(role => 
                commandPerms.allowedRoles.includes(role.id)
            );
            
            if (!hasRole) {
                return false;
            }
        }
        
        // Check allowed channels
        if (commandPerms.allowedChannels && commandPerms.allowedChannels.length > 0) {
            if (!commandPerms.allowedChannels.includes(interaction.channelId)) {
                return false;
            }
        }
        
        // Check denied users
        if (commandPerms.deniedUsers && commandPerms.deniedUsers.includes(interaction.user.id)) {
            return false;
        }
        
        // Check denied roles
        if (commandPerms.deniedRoles && commandPerms.deniedRoles.length > 0 && interaction.member) {
            const hasRole = interaction.member.roles.cache.some(role => 
                commandPerms.deniedRoles.includes(role.id)
            );
            
            if (hasRole) {
                return false;
            }
        }
        
        // Check denied channels
        if (commandPerms.deniedChannels && commandPerms.deniedChannels.includes(interaction.channelId)) {
            return false;
        }
        
        return true;
    }

    /**
     * Get a user's permission level
     * @param {Object} memberOrUser - The member or user object
     * @returns {number} - The permission level
     */
    getUserPermissionLevel(memberOrUser) {
        // Check cache first
        const cacheKey = memberOrUser.id + (memberOrUser.guild ? `:${memberOrUser.guild.id}` : '');
        if (this.permissionCache.has(cacheKey)) {
            return this.permissionCache.get(cacheKey);
        }
        
        // Check user-specific permission level
        const userPerms = this.permissions.users.get(memberOrUser.id);
        if (userPerms && userPerms.permissionLevel !== undefined) {
            this.permissionCache.set(cacheKey, userPerms.permissionLevel);
            return userPerms.permissionLevel;
        }
        
        // Check role-based permission level
        if (memberOrUser.roles) {
            let highestLevel = this.getConfig('defaultPermissionLevel');
            
            for (const [roleId, role] of memberOrUser.roles.cache) {
                const rolePerms = this.permissions.roles.get(roleId);
                if (rolePerms && rolePerms.permissionLevel !== undefined && rolePerms.permissionLevel > highestLevel) {
                    highestLevel = rolePerms.permissionLevel;
                }
            }
            
            if (highestLevel > this.getConfig('defaultPermissionLevel')) {
                this.permissionCache.set(cacheKey, highestLevel);
                return highestLevel;
            }
        }
        
        // Check permission level based on predefined levels
        for (let i = this.permissionLevels.length - 1; i >= 0; i--) {
            const level = this.permissionLevels[i];
            if (level.check(memberOrUser)) {
                this.permissionCache.set(cacheKey, level.level);
                return level.level;
            }
        }
        
        // Default permission level
        const defaultLevel = this.getConfig('defaultPermissionLevel');
        this.permissionCache.set(cacheKey, defaultLevel);
        return defaultLevel;
    }

    /**
     * Set a user's permission level
     * @param {string} userId - The user ID
     * @param {number} level - The permission level
     * @returns {PermissionsManager} - The permissions manager instance for chaining
     */
    setUserPermissionLevel(userId, level) {
        let userPerms = this.permissions.users.get(userId);
        
        if (!userPerms) {
            userPerms = {};
            this.permissions.users.set(userId, userPerms);
        }
        
        userPerms.permissionLevel = level;
        
        // Clear cache
        this._clearUserCache(userId);
        
        // Auto-save if enabled
        if (this.getConfig('autoSave')) {
            this.savePermissions().catch(() => {});
        }
        
        return this;
    }

    /**
     * Set a role's permission level
     * @param {string} roleId - The role ID
     * @param {number} level - The permission level
     * @returns {PermissionsManager} - The permissions manager instance for chaining
     */
    setRolePermissionLevel(roleId, level) {
        let rolePerms = this.permissions.roles.get(roleId);
        
        if (!rolePerms) {
            rolePerms = {};
            this.permissions.roles.set(roleId, rolePerms);
        }
        
        rolePerms.permissionLevel = level;
        
        // Clear cache
        this._clearCache();
        
        // Auto-save if enabled
        if (this.getConfig('autoSave')) {
            this.savePermissions().catch(() => {});
        }
        
        return this;
    }

    /**
     * Set command permissions
     * @param {string} commandName - The command name
     * @param {Object} permissions - The command permissions
     * @returns {PermissionsManager} - The permissions manager instance for chaining
     */
    setCommandPermissions(commandName, permissions) {
        this.permissions.commands.set(commandName, permissions);
        
        // Auto-save if enabled
        if (this.getConfig('autoSave')) {
            this.savePermissions().catch(() => {});
        }
        
        return this;
    }

    /**
     * Check if a user is the bot owner
     * @param {string} userId - The user ID
     * @returns {boolean} - Whether the user is the bot owner
     */
    isBotOwner(userId) {
        const ownerId = this.manager.getConfig('ownerId');
        const ownerIds = this.manager.getConfig('ownerIds') || [];
        
        return userId === ownerId || ownerIds.includes(userId);
    }

    /**
     * Check if a member has moderator permissions
     * @param {Object} member - The member object
     * @returns {boolean} - Whether the member has moderator permissions
     */
    hasModeratorPermissions(member) {
        if (!member || !member.permissions) {
            return false;
        }
        
        const moderatorPermissions = this.getConfig('moderatorPermissions');
        const requiredPerms = new PermissionsBitField(this._resolvePermissions(moderatorPermissions));
        
        return member.permissions.has(requiredPerms);
    }

    /**
     * Check if a member has administrator permissions
     * @param {Object} member - The member object
     * @returns {boolean} - Whether the member has administrator permissions
     */
    hasAdministratorPermissions(member) {
        if (!member || !member.permissions) {
            return false;
        }
        
        const administratorPermissions = this.getConfig('administratorPermissions');
        const requiredPerms = new PermissionsBitField(this._resolvePermissions(administratorPermissions));
        
        return member.permissions.has(requiredPerms);
    }

    /**
     * Get permission level name
     * @param {number} level - The permission level
     * @returns {string} - The permission level name
     */
    getPermissionLevelName(level) {
        const permLevel = this.permissionLevels.find(l => l.level === level);
        return permLevel ? permLevel.name : 'Unknown';
    }

    /**
     * Clear permission cache
     * @private
     */
    _clearCache() {
        this.permissionCache.clear();
    }

    /**
     * Clear user permission cache
     * @param {string} userId - The user ID
     * @private
     */
    _clearUserCache(userId) {
        for (const [key] of this.permissionCache) {
            if (key.startsWith(userId)) {
                this.permissionCache.delete(key);
            }
        }
    }

    /**
     * Resolve permissions
     * @param {Array|string} permissions - The permissions to resolve
     * @returns {Array} - The resolved permissions
     * @private
     */
    _resolvePermissions(permissions) {
        if (!permissions) {
            return [];
        }
        
        if (typeof permissions === 'string') {
            return [PermissionFlagsBits[permissions]].filter(Boolean);
        }
        
        if (Array.isArray(permissions)) {
            return permissions.map(p => {
                if (typeof p === 'string') {
                    return PermissionFlagsBits[p];
                }
                return p;
            }).filter(Boolean);
        }
        
        return [permissions].filter(Boolean);
    }
}

module.exports = PermissionsManager; 