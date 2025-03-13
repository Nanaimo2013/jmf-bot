/**
 * JMF Hosting Discord Bot - Base Components
 * Version: 1.2.0
 * Last Updated: 03/12/2025
 * 
 * This module exports all base components for the bot, including the base manager,
 * base module, permissions system, utilities, and core modules.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('./base.manager');
const BaseModule = require('./base.module');
const permissions = require('./permissions');
const utils = require('./utilities');
const managerUtils = require('./manager.utils');

// Core modules
const ConfigModule = require('./modules/config');
const PerformanceModule = require('./modules/performance');
const HealthModule = require('./modules/health');
const CacheModule = require('./modules/cache');
const UtilityModule = require('./modules/utility');

module.exports = {
    // Core components
    BaseManager,
    BaseModule,
    permissions,
    utils,
    managerUtils,
    
    // Core modules
    modules: {
        ConfigModule,
        PerformanceModule,
        HealthModule,
        CacheModule,
        UtilityModule
    }
}; 