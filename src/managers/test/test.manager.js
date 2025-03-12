/**
 * JMF Hosting Discord Bot - Test Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles all test-related operations including unit tests,
 * integration tests, and end-to-end tests. It provides a comprehensive
 * testing framework with detailed reporting and logging.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 */

const BaseManager = require('../base.manager');
const path = require('path');
const fs = require('fs').promises;

class TestManager extends BaseManager {
    constructor() {
        super('test');
        this.results = new Map();
        this.testSuites = new Map();
        this.currentSuite = null;
        this.startTime = null;
        this.options = {
            timeout: 5000,
            bail: false,
            parallel: false,
            retries: 0,
            reporters: ['console']
        };
    }

    /**
     * Initialize test environment
     * @param {Object} config - Test configuration
     */
    async initialize(config = {}) {
        await super.initialize(config);
        this.options = { ...this.options, ...config };
        await this._setupTestEnvironment();
    }

    /**
     * Set up the test environment
     * @private
     */
    async _setupTestEnvironment() {
        try {
            this.logger.info(this.name, `${this.logger.defaultIcons.start} Setting up test environment...`);
            
            // Create test directories if they don't exist
            const testDirs = [
                path.join(process.cwd(), 'tests'),
                path.join(process.cwd(), 'tests', 'unit'),
                path.join(process.cwd(), 'tests', 'integration'),
                path.join(process.cwd(), 'tests', 'e2e'),
                path.join(process.cwd(), 'tests', 'fixtures')
            ];

            for (const dir of testDirs) {
                await fs.mkdir(dir, { recursive: true });
            }

            this.logger.success(this.name, `${this.logger.defaultIcons.success} Test environment setup complete`);
        } catch (error) {
            this.logger.error(this.name, `${this.logger.defaultIcons.error} Failed to setup test environment:`, error);
            throw error;
        }
    }

    /**
     * Run pre-test setup for all modules
     */
    async preTestSetup() {
        try {
            this.logger.info(this.name, `${this.logger.defaultIcons.setup} Running pre-test setup...`);
            
            for (const [name, module] of this.modules) {
                try {
                    if (typeof module.setup === 'function') {
                        await module.setup();
                        this.logger.debug(this.name, `${this.logger.defaultIcons.success} Setup complete for module: ${name}`);
                    }
                } catch (error) {
                    this.logger.error(this.name, `${this.logger.defaultIcons.error} Setup failed for module ${name}:`, error);
                    throw error;
                }
            }

            this.logger.success(this.name, `${this.logger.defaultIcons.success} Pre-test setup completed`);
        } catch (error) {
            this.logger.error(this.name, `${this.logger.defaultIcons.error} Pre-test setup failed:`, error);
            throw error;
        }
    }

    /**
     * Run all tests
     * @param {Object} options - Test options
     */
    async runTests(options = {}) {
        try {
            this.startTime = Date.now();
            this.options = { ...this.options, ...options };
            
            this.logger.info(this.name, `${this.logger.defaultIcons.start} Starting test run with options:`, this.options);
            
            await this.preTestSetup();

            const results = [];
            for (const [name, module] of this.modules) {
                this.logger.info(this.name, `${this.logger.defaultIcons.test} Running tests for module: ${name}`);
                
                try {
                    const moduleResults = await module.runTests(this.options);
                    results.push({
                        module: name,
                        ...moduleResults,
                        duration: moduleResults.duration || 0,
                        timestamp: new Date().toISOString()
                    });
                    
                    this.logger.info(this.name, `${this.logger.defaultIcons.success} Completed tests for module: ${name}`);
                } catch (error) {
                    this.logger.error(this.name, `${this.logger.defaultIcons.error} Tests failed for module ${name}:`, error);
                    
                    results.push({
                        module: name,
                        error: error.message,
                        stack: error.stack,
                        failed: true,
                        timestamp: new Date().toISOString()
                    });

                    if (this.options.bail) {
                        throw error;
                    }
                }
            }

            this.results = new Map(results.map(result => [result.module, result]));
            const summary = this.generateSummary();
            
            await this._saveTestResults(summary);
            await this.cleanup();

            this.logger.info(this.name, `${this.logger.defaultIcons.report} Test summary:`, summary);
            return summary;
        } catch (error) {
            this.logger.error(this.name, `${this.logger.defaultIcons.error} Test run failed:`, error);
            throw error;
        }
    }

    /**
     * Clean up after tests
     */
    async cleanup() {
        this.logger.info(this.name, `${this.logger.defaultIcons.cleanup} Running test cleanup...`);
        
        for (const [name, module] of this.modules) {
            if (typeof module.cleanup === 'function') {
                try {
                    await module.cleanup();
                    this.logger.debug(this.name, `${this.logger.defaultIcons.success} Cleanup complete for module: ${name}`);
                } catch (error) {
                    this.logger.error(this.name, `${this.logger.defaultIcons.error} Cleanup failed for module ${name}:`, error);
                }
            }
        }

        this.logger.success(this.name, `${this.logger.defaultIcons.success} Test cleanup completed`);
    }

    /**
     * Generate test summary
     */
    generateSummary() {
        const summary = {
            totalTests: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: Date.now() - this.startTime,
            timestamp: new Date().toISOString(),
            moduleResults: {}
        };

        for (const [name, result] of this.results) {
            summary.totalTests += result.total || 0;
            summary.passed += result.passed || 0;
            summary.failed += result.failed || 0;
            summary.skipped += result.skipped || 0;
            summary.moduleResults[name] = result;
        }

        return summary;
    }

    /**
     * Save test results to file
     * @private
     */
    async _saveTestResults(summary) {
        try {
            const resultsDir = path.join(process.cwd(), 'tests', 'results');
            await fs.mkdir(resultsDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const resultsPath = path.join(resultsDir, `test-results-${timestamp}.json`);

            await fs.writeFile(
                resultsPath,
                JSON.stringify(summary, null, 2),
                'utf8'
            );

            this.logger.info(this.name, `${this.logger.defaultIcons.save} Test results saved to: ${resultsPath}`);
        } catch (error) {
            this.logger.error(this.name, `${this.logger.defaultIcons.error} Failed to save test results:`, error);
        }
    }

    /**
     * Get test results
     * @param {string} [moduleName] - Optional module name to filter results
     * @returns {Object} Test results
     */
    getTestResults(moduleName) {
        if (moduleName) {
            const result = this.results.get(moduleName);
            if (!result) {
                throw new Error(`No test results found for module: ${moduleName}`);
            }
            return result;
        }
        return Object.fromEntries(this.results);
    }

    /**
     * Get the status of the test manager
     */
    async getStatus() {
        const status = await super.getStatus();
        return {
            ...status,
            options: this.options,
            lastRun: this.startTime ? new Date(this.startTime).toISOString() : null,
            results: this.generateSummary()
        };
    }
}

module.exports = TestManager;