/**
 * JMF Hosting Discord Bot - Database Test Example
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file demonstrates how to write tests for the database manager
 * using the test manager. It includes examples of unit tests and
 * integration tests for database operations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const path = require('path');
const TestManager = require('../test.manager');
const DatabaseManager = require('../../database/database.manager');
const { assert } = require('../utils/assertions');

/**
 * Database test suite
 */
module.exports = async function runDatabaseTests() {
    // Create test cases
    return {
        name: 'Database Tests',
        setup: async () => {
            // Initialize database manager with test configuration
            const dbManager = new DatabaseManager({
                configPath: path.join(process.cwd(), 'config', 'test', 'database.json'),
                defaultConfig: {
                    type: 'sqlite',
                    sqlite: {
                        database: path.join(process.cwd(), 'data', 'test', 'database', 'test.db'),
                        backupDir: path.join(process.cwd(), 'data', 'test', 'database', 'backups'),
                        maxBackups: 3,
                        journalMode: 'WAL',
                        busyTimeout: 5000,
                        enableForeignKeys: true
                    },
                    migrations: {
                        directory: path.join(process.cwd(), 'data', 'test', 'database', 'migrations'),
                        tableName: 'migrations'
                    },
                    queryLogging: {
                        enabled: true,
                        slowQueryThreshold: 500,
                        logParams: true,
                        maxLogSize: 100
                    }
                }
            });
            
            // Initialize the database manager
            await dbManager.initialize();
            
            // Get the SQLite module
            const sqliteModule = dbManager.getModule('sqlite');
            
            // Create test database
            await sqliteModule.createTestDatabase();
            
            return { dbManager, sqliteModule };
        },
        teardown: async ({ dbManager, sqliteModule }) => {
            // Clean up test database
            await sqliteModule.cleanupTestDatabase();
            
            // Shutdown database manager
            await dbManager.shutdown();
        },
        tests: [
            // Test database connection
            {
                name: 'Database connection',
                run: async ({ dbManager }) => {
                    const status = await dbManager.getStatus();
                    assert.ok(status.database.connected, 'Database should be connected');
                    assert.equal(status.database.type, 'sqlite', 'Database type should be SQLite');
                }
            },
            
            // Test query execution
            {
                name: 'Query execution',
                run: async ({ dbManager }) => {
                    // Execute a simple query
                    const result = await dbManager.query('SELECT * FROM test_users');
                    
                    assert.ok(Array.isArray(result), 'Query result should be an array');
                    assert.equal(result.length, 1, 'Should have one test user');
                    assert.equal(result[0].username, 'testuser', 'Username should match');
                    assert.equal(result[0].email, 'test@example.com', 'Email should match');
                }
            },
            
            // Test data insertion
            {
                name: 'Data insertion',
                run: async ({ dbManager }) => {
                    // Insert a new user
                    const insertResult = await dbManager.query(
                        'INSERT INTO test_users (username, email) VALUES (?, ?)',
                        ['newuser', 'new@example.com']
                    );
                    
                    assert.ok(insertResult.lastID > 0, 'Insert should return a valid ID');
                    assert.equal(insertResult.changes, 1, 'One row should be affected');
                    
                    // Verify the insertion
                    const users = await dbManager.query('SELECT * FROM test_users');
                    assert.equal(users.length, 2, 'Should have two users now');
                    
                    const newUser = users.find(u => u.username === 'newuser');
                    assert.ok(newUser, 'New user should exist');
                    assert.equal(newUser.email, 'new@example.com', 'Email should match');
                }
            },
            
            // Test transactions
            {
                name: 'Transaction handling',
                run: async ({ dbManager }) => {
                    // Start a transaction
                    await dbManager.beginTransaction();
                    
                    try {
                        // Insert a new item
                        await dbManager.query(
                            'INSERT INTO test_items (user_id, name, description) VALUES (?, ?, ?)',
                            [1, 'Transaction Test Item', 'Created in a transaction']
                        );
                        
                        // Verify the item exists within the transaction
                        const itemsInTransaction = await dbManager.query('SELECT * FROM test_items WHERE name = ?', ['Transaction Test Item']);
                        assert.equal(itemsInTransaction.length, 1, 'Item should exist in transaction');
                        
                        // Rollback the transaction
                        await dbManager.rollback();
                        
                        // Verify the item doesn't exist after rollback
                        const itemsAfterRollback = await dbManager.query('SELECT * FROM test_items WHERE name = ?', ['Transaction Test Item']);
                        assert.equal(itemsAfterRollback.length, 0, 'Item should not exist after rollback');
                    } catch (error) {
                        // Ensure transaction is rolled back on error
                        await dbManager.rollback();
                        throw error;
                    }
                }
            },
            
            // Test database backup and restore
            {
                name: 'Backup and restore',
                run: async ({ dbManager }) => {
                    // Insert a marker record to verify backup/restore
                    await dbManager.query(
                        'INSERT INTO test_users (username, email) VALUES (?, ?)',
                        ['backupuser', 'backup@example.com']
                    );
                    
                    // Create a backup
                    const backupPath = await dbManager.backup();
                    assert.ok(backupPath, 'Backup path should be returned');
                    
                    // Delete the marker record
                    await dbManager.query('DELETE FROM test_users WHERE username = ?', ['backupuser']);
                    
                    // Verify the record is gone
                    const usersBeforeRestore = await dbManager.query('SELECT * FROM test_users WHERE username = ?', ['backupuser']);
                    assert.equal(usersBeforeRestore.length, 0, 'User should be deleted');
                    
                    // Restore from backup
                    await dbManager.restore(backupPath);
                    
                    // Verify the record is back
                    const usersAfterRestore = await dbManager.query('SELECT * FROM test_users WHERE username = ?', ['backupuser']);
                    assert.equal(usersAfterRestore.length, 1, 'User should be restored from backup');
                }
            },
            
            // Test database integrity
            {
                name: 'Database integrity',
                run: async ({ dbManager }) => {
                    // Verify database integrity
                    const integrityResult = await dbManager.verifyIntegrity();
                    assert.ok(integrityResult, 'Database integrity check should pass');
                }
            }
        ]
    };
};

// Run the tests if this file is executed directly
if (require.main === module) {
    (async () => {
        // Initialize the test manager
        const testManager = new TestManager();
        await testManager.initialize();
        
        // Register the database test module
        testManager.registerTest('database', module.exports);
        
        // Run the database tests
        const results = await testManager.runTests(['database']);
        
        // Log the results
        console.log(`Tests completed: ${results.passed} passed, ${results.failed} failed`);
        
        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);
    })();
} 