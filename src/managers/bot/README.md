# JMF Hosting Discord Bot Manager

## Overview

The Bot Manager is a comprehensive system for creating and managing Discord bots with a modular architecture. It extends the base manager and provides a structured approach to handling commands, events, embeds, and other Discord-specific functionality.

## Features

- **Modular Architecture**: Built on a flexible module system that allows for easy extension and customization
- **Command Management**: Simplified command creation and handling with built-in permission checks and cooldowns
- **Event Handling**: Streamlined event registration and execution
- **Embed Creation**: Consistent embed styling with built-in templates for common use cases
- **Utility Functions**: Common utility functions for Discord bot operations
- **Module Registry**: Central registry for managing and organizing bot modules

## Structure

```
src/managers/bot/
├── index.js                # Main Bot Manager class
├── modules/
│   ├── base.command.js     # Base Command module
│   ├── base.event.js       # Base Event module
│   ├── base.embed.js       # Base Embed module
│   ├── base.utils.js       # Base Utilities module
│   └── module.registry.js  # Module Registry
├── commands/               # Command implementations
├── events/                 # Event implementations
└── README.md               # Documentation
```

## Usage

### Initialization

```javascript
const BotManager = require('./managers/bot');
const LoggerManager = require('./managers/logger');

// Create and initialize the logger
const logger = new LoggerManager();
await logger.initialize();

// Create and initialize the bot manager
const botManager = new BotManager({
    name: 'my-discord-bot',
    configPath: './config/bot.config.json'
});

// Register the logger
botManager.registerManager('logger', logger);

// Initialize the bot manager
await botManager.initialize();

// Start the bot
await botManager.start();
```

### Creating Commands

Create a new file in the `commands` directory:

```javascript
const BaseCommand = require('../managers/bot/modules/base.command');
const { SlashCommandBuilder } = require('discord.js');

class PingCommand extends BaseCommand {
    constructor(manager) {
        super(manager, {
            name: 'ping',
            description: 'Replies with Pong!',
            category: 'utility',
            cooldown: 5
        });
        
        // Add command options if needed
        this.builder
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Optional message to echo back')
                    .setRequired(false)
            );
    }
    
    async run(interaction) {
        const message = interaction.options.getString('message');
        const latency = Math.round(this.manager.client.ws.ping);
        
        await interaction.reply({
            content: `🏓 Pong! (${latency}ms)${message ? `\nMessage: ${message}` : ''}`,
            ephemeral: false
        });
    }
}

module.exports = PingCommand;
```

### Creating Events

Create a new file in the `events` directory:

```javascript
const BaseEvent = require('../managers/bot/modules/base.event');
const { Events } = require('discord.js');

class ReadyEvent extends BaseEvent {
    constructor(manager) {
        super(manager, {
            name: 'ready-handler',
            eventName: Events.ClientReady,
            once: true
        });
    }
    
    async run(client) {
        this.logger.info(this.name, `Logged in as ${client.user.tag}`);
        this.logger.info(this.name, `Serving ${client.guilds.cache.size} guilds`);
    }
}

module.exports = ReadyEvent;
```

### Using Embeds

```javascript
const { EmbedBuilder } = require('discord.js');

// Create a basic embed
const embed = botManager.createEmbed({
    title: 'Hello World',
    description: 'This is a sample embed',
    color: '#00ff00'
});

// Create a success embed
const successEmbed = botManager.embedModule.success(
    'Success!',
    'The operation completed successfully'
);

// Create a paginated embed
const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
const pagination = botManager.embedModule.paginate({
    title: 'Item List',
    items,
    formatter: (item, index) => `${index}. ${item}`,
    itemsPerPage: 2
});

// Get the first page
const firstPageEmbed = pagination.currentEmbed;

// Navigate to next page
const nextPageEmbed = pagination.nextPage();
```

### Deploying Commands

```javascript
// Deploy commands to a specific guild (for testing)
await botManager.deployCommands(true);

// Deploy commands globally
await botManager.deployCommands(false);
```

## Module Registry

The Module Registry provides a central system for managing and organizing bot modules. It handles module registration, initialization, and dependency resolution.

```javascript
// Get the module registry
const registry = botManager.moduleRegistry;

// Get all modules of a specific type
const commandModules = registry.getModulesByType('command');

// Get all modules in a specific category
const utilityModules = registry.getModulesByCategory('utility');

// Get module status
const status = registry.getModuleStatus();
console.log(`Total modules: ${status.total}, Initialized: ${status.initialized}`);
```

## Extending the Bot Manager

### Creating Custom Modules

You can create custom modules by extending the base modules:

```javascript
const BaseModule = require('../managers/base/base.module');

class CustomModule extends BaseModule {
    constructor(manager) {
        super(manager, {
            name: 'custom-module',
            version: '1.0.0',
            description: 'A custom module'
        });
    }
    
    async initialize() {
        await super.initialize();
        this.logger.info(this.name, 'Custom module initialized');
    }
    
    // Add custom methods
    doSomething() {
        // Implementation
    }
}

module.exports = CustomModule;
```

### Registering Custom Modules

```javascript
const CustomModule = require('./custom.module');

// Create and initialize the module
const customModule = new CustomModule(botManager);
await customModule.initialize();

// Register the module with the registry
botManager.moduleRegistry.registerModule(customModule);
```

## Configuration

The Bot Manager uses a configuration file located at the path specified in the constructor options. Here's an example configuration:

```json
{
    "token": "YOUR_DISCORD_BOT_TOKEN",
    "clientId": "YOUR_CLIENT_ID",
    "guildId": "YOUR_GUILD_ID",
    "ownerId": "YOUR_DISCORD_USER_ID",
    "prefix": "!",
    "status": "online",
    "activity": {
        "type": "PLAYING",
        "name": "with Discord.js"
    },
    "intents": [
        "Guilds",
        "GuildMessages",
        "GuildMembers",
        "MessageContent"
    ],
    "partials": [
        "Message",
        "Channel",
        "Reaction"
    ],
    "commandsPath": "./src/commands",
    "eventsPath": "./src/events",
    "cooldowns": {
        "default": 3,
        "commands": {
            "ping": 5
        }
    }
}
```

## Testing

The Bot Manager includes a comprehensive testing system that allows you to test commands, events, and other functionality without connecting to Discord.

See the `src/managers/test/examples/bot.manager.test.js` file for examples of how to test the Bot Manager.

## License

© 2025 JMFHosting. All Rights Reserved.
Developed by Nanaimo2013 (https://github.com/Nanaimo2013) 