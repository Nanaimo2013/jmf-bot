# JMF Bot

<div align="center">

[![Version](https://img.shields.io/badge/Version-1.1.1-blue.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/releases)
[![Architecture](https://img.shields.io/badge/Architecture-Modular-green.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/docs/ARCHITECTURE.md)
[![Discord](https://img.shields.io/discord/123456789?style=for-the-badge&logo=discord)](https://discord.gg/jmf)

</div>

## Overview

JMF Bot is a powerful Discord bot designed for server management, user engagement, and automation. Built with a modern, modular architecture, it provides robust features for server administration, user interaction, and system monitoring.

## Features

- **Server Management**
  - Role management
  - Channel configuration
  - Permission handling
  - Automated moderation

- **User Engagement**
  - Custom commands
  - Interactive responses
  - User tracking
  - Leveling system

- **System Integration**
  - Docker support
  - Database management
  - API integration
  - Monitoring and alerts

## Architecture

JMF Bot uses a manager-based architecture for better modularity and maintainability:

- **Install Manager**: Handles installation and setup
- **Update Manager**: Manages updates and migrations
- **Monitor Manager**: Tracks system health
- **Database Manager**: Handles data operations
- **Docker Manager**: Manages containerization

> **Note**: The previous scripts-based system is deprecated. Please use the new manager-based system for all operations.

For detailed information about the manager system, see [MANAGERS.md](docs/MANAGERS.md).

## Prerequisites

- Node.js 18.x or higher
- Docker (optional, for containerized deployment)
- PostgreSQL 13+ or SQLite 3
- Discord Bot Token

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

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Initialize the Bot**
   ```bash
   npm run manager install all
   ```

5. **Start the Bot**
   ```bash
   npm run manager start
   ```

## Manager Commands

### Installation