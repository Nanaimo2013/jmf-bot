# JMF Hosting Discord Bot Architecture Overview
By JMFHosting

<div align="center">

[![Platform](https://img.shields.io/badge/Platform-Discord-5865F2.svg?style=for-the-badge&logo=discord)](https://discord.com/)
[![Documentation](https://img.shields.io/badge/Documentation-Latest-green.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/docs)
[![Framework](https://img.shields.io/badge/Framework-Discord.js%20v14-blue.svg?style=for-the-badge)](https://discord.js.org/)

</div>

## 🏗️ System Architecture

<table>
<tr>
<td width="50%">

### 📦 Core Components
```
+------------------+
|    User Layer    |
|  Discord Server  |
+------------------+
|  Command Layer   |
|  Slash Commands  |
+------------------+
|  Service Layer   |
|  Business Logic  |
+------------------+
|    Data Layer    |
|  Database & API  |
+------------------+
|  Discord.js API  |
|  Discord Gateway |
+------------------+
```

</td>
<td width="50%">

### 🔑 Key Features
- **Discord.js Integration**
  - Slash command support
  - Button interactions
  - Select menus
  - Modal forms
- **Modular Design**
  - Command categories
  - Event handlers
  - Service modules
  - Utility functions
- **Data Management**
  - MySQL database
  - Caching system
  - API integrations
  - Configuration management

</td>
</tr>
</table>

## 🚀 Bot Initialization Process

<table>
<tr>
<td width="25%">

### Configuration
[![Config](https://img.shields.io/badge/Config-JSON-blue.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- Load environment variables
- Parse config.json
- Set up logging
- Initialize cache

</td>
<td width="25%">

### Client Setup
[![Client](https://img.shields.io/badge/Client-Discord.js-blue.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- Create Discord client
- Register intents
- Set up event handlers
- Initialize collections

</td>
<td width="25%">

### Command Registration
[![Commands](https://img.shields.io/badge/Commands-Slash-green.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- Load command files
- Register command handlers
- Set up permissions
- Deploy to Discord API

</td>
<td width="25%">

### Service Initialization
[![Services](https://img.shields.io/badge/Services-Modular-green.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- Connect to database
- Initialize API clients
- Start scheduled tasks
- Set up event listeners

</td>
</tr>
</table>

## 💾 Data Management

### 🗺️ Database Schema
```
+----------------+       +----------------+       +----------------+
|     Users      |       |    Tickets     |       |   Economy      |
+----------------+       +----------------+       +----------------+
| user_id (PK)   |<----->| ticket_id (PK) |       | user_id (PK)   |
| discord_id     |       | creator_id (FK)|       | balance        |
| username       |       | category       |       | bank           |
| joined_at      |       | status         |       | last_daily     |
| verified       |       | created_at     |       | inventory      |
| roles          |       | closed_at      |       | experience     |
| experience     |       | closed_by      |       | level          |
+----------------+       +----------------+       +----------------+
        |                        |                       |
        |                        |                       |
        v                        v                       v
+----------------+       +----------------+       +----------------+
|   Moderation   |       | TicketMessages |       |  Transactions  |
+----------------+       +----------------+       +----------------+
| case_id (PK)   |       | message_id (PK)|       | tx_id (PK)     |
| user_id (FK)   |       | ticket_id (FK) |       | user_id (FK)   |
| moderator_id   |       | author_id      |       | amount         |
| type           |       | content        |       | type           |
| reason         |       | timestamp      |       | timestamp      |
| timestamp      |       | attachments    |       | description    |
| active         |       |                |       | balance_after  |
+----------------+       +----------------+       +----------------+
```

### 📑 Caching Strategy
[![Caching](https://img.shields.io/badge/Caching-In--Memory-blue.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- In-memory collections for commands and events
- User data caching with TTL
- Server configuration caching
- Pterodactyl API response caching

## 🖥️ Command System

<table>
<tr>
<td width="33%">

### ⌨️ Command Structure
[![Structure](https://img.shields.io/badge/Structure-Modular-yellow.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- Name and description
- Command options
- Permission requirements
- Execution function
- Cooldown settings

</td>
<td width="33%">

### 🖥️ Command Categories
[![Categories](https://img.shields.io/badge/Categories-Organized-yellow.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- Administration
- Moderation
- Economy
- Tickets
- Pterodactyl
- Mining
- Utility

</td>
<td width="33%">

### 💽 Command Handling
[![Handling](https://img.shields.io/badge/Handling-Automated-green.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- Permission checking
- Cooldown enforcement
- Error handling
- Logging
- Response formatting

</td>
</tr>
</table>

## 🛠️ Development Tools

<table>
<tr>
<td width="33%">

### 🏗️ Build System
[![Build](https://img.shields.io/badge/Build-Node.js-green.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- npm scripts
- ESLint configuration
- GitHub Actions
- Docker builds

</td>
<td width="33%">

### 🐛 Debugging
[![Debug](https://img.shields.io/badge/Debug-Winston-blue.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- Winston logging
- Rotating log files
- Error tracking
- Performance monitoring

</td>
<td width="33%">

### 📊 Testing
[![Test](https://img.shields.io/badge/Test-Planned-red.svg)](https://github.com/Nanaimo2013/Jmf-Bot)
- Unit testing framework
- Integration tests
- Mock Discord API
- Test coverage reporting

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

## Future Architecture

### Planned Enhancements
1. **Microservices Architecture**
   - Split bot into multiple services
   - Message queue integration
   - Service discovery
   - Horizontal scaling

2. **Advanced Caching**
   - Redis integration
   - Distributed caching
   - Cache invalidation strategies
   - Performance optimization

3. **API Gateway**
   - Centralized API access
   - Rate limiting
   - Authentication
   - Request logging

## References
- [Discord.js Documentation](https://discord.js.org/)
- [Discord API Documentation](https://discord.com/developers/docs)
- [Pterodactyl API Documentation](https://dashflo.net/docs/api/pterodactyl/v1/) 