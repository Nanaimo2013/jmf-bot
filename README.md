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
[🐳 Docker](#-docker-support)

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

### 💰 Economy & Progression
- **Leveling System**: XP, levels, and rewards
- **Economy System**: Virtual currency and shop
- **Mining Game**: Interactive mining with upgrades

</td>
<td>

### 🛠️ Administration
- **Dashboard Integration**: Web interface
- **Status Monitoring**: Service status display
- **Database Integration**: Persistent data storage

</td>
</tr>
</table>

## 🚀 Getting Started

### Prerequisites

<div align="center">

[![Node.js 16.9+](https://img.shields.io/badge/Node.js-16.9+-brightgreen.svg?style=for-the-badge)](https://nodejs.org/)
[![MySQL 5.7+](https://img.shields.io/badge/MySQL-5.7+-blue.svg?style=for-the-badge)](https://www.mysql.com/)
[![Discord Bot Token](https://img.shields.io/badge/Discord-Bot_Token-5865F2.svg?style=for-the-badge)](https://discord.com/developers/applications)

</div>

### Quick Start

```bash
# Clone repository
git clone https://github.com/Nanaimo2013/Jmf-Bot.git
cd Jmf-Bot

# Install dependencies
npm install

# Configure the bot
cp .env.example .env
cp config.json.example config.json

# Deploy slash commands
npm run deploy

# Start the bot
npm start
```

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Nanaimo2013/Jmf-Bot.git
   cd Jmf-Bot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a configuration file**:
   ```bash
   cp config.json.example config.json
   cp .env.example .env
   ```

4. **Edit the configuration files**:
   - Update the `config.json` file with your bot settings
   - Add your Discord bot token to the `.env` file

5. **Set up the database**:
   - Create a MySQL database
   - Import the `schema.sql` file to create the necessary tables
   - Update the database configuration in `config.json`

6. **Deploy slash commands**:
   ```bash
   npm run deploy
   ```

7. **Start the bot**:
   ```bash
   npm start
   ```

## 🔧 Configuration

The bot is highly configurable through the `config.json` file. You can also use the `/config` command to view and modify settings directly from Discord.

### Key Configuration Sections

- **General**: Bot token, prefix, and basic settings
- **Channels**: Channel IDs and names for various features
- **Roles**: Role names for different permissions
- **Verification**: Settings for the verification system
- **Tickets**: Configuration for the ticket system
- **Leveling**: XP rates, rewards, and level-up messages
- **Economy**: Currency settings, rewards, and shop items
- **Mining**: Mining game worlds, resources, and upgrades
- **Pterodactyl**: Game server panel integration
- **Database**: Database connection settings
- **Logging**: Logging configuration

## 🐳 Docker Support

### Using GitHub Packages

The bot is available as a Docker image from GitHub Packages:

```bash
# Pull the image
docker pull ghcr.io/nanaimo2013/jmf-bot:latest

# Run with environment variables
docker run -d \
  --name jmf-bot \
  -v $(pwd)/config.json:/usr/src/app/config.json \
  -v $(pwd)/logs:/usr/src/app/logs \
  --env-file .env \
  ghcr.io/nanaimo2013/jmf-bot:latest
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Building Locally

```bash
# Build the Docker image
docker build -t jmf-bot .

# Run the container
docker run -d --name jmf-bot \
  -v $(pwd)/config.json:/usr/src/app/config.json \
  -v $(pwd)/logs:/usr/src/app/logs \
  --env-file .env \
  jmf-bot
```

## 🚢 Deployment

### VM Installation

For easy deployment on a VM, we provide an installation script:

```bash
# Download the installer
wget https://raw.githubusercontent.com/Nanaimo2013/Jmf-Bot/main/install.sh

# Make it executable
chmod +x install.sh

# Run the installer
sudo ./install.sh
```

The installer will guide you through the setup process, including:
- Installing dependencies
- Setting up the bot
- Creating a systemd service
- Configuring the bot

## 📚 Documentation

Comprehensive documentation is available in the [docs](docs) directory:

- [📖 Documentation Home](docs/README.md)
- [🚀 Deployment Guide](docs/DEPLOYMENT.md)
- [💻 VM Deployment Guide](docs/VM-DEPLOYMENT.md)
- [🎮 Pterodactyl Integration](docs/PTERODACTYL.md)
- [🔌 API Documentation](docs/API.md)
- [📝 Changelog](CHANGELOG.md)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a pull request.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@jmfhosting.com or join our [Discord server](https://discord.gg/qZBWNjuBzy).

---

<div align="center">

**[Documentation](docs/README.md)** •
**[Report Bug](https://github.com/Nanaimo2013/Jmf-Bot/issues)** •
**[Request Feature](https://github.com/Nanaimo2013/Jmf-Bot/issues)**

<br/>

© 2025 JMFHosting. All Rights Reserved.  
Developed by [Nanaimo2013](https://github.com/Nanaimo2013)

</div> 
