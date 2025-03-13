/**
 * JMF Hosting Discord Bot - Bot Modules Index
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file exports all bot modules for easy importing and registration.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

// Base modules
const BaseCommand = require('./base.command');
const BaseEmbed = require('./base.embed');
const BaseEvent = require('./base.event');
const BaseUtils = require('./base.utils');
const BaseModule = require('./base.module');

// Core modules
const ModuleRegistry = require('./module.registry');
const ConfigManager = require('./config.manager');
const ErrorHandler = require('./error.handler');
const EventBus = require('./event.bus');
const PermissionsManager = require('./permissions.manager');
const LocalizationManager = require('./localization.manager');
const CooldownManager = require('./cooldown.manager');
const CacheManager = require('./cache.manager');
const StatisticsManager = require('./statistics.manager');
const SchedulerManager = require('./scheduler.manager');

// Export all modules
module.exports = {
    // Base modules
    BaseCommand,
    BaseEmbed,
    BaseEvent,
    BaseUtils,
    BaseModule,
    
    // Core modules
    ModuleRegistry,
    ConfigManager,
    ErrorHandler,
    EventBus,
    PermissionsManager,
    LocalizationManager,
    CooldownManager,
    CacheManager,
    StatisticsManager,
    SchedulerManager,
    
    // Module registry
    registry: {
        'module-registry': ModuleRegistry,
        'config-manager': ConfigManager,
        'error-handler': ErrorHandler,
        'event-bus': EventBus,
        'permissions-manager': PermissionsManager,
        'localization-manager': LocalizationManager,
        'cooldown-manager': CooldownManager,
        'cache-manager': CacheManager,
        'statistics-manager': StatisticsManager,
        'scheduler-manager': SchedulerManager
    }
}; 