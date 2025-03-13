/**
 * JMF Hosting Discord Bot - Test Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles testing of the bot and its components,
 * including unit tests, integration tests, and end-to-end tests.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base.manager');
const path = require('path');
const fs = require('fs').promises;

class TestManager extends BaseManager {
    /**
     * Create a new Test manager
     * @param {Object} [options] - Manager options
     */
    constructor(options = {}) {
        super('test', {
            version: '1.0.0',
            defaultConfig: {
                enabled: true,
                testDir: path.join(process.cwd(), 'tests'),
                reporters: ['console'],
                timeout: 5000,
                bail: false,
                coverage: {
                    enabled: false,
                    directory: path.join(process.cwd(), 'coverage'),
                    reporters: ['text', 'lcov'],
                    excludes: ['node_modules/**', 'tests/**']
                }
            },
            ...options
        });

        // Test results
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            duration: 0,
            suites: []
        };

        // Register event handlers
        this.registerEvent('testStarted', this._onTestStarted.bind(this));
        this.registerEvent('testCompleted', this._onTestCompleted.bind(this));
        this.registerEvent('suiteStarted', this._onSuiteStarted.bind(this));
        this.registerEvent('suiteCompleted', this._onSuiteCompleted.bind(this));
    }

    /**
     * Initialize the Test manager
     * @param {Object} [config] - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        this.logger.info('test', 'Test manager initialized');
    }

    /**
     * Run tests
     * @param {Object} [options] - Test options
     * @returns {Promise<Object>} Test results
     */
    async runTests(options = {}) {
        if (!this.config.enabled) {
            this.logger.info('test', 'Testing is disabled in configuration');
            return this.results;
        }

        const testOptions = { ...this.config, ...options };
        this.logger.info('test', 'Running tests...');

        try {
            // Reset results
            this.results = {
                passed: 0,
                failed: 0,
                skipped: 0,
                total: 0,
                duration: 0,
                suites: []
            };

            // Start timer
            const startTime = Date.now();

            // Find test files
            const testFiles = await this._findTestFiles(testOptions.testDir);
            this.logger.debug('test', `Found ${testFiles.length} test files`);

            // Run tests
            for (const file of testFiles) {
                await this._runTestFile(file, testOptions);
            }

            // Calculate duration
            this.results.duration = Date.now() - startTime;

            // Log results
            this._logResults();

            return this.results;
        } catch (error) {
            this.logger.error('test', `Test execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Find test files
     * @param {string} testDir - Test directory
     * @returns {Promise<string[]>} Test files
     * @private
     */
    async _findTestFiles(testDir) {
        try {
            const files = await fs.readdir(testDir);
            return files
                .filter(file => file.endsWith('.test.js') || file.endsWith('.spec.js'))
                .map(file => path.join(testDir, file));
        } catch (error) {
            this.logger.error('test', `Failed to find test files: ${error.message}`);
            return [];
        }
    }

    /**
     * Run a test file
     * @param {string} file - Test file path
     * @param {Object} options - Test options
     * @returns {Promise<void>}
     * @private
     */
    async _runTestFile(file, options) {
        this.logger.debug('test', `Running test file: ${file}`);

        try {
            // Load test file
            const testModule = require(file);
            
            // Run tests
            if (typeof testModule.run === 'function') {
                await testModule.run(this, options);
            } else {
                this.logger.warn('test', `Test file ${file} does not export a run function`);
            }
        } catch (error) {
            this.logger.error('test', `Failed to run test file ${file}: ${error.message}`);
            
            // Add failed suite
            this.results.suites.push({
                name: path.basename(file),
                file,
                passed: 0,
                failed: 1,
                skipped: 0,
                total: 1,
                duration: 0,
                error: error.message,
                tests: []
            });
            
            this.results.failed++;
            this.results.total++;
            
            // Bail if configured
            if (options.bail) {
                throw error;
            }
        }
    }

    /**
     * Log test results
     * @private
     */
    _logResults() {
        const { passed, failed, skipped, total, duration } = this.results;
        
        this.logger.info('test', `Test results: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)`);
        this.logger.info('test', `Test duration: ${duration}ms`);
        
        if (failed > 0) {
            this.logger.error('test', `${failed} tests failed`);
        } else {
            this.logger.success('test', 'All tests passed');
        }
    }

    /**
     * Get test results
     * @returns {Object} Test results
     */
    getTestResults() {
        return this.results;
    }

    /**
     * Handle test started event
     * @param {Object} test - Test information
     * @private
     */
    _onTestStarted(test) {
        this.logger.debug('test', `Test started: ${test.name}`);
    }

    /**
     * Handle test completed event
     * @param {Object} test - Test information
     * @private
     */
    _onTestCompleted(test) {
        this.logger.debug('test', `Test completed: ${test.name} (${test.status})`);
        
        // Update results
        if (test.status === 'passed') {
            this.results.passed++;
        } else if (test.status === 'failed') {
            this.results.failed++;
        } else if (test.status === 'skipped') {
            this.results.skipped++;
        }
        
        this.results.total++;
    }

    /**
     * Handle suite started event
     * @param {Object} suite - Suite information
     * @private
     */
    _onSuiteStarted(suite) {
        this.logger.debug('test', `Suite started: ${suite.name}`);
    }

    /**
     * Handle suite completed event
     * @param {Object} suite - Suite information
     * @private
     */
    _onSuiteCompleted(suite) {
        this.logger.debug('test', `Suite completed: ${suite.name}`);
        
        // Add suite to results
        this.results.suites.push(suite);
    }

    /**
     * Shut down the Test manager
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.logger.info('test', 'Shutting down Test manager');
        await super.shutdown();
    }
}

module.exports = TestManager;