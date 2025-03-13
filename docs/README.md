# JMF Bot

<div align="center">

[![Version](https://img.shields.io/badge/Version-1.2.0-blue.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/releases)
[![Architecture](https://img.shields.io/badge/Architecture-Modular-green.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/docs/ARCHITECTURE.md)
[![Discord](https://img.shields.io/discord/123456789?style=for-the-badge&logo=discord)](https://discord.gg/jmf)

</div>

## Overview

JMF Bot is a powerful Discord bot designed for server management, user engagement, and game server integration. Built with a modern, modular architecture, it provides robust features for server administration, user interaction, and system monitoring.

## Features

- **Server Management**
  - Role management
  - Channel configuration
  - Permission handling
  - Automated moderation
  - Member count tracking
  - Verification system

- **User Engagement**
  - Custom commands
  - Interactive responses
  - User tracking
  - Leveling system
  - Economy system
  - Mining game

- **Game Server Integration**
  - Pterodactyl panel integration
  - Server status monitoring
  - Player count tracking
  - Server management commands

- **System Integration**
  - Docker support
  - Database management (SQLite/MySQL)
  - API integration
  - Monitoring and alerts
  - Automated backups

## Architecture

JMF Bot uses a manager-based architecture for better modularity and maintainability:

- **Bot Manager**: Core bot functionality and event handling
- **Config Manager**: Configuration management and validation
- **Database Manager**: Database operations and migrations
- **Monitor Manager**: System health and performance tracking
- **Event Manager**: Event handling and distribution

For detailed information about the manager system, see [MANAGERS.md](MANAGERS.md).

## Prerequisites

- Node.js 14.x or higher
- Docker (optional, for containerized deployment)
- SQLite 3 or MySQL 5.7+
- Discord Bot Token
- Pterodactyl API Key (optional, for game server integration)

## Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Nanaimo2013/Jmf-Bot.git
   cd Jmf-Bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure the Bot**
   ```bash
   cp config/config.json.example config/config.json
   # Edit config.json with your settings
   ```

4. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your tokens and secrets
   ```

5. **Start the Bot**
   ```bash
   npm start
   ```

## Configuration

The bot uses a comprehensive configuration system:

- `config.json`: Main configuration file
- `.env`: Environment variables and secrets
- `config/`: Additional configuration files

See the [configuration documentation](docs/configuration/README.md) for details.

## Features Documentation

- [Verification System](docs/features/verification.md)
- [Economy System](docs/features/economy.md)
- [Mining Game](docs/features/mining.md)
- [Leveling System](docs/features/leveling.md)
- [Ticket System](docs/features/tickets.md)

## Development

- [Development Guide](docs/development/README.md)
- [API Documentation](docs/api/README.md)
- [Deployment Guide](docs/deployment/README.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

Join our [Discord server](https://discord.gg/jmf) for support and updates.