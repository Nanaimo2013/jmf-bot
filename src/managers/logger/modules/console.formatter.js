const chalk = require('chalk');
const winston = require('winston');
const figures = require('figures');

class ConsoleFormatter {
    constructor(manager) {
        this.manager = manager;
        this.name = 'console';
        this.type = 'formatter';

        // Extended color scheme
        this.colors = {
            error: chalk.red,
            warn: chalk.yellow,
            info: chalk.blue,
            debug: chalk.magenta,
            trace: chalk.cyan,
            success: chalk.green,
            timestamp: chalk.gray,
            category: chalk.cyan,
            meta: chalk.gray,
            separator: chalk.gray,
            label: chalk.white
        };

        // Extended symbols
        this.symbols = {
            error: figures.cross,
            warn: figures.warning,
            info: figures.info,
            debug: figures.bullet,
            trace: figures.magnifyingGlass,
            success: figures.tick,
            arrow: figures.arrowRight,
            pointer: figures.pointer,
            line: figures.line,
            ellipsis: figures.ellipsis
        };
    }

    initialize() {
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(this.formatMessage.bind(this))
        );
    }

    formatMessage(info) {
        const {
            timestamp,
            level,
            message,
            category,
            icon,
            duration,
            ...meta
        } = info;

        // Build the log parts
        const parts = [];

        // Timestamp
        parts.push(this.colors.timestamp(this.formatTimestamp(timestamp)));

        // Icon and Level
        const levelIcon = icon || this.manager.defaultIcons[level] || '📝';
        parts.push(`${levelIcon} ${this.formatLevel(level)}`);

        // Category
        if (category) {
            parts.push(this.formatCategory(category));
        }

        // Message
        parts.push(this.formatMessageContent(message, level));

        // Duration (if exists)
        if (duration) {
            parts.push(this.colors.meta(`(${duration}ms)`));
        }

        // Meta information
        if (Object.keys(meta).length > 0) {
            parts.push(this.formatMeta(meta));
        }

        return parts.join(' ');
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toISOString().replace('T', ' ').split('.')[0];
    }

    formatLevel(level) {
        const color = this.colors[level] || this.colors.info;
        return color.bold(`[${level.toUpperCase()}]`);
    }

    formatCategory(category) {
        return this.colors.category(`[${category}]`);
    }

    formatMessageContent(message, level) {
        const color = this.colors[level] || this.colors.info;
        
        // Handle multi-line messages
        if (message.includes('\n')) {
            const lines = message.split('\n');
            const firstLine = color(lines[0]);
            const restLines = lines
                .slice(1)
                .map(line => `${' '.repeat(20)}${this.symbols.line} ${color(line)}`)
                .join('\n');
            return `${firstLine}\n${restLines}`;
        }
        
        return color(message);
    }

    formatMeta(meta) {
        const formatValue = (value) => {
            if (typeof value === 'object' && value !== null) {
                if (value instanceof Error) {
                    return value.stack || value.message;
                }
                return JSON.stringify(value, null, 2);
            }
            return value;
        };

        const metaStrings = Object.entries(meta).map(([key, value]) => {
            const formattedValue = formatValue(value);
            return `${this.colors.label(key)}=${this.colors.meta(formattedValue)}`;
        });

        return this.colors.meta(`(${metaStrings.join(', ')})`);
    }

    // Special formatters for different types of messages
    formatSuccess(message) {
        return `${this.symbols.success} ${this.colors.success(message)}`;
    }

    formatError(message, error) {
        let errorOutput = `${this.symbols.error} ${this.colors.error(message)}`;
        if (error) {
            errorOutput += '\n' + this.colors.error(error.stack || error.message);
        }
        return errorOutput;
    }

    formatWarning(message) {
        return `${this.symbols.warn} ${this.colors.warn(message)}`;
    }

    formatDebug(message) {
        return `${this.symbols.debug} ${this.colors.debug(message)}`;
    }

    formatTrace(message) {
        return `${this.symbols.trace} ${this.colors.trace(message)}`;
    }

    // Utility formatters
    formatList(items, indent = 0) {
        const indentation = ' '.repeat(indent);
        return items
            .map(item => `${indentation}${this.symbols.pointer} ${item}`)
            .join('\n');
    }

    formatSection(title, content, indent = 0) {
        const indentation = ' '.repeat(indent);
        return `${indentation}${this.symbols.arrow} ${this.colors.info.bold(title)}\n${content}`;
    }

    formatProgress(current, total, width = 20) {
        const percentage = Math.round((current / total) * 100);
        const filled = Math.round((width * current) / total);
        const empty = width - filled;

        const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
        return `${bar} ${percentage}%`;
    }
}

module.exports = ConsoleFormatter; 