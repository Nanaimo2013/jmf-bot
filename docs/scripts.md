# JMF Bot Scripts Documentation

This document provides an overview of the scripts available in the JMF Bot project, their purpose, and how to use them.

## Table of Contents

- [Configuration Scripts](#configuration-scripts)
- [Database Scripts](#database-scripts)
- [Development Scripts](#development-scripts)
- [Deployment Scripts](#deployment-scripts)
- [Utility Scripts](#utility-scripts)

## Configuration Scripts

Scripts for managing bot configuration.

### manage-config.js

The main configuration management script that handles configuration validation, updates, and backups.

**Usage:**
```bash
node scripts/manage-config.js <command>
```

**Commands:**
- `validate`: Validate the current configuration
- `update`: Update configuration with new values
- `backup`: Create a backup of the current configuration
- `restore`: Restore configuration from a backup
- `init`: Initialize configuration from example files

**Examples:**
```bash
# Validate configuration
node scripts/manage-config.js validate

# Update specific config value
node scripts/manage-config.js update database.maxConnections 10

# Backup configuration
node scripts/manage-config.js backup

# Restore from backup
node scripts/manage-config.js restore config_backup_20240312.json
```

## Database Scripts

Scripts for managing the database.

### manage-database.js

Handles database operations including migrations, backups, and maintenance.

**Usage:**
```bash
node scripts/manage-database.js <command>
```

**Commands:**
- `migrate`: Run database migrations
- `backup`: Create database backup
- `restore`: Restore from backup
- `validate`: Validate database schema
- `clean`: Clean up old data and optimize

**Examples:**
```bash
# Run migrations
node scripts/manage-database.js migrate

# Create backup
node scripts/manage-database.js backup

# Restore from backup
node scripts/manage-database.js restore backup_20240312.sql

# Validate schema
node scripts/manage-database.js validate
```

### fix-database.js

Fixes common database issues and ensures data integrity.

**Usage:**
```bash
node scripts/fix-database.js [options]
```

**Options:**
- `--check`: Only check for issues without fixing
- `--fix`: Fix found issues
- `--backup`: Create backup before fixing
- `--verbose`: Show detailed output

## Development Scripts

Scripts for development and testing.

### dev-server.js

Runs the bot in development mode with hot reloading.

**Usage:**
```bash
node scripts/dev-server.js [options]
```

**Options:**
- `--watch`: Enable file watching
- `--debug`: Enable debug logging
- `--test-guild`: Use test guild for commands

### test-runner.js

Runs the test suite.

**Usage:**
```bash
node scripts/test-runner.js [options]
```

**Options:**
- `--unit`: Run unit tests
- `--integration`: Run integration tests
- `--coverage`: Generate coverage report
- `--watch`: Watch for changes

## Deployment Scripts

Scripts for deploying the bot.

### deploy.js

Handles bot deployment to production environment.

**Usage:**
```bash
node scripts/deploy.js [options]
```

**Options:**
- `--production`: Deploy to production
- `--staging`: Deploy to staging
- `--backup`: Backup before deployment
- `--no-commands`: Skip command registration

### docker-deploy.js

Handles Docker deployment.

**Usage:**
```bash
node scripts/docker-deploy.js [options]
```

**Options:**
- `--build`: Build Docker image
- `--push`: Push to registry
- `--compose`: Use docker-compose
- `--env <env>`: Specify environment

## Utility Scripts

General utility scripts.

### generate-docs.js

Generates documentation from source code.

**Usage:**
```bash
node scripts/generate-docs.js [options]
```

**Options:**
- `--output`: Output directory
- `--format`: Output format (md/html)
- `--watch`: Watch for changes

### cleanup.js

Cleans up temporary files and old logs.

**Usage:**
```bash
node scripts/cleanup.js [options]
```

**Options:**
- `--logs`: Clean log files
- `--temp`: Clean temp files
- `--backups`: Clean old backups
- `--all`: Clean everything 