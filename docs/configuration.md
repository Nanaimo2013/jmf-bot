# JMF Bot Configuration System

## Overview

The JMF Bot uses a centralized configuration system that allows for flexible and robust configuration management. This document explains how the configuration system works and how to use it effectively.

## Configuration Structure

The configuration is stored in a single JSON file at `config/config.json`. This file contains sections for each manager in the bot, such as:

```json
{
  "bot": { ... },
  "database": { ... },
  "logging": { ... },
  "api": { ... },
  "monitor": { ... },
  "update": { ... },
  "install": { ... }
}
```

Each section contains configuration specific to that manager.

## Configuration Management

The bot provides several ways to manage configuration:

### 1. Direct File Editing

You can edit the `config/config.json` file directly with a text editor. The bot will load the changes the next time it starts.

### 2. Configuration API

The bot provides a configuration API that allows you to get and set configuration values programmatically:

```javascript
// Get a configuration value
const prefix = bot.getConfig('prefix');

// Set a configuration value
bot.setConfig('prefix', '!');

// Get a nested configuration value
const embedColor = bot.getConfig('embed.color');

// Set a nested configuration value
bot.setConfig('embed.color', '#00AAFF');
```

### 3. Configuration Manager

The bot includes a ConfigManager module that provides more advanced configuration management:

```javascript
const configManager = bot.getModule('config-manager');

// Get a configuration value
const prefix = configManager.get('prefix');

// Set a configuration value
configManager.set('prefix', '!');

// Delete a configuration value
configManager.delete('prefix');

// Reset configuration to defaults
configManager.reset();

// Save configuration to file
await configManager.saveConfig();

// Load configuration from file
await configManager.loadConfig();
```

## Default Configuration

The bot provides default values for all configuration options. If a configuration option is not specified in the configuration file, the default value will be used.

Default values are defined in each manager and module, and are merged with the configuration from the file when the bot starts.

## Environment Variables

The bot supports configuration through environment variables. Environment variables take precedence over configuration from the file.

Environment variables should be prefixed with `JMF_` and use underscores to separate nested properties. For example:

- `JMF_BOT_PREFIX` sets the `bot.prefix` configuration option
- `JMF_DATABASE_ENABLED` sets the `database.enabled` configuration option
- `JMF_API_PORT` sets the `api.port` configuration option

## Configuration Migration

If you're upgrading from an older version of the bot, you can use the configuration migration script to migrate your configuration to the new format:

```bash
node scripts/migrate-config.js
```

This script will:

1. Load all existing configuration files
2. Merge them into a single configuration
3. Create a backup of your existing configuration
4. Save the merged configuration to `config/config.json`

## Best Practices

1. **Use the Configuration API**: Instead of hardcoding values, use the configuration API to get configuration values. This makes your code more flexible and easier to maintain.

2. **Provide Default Values**: When getting configuration values, always provide a default value in case the configuration option is not specified.

3. **Use Nested Properties**: Use nested properties to organize related configuration options. For example, use `embed.color` instead of `embedColor`.

4. **Document Configuration Options**: Document all configuration options in your code, including their purpose, type, and default value.

5. **Validate Configuration**: Validate configuration values to ensure they are valid. For example, ensure that numeric values are within a valid range.

## Troubleshooting

### Configuration Not Saving

If configuration changes are not being saved, check the following:

1. Ensure the bot has write permissions to the configuration file
2. Check if the manager has disabled configuration saving during shutdown
3. Look for error messages in the logs related to configuration saving

### Configuration Not Loading

If configuration is not loading correctly, check the following:

1. Ensure the configuration file exists and is valid JSON
2. Check if the manager is looking for configuration in the correct section
3. Look for error messages in the logs related to configuration loading

### Default Values Not Applied

If default values are not being applied, check the following:

1. Ensure the default values are defined correctly in the manager or module
2. Check if the configuration is being loaded before the default values are defined
3. Look for error messages in the logs related to configuration loading 