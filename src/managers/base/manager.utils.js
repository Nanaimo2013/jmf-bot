/**
 * JMF Hosting Discord Bot - Manager Utilities
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides utility functions specifically for managers.
 * It contains helper methods for operations, hooks, module management,
 * and other manager-specific functionality.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const path = require('path');
const fs = require('fs').promises;
const utils = require('./utilities');

/**
 * Execute an operation with hooks, error handling, and performance tracking
 * @param {Object} manager - Manager instance
 * @param {string} operationName - Name of the operation
 * @param {Function} operation - Operation function
 * @param {Object} [data] - Operation data
 * @returns {Promise<any>} Operation result
 */
async function executeOperation(manager, operationName, operation, data = {}) {
    manager._metrics.operations++;
    manager._metrics.lastOperation = {
        name: operationName,
        timestamp: Date.now()
    };
    
    const startTime = Date.now();
    
    try {
        // Run before operation hook
        await runHook(manager, 'beforeOperation', { operation: operationName, data });
        
        // Execute operation
        const result = await operation(data);
        
        // Run after operation hook
        const duration = Date.now() - startTime;
        await runHook(manager, 'afterOperation', { operation: operationName, data, result, duration });
        
        // Track performance
        manager.emit('operationComplete', { operation: operationName, duration });
        
        return result;
    } catch (error) {
        manager._metrics.errors++;
        
        // Run error hook
        await runHook(manager, 'onError', { operation: operationName, data, error });
        
        manager.logger.error(manager.name, `Operation ${operationName} failed:`, error);
        throw error;
    }
}

/**
 * Run a hook
 * @param {Object} manager - Manager instance
 * @param {string} hookName - Name of the hook
 * @param {Object} [data] - Hook data
 */
async function runHook(manager, hookName, data = {}) {
    if (!manager._hooks.has(hookName)) return;
    
    const hooks = manager._hooks.get(hookName);
    for (const hook of hooks) {
        try {
            await hook(data, manager);
        } catch (error) {
            manager.logger.error(manager.name, `Error running hook ${hookName}:`, error);
            manager.emit('error', error);
        }
    }
}

/**
 * Register default hooks for a manager
 * @param {Object} manager - Manager instance
 */
function registerDefaultHooks(manager) {
    // Default hooks
    manager._hooks.set('beforeInitialize', []);
    manager._hooks.set('afterInitialize', []);
    manager._hooks.set('beforeShutdown', []);
    manager._hooks.set('afterShutdown', []);
    manager._hooks.set('beforeOperation', []);
    manager._hooks.set('afterOperation', []);
    manager._hooks.set('onError', []);
    manager._hooks.set('beforeModuleLoad', []);
    manager._hooks.set('afterModuleLoad', []);
    manager._hooks.set('beforeConfigLoad', []);
    manager._hooks.set('afterConfigLoad', []);
    manager._hooks.set('beforeConfigSave', []);
    manager._hooks.set('afterConfigSave', []);
}

/**
 * Register default event handlers for a manager
 * @param {Object} manager - Manager instance
 */
function registerDefaultEvents(manager) {
    manager.on('error', (error) => {
        manager.logger.error(manager.name, `Unhandled error:`, error);
        manager._metrics.errors++;
    });

    manager.on('moduleError', ({ module, error }) => {
        manager.logger.error(manager.name, `Error in module ${module}:`, error);
        manager._metrics.errors++;
    });

    manager.on('managerError', ({ manager: managerName, error }) => {
        manager.logger.error(manager.name, `Error in manager ${managerName}:`, error);
        manager._metrics.errors++;
    });

    // Performance monitoring
    manager.on('operationComplete', ({ operation, duration }) => {
        if (!manager._metrics.performance.operations.has(operation)) {
            manager._metrics.performance.operations.set(operation, []);
        }
        
        const durations = manager._metrics.performance.operations.get(operation);
        durations.push(duration);
        
        // Keep only the last 100 operations for memory efficiency
        if (durations.length > 100) {
            durations.shift();
        }
        
        // Calculate average
        const average = durations.reduce((sum, val) => sum + val, 0) / durations.length;
        manager._metrics.performance.averages.set(operation, average);
        
        // Log slow operations
        if (duration > 1000) {
            manager.logger.performance(manager.name, `Slow operation: ${operation}`, duration);
        }
    });
}

/**
 * Register module event listeners
 * @param {Object} manager - Manager instance
 * @param {Object} module - Module instance
 */
function registerModuleEvents(manager, module) {
    if (module.on) {
        // Register for module events
        module.on('initialized', data => {
            manager.emitEvent('moduleInitialized', { module: module.name, ...data });
        });
        
        module.on('shutdown', data => {
            manager.emitEvent('moduleShutdown', { module: module.name, ...data });
        });
        
        module.on('error', data => {
            manager.emitEvent('moduleError', { module: module.name, ...data });
            manager._metrics.errors++;
        });
        
        // Register for custom module events
        module.on('customEvent', data => {
            manager.emitEvent('moduleCustomEvent', { module: module.name, ...data });
        });
    }
}

/**
 * Unload a module
 * @param {Object} manager - Manager instance
 * @param {string} moduleName - Name of the module to unload
 * @returns {Promise<boolean>} Whether the module was unloaded
 */
async function unloadModule(manager, moduleName) {
    // Check if module exists
    const isModuleLoaded = manager.modules instanceof Map 
        ? manager.modules.has(moduleName) 
        : Object.prototype.hasOwnProperty.call(manager.modules, moduleName);
        
    if (!isModuleLoaded) {
        return false;
    }
    
    // Get module
    const module = manager.modules instanceof Map 
        ? manager.modules.get(moduleName) 
        : manager.modules[moduleName];
    
    try {
        // Shutdown module if it has a shutdown method
        if (typeof module.shutdown === 'function') {
            await module.shutdown();
        }
        
        // Remove module from map
        if (manager.modules instanceof Map) {
            manager.modules.delete(moduleName);
        } else {
            delete manager.modules[moduleName];
        }
        
        manager.logger.info(manager.name, `Unloaded module: ${moduleName}`);
        
        // Emit module unloaded event
        manager.emit('moduleUnloaded', { module: moduleName });
        
        return true;
    } catch (error) {
        manager.logger.error(manager.name, `Failed to unload module: ${moduleName}`, error);
        manager.emit('moduleError', { module: moduleName, error });
        return false;
    }
}

/**
 * Load modules for a manager
 * @param {Object} manager - Manager instance
 * @param {Object} [options] - Load options
 * @param {boolean} [options.reload=false] - Whether to reload existing modules
 * @returns {Promise<Object|Map>} Loaded modules
 */
async function loadModules(manager, options = { reload: false }) {
    try {
        manager.logger.info(manager.name, `Loading modules...`);
        
        // Check if modules directory exists
        try {
            await fs.access(manager.modulesPath);
        } catch (error) {
            // Create modules directory if it doesn't exist
            await fs.mkdir(manager.modulesPath, { recursive: true });
            manager.logger.info(manager.name, `Created modules directory: ${manager.modulesPath}`);
            return manager.modules; // No modules to load yet
        }
        
        // Get module files
        const files = await fs.readdir(manager.modulesPath);
        const moduleFiles = files.filter(file => file.endsWith('.js') && !file.startsWith('_'));

        for (const file of moduleFiles) {
            const moduleName = path.basename(file, '.js');
            
            // Check if module is already loaded
            const isModuleLoaded = manager.modules instanceof Map 
                ? manager.modules.has(moduleName) 
                : Object.prototype.hasOwnProperty.call(manager.modules, moduleName);
            
            // Skip if module is already loaded and reload is false
            if (isModuleLoaded && !options.reload) {
                manager.logger.debug(manager.name, `Module already loaded: ${moduleName}`);
                continue;
            }
            
            // Unload module if it exists and we're reloading
            if (isModuleLoaded && options.reload) {
                await unloadModule(manager, moduleName);
            }
            
            try {
                const modulePath = path.join(manager.modulesPath, file);
                
                // Clear require cache if reloading
                if (options.reload) {
                    delete require.cache[require.resolve(modulePath)];
                }
                
                // Run before module load hook
                await runHook(manager, 'beforeModuleLoad', { moduleName, modulePath });
                
                // Load module
                const moduleExport = require(modulePath);
                const ModuleClass = moduleExport.default || moduleExport;
                
                // Create module instance
                const moduleInstance = new ModuleClass(manager);
                
                // Initialize module if it has an initialize method
                if (typeof moduleInstance.initialize === 'function') {
                    await moduleInstance.initialize();
                }
                
                // Run after module load hook
                await runHook(manager, 'afterModuleLoad', { module: moduleInstance });
                
                // Add module to manager
                if (manager.modules instanceof Map) {
                    manager.modules.set(moduleInstance.name, moduleInstance);
                } else {
                    manager.modules[moduleInstance.name] = moduleInstance;
                }
                
                manager.logger.info(manager.name, `Loaded module: ${moduleInstance.name}`);
                
                // Register module event listeners
                if (typeof moduleInstance.registerEventListeners === 'function') {
                    moduleInstance.registerEventListeners();
                }
                
                // Emit module loaded event
                manager.emit('moduleLoaded', { module: moduleInstance.name });
            } catch (error) {
                manager.logger.error(manager.name, `Failed to load module: ${moduleName}`, error);
                manager.emit('moduleError', { module: moduleName, error });
            }
        }

        const moduleCount = manager.modules instanceof Map 
            ? manager.modules.size 
            : Object.keys(manager.modules).length;
            
        manager.logger.success(manager.name, `All modules loaded successfully (${moduleCount} total)`);
        return manager.modules;
    } catch (error) {
        manager.logger.error(manager.name, `Error loading modules:`, error);
        manager.emit('error', error);
        throw error;
    }
}

/**
 * Save configuration to file
 * @param {Object} manager - Manager instance
 * @returns {Promise<void>}
 */
async function saveConfig(manager) {
    try {
        // Run before config save hook
        await runHook(manager, 'beforeConfigSave', { config: manager._config });
        
        await utils.writeJsonFile(manager._configPath, manager._config);
        
        // Run after config save hook
        await runHook(manager, 'afterConfigSave', { config: manager._config });
        
        manager.logger.info(manager.name, `Configuration saved to: ${manager._configPath}`);
    } catch (error) {
        manager.logger.error(manager.name, `Failed to save configuration:`, error);
        throw error;
    }
}

/**
 * Load configuration from file
 * @param {Object} manager - Manager instance
 * @returns {Promise<Object>} Loaded configuration
 */
async function loadConfig(manager) {
    try {
        // Run before config load hook
        await runHook(manager, 'beforeConfigLoad');
        
        try {
            const config = await utils.readJsonFile(manager._configPath);
            manager._config = utils.deepMerge(manager._config, config);
            
            // Run after config load hook
            await runHook(manager, 'afterConfigLoad', { config: manager._config });
            
            manager.logger.info(manager.name, `Configuration loaded from: ${manager._configPath}`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                manager.logger.error(manager.name, `Failed to load configuration:`, error);
            } else {
                manager.logger.warn(manager.name, `Configuration file not found, using defaults`);
                // Create default config file
                await saveConfig(manager);
            }
        }
        
        return manager._config;
    } catch (error) {
        manager.logger.error(manager.name, `Error in loadConfig:`, error);
        throw error;
    }
}

/**
 * Ensure required directories exist
 * @param {Object} manager - Manager instance
 */
async function ensureDirectories(manager) {
    const dirs = [
        manager.modulesPath,
        path.join(process.cwd(), 'logs', manager.name),
        path.join(process.cwd(), 'data', manager.name),
        path.dirname(manager._configPath)
    ];

    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            manager.logger.error(manager.name, `Failed to create directory: ${dir}`, error);
        }
    }
}

/**
 * Initialize all dependencies
 * @param {Object} manager - Manager instance
 */
async function initializeDependencies(manager) {
    if (!manager._dependencies.length && !manager._optionalDependencies?.length) return;
    
    // Initialize required dependencies
    if (manager._dependencies.length) {
        manager.logger.info(manager.name, `Initializing dependencies: ${manager._dependencies.join(', ')}`);
        
        for (const dependency of manager._dependencies) {
            try {
                await manager.loadDependency(dependency);
            } catch (error) {
                manager.logger.error(manager.name, `Failed to initialize dependency: ${dependency}`, error);
                throw error;
            }
        }
        
        manager.logger.success(manager.name, `All required dependencies initialized`);
    }
    
    // Initialize optional dependencies
    if (manager._optionalDependencies?.length) {
        manager.logger.info(manager.name, `Initializing optional dependencies: ${manager._optionalDependencies.join(', ')}`);
        
        for (const dependency of manager._optionalDependencies) {
            try {
                await manager.loadDependency(dependency);
                manager.logger.info(manager.name, `Optional dependency loaded: ${dependency}`);
            } catch (error) {
                manager.logger.warn(manager.name, `Optional dependency not available: ${dependency}`);
                // Don't throw error for optional dependencies
            }
        }
    }
}

/**
 * Get performance metrics for the manager
 * @param {Object} manager - Manager instance
 * @returns {Object} Performance metrics
 */
function getPerformanceMetrics(manager) {
    return {
        uptime: Date.now() - manager._metrics.startTime,
        operations: manager._metrics.operations,
        errors: manager._metrics.errors,
        errorRate: manager._metrics.operations > 0 ? (manager._metrics.errors / manager._metrics.operations) * 100 : 0,
        lastOperation: manager._metrics.lastOperation,
        averageOperationTimes: Object.fromEntries(manager._metrics.performance.averages)
    };
}

/**
 * Get the status of the manager and its modules
 * @param {Object} manager - Manager instance
 * @returns {Promise<Object>} Status object
 */
async function getStatus(manager) {
    const status = {
        name: manager.name,
        version: manager.version,
        initialized: manager._initialized,
        shuttingDown: manager._shuttingDown,
        modules: {},
        managers: Array.from(manager._managers.keys()),
        dependencies: manager._dependencies,
        metrics: {
            uptime: Date.now() - manager._metrics.startTime,
            operations: manager._metrics.operations,
            errors: manager._metrics.errors,
            lastOperation: manager._metrics.lastOperation,
            performance: {
                averages: Object.fromEntries(manager._metrics.performance.averages)
            }
        }
    };

    // Get status from each module
    for (const [name, module] of manager.modules) {
        try {
            status.modules[name] = await module.getStatus();
        } catch (error) {
            manager.logger.error(manager.name, `Failed to get status for module ${name}:`, error);
            status.modules[name] = { error: error.message };
        }
    }

    return status;
}

module.exports = {
    executeOperation,
    runHook,
    registerDefaultHooks,
    registerDefaultEvents,
    registerModuleEvents,
    unloadModule,
    loadModules,
    saveConfig,
    loadConfig,
    ensureDirectories,
    initializeDependencies,
    getPerformanceMetrics,
    getStatus
}; 