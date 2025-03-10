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
[![Version](https://img.shields.io/badge/VERSION-1.0.0-blue.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/releases)
[![Build](https://img.shields.io/badge/BUILD-in_progress-yellow.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/actions)
[![Docker](https://img.shields.io/badge/docker-supported-2496ED.svg?style=for-the-badge&logo=docker)](https://github.com/Nanaimo2013/Jmf-Bot/pkgs/container/jmf-bot)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF.svg?style=for-the-badge&logo=github-actions)](https://github.com/Nanaimo2013/Jmf-Bot/actions)

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
bash install.sh
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
node fix-database.js

# For MySQL
# First, create a database and update .env with your MySQL credentials
# Then run:
mysql -u your_username -p your_database < schema.mysql.sql
```

6. Register commands with Discord:
```bash
# Register commands globally (takes up to an hour to propagate)
npm run deploy:global

# OR register commands for a specific guild (instant)
npm run deploy:guild
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
docker-compose up -d
```

5. View logs:
```bash
docker-compose logs -f
```

### Using Dockerfile

1. Build the Docker image:
```bash
docker build -t jmf-bot .
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

For more detailed instructions, see [DOCKER-USAGE.md](DOCKER-USAGE.md).

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

## 🔧 Troubleshooting

### Database Issues

If you encounter database-related errors, you can use the database fix script:

```bash
# Run the database update script
bash update-database.sh
```

Common database errors and solutions:

1. **Missing columns in tables**:
   - Error: `table account_links has no column named created_at`
   - Solution: Run `node fix-database.js` to add missing columns

2. **Command usage tracking errors**:
   - Error: `table command_usage has no column named command`
   - Solution: Run `node fix-database.js` to fix the command_usage table

3. **Button usage tracking errors**:
   - Error: `table button_usage has no column named button_id`
   - Solution: Run `node fix-database.js` to fix the button_usage table

### Command Registration Issues

If slash commands are not appearing:

1. Make sure your bot has the `applications.commands` scope in the OAuth2 URL
2. Try registering commands for a specific guild first:
   ```bash
   npm run deploy:guild
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
   sudo bash install-service.sh
   ```

3. Use Docker for containerized deployment:
   ```bash
   docker-compose up -d
   ```

## 🔄 Updating

To update the bot to the latest version:

```bash
# Pull the latest changes
git pull

# Install any new dependencies
npm install

# Update the database schema
bash update-database.sh

# Restart the bot
npm start
```

If using Docker:

```bash
# Pull the latest changes
git pull

# Rebuild and restart the container
docker-compose up -d --build
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

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
