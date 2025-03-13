# Manager System Documentation

<div align="center">

[![Version](https://img.shields.io/badge/Version-1.2.0-blue.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/releases)
[![Architecture](https://img.shields.io/badge/Architecture-Modular-green.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/docs/ARCHITECTURE.md)

</div>

## Overview

The JMF Bot uses a modular manager-based architecture to organize and handle different aspects of the bot's functionality. This system provides a clean separation of concerns, making the codebase more maintainable and extensible.

## Core Concepts

### Base Manager

The `BaseManager` class serves as the foundation for all managers, providing:
- Event handling and emission
- Logging capabilities
- Configuration management
- State management
- Error handling
- Module loading
- Permission management

### Manager Types

1. **Bot Manager** (`src/managers/bot/`)
   - Core bot functionality
   - Event handling
   - Command management
   - Module coordination
   - Client state management

2. **Config Manager** (`src/managers/bot/modules/config.manager.js`)
   - Configuration loading and validation
   - Environment variable management
   - Dynamic config updates
   - Config file management
   - Default config handling

3. **Monitor Manager** (`src/managers/monitor/`)
   - System health monitoring
   - Performance tracking
   - Resource usage monitoring
   - Alert management
   - Status reporting

4. **Database Manager** (`src/managers/database/`)
   - Database connections
   - Query execution
   - Migration management
   - Backup handling
   - Data validation

5. **Event Manager** (`src/managers/bot/modules/event.bus.js`)
   - Event distribution
   - Event filtering
   - Namespace management
   - Handler registration
   - Event statistics

## Directory Structure

```
src/managers/
├── base/
│   ├── base.manager.js    # Base manager class
│   └── base.module.js     # Base module class
├── bot/
│   ├── index.js           # Bot manager
│   ├── bot.manager.js     # Bot manager implementation
│   └── modules/
│       ├── base.module.js # Bot base module
│       ├── config.manager.js # Configuration manager
│       ├── event.bus.js   # Event bus module
│       └── command.manager.js # Command manager
├── monitor/
│   ├── index.js           # Monitor manager
│   └── modules/
│       ├── system.js      # System monitoring
│       ├── performance.js # Performance tracking
│       └── alerts.js      # Alert management
├── database/
│   ├── index.js           # Database manager
│   └── modules/
│       ├── migrations.js  # Migration handling
│       ├── backup.js      # Backup management
│       └── queries.js     # Query execution
└── events/
    ├── index.js           # Event manager
    └── modules/
        ├── handlers.js    # Event handlers
        └── filters.js     # Event filters
```

## Implementation Patterns

### Event-Based Communication

Managers use an event bus for communication:

```javascript
// Publishing events
await this.publishEvent('userJoined', {
    userId: user.id,
    guildId: guild.id,
    timestamp: Date.now()
});

// Subscribing to events
await this.subscribeToEvent('userJoined', async (data) => {
    await this.handleNewUser(data);
});
```

### Configuration Management

Managers use a centralized configuration system:

```javascript
// Loading configuration
const config = this.getConfig();
const dbConfig = config.database;

// Validating configuration
if (!this.validateConfig(config)) {
    throw new Error('Invalid configuration');
}

// Updating configuration
await this.updateConfig({
    database: {
        ...dbConfig,
        maxConnections: 10
    }
});
```

### Error Handling

Standardized error handling across managers:

```javascript
try {
    await this.performOperation();
} catch (error) {
    this.log('error', `Operation failed: ${error.message}`, {
        error: error,
        context: this.context,
        module: this.name
    });
    await this.handleError(error);
}
```

## Manager Lifecycle

1. **Initialization**
   ```javascript
   async init() {
       await this.loadConfig();
       await this.validateEnvironment();
       await this.setupEventHandlers();
       await this.initializeModules();
   }
   ```

2. **Operation**
   ```javascript
   async start() {
       await this.connect();
       await this.registerHandlers();
       await this.startModules();
       this.emit('ready');
   }
   ```

3. **Cleanup**
   ```javascript
   async shutdown() {
       await this.stopModules();
       await this.unregisterHandlers();
       await this.disconnect();
       this.emit('shutdown');
   }
   ```

## Usage Examples

### Bot Manager

```javascript
const manager = new BotManager();

// Initialize and start the bot
await manager.init();
await manager.start();

// Register commands
await manager.commands.registerAll();

// Handle events
manager.on('ready', () => {
    console.log('Bot is ready!');
});
```

### Config Manager

```javascript
const configManager = new ConfigManager();

// Load configuration
await configManager.load();

// Get specific config
const dbConfig = configManager.get('database');

// Update config
await configManager.update('database.maxConnections', 20);

// Save changes
await configManager.save();
```

### Monitor Manager

```javascript
const monitor = new MonitorManager();

// Start monitoring
await monitor.start({
    interval: 60000,
    metrics: ['cpu', 'memory', 'disk']
});

// Get status
const status = await monitor.getStatus();

// Set up alerts
monitor.on('alert', async (alert) => {
    await handleAlert(alert);
});
```

## Development Guidelines

### Creating a New Manager

1. Create the manager structure:
   ```bash
   mkdir -p src/managers/new-manager/modules
   ```

2. Create the base files:
   ```bash
   touch src/managers/new-manager/index.js
   touch src/managers/new-manager/modules/base.module.js
   ```

3. Implement the manager:
   ```javascript
   const { BaseManager } = require('../base/base.manager');

   class NewManager extends BaseManager {
       constructor(options = {}) {
           super('NewManager', options);
           this.setupModules();
       }

       async init() {
           await this.loadConfig();
           await this.initializeModules();
       }
   }
   ```

### Testing

Managers should be thoroughly tested:

```javascript
describe('NewManager', () => {
    let manager;

    beforeEach(() => {
        manager = new NewManager();
    });

    it('should initialize correctly', async () => {
        await manager.init();
        expect(manager.isInitialized).toBe(true);
    });

    it('should handle errors properly', async () => {
        const error = new Error('Test error');
        const handler = jest.fn();
        manager.on('error', handler);
        
        await manager.handleError(error);
        expect(handler).toHaveBeenCalledWith(error);
    });
});
```

## Best Practices

1. **Module Independence**
   - Keep modules self-contained
   - Minimize dependencies between modules
   - Use events for cross-module communication

2. **Error Recovery**
   - Implement rollback mechanisms
   - Create backups before operations
   - Log all critical operations

3. **State Management**
   - Use atomic operations
   - Maintain consistent state
   - Implement recovery mechanisms

4. **Logging**
   - Use appropriate log levels
   - Include context in log messages
   - Implement log rotation

## Troubleshooting

### Common Issues

1. **Manager Initialization Failures**
   - Check environment variables
   - Verify module dependencies
   - Check file permissions

2. **Event Communication Issues**
   - Verify event names
   - Check listener registration
   - Debug event propagation

3. **State Management Problems**
   - Clear cached state
   - Verify state persistence
   - Check state validation

### Debug Mode

Enable debug mode for detailed logging:
```javascript
manager.setLogLevel('debug');
await manager.init();
```

## Contributing

When contributing to the manager system:

1. Follow the established patterns
2. Add comprehensive tests
3. Document new functionality
4. Update this documentation
5. Submit a pull request

## Support

For issues with managers:

1. Check the logs
2. Review this documentation
3. Search existing issues
4. Create a new issue if needed 