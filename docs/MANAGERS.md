# Manager System Documentation

<div align="center">

[![Version](https://img.shields.io/badge/Version-1.1.1-blue.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/releases)
[![Architecture](https://img.shields.io/badge/Architecture-Modular-green.svg?style=for-the-badge)](https://github.com/Nanaimo2013/Jmf-Bot/docs/ARCHITECTURE.md)

</div>

## Overview

The JMF Bot uses a modular manager-based architecture to organize and handle different aspects of the bot's functionality. This system provides a clean separation of concerns, making the codebase more maintainable and extensible.

## Core Concepts

### Base Manager

The `BaseManager` class serves as the foundation for all managers, providing:
- Event handling and emission
- Logging capabilities through LoggerManager
- Utility methods
- State management
- Error handling

### Manager Types

1. **Install Manager** (`src/managers/install/`)
   - Handles bot installation and setup
   - Manages dependencies
   - Configures environment
   - Validates requirements
   - Performs system checks

2. **Update Manager** (`src/managers/update/`)
   - Manages bot updates
   - Handles version migrations
   - Updates dependencies
   - Maintains update history
   - Performs rollbacks if needed

3. **Monitor Manager** (`src/managers/monitor/`)
   - Tracks bot health
   - Monitors system resources
   - Handles alerts
   - Manages logging
   - Provides status reporting

4. **Database Manager** (`src/managers/database/`)
   - Handles database operations
   - Manages migrations
   - Performs backups
   - Handles data seeding
   - Manages rollbacks

5. **Docker Manager** (`src/managers/docker/`)
   - Manages containerization
   - Handles container lifecycle
   - Manages volumes
   - Handles networking
   - Manages container logs

## Directory Structure

```
src/managers/
├── base/
│   ├── base.manager.js    # Base manager class
│   └── base.module.js     # Base module class
├── install/
│   ├── index.js           # Install manager
│   ├── base.module.js     # Install base module
│   ├── check.js           # Installation checks
│   ├── dependencies.js    # Dependency management
│   └── config.js          # Configuration setup
├── update/
│   ├── index.js           # Update manager
│   └── base.module.js     # Update base module
├── monitor/
│   ├── index.js           # Monitor manager
│   └── base.module.js     # Monitor base module
├── database/
│   ├── index.js           # Database manager
│   ├── migrate.js         # Migration handling
│   ├── rollback.js        # Rollback handling
│   ├── seed.js           # Data seeding
│   ├── backup.js         # Backup management
│   └── restore.js        # Restore operations
└── docker/
    ├── index.js           # Docker manager
    └── base.module.js     # Docker base module
```

## Implementation Patterns

### Event-Based Architecture

Managers use an event-based system for communication:

```javascript
// Emitting events
this.emit('installStart', { type: 'dependencies' });

// Listening to events
this.on('installComplete', (data) => {
    this.logger.info(`Installation completed: ${data.type}`);
});
```

### Module Loading

Managers dynamically load their modules:

```javascript
class InstallManager extends BaseManager {
    async loadModules() {
        this.checkModule = await import('./check.js');
        this.dependenciesModule = await import('./dependencies.js');
        this.configModule = await import('./config.js');
    }
}
```

### Error Handling

Standardized error handling across managers:

```javascript
try {
    await this.performOperation();
} catch (error) {
    this.logger.error('Operation failed', {
        error: error.message,
        stack: error.stack,
        context: this.context
    });
    await this.handleError(error);
}
```

## Manager Lifecycle

1. **Initialization**
   ```javascript
   async init() {
       await this.loadModules();
       await this.validateEnvironment();
       await this.setupListeners();
       await this.initialize();
   }
   ```

2. **Operation**
   ```javascript
   async start() {
       await this.preStart();
       await this.executeOperation();
       await this.postStart();
   }
   ```

3. **Cleanup**
   ```javascript
   async cleanup() {
       await this.saveState();
       await this.closeConnections();
       await this.removeListeners();
   }
   ```

## Usage Examples

### Install Manager

```javascript
const manager = new InstallManager();

// Run all installation steps
await manager.init();
await manager.runAll();

// Run specific steps
await manager.check();
await manager.installDependencies();
await manager.setupConfig();
```

### Database Manager

```javascript
const dbManager = new DatabaseManager();

// Run migrations
await dbManager.migrate();

// Create backup
await dbManager.backup();

// Restore from backup
await dbManager.restore('backup_20240101.sql');
```

### Monitor Manager

```javascript
const monitor = new MonitorManager();

// Start monitoring
await monitor.start();

// Check status
const status = await monitor.getStatus();

// Stop monitoring
await monitor.stop();
```

## Development Guidelines

### Creating a New Manager

1. Create the manager directory:
   ```bash
   mkdir src/managers/new-manager
   ```

2. Create the base files:
   ```bash
   touch src/managers/new-manager/index.js
   touch src/managers/new-manager/base.module.js
   ```

3. Implement the manager:
   ```javascript
   import { BaseManager } from '../base/base.manager.js';

   class NewManager extends BaseManager {
       constructor() {
           super('NewManager');
       }

       async init() {
           // Implementation
       }
   }
   ```

### Testing

1. Unit Tests:
   ```javascript
   describe('NewManager', () => {
       it('should initialize correctly', async () => {
           const manager = new NewManager();
           await manager.init();
           expect(manager.isInitialized).toBe(true);
       });
   });
   ```

2. Integration Tests:
   ```javascript
   describe('NewManager Integration', () => {
       it('should work with other managers', async () => {
           const newManager = new NewManager();
           const otherManager = new OtherManager();
           await newManager.connectTo(otherManager);
           expect(newManager.isConnected).toBe(true);
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