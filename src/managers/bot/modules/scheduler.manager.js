/**
 * JMF Hosting Discord Bot - Task Scheduler Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides a flexible task scheduling system with support for
 * cron expressions, intervals, and one-time tasks.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { Collection } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class SchedulerManager extends BaseModule {
    /**
     * Create a new scheduler manager
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Scheduler options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'scheduler-manager',
            version: options.version || '1.0.0',
            description: 'Task scheduler for the bot',
            defaultConfig: {
                tasksPath: path.join(process.cwd(), 'data', 'tasks'),
                checkInterval: 1000, // 1 second
                persistInterval: 60000, // 1 minute
                maxConcurrentTasks: 10,
                persistTasks: true,
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Task storage
        this.tasks = new Collection();
        
        // Running tasks
        this.runningTasks = new Set();
        
        // Task intervals
        this.intervals = {
            check: null,
            persist: null
        };
        
        // Task statistics
        this.stats = {
            scheduled: 0,
            executed: 0,
            failed: 0,
            cancelled: 0,
            byType: new Map(),
            byTag: new Map()
        };
        
        // Last task executions (for debugging)
        this.lastExecutions = [];
        
        // Maximum number of last executions to store
        this.maxLastExecutions = 50;
    }

    /**
     * Initialize the scheduler manager
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Create tasks directory if persisting tasks
        if (this.getConfig('persistTasks')) {
            await this._ensureTasksDirectory();
        }
        
        // Load persisted tasks if persisting tasks
        if (this.getConfig('persistTasks')) {
            await this._loadPersistedTasks();
        }
        
        // Set up check interval
        const checkInterval = this.getConfig('checkInterval');
        if (checkInterval > 0) {
            this.intervals.check = setInterval(() => this._checkTasks(), checkInterval);
        }
        
        // Set up persist interval if persisting tasks
        if (this.getConfig('persistTasks') && this.getConfig('persistInterval') > 0) {
            this.intervals.persist = setInterval(() => this.persistTasks(), this.getConfig('persistInterval'));
        }
        
        this.logger.info(this.name, 'Scheduler manager initialized');
    }

    /**
     * Schedule a task
     * @param {Object} task - The task to schedule
     * @param {string} task.id - The task ID (optional, will be generated if not provided)
     * @param {string} task.name - The task name
     * @param {Function} task.handler - The task handler function
     * @param {Object} task.data - The task data (optional)
     * @param {string[]} task.tags - The task tags (optional)
     * @param {Object} task.schedule - The task schedule
     * @param {string} task.schedule.type - The schedule type ('cron', 'interval', 'date', 'immediate')
     * @param {string} [task.schedule.cron] - The cron expression (for 'cron' type)
     * @param {number} [task.schedule.interval] - The interval in milliseconds (for 'interval' type)
     * @param {Date|number} [task.schedule.date] - The date to execute (for 'date' type)
     * @param {boolean} [task.schedule.runOnInit=false] - Whether to run the task on initialization
     * @param {Object} [options] - Schedule options
     * @param {boolean} [options.persist=false] - Whether to persist the task
     * @returns {string} - The task ID
     */
    scheduleTask(task, options = {}) {
        // Generate task ID if not provided
        const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate task
        if (!task.name) {
            throw new Error('Task name is required');
        }
        
        if (typeof task.handler !== 'function') {
            throw new Error('Task handler must be a function');
        }
        
        if (!task.schedule || !task.schedule.type) {
            throw new Error('Task schedule type is required');
        }
        
        // Validate schedule type
        const validTypes = ['cron', 'interval', 'date', 'immediate'];
        if (!validTypes.includes(task.schedule.type)) {
            throw new Error(`Invalid schedule type: ${task.schedule.type}`);
        }
        
        // Validate schedule parameters
        switch (task.schedule.type) {
            case 'cron':
                if (!task.schedule.cron) {
                    throw new Error('Cron expression is required for cron schedule');
                }
                break;
            case 'interval':
                if (!task.schedule.interval || typeof task.schedule.interval !== 'number') {
                    throw new Error('Interval is required for interval schedule');
                }
                break;
            case 'date':
                if (!task.schedule.date) {
                    throw new Error('Date is required for date schedule');
                }
                break;
        }
        
        // Calculate next execution time
        const nextExecution = this._calculateNextExecution(task.schedule);
        
        // Create task object
        const taskObj = {
            id: taskId,
            name: task.name,
            handler: task.handler,
            data: task.data || {},
            tags: task.tags || [],
            schedule: task.schedule,
            nextExecution,
            lastExecution: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            executionCount: 0,
            failureCount: 0,
            status: 'scheduled',
            persist: options.persist || false
        };
        
        // Add task to collection
        this.tasks.set(taskId, taskObj);
        
        // Update statistics
        this.stats.scheduled++;
        this._updateTypeStats(task.schedule.type, 'scheduled');
        for (const tag of taskObj.tags) {
            this._updateTagStats(tag, 'scheduled');
        }
        
        // Persist task if needed
        if (options.persist && this.getConfig('persistTasks')) {
            this._persistTask(taskId, taskObj).catch(error => {
                this.logger.error(this.name, `Failed to persist task: ${error.message}`);
            });
        }
        
        // Run task immediately if specified
        if (task.schedule.runOnInit) {
            this._executeTask(taskId).catch(error => {
                this.logger.error(this.name, `Failed to execute task ${taskId}: ${error.message}`);
            });
        }
        
        this.logger.debug(this.name, `Scheduled task: ${taskId} (${task.name})`);
        
        return taskId;
    }

    /**
     * Cancel a scheduled task
     * @param {string} taskId - The task ID
     * @returns {boolean} - Whether the task was cancelled
     */
    cancelTask(taskId) {
        // Check if task exists
        if (!this.tasks.has(taskId)) {
            return false;
        }
        
        // Get task
        const task = this.tasks.get(taskId);
        
        // Remove task
        this.tasks.delete(taskId);
        
        // Update statistics
        this.stats.cancelled++;
        this._updateTypeStats(task.schedule.type, 'cancelled');
        for (const tag of task.tags) {
            this._updateTagStats(tag, 'cancelled');
        }
        
        // Delete persisted task if needed
        if (task.persist && this.getConfig('persistTasks')) {
            this._deletePersistedTask(taskId).catch(error => {
                this.logger.error(this.name, `Failed to delete persisted task: ${error.message}`);
            });
        }
        
        this.logger.debug(this.name, `Cancelled task: ${taskId} (${task.name})`);
        
        return true;
    }

    /**
     * Get a scheduled task
     * @param {string} taskId - The task ID
     * @returns {Object|null} - The task or null if not found
     */
    getTask(taskId) {
        return this.tasks.has(taskId) ? { ...this.tasks.get(taskId), handler: '[Function]' } : null;
    }

    /**
     * Get all scheduled tasks
     * @param {Object} [options] - Get options
     * @param {string} [options.type] - Filter by schedule type
     * @param {string} [options.tag] - Filter by tag
     * @param {string} [options.status] - Filter by status
     * @returns {Array} - The tasks
     */
    getAllTasks(options = {}) {
        let tasks = Array.from(this.tasks.values());
        
        // Filter by type
        if (options.type) {
            tasks = tasks.filter(task => task.schedule.type === options.type);
        }
        
        // Filter by tag
        if (options.tag) {
            tasks = tasks.filter(task => task.tags.includes(options.tag));
        }
        
        // Filter by status
        if (options.status) {
            tasks = tasks.filter(task => task.status === options.status);
        }
        
        // Remove handler function from result
        return tasks.map(task => ({ ...task, handler: '[Function]' }));
    }

    /**
     * Execute a task manually
     * @param {string} taskId - The task ID
     * @param {Object} [data] - Additional data to pass to the task
     * @returns {Promise<*>} - The task result
     */
    async executeTask(taskId, data = {}) {
        // Check if task exists
        if (!this.tasks.has(taskId)) {
            throw new Error(`Task not found: ${taskId}`);
        }
        
        // Execute task
        return this._executeTask(taskId, data);
    }

    /**
     * Persist all tasks
     * @returns {Promise<number>} - The number of tasks persisted
     */
    async persistTasks() {
        // Skip if not persisting tasks
        if (!this.getConfig('persistTasks')) {
            return 0;
        }
        
        try {
            // Ensure tasks directory exists
            await this._ensureTasksDirectory();
            
            // Find tasks to persist
            const tasksToPersist = [];
            
            for (const [taskId, task] of this.tasks.entries()) {
                if (task.persist) {
                    tasksToPersist.push({ taskId, task });
                }
            }
            
            // Persist tasks
            for (const { taskId, task } of tasksToPersist) {
                await this._persistTask(taskId, task);
            }
            
            this.logger.debug(this.name, `Persisted ${tasksToPersist.length} tasks`);
            
            return tasksToPersist.length;
        } catch (error) {
            this.logger.error(this.name, `Failed to persist tasks: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get scheduler statistics
     * @returns {Object} - Scheduler statistics
     */
    getStatistics() {
        return {
            tasks: this.tasks.size,
            running: this.runningTasks.size,
            scheduled: this.stats.scheduled,
            executed: this.stats.executed,
            failed: this.stats.failed,
            cancelled: this.stats.cancelled,
            byType: Object.fromEntries(this.stats.byType),
            byTag: Object.fromEntries(this.stats.byTag)
        };
    }

    /**
     * Get last task executions (for debugging)
     * @param {number} [count=10] - The number of executions to get
     * @returns {Array} - The last executions
     */
    getLastExecutions(count = 10) {
        return this.lastExecutions.slice(0, count);
    }

    /**
     * Calculate next execution time
     * @param {Object} schedule - The task schedule
     * @returns {number|null} - The next execution time (timestamp) or null if no more executions
     * @private
     */
    _calculateNextExecution(schedule) {
        const now = Date.now();
        
        switch (schedule.type) {
            case 'cron':
                // For simplicity, we'll use a basic implementation
                // In a real implementation, you would use a cron parser library
                // This is just a placeholder that schedules for the next minute
                return now + 60000;
                
            case 'interval':
                return now + schedule.interval;
                
            case 'date':
                const date = schedule.date instanceof Date ? schedule.date : new Date(schedule.date);
                return date.getTime() > now ? date.getTime() : null;
                
            case 'immediate':
                return now;
                
            default:
                return null;
        }
    }

    /**
     * Check tasks for execution
     * @private
     */
    _checkTasks() {
        const now = Date.now();
        const tasksToExecute = [];
        
        // Find tasks to execute
        for (const [taskId, task] of this.tasks.entries()) {
            if (task.nextExecution && task.nextExecution <= now && task.status === 'scheduled') {
                tasksToExecute.push(taskId);
            }
        }
        
        // Execute tasks
        for (const taskId of tasksToExecute) {
            // Check if we can execute more tasks
            if (this.runningTasks.size >= this.getConfig('maxConcurrentTasks')) {
                break;
            }
            
            // Execute task
            this._executeTask(taskId).catch(error => {
                this.logger.error(this.name, `Failed to execute task ${taskId}: ${error.message}`);
            });
        }
    }

    /**
     * Execute a task
     * @param {string} taskId - The task ID
     * @param {Object} [additionalData={}] - Additional data to pass to the task
     * @returns {Promise<*>} - The task result
     * @private
     */
    async _executeTask(taskId, additionalData = {}) {
        // Check if task exists
        if (!this.tasks.has(taskId)) {
            throw new Error(`Task not found: ${taskId}`);
        }
        
        // Get task
        const task = this.tasks.get(taskId);
        
        // Update task status
        task.status = 'running';
        task.lastExecution = Date.now();
        task.executionCount++;
        
        // Add to running tasks
        this.runningTasks.add(taskId);
        
        // Store execution for debugging
        this._storeExecution(taskId, task);
        
        try {
            // Execute task
            const result = await Promise.resolve(task.handler({
                ...task.data,
                ...additionalData,
                taskId,
                executionCount: task.executionCount,
                scheduledAt: task.nextExecution,
                executedAt: task.lastExecution
            }));
            
            // Update task
            task.status = 'scheduled';
            task.updatedAt = Date.now();
            
            // Calculate next execution
            task.nextExecution = this._calculateNextExecution(task.schedule);
            
            // If no more executions, remove task
            if (task.nextExecution === null) {
                this.tasks.delete(taskId);
                
                // Delete persisted task if needed
                if (task.persist && this.getConfig('persistTasks')) {
                    this._deletePersistedTask(taskId).catch(error => {
                        this.logger.error(this.name, `Failed to delete persisted task: ${error.message}`);
                    });
                }
            } else if (task.persist && this.getConfig('persistTasks')) {
                // Persist task if needed
                this._persistTask(taskId, task).catch(error => {
                    this.logger.error(this.name, `Failed to persist task: ${error.message}`);
                });
            }
            
            // Update statistics
            this.stats.executed++;
            this._updateTypeStats(task.schedule.type, 'executed');
            for (const tag of task.tags) {
                this._updateTagStats(tag, 'executed');
            }
            
            // Remove from running tasks
            this.runningTasks.delete(taskId);
            
            return result;
        } catch (error) {
            // Update task
            task.status = 'scheduled';
            task.failureCount++;
            task.updatedAt = Date.now();
            
            // Calculate next execution
            task.nextExecution = this._calculateNextExecution(task.schedule);
            
            // If no more executions, remove task
            if (task.nextExecution === null) {
                this.tasks.delete(taskId);
                
                // Delete persisted task if needed
                if (task.persist && this.getConfig('persistTasks')) {
                    this._deletePersistedTask(taskId).catch(error => {
                        this.logger.error(this.name, `Failed to delete persisted task: ${error.message}`);
                    });
                }
            } else if (task.persist && this.getConfig('persistTasks')) {
                // Persist task if needed
                this._persistTask(taskId, task).catch(error => {
                    this.logger.error(this.name, `Failed to persist task: ${error.message}`);
                });
            }
            
            // Update statistics
            this.stats.failed++;
            this._updateTypeStats(task.schedule.type, 'failed');
            for (const tag of task.tags) {
                this._updateTagStats(tag, 'failed');
            }
            
            // Remove from running tasks
            this.runningTasks.delete(taskId);
            
            // Forward error to error handler if available
            const errorHandler = this.manager.getModule('error-handler');
            if (errorHandler) {
                errorHandler.handleError(error, {
                    type: 'task',
                    source: 'scheduler-manager',
                    data: {
                        taskId,
                        taskName: task.name
                    }
                }).catch(() => {});
            }
            
            throw error;
        }
    }

    /**
     * Store task execution for debugging
     * @param {string} taskId - The task ID
     * @param {Object} task - The task
     * @private
     */
    _storeExecution(taskId, task) {
        // Add execution to last executions
        this.lastExecutions.unshift({
            taskId,
            taskName: task.name,
            executionCount: task.executionCount,
            scheduledAt: task.nextExecution,
            executedAt: task.lastExecution,
            timestamp: Date.now()
        });
        
        // Limit last executions
        if (this.lastExecutions.length > this.maxLastExecutions) {
            this.lastExecutions.pop();
        }
    }

    /**
     * Update type statistics
     * @param {string} type - The schedule type
     * @param {string} stat - The statistic to update
     * @param {number} [count=1] - The count to add
     * @private
     */
    _updateTypeStats(type, stat, count = 1) {
        if (!this.stats.byType.has(type)) {
            this.stats.byType.set(type, {
                scheduled: 0,
                executed: 0,
                failed: 0,
                cancelled: 0
            });
        }
        
        const typeStats = this.stats.byType.get(type);
        typeStats[stat] += count;
    }

    /**
     * Update tag statistics
     * @param {string} tag - The tag
     * @param {string} stat - The statistic to update
     * @param {number} [count=1] - The count to add
     * @private
     */
    _updateTagStats(tag, stat, count = 1) {
        if (!this.stats.byTag.has(tag)) {
            this.stats.byTag.set(tag, {
                scheduled: 0,
                executed: 0,
                failed: 0,
                cancelled: 0
            });
        }
        
        const tagStats = this.stats.byTag.get(tag);
        tagStats[stat] += count;
    }

    /**
     * Ensure tasks directory exists
     * @returns {Promise<void>}
     * @private
     */
    async _ensureTasksDirectory() {
        const tasksPath = this.getConfig('tasksPath');
        
        try {
            await fs.access(tasksPath);
        } catch (error) {
            await fs.mkdir(tasksPath, { recursive: true });
            this.logger.debug(this.name, `Created tasks directory: ${tasksPath}`);
        }
    }

    /**
     * Load persisted tasks
     * @returns {Promise<void>}
     * @private
     */
    async _loadPersistedTasks() {
        const tasksPath = this.getConfig('tasksPath');
        
        try {
            // Check if tasks directory exists
            try {
                await fs.access(tasksPath);
            } catch (error) {
                return;
            }
            
            // Get task files
            const files = await fs.readdir(tasksPath);
            const taskFiles = files.filter(file => file.endsWith('.json'));
            
            if (taskFiles.length === 0) {
                return;
            }
            
            // Load each task file
            for (const file of taskFiles) {
                try {
                    const filePath = path.join(tasksPath, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const taskData = JSON.parse(data);
                    
                    // Skip tasks with no handler
                    if (!taskData.handlerModule || !taskData.handlerFunction) {
                        this.logger.warn(this.name, `Skipping task ${file} with no handler`);
                        continue;
                    }
                    
                    // Try to load handler module
                    try {
                        const handlerModule = require(taskData.handlerModule);
                        const handler = handlerModule[taskData.handlerFunction];
                        
                        if (typeof handler !== 'function') {
                            this.logger.warn(this.name, `Skipping task ${file} with invalid handler`);
                            continue;
                        }
                        
                        // Create task
                        const task = {
                            ...taskData,
                            handler,
                            persist: true
                        };
                        
                        // Add task to collection
                        this.tasks.set(task.id, task);
                        
                        // Update statistics
                        this.stats.scheduled++;
                        this._updateTypeStats(task.schedule.type, 'scheduled');
                        for (const tag of task.tags) {
                            this._updateTagStats(tag, 'scheduled');
                        }
                    } catch (error) {
                        this.logger.error(this.name, `Failed to load handler for task ${file}: ${error.message}`);
                    }
                } catch (error) {
                    this.logger.error(this.name, `Failed to load task file ${file}: ${error.message}`);
                }
            }
            
            this.logger.info(this.name, `Loaded ${this.tasks.size} persisted tasks`);
        } catch (error) {
            this.logger.error(this.name, `Failed to load persisted tasks: ${error.message}`);
        }
    }

    /**
     * Persist task
     * @param {string} taskId - The task ID
     * @param {Object} task - The task
     * @returns {Promise<void>}
     * @private
     */
    async _persistTask(taskId, task) {
        const tasksPath = this.getConfig('tasksPath');
        const filePath = path.join(tasksPath, `${taskId}.json`);
        
        try {
            // Ensure tasks directory exists
            await this._ensureTasksDirectory();
            
            // Create serializable task data
            const taskData = { ...task };
            
            // Replace handler function with module and function name
            if (typeof task.handler === 'function') {
                // This is a simplified approach - in a real implementation,
                // you would need a more robust way to serialize functions
                taskData.handler = undefined;
                taskData.handlerModule = task.handlerModule || 'unknown';
                taskData.handlerFunction = task.handlerFunction || 'unknown';
            }
            
            // Write task to file
            const data = JSON.stringify(taskData, null, 2);
            await fs.writeFile(filePath, data, 'utf8');
        } catch (error) {
            this.logger.error(this.name, `Failed to persist task: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete persisted task
     * @param {string} taskId - The task ID
     * @returns {Promise<void>}
     * @private
     */
    async _deletePersistedTask(taskId) {
        const tasksPath = this.getConfig('tasksPath');
        const filePath = path.join(tasksPath, `${taskId}.json`);
        
        try {
            // Check if file exists
            try {
                await fs.access(filePath);
            } catch (error) {
                return;
            }
            
            // Delete file
            await fs.unlink(filePath);
        } catch (error) {
            this.logger.error(this.name, `Failed to delete persisted task: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        // Clear intervals
        if (this.intervals.check) {
            clearInterval(this.intervals.check);
            this.intervals.check = null;
        }
        
        if (this.intervals.persist) {
            clearInterval(this.intervals.persist);
            this.intervals.persist = null;
        }
        
        // Persist tasks if needed
        if (this.getConfig('persistTasks')) {
            try {
                await this.persistTasks();
            } catch (error) {
                this.logger.error(this.name, `Failed to persist tasks during cleanup: ${error.message}`);
            }
        }
        
        // Clear tasks
        this.tasks.clear();
        
        // Clear running tasks
        this.runningTasks.clear();
        
        // Reset statistics
        this.stats.scheduled = 0;
        this.stats.executed = 0;
        this.stats.failed = 0;
        this.stats.cancelled = 0;
        this.stats.byType.clear();
        this.stats.byTag.clear();
        
        // Clear last executions
        this.lastExecutions = [];
        
        this.logger.info(this.name, 'Scheduler manager cleaned up');
    }
}

module.exports = SchedulerManager; 