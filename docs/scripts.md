# JMF Bot Scripts Documentation

This document provides an overview of the scripts available in the JMF Bot project, their purpose, and how to use them.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Installation Scripts](#installation-scripts)
- [Update Scripts](#update-scripts)
- [Database Scripts](#database-scripts)
- [Docker Scripts](#docker-scripts)
- [Monitoring Scripts](#monitoring-scripts)
- [Testing Scripts](#testing-scripts)
- [Root Scripts](#root-scripts)

## Directory Structure

The `scripts` directory is organized into the following subdirectories:

```
scripts/
├── install/     # Installation scripts
├── update/      # Update scripts
├── database/    # Database management scripts
├── docker/      # Docker-related scripts
├── monitor/     # Monitoring scripts
├── test/        # Testing scripts
└── ...          # Root level scripts
```

## Installation Scripts

Scripts in the `scripts/install` directory are used for installing and setting up the bot.

### install.sh

The main installation script that sets up the bot environment, installs dependencies, and initializes the database.

**Usage:**
```bash
bash scripts/install/install.sh
```

**Options:**
- `--no-deps`: Skip dependency installation
- `--no-db`: Skip database initialization
- `--no-commands`: Skip command registration
- `--help`: Show help message

### install-service.sh

Installs the bot as a systemd service on Linux systems.

**Usage:**
```bash
sudo bash scripts/install/install-service.sh
```

## Update Scripts

Scripts in the `scripts/update` directory are used for updating the bot.

### updater.sh

The main update script that updates the bot code, dependencies, and database schema.

**Usage:**
```bash
bash scripts/update/updater.sh
```

**Options:**
- `--no-deps`: Skip dependency update
- `--no-db`: Skip database update
- `--no-commands`: Skip command re-registration
- `--help`: Show help message

### update-bot.sh

Updates only the bot code without updating dependencies or database.

**Usage:**
```bash
bash scripts/update/update-bot.sh
```

### update-database.sh

Updates the database schema without updating the bot code or dependencies.

**Usage:**
```bash
bash scripts/update/update-database.sh
```

## Database Scripts

Scripts in the `scripts/database` directory are used for managing the database.

### fix-schema.js

Fixes database schema issues by adding missing columns and creating missing tables.

**Usage:**
```bash
node scripts/database/fix-schema.js
```

### schema-manager.js

Manages database schemas, allowing users to list, apply, and validate schemas for both SQLite and MySQL databases.

**Usage:**
```bash
node scripts/database/schema-manager.js <command> [schema] [dbType]
```

**Commands:**
- `list`: List available schemas
- `apply <schema>`: Apply a schema to the database
- `validate <schema>`: Validate a schema
- `create`: Create a new schema
- `help`: Show help message

**Examples:**
```bash
node scripts/database/schema-manager.js list
node scripts/database/schema-manager.js list mysql
node scripts/database/schema-manager.js apply 01-initial-schema.sqlite.sql
node scripts/database/schema-manager.js validate schema.sqlite.sql
node scripts/database/schema-manager.js create
```

### apply-unified-schema.js

Applies the unified database schema to either SQLite or MySQL database based on the environment configuration.

**Usage:**
```bash
# For SQLite (default)
node scripts/database/apply-unified-schema.js

# For MySQL
DB_TYPE=mysql node scripts/database/apply-unified-schema.js
```

This script:
- Reads the unified schema file from `src/database/schema/unified-schema.sql`
- Applies the schema to the configured database
- Handles database-specific syntax differences automatically
- Creates the database if it doesn't exist (MySQL only)
- Creates the data directory if it doesn't exist (SQLite only)

### migrate-to-unified-schema.js

Migrates an existing database to the unified schema, preserving existing data.

**Usage:**
```bash
# For SQLite (default)
node scripts/database/migrate-to-unified-schema.js

# For MySQL
DB_TYPE=mysql node scripts/database/migrate-to-unified-schema.js
```

This script:
- Backs up the existing database before making changes
- Identifies missing tables and creates them
- Identifies missing columns in existing tables and adds them
- Creates necessary indexes
- Handles database-specific syntax differences automatically
- Preserves all existing data

### fix-account-links.js

Fixes issues with the `account_links` table.

**Usage:**
```bash
node scripts/database/fix-account-links.js
```

### fix-account-links-panel-id.js

Fixes issues with the `panel_id` column in the `account_links` table.

**Usage:**
```bash
node scripts/database/fix-account-links-panel-id.js
```

### fix-market-listings.js

Fixes issues with the `market_listings` table.

**Usage:**
```bash
node scripts/database/fix-market-listings.js
```

### fix-market-purchase.js

Fixes issues with the `market_purchases` table.

**Usage:**
```bash
node scripts/database/fix-market-purchase.js
```

## Docker Scripts

Scripts in the `scripts/docker` directory are used for Docker-related operations.

### Dockerfile

The Dockerfile for building the bot Docker image.

**Usage:**
```bash
docker build -t jmf-bot -f scripts/docker/Dockerfile .
```

### docker-compose.yml

The Docker Compose configuration file for running the bot with Docker Compose.

**Usage:**
```bash
docker-compose -f scripts/docker/docker-compose.yml up -d
```

## Monitoring Scripts

Scripts in the `scripts/monitor` directory are used for monitoring the bot.

### bot-monitor.js

Monitors the bot's status, database health, and other critical components.

**Usage:**
```bash
node scripts/monitor/bot-monitor.js [options]
```

**Options:**
- `--bot`, `-b`: Check bot status (default: enabled)
- `--db`, `-d`: Check database health (default: enabled)
- `--system`, `-s`: Check system health (default: enabled)
- `--discord`, `-c`: Check Discord connection (default: enabled)
- `--fix`, `-f`: Attempt to fix issues
- `--verbose`, `-v`: Show detailed output
- `--json`, `-j`: Output results as JSON
- `--help`, `-h`: Show help message

**Examples:**
```bash
node scripts/monitor/bot-monitor.js
node scripts/monitor/bot-monitor.js --bot --db
node scripts/monitor/bot-monitor.js --fix --verbose
```

### check-bot.sh

A shell script that checks if the bot is running and restarts it if necessary.

**Usage:**
```bash
bash scripts/monitor/check-bot.sh
```

## Testing Scripts

Scripts in the `scripts/test` directory are used for testing the bot.

### test-commands.js

Tests the bot's commands by simulating command interactions.

**Usage:**
```bash
node scripts/test/test-commands.js [command]
```

## Root Scripts

Scripts in the root of the `scripts` directory are general-purpose scripts.

### start.sh

Starts the bot with proper environment setup.

**Usage:**
```bash
bash scripts/start.sh
```

### register-commands.js

Registers slash commands with Discord's API.

**Usage:**
```bash
node scripts/register-commands.js [options]
```

**Options:**
- `--global`, `-g`: Register commands globally
- `--guild`, `-s`: Register commands for a specific guild
- `--all`, `-a`: Register commands both globally and for the guild
- `--guild-id=ID`: Specify a guild ID (overrides .env)
- `--force`, `-f`: Force registration even if no changes are detected
- `--verbose`, `-v`: Show detailed logging
- `--help`, `-h`: Show help message

**Examples:**
```bash
node scripts/register-commands.js --global
node scripts/register-commands.js --guild
node scripts/register-commands.js --guild --guild-id=123456789012345678
node scripts/register-commands.js --all --verbose
```

## Using Scripts in package.json

Many of these scripts are available as npm scripts in the `package.json` file. You can run them using `npm run <script-name>`.

**Examples:**
```bash
npm run start
npm run deploy:global
npm run deploy:guild
npm run db:fix
npm run db:update
npm run docker:build
npm run docker:start
```

For a complete list of available npm scripts, check the `scripts` section in the `package.json` file. 