/**
 * JMF Hosting Discord Bot - Error Handler Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides centralized error handling, logging, and reporting
 * for the bot, including Discord API errors, command errors, and more.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { EmbedBuilder, Colors, DiscordAPIError, HTTPError } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;

class ErrorHandler extends BaseModule {
    /**
     * Create a new error handler
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Error handler options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'error-handler',
            version: options.version || '1.0.0',
            description: 'Error handler for the bot',
            defaultConfig: {
                logErrors: true,
                reportErrors: true,
                errorChannelId: '',
                errorLogPath: path.join(process.cwd(), 'logs', 'errors'),
                maxErrorsPerMinute: 10,
                ignoredErrors: [
                    'Unknown interaction',
                    'Unknown Message',
                    'Missing Permissions',
                    'Missing Access'
                ],
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Error tracking
        this.errors = [];
        this.errorCount = 0;
        this.lastErrorReset = Date.now();
        
        // Error types
        this.errorTypes = {
            COMMAND: 'command',
            EVENT: 'event',
            API: 'api',
            DATABASE: 'database',
            INTERNAL: 'internal',
            UNKNOWN: 'unknown'
        };
        
        // Error handlers
        this.errorHandlers = new Map();
        
        // Register default error handlers
        this._registerDefaultHandlers();
    }

    /**
     * Initialize the error handler
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Create error log directory if it doesn't exist
        const errorLogPath = this.getConfig('errorLogPath');
        try {
            await fs.access(errorLogPath);
        } catch (error) {
            await fs.mkdir(errorLogPath, { recursive: true });
        }
        
        // Set up error reset interval
        setInterval(() => this._resetErrorCount(), 60000);
        
        // Register process error handlers
        this._registerProcessHandlers();
        
        this.logger.info(this.name, 'Error handler initialized');
    }

    /**
     * Handle an error
     * @param {Error} error - The error to handle
     * @param {Object} [context] - Error context
     * @param {string} [context.type] - Error type
     * @param {string} [context.source] - Error source
     * @param {Object} [context.data] - Additional error data
     * @returns {Promise<void>}
     */
    async handleError(error, context = {}) {
        // Check error rate limit
        if (this._checkRateLimit()) {
            return;
        }
        
        // Determine error type
        const type = context.type || this._determineErrorType(error);
        
        // Check if error should be ignored
        if (this._shouldIgnoreError(error)) {
            this.logger.debug(this.name, `Ignored error: ${error.message}`);
            return;
        }
        
        // Track error
        this._trackError(error, type, context);
        
        // Log error
        if (this.getConfig('logErrors')) {
            this._logError(error, type, context);
        }
        
        // Report error
        if (this.getConfig('reportErrors')) {
            await this._reportError(error, type, context);
        }
        
        // Call specific error handler if available
        const handler = this.errorHandlers.get(type);
        if (handler) {
            try {
                await handler(error, context);
            } catch (handlerError) {
                this.logger.error(this.name, `Error in error handler for ${type}: ${handlerError.message}`);
            }
        }
        
        // Emit error event
        this.emit('error', {
            error,
            type,
            source: context.source || 'unknown',
            data: context.data || {}
        });
    }

    /**
     * Register an error handler
     * @param {string} type - Error type
     * @param {Function} handler - Error handler function
     * @returns {ErrorHandler} - The error handler instance for chaining
     */
    registerHandler(type, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        
        this.errorHandlers.set(type, handler);
        this.logger.debug(this.name, `Registered error handler for ${type}`);
        
        return this;
    }

    /**
     * Unregister an error handler
     * @param {string} type - Error type
     * @returns {boolean} - Whether the handler was unregistered
     */
    unregisterHandler(type) {
        const result = this.errorHandlers.delete(type);
        
        if (result) {
            this.logger.debug(this.name, `Unregistered error handler for ${type}`);
        }
        
        return result;
    }

    /**
     * Get error statistics
     * @returns {Object} - Error statistics
     */
    getStatistics() {
        const stats = {
            total: this.errors.length,
            byType: {},
            bySource: {},
            recent: this.errors.slice(-10).map(e => ({
                message: e.error.message,
                type: e.type,
                source: e.source,
                timestamp: e.timestamp
            }))
        };
        
        // Count errors by type
        for (const error of this.errors) {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            stats.bySource[error.source] = (stats.bySource[error.source] || 0) + 1;
        }
        
        return stats;
    }

    /**
     * Create an error embed
     * @param {Error} error - The error
     * @param {string} type - Error type
     * @param {Object} context - Error context
     * @returns {EmbedBuilder} - The error embed
     * @private
     */
    _createErrorEmbed(error, type, context) {
        const embed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle(`Error: ${type}`)
            .setDescription(`\`\`\`\n${error.message}\n\`\`\``)
            .addFields(
                { name: 'Type', value: type, inline: true },
                { name: 'Source', value: context.source || 'unknown', inline: true },
                { name: 'Timestamp', value: new Date().toISOString(), inline: true }
            )
            .setTimestamp();
            
        // Add stack trace if available
        if (error.stack) {
            const stackTrace = error.stack.split('\n').slice(0, 5).join('\n');
            embed.addFields({ name: 'Stack Trace', value: `\`\`\`\n${stackTrace}\n\`\`\`` });
        }
        
        // Add additional data if available
        if (context.data) {
            const dataString = JSON.stringify(context.data, null, 2);
            if (dataString.length <= 1024) {
                embed.addFields({ name: 'Additional Data', value: `\`\`\`json\n${dataString}\n\`\`\`` });
            }
        }
        
        return embed;
    }

    /**
     * Determine error type
     * @param {Error} error - The error
     * @returns {string} - Error type
     * @private
     */
    _determineErrorType(error) {
        if (error instanceof DiscordAPIError || error instanceof HTTPError) {
            return this.errorTypes.API;
        }
        
        if (error.name === 'SequelizeError' || error.name === 'MongoError' || error.message.includes('database')) {
            return this.errorTypes.DATABASE;
        }
        
        if (error.name === 'CommandError' || error.message.includes('command')) {
            return this.errorTypes.COMMAND;
        }
        
        if (error.name === 'EventError' || error.message.includes('event')) {
            return this.errorTypes.EVENT;
        }
        
        return this.errorTypes.UNKNOWN;
    }

    /**
     * Check if error should be ignored
     * @param {Error} error - The error
     * @returns {boolean} - Whether the error should be ignored
     * @private
     */
    _shouldIgnoreError(error) {
        const ignoredErrors = this.getConfig('ignoredErrors');
        
        for (const ignoredError of ignoredErrors) {
            if (error.message.includes(ignoredError)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Track error
     * @param {Error} error - The error
     * @param {string} type - Error type
     * @param {Object} context - Error context
     * @private
     */
    _trackError(error, type, context) {
        this.errors.push({
            error,
            type,
            source: context.source || 'unknown',
            data: context.data || {},
            timestamp: Date.now()
        });
        
        // Limit error history
        if (this.errors.length > 100) {
            this.errors.shift();
        }
        
        // Increment error count
        this.errorCount++;
    }

    /**
     * Log error
     * @param {Error} error - The error
     * @param {string} type - Error type
     * @param {Object} context - Error context
     * @private
     */
    _logError(error, type, context) {
        // Log to console
        this.logger.error(this.name, `[${type}] ${error.message}`);
        
        // Log to file
        this._logErrorToFile(error, type, context).catch(fileError => {
            this.logger.error(this.name, `Failed to log error to file: ${fileError.message}`);
        });
    }

    /**
     * Log error to file
     * @param {Error} error - The error
     * @param {string} type - Error type
     * @param {Object} context - Error context
     * @returns {Promise<void>}
     * @private
     */
    async _logErrorToFile(error, type, context) {
        const errorLogPath = this.getConfig('errorLogPath');
        const date = new Date();
        const fileName = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
        const filePath = path.join(errorLogPath, fileName);
        
        const logEntry = {
            timestamp: date.toISOString(),
            type,
            source: context.source || 'unknown',
            message: error.message,
            stack: error.stack,
            data: context.data || {}
        };
        
        const logString = JSON.stringify(logEntry) + '\n';
        
        await fs.appendFile(filePath, logString, 'utf8');
    }

    /**
     * Report error
     * @param {Error} error - The error
     * @param {string} type - Error type
     * @param {Object} context - Error context
     * @returns {Promise<void>}
     * @private
     */
    async _reportError(error, type, context) {
        const errorChannelId = this.getConfig('errorChannelId');
        
        if (!errorChannelId || !this.manager.client) {
            return;
        }
        
        try {
            const channel = await this.manager.client.channels.fetch(errorChannelId);
            
            if (!channel) {
                return;
            }
            
            const embed = this._createErrorEmbed(error, type, context);
            
            await channel.send({ embeds: [embed] });
        } catch (reportError) {
            this.logger.error(this.name, `Failed to report error: ${reportError.message}`);
        }
    }

    /**
     * Check error rate limit
     * @returns {boolean} - Whether the rate limit was exceeded
     * @private
     */
    _checkRateLimit() {
        const maxErrorsPerMinute = this.getConfig('maxErrorsPerMinute');
        
        return this.errorCount >= maxErrorsPerMinute;
    }

    /**
     * Reset error count
     * @private
     */
    _resetErrorCount() {
        this.errorCount = 0;
        this.lastErrorReset = Date.now();
    }

    /**
     * Register default error handlers
     * @private
     */
    _registerDefaultHandlers() {
        // Command error handler
        this.registerHandler(this.errorTypes.COMMAND, async (error, context) => {
            if (context.data && context.data.interaction) {
                const interaction = context.data.interaction;
                
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
                    this.logger.error(this.name, `Error replying to command: ${replyError.message}`);
                }
            }
        });
        
        // API error handler
        this.registerHandler(this.errorTypes.API, async (error) => {
            if (error instanceof DiscordAPIError) {
                // Handle specific API errors
                if (error.code === 10008) {
                    // Unknown message
                    this.logger.debug(this.name, 'Ignoring unknown message error');
                } else if (error.code === 50013) {
                    // Missing permissions
                    this.logger.warn(this.name, `Missing permissions: ${error.message}`);
                }
            }
        });
    }

    /**
     * Register process error handlers
     * @private
     */
    _registerProcessHandlers() {
        // Unhandled promise rejections
        process.on('unhandledRejection', (reason) => {
            this.handleError(
                reason instanceof Error ? reason : new Error(String(reason)),
                { type: this.errorTypes.INTERNAL, source: 'unhandledRejection' }
            );
        });
        
        // Uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.handleError(
                error,
                { type: this.errorTypes.INTERNAL, source: 'uncaughtException' }
            );
        });
    }
}

module.exports = ErrorHandler; 