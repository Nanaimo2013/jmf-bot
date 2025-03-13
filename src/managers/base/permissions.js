/**
 * JMF Hosting Discord Bot - Permissions System
 * Version: 1.1.0
 * Last Updated: 03/13/2025
 * 
 * This module provides a comprehensive permissions system for the bot,
 * allowing fine-grained control over what actions different users,
 * roles, and modules can perform.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

/**
 * Permission levels for the system
 * @enum {number}
 */
const PermissionLevel = {
    NONE: 0,        // No permissions
    USER: 1,        // Regular user permissions
    MODERATOR: 2,   // Moderator permissions
    ADMIN: 3,       // Admin permissions
    OWNER: 4,       // Owner permissions
    SYSTEM: 5       // System-level permissions
};

/**
 * Permission flags for the bot
 * @type {Object}
 */
const PermissionFlag = {
    // Manager permissions
    MANAGE_BOT: 'manageBot',
    MANAGE_USERS: 'manageUsers',
    MANAGE_SERVERS: 'manageServers',
    VIEW_ANALYTICS: 'viewAnalytics',
    MANAGE_ECONOMY: 'manageEconomy',
    MANAGE_GAMES: 'manageGames',
    
    // General permissions
    VIEW: 'view',
    CREATE: 'create',
    EDIT: 'edit',
    DELETE: 'delete',
    
    // User management
    MANAGE_ROLES: 'manage_roles',
    
    // System permissions
    VIEW_LOGS: 'view_logs',
    MANAGE_SYSTEM: 'manage_system',
    SHUTDOWN: 'shutdown',
    
    // Bot permissions
    MANAGE_COMMANDS: 'manage_commands',
    
    // Database permissions
    MANAGE_DATABASE: 'manage_database',
    BACKUP_DATABASE: 'backup_database',
    RESTORE_DATABASE: 'restore_database',
    
    // API permissions
    API_ACCESS: 'api_access',
    API_ADMIN: 'api_admin',
    
    // Module permissions
    MANAGE_MODULES: 'manage_modules',
    INSTALL_MODULES: 'install_modules',
    UNINSTALL_MODULES: 'uninstall_modules',
    
    // Special permissions
    BYPASS_COOLDOWN: 'bypass_cooldown',
    BYPASS_RESTRICTIONS: 'bypass_restrictions',
    EXECUTE_RESTRICTED: 'execute_restricted'
};

/**
 * Permission sets for different roles
 * @type {Object}
 */
const PermissionSets = {
    USER: [
        PermissionFlag.VIEW
    ],
    MODERATOR: [
        PermissionFlag.VIEW,
        PermissionFlag.CREATE,
        PermissionFlag.EDIT,
        PermissionFlag.MANAGE_USERS,
        PermissionFlag.VIEW_LOGS,
        PermissionFlag.BYPASS_COOLDOWN
    ],
    ADMIN: [
        PermissionFlag.VIEW,
        PermissionFlag.CREATE,
        PermissionFlag.EDIT,
        PermissionFlag.DELETE,
        PermissionFlag.MANAGE_USERS,
        PermissionFlag.MANAGE_ROLES,
        PermissionFlag.VIEW_LOGS,
        PermissionFlag.MANAGE_BOT,
        PermissionFlag.MANAGE_COMMANDS,
        PermissionFlag.BACKUP_DATABASE,
        PermissionFlag.API_ACCESS,
        PermissionFlag.API_ADMIN,
        PermissionFlag.MANAGE_MODULES,
        PermissionFlag.BYPASS_COOLDOWN
    ],
    OWNER: [
        PermissionFlag.MANAGE_BOT,
        PermissionFlag.MANAGE_USERS,
        PermissionFlag.MANAGE_SERVERS,
        PermissionFlag.VIEW_ANALYTICS,
        PermissionFlag.MANAGE_ECONOMY,
        PermissionFlag.MANAGE_GAMES,
        PermissionFlag.VIEW,
        PermissionFlag.CREATE,
        PermissionFlag.EDIT,
        PermissionFlag.DELETE,
        PermissionFlag.MANAGE_ROLES,
        PermissionFlag.VIEW_LOGS,
        PermissionFlag.MANAGE_SYSTEM,
        PermissionFlag.SHUTDOWN,
        PermissionFlag.MANAGE_COMMANDS,
        PermissionFlag.MANAGE_DATABASE,
        PermissionFlag.BACKUP_DATABASE,
        PermissionFlag.RESTORE_DATABASE,
        PermissionFlag.API_ACCESS,
        PermissionFlag.API_ADMIN,
        PermissionFlag.MANAGE_MODULES,
        PermissionFlag.INSTALL_MODULES,
        PermissionFlag.UNINSTALL_MODULES,
        PermissionFlag.BYPASS_COOLDOWN,
        PermissionFlag.BYPASS_RESTRICTIONS,
        PermissionFlag.EXECUTE_RESTRICTED
    ],
    MANAGER: [
        PermissionFlag.MANAGE_BOT,
        PermissionFlag.MANAGE_USERS,
        PermissionFlag.MANAGE_SERVERS,
        PermissionFlag.VIEW_ANALYTICS,
        PermissionFlag.MANAGE_ECONOMY,
        PermissionFlag.MANAGE_GAMES,
        PermissionFlag.VIEW,
        PermissionFlag.CREATE,
        PermissionFlag.EDIT,
        PermissionFlag.DELETE,
        PermissionFlag.MANAGE_ROLES,
        PermissionFlag.VIEW_LOGS,
        PermissionFlag.API_ACCESS
    ]
};

/**
 * Class for managing permissions
 */
class PermissionManager {
    constructor() {
        this.permissions = new Map();
        this.roles = new Map();
        this.userPermissions = new Map();
    }

    /**
     * Initialize the permission manager
     * @param {Object} config - Configuration options
     */
    initialize(config = {}) {
        // Set up default roles with new structure
        this._setupDefaultRoles();
        
        // Apply custom configuration
        if (config.roles) {
            for (const roleName of config.roles) {
                const permissions = PermissionSets[roleName.toUpperCase()] || [];
                this.defineRole(roleName, permissions);
            }
        }
        
        // Apply custom permissions
        if (config.permissions) {
            for (const [permission, enabled] of Object.entries(config.permissions)) {
                if (enabled && PermissionFlag[permission.toUpperCase()]) {
                    this.addGlobalPermission(PermissionFlag[permission.toUpperCase()]);
                }
            }
        }
    }

    /**
     * Set up default roles
     * @private
     */
    _setupDefaultRoles() {
        this.defineRole('user', PermissionSets.USER);
        this.defineRole('moderator', PermissionSets.MODERATOR);
        this.defineRole('admin', PermissionSets.ADMIN);
        this.defineRole('owner', PermissionSets.OWNER);
        this.defineRole('manager', PermissionSets.MANAGER);
    }

    /**
     * Add a global permission
     * @param {string} permission - Permission to add
     */
    addGlobalPermission(permission) {
        for (const [roleName, permissions] of this.roles.entries()) {
            if (roleName !== 'user') {
                permissions.add(permission);
            }
        }
    }

    /**
     * Define a role with specific permissions
     * @param {string} roleName - Name of the role
     * @param {string[]} permissions - Array of permission flags
     */
    defineRole(roleName, permissions) {
        this.roles.set(roleName.toLowerCase(), new Set(permissions));
    }

    /**
     * Get permissions for a role
     * @param {string} roleName - Name of the role
     * @returns {Set<string>} Set of permission flags
     */
    getRolePermissions(roleName) {
        return this.roles.get(roleName.toLowerCase()) || new Set();
    }

    /**
     * Set permissions for a user
     * @param {string} userId - User ID
     * @param {string[]} roles - Array of role names
     * @param {string[]} permissions - Array of additional permission flags
     */
    setUserPermissions(userId, roles = [], permissions = []) {
        const userPerms = new Set(permissions);
        
        // Add permissions from roles
        for (const role of roles) {
            const rolePerms = this.getRolePermissions(role);
            for (const perm of rolePerms) {
                userPerms.add(perm);
            }
        }
        
        this.userPermissions.set(userId, userPerms);
    }

    /**
     * Check if a user has a specific permission
     * @param {string} userId - User ID
     * @param {string} permission - Permission flag to check
     * @returns {boolean} True if the user has the permission
     */
    hasPermission(userId, permission) {
        // System always has all permissions
        if (userId === 'system') return true;
        
        const userPerms = this.userPermissions.get(userId);
        if (!userPerms) return false;
        
        // Check for the specific permission or bypass permission
        return userPerms.has(permission) || userPerms.has(PermissionFlag.BYPASS_RESTRICTIONS);
    }

    /**
     * Check if a user has any of the specified permissions
     * @param {string} userId - User ID
     * @param {string[]} permissions - Array of permission flags to check
     * @returns {boolean} True if the user has any of the permissions
     */
    hasAnyPermission(userId, permissions) {
        return permissions.some(permission => this.hasPermission(userId, permission));
    }

    /**
     * Check if a user has all of the specified permissions
     * @param {string} userId - User ID
     * @param {string[]} permissions - Array of permission flags to check
     * @returns {boolean} True if the user has all of the permissions
     */
    hasAllPermissions(userId, permissions) {
        return permissions.every(permission => this.hasPermission(userId, permission));
    }

    /**
     * Get all permissions for a user
     * @param {string} userId - User ID
     * @returns {string[]} Array of permission flags
     */
    getUserPermissions(userId) {
        const userPerms = this.userPermissions.get(userId);
        return userPerms ? Array.from(userPerms) : [];
    }

    /**
     * Add a permission to a user
     * @param {string} userId - User ID
     * @param {string} permission - Permission flag to add
     */
    addUserPermission(userId, permission) {
        const userPerms = this.userPermissions.get(userId) || new Set();
        userPerms.add(permission);
        this.userPermissions.set(userId, userPerms);
    }

    /**
     * Remove a permission from a user
     * @param {string} userId - User ID
     * @param {string} permission - Permission flag to remove
     */
    removeUserPermission(userId, permission) {
        const userPerms = this.userPermissions.get(userId);
        if (userPerms) {
            userPerms.delete(permission);
        }
    }

    /**
     * Get all defined roles
     * @returns {string[]} Array of role names
     */
    getRoles() {
        return Array.from(this.roles.keys());
    }

    /**
     * Get all users with permissions
     * @returns {string[]} Array of user IDs
     */
    getUsers() {
        return Array.from(this.userPermissions.keys());
    }
}

module.exports = {
    PermissionLevel,
    PermissionFlag,
    PermissionSets,
    PermissionManager
}; 