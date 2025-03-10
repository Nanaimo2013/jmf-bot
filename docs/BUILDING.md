# JMF Hosting Discord Bot Build System Documentation
By JMFHosting

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-16.9+-blue.svg?style=for-the-badge)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-8.0+-blue.svg?style=for-the-badge)](https://www.npmjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF.svg?style=for-the-badge&logo=github-actions)](https://github.com/Nanaimo2013/Jmf-Bot/actions)

</div>

## 🚀 Quick Start

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

## 📋 Prerequisites

<table>
<tr>
<td width="50%">

### 🛠️ Required Tools
[![Tools](https://img.shields.io/badge/Tools-Required-red.svg)](https://github.com/Nanaimo2013/Jmf-Bot)

- Node.js 16.9.0 or higher
- npm 8.0.0 or higher
- Git 2.0.0 or higher
- MySQL 5.7+ or MongoDB 6.0+
- Discord Bot Token
- Pterodactyl API Key (optional)

</td>
<td width="50%">

### 📥 Installation

#### Windows
```powershell
# Install Node.js and npm
winget install OpenJS.NodeJS.LTS
# or
choco install nodejs-lts

# Install Git
winget install Git.Git
# or
choco install git
```

#### Linux (Debian/Ubuntu)
```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install git
```

</td>
</tr>
</table>

## 📁 Project Structure

<table>
<tr>
<td width="50%">

### 📂 Source Layout
```
src/
├── commands/       # Bot commands
│   ├── admin/      # Admin commands
│   ├── economy/    # Economy commands
│   ├── moderation/ # Moderation commands
│   ├── tickets/    # Ticket commands
│   └── utility/    # Utility commands
├── events/         # Discord event handlers
├── utils/          # Utility functions
├── services/       # Business logic services
│   ├── database.js # Database service
│   ├── logger.js   # Logging service
│   └── pterodactyl.js # Pterodactyl API
├── models/         # Data models
├── deploy-commands.js # Command deployment
└── index.js        # Main entry point
```

</td>
<td width="50%">

### 🎯 Configuration Files
```
.env                # Environment variables
config.json         # Bot configuration
package.json        # Dependencies
.eslintrc.js        # Linting rules
docker-compose.yml  # Docker configuration
Dockerfile          # Docker build
.github/workflows/  # CI/CD pipelines
schema.sql          # Database schema
```

</td>
</tr>
</table>

## 🏗️ Build Process

### 📜 npm Scripts

<table>
<tr>
<td width="50%">

#### Main Scripts
```bash
# Start the bot
npm start

# Development mode with auto-restart
npm run dev

# Deploy slash commands
npm run deploy

# Run database backup
npm run backup

# Add copyright notices
npm run add-copyright
```

</td>
<td width="50%">

#### Development Scripts
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests (when implemented)
npm test

# Build Docker image
docker build -t jmf-bot .

# Run with Docker Compose
docker-compose up -d
```

</td>
</tr>
</table>

## ⚙️ Configuration

<table>
<tr>
<td width="33%">

### 🔧 Environment Variables
```env
# Discord Bot Token
DISCORD_TOKEN=your_token_here

# Pterodactyl API
PTERODACTYL_API_URL=https://panel.example.com
PTERODACTYL_API_KEY=your_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=password
DB_NAME=jmf_bot

# Node Environment
NODE_ENV=production
```

</td>
<td width="33%">

### 🔨 Bot Configuration
```json
{
  "embedColor": "#0099ff",
  "footerText": "JMF Hosting",
  "channels": {
    "logs": "channel_id",
    "joinLeave": "channel_id",
    "moderationLogs": "channel_id"
  },
  "roles": {
    "admin": "role_id",
    "moderator": "role_id",
    "verified": "role_id"
  }
}
```

</td>
<td width="33%">

### 🔗 Dependencies
```json
{
  "dependencies": {
    "discord.js": "^14.14.1",
    "dotenv": "^16.3.1",
    "mysql2": "^3.6.5",
    "node-fetch": "^3.3.2",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "eslint": "^8.55.0"
  }
}
```

</td>
</tr>
</table>

## 🐳 Docker Build Environment

<table>
<tr>
<td width="50%">

### 🏗️ Building with Docker
```bash
# Build Docker image
docker build -t jmf-bot .

# Run container
docker run -d --name jmf-bot \
  -v $(pwd)/config.json:/usr/src/app/config.json \
  -v $(pwd)/logs:/usr/src/app/logs \
  --env-file .env \
  jmf-bot
```

</td>
<td width="50%">

### 📝 Docker Compose
```yaml
version: '3.8'

services:
  jmf-bot:
    image: ghcr.io/nanaimo2013/jmf-bot:latest
    container_name: jmf-discord-bot
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./logs:/usr/src/app/logs
      - ./config.json:/usr/src/app/config.json:ro
    networks:
      - jmf-network
    depends_on:
      - mongo
```

</td>
</tr>
</table>

## 🧪 Testing

<table>
<tr>
<td width="50%">

### 🖥️ Manual Testing
```bash
# Start in development mode
npm run dev

# Test slash commands
/help
/ping
/status

# Test with different permissions
# Test with different user roles
# Test error handling
```

</td>
<td width="50%">

### 🐛 Debugging
```bash
# Enable debug logging
NODE_ENV=development npm run dev

# Check logs
tail -f logs/bot.log

# Check Discord API errors
# Check database connection
# Monitor performance
```

</td>
</tr>
</table>

## ❗ Common Issues

<table>
<tr>
<td width="50%">

### 🚫 Build Errors
1. **Missing Dependencies**
   ```
   Error: Cannot find module 'discord.js'
   ```
   - Run `npm install` to install dependencies
   - Check package.json for correct versions

2. **Environment Variables**
   ```
   Error: Token invalid
   ```
   - Check .env file exists
   - Verify Discord token is valid
   - Ensure environment variables are loaded

3. **Permission Issues**
   ```
   Error: EACCES: permission denied
   ```
   - Check file permissions
   - Run with proper privileges
   - Check directory ownership

</td>
<td width="50%">

### ⚠️ Runtime Issues
1. **Discord API Errors**
   ```
   DiscordAPIError: Missing Access
   ```
   - Check bot permissions
   - Verify token is valid
   - Check intents configuration

2. **Database Connection**
   ```
   Error: Connection refused
   ```
   - Check database credentials
   - Verify database is running
   - Check network connectivity

3. **Command Registration**
   ```
   Error: Unknown application command
   ```
   - Run `npm run deploy` to register commands
   - Check command structure
   - Verify bot has applications.commands scope

</td>
</tr>
</table>

## 🔄 Continuous Integration

<table>
<tr>
<td width="50%">

### 👷 GitHub Actions Workflow
```yaml
name: JMF Bot CI/CD

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js
      uses: actions/setup-node@v4
    - name: Install dependencies
      run: npm ci
    - name: Run linting
      run: npm run lint
```

</td>
<td width="50%">

### 🎯 CI/CD Pipeline
- **Lint**: Check code quality
- **Test**: Run automated tests
- **Build**: Build Docker image
- **Push**: Push to GitHub Packages
- **Deploy**: Deploy to production (optional)
- **Notify**: Send notifications

</td>
</tr>
</table>

---

<div align="center">

**[🏠 Home](../README.md)** •
**[📖 Documentation](README.md)** •
**[🚀 Roadmap](ROADMAP.md)**

Made with ❤️ by JMFHosting

</div> 