/**
 * JMF Hosting Discord Bot - Database Modules Index
 * Version: 1.1.0
 * Last Updated: 03/12/2025
 * 
 * This file exports all database modules for easy importing and registration.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

// Base module
const BaseModule = require('./base.module');

// Database modules
const SQLiteModule = require('./sqlite.module');
const MySQLModule = require('./mysql.module');
const MigrationModule = require('./migration.module');
const Registry = require('./registry');

// Export all modules
module.exports = {
    // Base module
    BaseModule,
    
    // Database modules
    SQLiteModule,
    MySQLModule,
    MigrationModule,
    Registry,
    
    // Default constructor for module loading
    default: BaseModule,
    
    // Module registry for easy access
    registry: {
        'base': BaseModule,
        'sqlite': SQLiteModule,
        'mysql': MySQLModule,
        'migration': MigrationModule,
        'registry': Registry
    },
    
    // Helper function to get module by name
    getModule: function(name) {
        return this.registry[name] || null;
    },
    
    // Helper function to register a new module
    registerModule: function(name, moduleClass) {
        if (typeof moduleClass !== 'function') {
            throw new Error('Module must be a constructor function');
        }
        this.registry[name] = moduleClass;
    }
}; 