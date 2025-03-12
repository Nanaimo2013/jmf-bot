/**
 * JMF Hosting Discord Bot - Database Test Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module handles database testing, including schema validation,
 * migration testing, and CRUD operation verification.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const path = require('path');
const fs = require('fs').promises;

class DatabaseTestModule {
    constructor(manager) {
        this.name = 'database';
        this.manager = manager;
        this.dbManager = null;
        this.testData = {
            users: [],
            guilds: [],
            commands: []
        };
    }

    async setup() {
        this.manager.logger.info('database-test', `${this.manager.logger.defaultIcons.setup} Setting up database tests...`);
        
        // Get database manager instance
        this.dbManager = await this.manager.getManager('database');
        
        // Create test database
        await this._createTestDatabase();
        
        // Load test data
        await this._loadTestData();
    }

    async _createTestDatabase() {
        const config = {
            default: 'sqlite',
            connections: {
                sqlite: {
                    database: path.join(process.cwd(), 'tests', 'data', 'test.sqlite')
                }
            }
        };

        await this.dbManager.initialize(config);
    }

    async _loadTestData() {
        const fixturesPath = path.join(process.cwd(), 'tests', 'fixtures', 'database');
        await fs.mkdir(fixturesPath, { recursive: true });

        // Load or create test data fixtures
        this.testData = {
            users: [
                { user_id: '123456789', username: 'TestUser1', discriminator: '0001' },
                { user_id: '987654321', username: 'TestUser2', discriminator: '0002' }
            ],
            guilds: [
                { guild_id: '111222333', name: 'Test Guild 1', owner_id: '123456789' },
                { guild_id: '444555666', name: 'Test Guild 2', owner_id: '987654321' }
            ],
            commands: [
                { name: 'test1', description: 'Test Command 1' },
                { name: 'test2', description: 'Test Command 2' }
            ]
        };
    }

    async runTests(options = {}) {
        const results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
        };

        const startTime = Date.now();

        try {
            // Run test suites
            await this._runSchemaTests(results);
            await this._runMigrationTests(results);
            await this._runCRUDTests(results);
            await this._runRelationshipTests(results);
            await this._runIndexTests(results);
            await this._runTransactionTests(results);
            await this._runBackupRestoreTests(results);

            results.duration = Date.now() - startTime;
            return results;
        } catch (error) {
            this.manager.logger.error('database-test', `${this.manager.logger.defaultIcons.error} Tests failed:`, error);
            throw error;
        }
    }

    async _runSchemaTests(results) {
        this.manager.logger.info('database-test', `${this.manager.logger.defaultIcons.test} Running schema tests...`);

        try {
            // Test table existence
            const tables = ['users', 'guilds', 'commands', 'guild_members', 'roles'];
            for (const table of tables) {
                const exists = await this._tableExists(table);
                this._assertTest(exists, `Table ${table} should exist`, results);
            }

            // Test table structure
            const userColumns = await this._getTableColumns('users');
            this._assertTest(
                userColumns.includes('user_id') && userColumns.includes('username'),
                'Users table should have required columns',
                results
            );

            this.manager.logger.success('database-test', `${this.manager.logger.defaultIcons.success} Schema tests completed`);
        } catch (error) {
            this._handleTestError('Schema tests', error, results);
        }
    }

    async _runMigrationTests(results) {
        this.manager.logger.info('database-test', `${this.manager.logger.defaultIcons.test} Running migration tests...`);

        try {
            // Test migration application
            const version = await this.dbManager.getCurrentVersion();
            this._assertTest(version > 0, 'Database should be migrated', results);

            // Test migration rollback
            await this.dbManager.rollback(1);
            const newVersion = await this.dbManager.getCurrentVersion();
            this._assertTest(newVersion < version, 'Migration rollback should work', results);

            // Test migration reapplication
            await this.dbManager.migrate();
            const finalVersion = await this.dbManager.getCurrentVersion();
            this._assertTest(finalVersion === version, 'Migration reapplication should work', results);

            this.manager.logger.success('database-test', `${this.manager.logger.defaultIcons.success} Migration tests completed`);
        } catch (error) {
            this._handleTestError('Migration tests', error, results);
        }
    }

    async _runCRUDTests(results) {
        this.manager.logger.info('database-test', `${this.manager.logger.defaultIcons.test} Running CRUD tests...`);

        try {
            // Test user CRUD operations
            const user = this.testData.users[0];
            await this.dbManager.query('INSERT INTO users (user_id, username, discriminator) VALUES (?, ?, ?)', 
                [user.user_id, user.username, user.discriminator]);
            
            const [insertedUser] = await this.dbManager.query('SELECT * FROM users WHERE user_id = ?', [user.user_id]);
            this._assertTest(insertedUser.username === user.username, 'User insertion should work', results);

            await this.dbManager.query('UPDATE users SET username = ? WHERE user_id = ?', 
                ['UpdatedUser', user.user_id]);
            
            const [updatedUser] = await this.dbManager.query('SELECT * FROM users WHERE user_id = ?', [user.user_id]);
            this._assertTest(updatedUser.username === 'UpdatedUser', 'User update should work', results);

            await this.dbManager.query('DELETE FROM users WHERE user_id = ?', [user.user_id]);
            const [deletedUser] = await this.dbManager.query('SELECT * FROM users WHERE user_id = ?', [user.user_id]);
            this._assertTest(!deletedUser, 'User deletion should work', results);

            this.manager.logger.success('database-test', `${this.manager.logger.defaultIcons.success} CRUD tests completed`);
        } catch (error) {
            this._handleTestError('CRUD tests', error, results);
        }
    }

    async _runRelationshipTests(results) {
        this.manager.logger.info('database-test', `${this.manager.logger.defaultIcons.test} Running relationship tests...`);

        try {
            // Test foreign key constraints
            const user = this.testData.users[0];
            const guild = this.testData.guilds[0];

            // Insert user first (required for foreign key)
            await this.dbManager.query('INSERT INTO users (user_id, username, discriminator) VALUES (?, ?, ?)',
                [user.user_id, user.username, user.discriminator]);

            // Insert guild with valid owner_id
            await this.dbManager.query('INSERT INTO guilds (guild_id, name, owner_id) VALUES (?, ?, ?)',
                [guild.guild_id, guild.name, user.user_id]);

            const [insertedGuild] = await this.dbManager.query('SELECT * FROM guilds WHERE guild_id = ?', [guild.guild_id]);
            this._assertTest(insertedGuild.owner_id === user.user_id, 'Guild-User relationship should work', results);

            // Test cascade delete
            await this.dbManager.query('DELETE FROM users WHERE user_id = ?', [user.user_id]);
            const [deletedGuild] = await this.dbManager.query('SELECT * FROM guilds WHERE guild_id = ?', [guild.guild_id]);
            this._assertTest(!deletedGuild, 'Cascade delete should work', results);

            this.manager.logger.success('database-test', `${this.manager.logger.defaultIcons.success} Relationship tests completed`);
        } catch (error) {
            this._handleTestError('Relationship tests', error, results);
        }
    }

    async _runIndexTests(results) {
        this.manager.logger.info('database-test', `${this.manager.logger.defaultIcons.test} Running index tests...`);

        try {
            // Test index existence
            const indexes = await this._getTableIndexes('users');
            this._assertTest(
                indexes.includes('idx_users_username'),
                'Username index should exist',
                results
            );

            this.manager.logger.success('database-test', `${this.manager.logger.defaultIcons.success} Index tests completed`);
        } catch (error) {
            this._handleTestError('Index tests', error, results);
        }
    }

    async _runTransactionTests(results) {
        this.manager.logger.info('database-test', `${this.manager.logger.defaultIcons.test} Running transaction tests...`);

        try {
            await this.dbManager.beginTransaction();

            // Test successful transaction
            const user = this.testData.users[0];
            await this.dbManager.query('INSERT INTO users (user_id, username, discriminator) VALUES (?, ?, ?)',
                [user.user_id, user.username, user.discriminator]);
            await this.dbManager.commit();

            const [insertedUser] = await this.dbManager.query('SELECT * FROM users WHERE user_id = ?', [user.user_id]);
            this._assertTest(insertedUser.username === user.username, 'Transaction commit should work', results);

            // Test transaction rollback
            await this.dbManager.beginTransaction();
            await this.dbManager.query('UPDATE users SET username = ? WHERE user_id = ?',
                ['RollbackTest', user.user_id]);
            await this.dbManager.rollback();

            const [rolledBackUser] = await this.dbManager.query('SELECT * FROM users WHERE user_id = ?', [user.user_id]);
            this._assertTest(rolledBackUser.username === user.username, 'Transaction rollback should work', results);

            this.manager.logger.success('database-test', `${this.manager.logger.defaultIcons.success} Transaction tests completed`);
        } catch (error) {
            await this.dbManager.rollback();
            this._handleTestError('Transaction tests', error, results);
        }
    }

    async _runBackupRestoreTests(results) {
        this.manager.logger.info('database-test', `${this.manager.logger.defaultIcons.test} Running backup/restore tests...`);

        try {
            // Create test data
            const user = this.testData.users[0];
            await this.dbManager.query('INSERT INTO users (user_id, username, discriminator) VALUES (?, ?, ?)',
                [user.user_id, user.username, user.discriminator]);

            // Create backup
            const backupPath = await this.dbManager.backup();
            this._assertTest(backupPath && await this._fileExists(backupPath), 'Backup should be created', results);

            // Modify data
            await this.dbManager.query('UPDATE users SET username = ? WHERE user_id = ?',
                ['ModifiedUser', user.user_id]);

            // Restore backup
            await this.dbManager.restore(backupPath);
            const [restoredUser] = await this.dbManager.query('SELECT * FROM users WHERE user_id = ?', [user.user_id]);
            this._assertTest(restoredUser.username === user.username, 'Backup restore should work', results);

            this.manager.logger.success('database-test', `${this.manager.logger.defaultIcons.success} Backup/restore tests completed`);
        } catch (error) {
            this._handleTestError('Backup/restore tests', error, results);
        }
    }

    async cleanup() {
        try {
            this.manager.logger.info('database-test', `${this.manager.logger.defaultIcons.cleanup} Cleaning up test database...`);
            
            // Drop all test data
            const tables = ['users', 'guilds', 'commands', 'guild_members', 'roles'];
            for (const table of tables) {
                await this.dbManager.query(`DELETE FROM ${table}`);
            }

            // Close database connection
            await this.dbManager.shutdown();

            this.manager.logger.success('database-test', `${this.manager.logger.defaultIcons.success} Test cleanup completed`);
        } catch (error) {
            this.manager.logger.error('database-test', `${this.manager.logger.defaultIcons.error} Cleanup failed:`, error);
            throw error;
        }
    }

    // Helper methods
    async _tableExists(tableName) {
        const [result] = await this.dbManager.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            [tableName]
        );
        return !!result;
    }

    async _getTableColumns(tableName) {
        const [result] = await this.dbManager.query(`PRAGMA table_info(${tableName})`);
        return result ? Object.keys(result) : [];
    }

    async _getTableIndexes(tableName) {
        const results = await this.dbManager.query(`PRAGMA index_list(${tableName})`);
        return results.map(r => r.name);
    }

    async _fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    _assertTest(condition, message, results) {
        results.total++;
        if (condition) {
            results.passed++;
            this.manager.logger.debug('database-test', `${this.manager.logger.defaultIcons.success} ${message}`);
        } else {
            results.failed++;
            this.manager.logger.error('database-test', `${this.manager.logger.defaultIcons.error} ${message}`);
        }
    }

    _handleTestError(testName, error, results) {
        results.failed++;
        results.total++;
        this.manager.logger.error('database-test', `${this.manager.logger.defaultIcons.error} ${testName} failed:`, error);
    }
}

module.exports = DatabaseTestModule; 