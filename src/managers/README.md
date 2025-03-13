# JMF Hosting Discord Bot - Managers

This directory contains the manager modules for the JMF Hosting Discord Bot. Each manager is responsible for a specific aspect of the bot's functionality.

## Manager Structure

The bot uses a hierarchical manager structure:

1. **Base Manager** - The foundation for all managers, providing common functionality
2. **Specialized Managers** - Extend the base manager for specific functionality domains
3. **Modules** - Smaller, focused components that managers use to implement specific features

## Available Managers

- **Base Manager** (`base/`) - Core functionality for all managers
- **Bot Manager** (`bot/`) - Discord bot functionality
- **Database Manager** (`database/`) - Database operations and migrations
- **Logger Manager** (`logger/`) - Logging and error tracking
- **API Manager** (`api/`) - REST API functionality
- **Monitor Manager** (`monitor/`) - System monitoring and health checks

## Module Integration

All managers and modules are designed to work together through a standardized interface. The integration points include:

1. **Database Integration** - All modules can access the database through the database manager
2. **Event Bus** - Modules communicate through the event bus for loosely coupled interactions
3. **Shared Configuration** - Configuration is managed centrally and distributed to modules
4. **Permissions System** - A unified permissions system controls access to functionality

## Using Managers

To use a manager in your code:

```javascript
// Get a manager instance
const botManager = global.managers.bot;

// Use manager functionality
await botManager.executeCommand('commandName', context, args);
```

## Creating New Modules

To create a new module:

1. Create a new file in the appropriate manager's `modules/` directory
2. Extend the `BaseModule` class
3. Implement required methods
4. Register the module in the manager's index.js file

Example:

```javascript
const BaseModule = require('../../base/base.module');

class MyModule extends BaseModule {
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'my-module',
            version: options.version || '1.0.0',
            description: 'My custom module',
            defaultConfig: {
                // Module-specific configuration
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });
    }

    async initialize(config = {}) {
        await super.initialize(config);
        // Module-specific initialization
    }

    // Module-specific methods
}

module.exports = MyModule;
```

## Database Integration

All modules have built-in database integration through the base module. You can use these methods:

```javascript
// Execute a query
const results = await this.dbQuery('SELECT * FROM users WHERE id = ?', [userId]);

// Transaction support
await this.dbBeginTransaction();
try {
    await this.dbQuery('INSERT INTO users (name) VALUES (?)', ['User1']);
    await this.dbQuery('INSERT INTO profiles (user_id) VALUES (?)', [1]);
    await this.dbCommit();
} catch (error) {
    await this.dbRollback();
    throw error;
}
```

## Event Bus Integration

Modules can communicate through the event bus:

```javascript
// Publish an event
await this.publishEvent('userCreated', { userId: 123, username: 'NewUser' });

// Subscribe to an event
await this.subscribeToEvent('userCreated', async (data) => {
    console.log(`New user created: ${data.username}`);
});
```

## Cache Integration

Modules have access to a shared cache system:

```javascript
// Get cached value
const cachedData = await this.getCacheValue('key', defaultValue);

// Set cached value
await this.setCacheValue('key', value, ttl);

// Delete cached value
await this.deleteCacheValue('key');
``` 