# Bot Manager

The Bot Manager is responsible for managing the Discord bot and its components, including commands, events, and modules.

## Features

- Manages the Discord.js client
- Loads and initializes commands, events, and modules
- Handles bot lifecycle (start, stop, restart)
- Provides status information about the bot

## Directory Structure

```
src/managers/bot/
├── bot.manager.js - Main bot manager class
├── index.js - Exports the bot manager
└── README.md - This file
```

## Usage

### Initialization

```javascript
const { createBotManager } = require('./managers/bot');

// Create and initialize the bot manager
const botManager = await createBotManager(bot);
```

### Starting the Bot

```javascript
// Start the bot
await botManager.start();
```

### Stopping the Bot

```javascript
// Stop the bot
await botManager.stop();
```

### Getting Bot Status

```javascript
// Get bot status
const status = botManager.getStatus();
console.log(status);
```

## Configuration

The bot manager uses the following configuration options from `config/bot/config.json`:

```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "clientId": "YOUR_CLIENT_ID",
  "guildId": "YOUR_GUILD_ID",
  "ownerId": "YOUR_OWNER_ID",
  "adminRoles": ["ADMIN_ROLE_ID"],
  "modRoles": ["MOD_ROLE_ID"],
  "embedColor": "#00AAFF",
  "embedFooter": "JMF Hosting Discord Bot",
  "embedFooterIcon": "URL_TO_FOOTER_ICON",
  "intents": ["GuildPresences", "GuildVoiceStates"],
  "partials": ["GuildMember", "User"],
  "debug": false
}
```

## Events

The bot manager emits the following events:

- `initialized` - Emitted when the bot manager is initialized
- `started` - Emitted when the bot is started
- `stopped` - Emitted when the bot is stopped
- `error` - Emitted when an error occurs

## Dependencies

The bot manager depends on the following components:

- `CommandRegistry` - Manages bot commands
- `EventRegistry` - Manages bot events
- `ModuleRegistry` - Manages bot modules

## License

© 2025 JMFHosting. All Rights Reserved.
Developed by Nanaimo2013 (https://github.com/Nanaimo2013) 