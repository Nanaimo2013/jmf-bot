# JMF Hosting Discord Bot Configuration

This directory contains all configuration files for the JMF Hosting Discord Bot.

## Directory Structure

- `config.json` - Main configuration file
- `database/` - Database configuration
  - `config.json` - Database-specific configuration
- `logger/` - Logger configuration
  - `config.json` - Logger-specific configuration

## Configuration Files

### Main Configuration (`config.json`)

The main configuration file contains settings for the bot, including Discord-specific settings, feature flags, and references to other configuration files.

Example:
```json
{
  "bot": {
    "token": "YOUR_BOT_TOKEN_HERE",
    "clientId": "YOUR_CLIENT_ID_HERE",
    "guildId": "YOUR_GUILD_ID_HERE",
    "prefix": "!",
    "embedColor": "#00AAFF",
    "footerText": "JMF Hosting | Game Server Solutions"
  },
  "database": {
    "type": "sqlite"
  },
  "features": {
    "tickets": true,
    "moderation": true,
    "gameServers": true
  }
}
```

### Database Configuration (`database/config.json`)

This file contains database-specific configuration, including connection details for different database types.

Example:
```json
{
  "type": "sqlite",
  "connections": {
    "sqlite": {
      "driver": "sqlite3",
      "filename": "./data/database.sqlite",
      "useNullAsDefault": true,
      "foreign_key_constraints": true
    },
    "mysql": {
      "driver": "mysql2",
      "host": "localhost",
      "port": 3306,
      "database": "jmf_bot",
      "user": "jmf_bot",
      "password": ""
    }
  },
  "migrations": {
    "directory": "./src/database/migrations",
    "tableName": "migrations"
  }
}
```

### Logger Configuration (`logger/config.json`)

This file contains logger-specific configuration, including log levels, formats, and transports.

Example:
```json
{
  "level": "info",
  "format": "simple",
  "colors": true,
  "timestamp": true,
  "logDirectory": "./logs",
  "categories": {
    "default": {
      "level": "info",
      "format": "detailed",
      "console": true,
      "file": true
    }
  },
  "transports": {
    "console": {
      "enabled": true,
      "level": "debug",
      "format": "colored"
    },
    "file": {
      "enabled": true,
      "level": "debug",
      "format": "json",
      "maxSize": "10m",
      "maxFiles": 10
    }
  }
}
```

## Environment Variables

In addition to these configuration files, the bot also uses environment variables for sensitive information and deployment-specific settings. These are stored in a `.env` file in the root directory.

Example `.env` file:
```
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_guild_id_here
NODE_ENV=production
DB_TYPE=sqlite
```

## Configuration Management

The bot provides several scripts for managing configuration:

- `npm run config:init` - Initialize configuration files
- `npm run config:validate` - Validate configuration files

## Configuration Precedence

The bot uses the following precedence for configuration values:

1. Environment variables (highest priority)
2. Command-line arguments
3. Configuration files
4. Default values (lowest priority)

This means that environment variables will override values in configuration files, and command-line arguments will override environment variables.

## Sensitive Information

Never commit sensitive information (tokens, passwords, etc.) to version control. Use environment variables or configuration files that are excluded from version control (via `.gitignore`) for sensitive information. 