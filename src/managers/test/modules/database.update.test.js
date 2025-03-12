/**
 * JMF Hosting Discord Bot - Database Update Test Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module handles testing of database updates, migrations,
 * and version management.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const path = require('path');
const fs = require('fs').promises;

class DatabaseUpdateTestModule {
    constructor(manager) {
        this.name = 'database-update';
        this.manager = manager;
        this.dbManager = null;
        this.updateManager = null;
    }

    async setup() {
        this.manager.logger.info('database-update-test', `${this.manager.logger.defaultIcons.setup} Setting up database update tests...`);
        
        // Get required managers
        this.dbManager = await this.manager.getManager('database');
        this.updateManager = await this.manager.getManager('update');
        
        // Create test environment
        await this._setupTestEnvironment();
    }

    async _setupTestEnvironment() {
        // Create test directories
        const dirs = [
            path.join(process.cwd(), 'tests', 'data', 'updates'),
            path.join(process.cwd(), 'tests', 'backups', 'database')
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }

        // Initialize test database
        const config = {
            default: 'sqlite',
            connections: {
                sqlite: {
                    database: path.join(process.cwd(), 'tests', 'data', 'updates', 'test.sqlite')
                }
            }
        };

        await this.dbManager.initialize(config);
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
            await this._runUpdateChecks(results);
            await this._runMigrationProcess(results);
            await this._runBackupProcess(results);
            await this._runVersionManagement(results);
            await this._runRollbackProcess(results);

            results.duration = Date.now() - startTime;
            return results;
        } catch (error) {
            this.manager.logger.error('database-update-test', `${this.manager.logger.defaultIcons.error} Tests failed:`, error);
            throw error;
        }
    }

    async _runUpdateChecks(results) {
        this.manager.logger.info('database-update-test', `${this.manager.logger.defaultIcons.test} Running update checks...`);

        try {
            // Test update check functionality
            const updates = await this.updateManager.checkForUpdates();
            this._assertTest(updates !== null, 'Update check should return a result', results);
            this._assertTest('database' in updates.moduleResults, 'Database module should be included in updates', results);

            this.manager.logger.success('database-update-test', `${this.manager.logger.defaultIcons.success} Update checks completed`);
        } catch (error) {
            this._handleTestError('Update checks', error, results);
        }
    }

    async _runMigrationProcess(results) {
        this.manager.logger.info('database-update-test', `${this.manager.logger.defaultIcons.test} Running migration process tests...`);

        try {
            // Test pre-update checks
            const preCheck = await this.updateManager.preUpdateCheck();
            this._assertTest(preCheck.success, 'Pre-update check should succeed', results);

            // Test migration process
            const migrationResult = await this.dbManager.migrate();
            this._assertTest(migrationResult.success, 'Migration should succeed', results);

            // Verify database version
            const version = await this.dbManager.getCurrentVersion();
            this._assertTest(version > 0, 'Database version should be updated', results);

            this.manager.logger.success('database-update-test', `${this.manager.logger.defaultIcons.success} Migration process tests completed`);
        } catch (error) {
            this._handleTestError('Migration process', error, results);
        }
    }

    async _runBackupProcess(results) {
        this.manager.logger.info('database-update-test', `${this.manager.logger.defaultIcons.test} Running backup process tests...`);

        try {
            // Test backup creation
            const backupResult = await this.updateManager.backup();
            this._assertTest(backupResult.success, 'Backup creation should succeed', results);

            // Verify backup file exists
            const backupExists = await this._backupExists();
            this._assertTest(backupExists, 'Backup file should exist', results);

            this.manager.logger.success('database-update-test', `${this.manager.logger.defaultIcons.success} Backup process tests completed`);
        } catch (error) {
            this._handleTestError('Backup process', error, results);
        }
    }

    async _runVersionManagement(results) {
        this.manager.logger.info('database-update-test', `${this.manager.logger.defaultIcons.test} Running version management tests...`);

        try {
            // Test version tracking
            const initialVersion = await this.dbManager.getCurrentVersion();
            
            // Simulate update
            await this.dbManager.query('UPDATE db_version SET version = version + 1 WHERE version = ?', [initialVersion]);
            
            const updatedVersion = await this.dbManager.getCurrentVersion();
            this._assertTest(updatedVersion > initialVersion, 'Version should be updateable', results);

            this.manager.logger.success('database-update-test', `${this.manager.logger.defaultIcons.success} Version management tests completed`);
        } catch (error) {
            this._handleTestError('Version management', error, results);
        }
    }

    async _runRollbackProcess(results) {
        this.manager.logger.info('database-update-test', `${this.manager.logger.defaultIcons.test} Running rollback process tests...`);

        try {
            // Create a backup before testing rollback
            await this.updateManager.backup();

            // Make some changes
            await this.dbManager.query('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY)');

            // Test rollback
            const rollbackResult = await this.updateManager.rollback();
            this._assertTest(rollbackResult.success, 'Rollback should succeed', results);

            // Verify test table doesn't exist after rollback
            const tableExists = await this._tableExists('test_table');
            this._assertTest(!tableExists, 'Changes should be rolled back', results);

            this.manager.logger.success('database-update-test', `${this.manager.logger.defaultIcons.success} Rollback process tests completed`);
        } catch (error) {
            this._handleTestError('Rollback process', error, results);
        }
    }

    async cleanup() {
        try {
            this.manager.logger.info('database-update-test', `${this.manager.logger.defaultIcons.cleanup} Cleaning up test environment...`);
            
            // Close database connection
            await this.dbManager.shutdown();

            // Clean up test files
            const testDb = path.join(process.cwd(), 'tests', 'data', 'updates', 'test.sqlite');
            await fs.unlink(testDb).catch(() => {});

            this.manager.logger.success('database-update-test', `${this.manager.logger.defaultIcons.success} Test cleanup completed`);
        } catch (error) {
            this.manager.logger.error('database-update-test', `${this.manager.logger.defaultIcons.error} Cleanup failed:`, error);
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

    async _backupExists() {
        const backupDir = path.join(process.cwd(), 'tests', 'backups', 'database');
        const files = await fs.readdir(backupDir);
        return files.some(f => f.startsWith('backup_') && f.endsWith('.sqlite'));
    }

    _assertTest(condition, message, results) {
        results.total++;
        if (condition) {
            results.passed++;
            this.manager.logger.debug('database-update-test', `${this.manager.logger.defaultIcons.success} ${message}`);
        } else {
            results.failed++;
            this.manager.logger.error('database-update-test', `${this.manager.logger.defaultIcons.error} ${message}`);
        }
    }

    _handleTestError(testName, error, results) {
        results.failed++;
        results.total++;
        this.manager.logger.error('database-update-test', `${this.manager.logger.defaultIcons.error} ${testName} failed:`, error);
    }
}

module.exports = DatabaseUpdateTestModule; 