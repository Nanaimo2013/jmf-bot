# JMF Hosting Discord Bot

<div align="center">

### A custom Discord bot for the JMF Hosting server

<pre>
      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗
      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   
 ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   
 ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   
  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   
</pre>

<br/>

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg?style=for-the-badge)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D16.9.0-brightgreen.svg?style=for-the-badge)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/mysql-v8-orange.svg?style=for-the-badge)](https://www.mysql.com/)
[![SQLite](https://img.shields.io/badge/sqlite-v3-blue.svg?style=for-the-badge)](https://www.sqlite.org/)
[![Version](https://img.shields.io/badge/VERSION-1.0.0-blue.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/releases)
[![Docker](https://img.shields.io/badge/docker-supported-2496ED.svg?style=for-the-badge&logo=docker)](https://github.com/Nanaimo2013/Jmf-Bot/pkgs/container/jmf-bot)

<br/>

[📖 Documentation](docs/README.md) •
[🚀 Getting Started](#-getting-started) •
[💡 Features](#-features) •
[🐳 Docker](#-docker-support) •
[🔧 Troubleshooting](#-troubleshooting)

</div>

<br/>

## ✨ Features

<table>
<tr>
<td>

### 🔐 User Management
- **User Verification**: Secure server access
- **Support Tickets**: Streamlined ticket management
- **Moderation Tools**: Comprehensive moderation commands

</td>
<td>

### 🎮 Game Integration
- **Pterodactyl Panel**: Game server management
- **Server Status**: Real-time server monitoring
- **Server Control**: Start, stop, and restart servers

</td>
</tr>
<tr>
<td>

### 💰 Economy System
- **Mining**: Mine for resources and earn coins
- **Leveling**: Earn XP and level up
- **Leaderboards**: Compete with other users

</td>
<td>

### 🛠️ Administration
- **Custom Commands**: Create custom commands
- **Welcome Messages**: Customize welcome messages
- **Auto Roles**: Automatically assign roles

</td>
</tr>
</table>

### 🔌 Integrations
- **Pterodactyl Panel**: Game server management
- **Server Status**: Real-time server monitoring
- **Server Control**: Start, stop, and restart servers
- **API Integration**: Comprehensive REST API with Pterodactyl support

## 📂 Project Structure

The project is organized into the following directories:

```
jmf-bot/
├── docs/                # Documentation
│   ├── api/             # API documentation
│   ├── configuration/   # Configuration guides
│   ├── deployment/      # Deployment guides
│   ├── development/     # Development guides
│   ├── installation/    # Installation guides
│   └── troubleshooting/ # Troubleshooting guides
├── scripts/             # Scripts for installation, updates, etc.
│   ├── database/        # Database management scripts
│   ├── docker/          # Docker-related scripts
│   ├── install/         # Installation scripts
│   ├── monitor/         # Monitoring scripts
│   ├── test/            # Testing scripts
│   └── update/          # Update scripts
├── src/                 # Source code
│   ├── commands/        # Bot commands
│   ├── database/        # Database utilities and schemas
│   ├── embeds/          # Embed templates
│   ├── events/          # Event handlers
│   ├── modules/         # Feature modules
│   └── utils/           # Utility functions
└── data/                # Data storage (created at runtime)
```

For more information about the scripts, see [Scripts Documentation](docs/scripts.md).

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.9.0 or higher)
- [npm](https://www.npmjs.com/) (v7 or higher)
- [Git](https://git-scm.com/) (optional, for version control)
- [MySQL](https://www.mysql.com/) (optional, SQLite is used by default)

### Installation

#### Quick Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/Nanaimo2013/Jmf-Bot.git
cd Jmf-Bot

# Run the installer script
bash scripts/install/install.sh
```

The installer will guide you through the setup process, including:
- Setting up environment variables
- Installing dependencies
- Initializing the database
- Registering commands with Discord
- Setting up systemd service (Linux only)
- Configuring Docker (optional)

#### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/Nanaimo2013/Jmf-Bot.git
cd Jmf-Bot
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your Discord bot token and other settings.

5. Initialize the database:
```bash
# For SQLite (default)
node scripts/database/fix-schema.js

# For MySQL
# First, create a database and update .env with your MySQL credentials
# Then run:
node scripts/database/schema-manager.js apply 01-initial-schema.mysql.sql
```

6. Register commands with Discord:
```bash
# Register commands globally (takes up to an hour to propagate)
npm run register:global

# OR register commands for a specific guild (instant)
npm run register:guild
```

7. Start the bot:
```bash
npm start
```

## 🐳 Docker Support

JMF Bot can be run in a Docker container for easier deployment and management.

### Using Docker Compose (Recommended)

1. Make sure you have Docker and Docker Compose installed.

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Edit the `.env` file with your Discord bot token and other settings.

4. Start the bot with Docker Compose:
```bash
npm run docker:start
```

5. View logs:
```bash
npm run docker:logs
```

### Using Dockerfile

1. Build the Docker image:
```bash
npm run docker:build
```

2. Run the container:
```bash
docker run -d \
  --name jmf-bot \
  -v $(pwd)/.env:/usr/src/app/.env \
  -v $(pwd)/config.json:/usr/src/app/config.json \
  -v $(pwd)/data:/usr/src/app/data \
  -v $(pwd)/logs:/usr/src/app/logs \
  jmf-bot
```

For more detailed instructions, see [Docker Usage](docs/deployment/DOCKER-USAGE.md).

## 📝 Configuration

### Environment Variables

The bot uses environment variables for sensitive configuration. Copy `.env.example` to `.env` and update the values:

```
# Discord Bot Token (Required)
DISCORD_TOKEN=your_discord_bot_token

# Database Configuration
DB_TYPE=sqlite  # or mysql
DB_PATH=./data/database.sqlite  # for SQLite

# MySQL Configuration (if using MySQL)
# DB_HOST=localhost
# DB_PORT=3306
# DB_DATABASE=jmf_bot
# DB_USERNAME=jmf_bot
# DB_PASSWORD=your_secure_password_here

# Other settings
NODE_ENV=production  # or development
LOG_LEVEL=info  # debug, info, warn, error
```

### Bot Configuration

The `config.json` file contains all the bot's feature configurations. Copy `config.json.example` to `config.json` and customize as needed.

Key configuration sections:
- `botName`: The name of your bot
- `embedColor`: Default color for embeds
- `prefix`: Legacy command prefix (slash commands are recommended)
- `levelSystem`: XP and leveling settings
- `economySystem`: Currency and economy settings
- `welcomeSystem`: Welcome message settings
- `ticketSystem`: Support ticket settings
- `moderationSystem`: Moderation settings

## 🗄️ Database Schema

The bot uses a unified database schema that works with both SQLite and MySQL. The schema includes tables for:

- User management and tracking
- Command usage and error logging
- Ticket system
- Economy system
- Mining game
- Leveling system
- Moderation actions
- Server settings

You can apply the unified schema using the provided script:

```bash
# For SQLite (default)
node scripts/database/apply-unified-schema.js

# For MySQL (set DB_TYPE=mysql in .env)
DB_TYPE=mysql node scripts/database/apply-unified-schema.js
```

If you're upgrading from a previous version, you can migrate your existing database to the unified schema:

```bash
# For SQLite (default)
node scripts/database/migrate-to-unified-schema.js

# For MySQL (set DB_TYPE=mysql in .env)
DB_TYPE=mysql node scripts/database/migrate-to-unified-schema.js
```

## 🔧 Troubleshooting

### Database Issues

If you encounter database-related errors, you can use the database fix script:

```bash
# Run the database update script
npm run db:fix
```

Common database errors and solutions:

1. **Missing columns in tables**:
   - Error: `table account_links has no column named created_at`
   - Solution: Run `node scripts/database/fix-schema.js` to add missing columns

2. **Command usage tracking errors**:
   - Error: `table command_usage has no column named command`
   - Solution: Run `node scripts/database/fix-schema.js` to fix the command_usage table

3. **Button usage tracking errors**:
   - Error: `table button_usage has no column named button_id`
   - Solution: Run `node scripts/database/fix-schema.js` to fix the button_usage table

### Command Registration Issues

If slash commands are not appearing:

1. Make sure your bot has the `applications.commands` scope in the OAuth2 URL
2. Try registering commands for a specific guild first:
   ```bash
   npm run register:guild
   ```
3. Check the bot's permissions in the Discord server

### Hosting Issues

If you're having trouble with the bot staying online:

1. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name jmf-bot
   ```

2. Set up the systemd service (Linux only):
   ```bash
   sudo bash scripts/install/install-service.sh
   ```

3. Use Docker for containerized deployment:
   ```bash
   npm run docker:start
   ```

## 🔄 Updating

To update the bot to the latest version:

```bash
# Pull the latest changes
git pull

# Install any new dependencies
npm install

# Update the database schema
npm run db:update

# Restart the bot
npm start
```

If using Docker:

```bash
# Pull the latest changes
git pull

# Rebuild and restart the container
npm run docker:start
```

## 🤝 Contributing

Contributions are welcome! Please see [Contributing Guide](CONTRIBUTING.md) for guidelines.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

Join our Discord server for support and updates:

[Join JMF Hosting Discord](https://discord.gg/jmfhosting)

## 🙏 Acknowledgements

- [Discord.js](https://discord.js.org/) for the amazing library
- [Node.js](https://nodejs.org/) for the runtime environment
- All contributors who have helped improve this bot

---

<div align="center">

**[Documentation](docs/README.md)** •
**[Report Bug](https://github.com/Nanaimo2013/Jmf-Bot/issues)** •
**[Request Feature](https://github.com/Nanaimo2013/Jmf-Bot/issues)**

<br/>

© 2025 JMFHosting. All Rights Reserved.  
Developed by [Nanaimo2013](https://github.com/Nanaimo2013)

</div> 
