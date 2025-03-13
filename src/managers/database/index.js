/**
 * JMF Hosting Discord Bot - Database Manager Index
 * Version: 1.2.0
 * Last Updated: 03/12/2025
 * 
 * This file exports the database manager and provides a factory function
 * for creating database manager instances.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const DatabaseManager = require('./database.manager');
const path = require('path');

/**
 * Create a new database manager
 * @param {Object} [config={}] - Configuration options
 * @returns {Promise<DatabaseManager>} Initialized database manager
 */
async function createDatabaseManager(config = {}) {
    const manager = new DatabaseManager();
    await manager.initialize(config);
    return manager;
}

// Export the database manager and factory function
module.exports = {
    DatabaseManager,
    createDatabaseManager
};

// Run the CLI if this file is executed directly
if (require.main === module) {
    const LoggerManager = require('../logger/logger.manager');
    const logger = new LoggerManager();
    
    // Initialize logger
    logger.initialize({
        level: 'info',
        directory: path.join(process.cwd(), 'logs', 'database')
    }).then(() => {
        // Get the command from command line arguments
        const command = process.argv[2];
        const args = process.argv.slice(3);
        
        // Create and initialize the database manager
        const dbManager = new DatabaseManager();
        
        dbManager.initialize().then(async () => {
            try {
                // Process the command
                switch (command) {
                    case 'migrate':
                        logger.info('database', 'Running database migrations...');
                        await dbManager.migrate(args[0] || null);
                        logger.success('database', 'Migrations completed successfully');
                        break;
                        
                    case 'rollback':
                        logger.info('database', 'Rolling back database migrations...');
                        await dbManager.rollback(args[0] || null);
                        logger.success('database', 'Rollback completed successfully');
                        break;
                        
                    case 'backup':
                        logger.info('database', 'Creating database backup...');
                        const backupPath = await dbManager.backup();
                        logger.success('database', `Backup created at: ${backupPath}`);
                        break;
                        
                    case 'restore':
                        if (!args[0]) {
                            logger.error('database', 'Backup path is required for restore');
                            process.exit(1);
                        }
                        
                        logger.info('database', `Restoring database from ${args[0]}...`);
                        await dbManager.restore(args[0]);
                        logger.success('database', 'Database restored successfully');
                        break;
                        
                    case 'verify':
                        logger.info('database', 'Verifying database integrity...');
                        const result = await dbManager.verifyIntegrity();
                        
                        if (result) {
                            logger.success('database', 'Database integrity check passed');
                        } else {
                            logger.error('database', 'Database integrity check failed');
                            process.exit(1);
                        }
                        break;
                        
                    case 'status':
                        logger.info('database', 'Getting database status...');
                        const status = await dbManager.getStatus();
                        console.log(JSON.stringify(status, null, 2));
                        break;
                        
                    default:
                        logger.error('database', 'Invalid command. Available commands:');
                        console.log('  migrate [version]  - Run migrations up to specified version');
                        console.log('  rollback [version] - Roll back migrations to specified version');
                        console.log('  backup            - Create a database backup');
                        console.log('  restore <path>    - Restore database from backup');
                        console.log('  verify            - Verify database integrity');
                        console.log('  status            - Show database status');
                        process.exit(1);
                }
                
                // Shutdown the database manager
                await dbManager.shutdown();
                process.exit(0);
            } catch (error) {
                logger.error('database', `Error: ${error.message}`);
                console.error(error);
                process.exit(1);
            }
        }).catch(error => {
            logger.error('database', `Failed to initialize database manager: ${error.message}`);
            process.exit(1);
        });
    }).catch(error => {
        console.error(`Failed to initialize logger: ${error.message}`);
        process.exit(1);
    });
} 