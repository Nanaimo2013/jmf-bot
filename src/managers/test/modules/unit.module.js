/**
 * JMF Hosting Discord Bot - Unit Test Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides unit testing capabilities for the test manager,
 * including test discovery, execution, and reporting.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class UnitModule extends BaseModule {
    /**
     * Create a new unit test module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager, {
            name: 'unit',
            version: '1.0.0',
            defaultConfig: {
                testDir: 'tests/unit',
                testPattern: '**/*.test.js',
                excludePatterns: ['**/node_modules/**', '**/dist/**'],
                timeout: 2000,
                bail: false,
                reporters: ['console'],
                mochaOptions: {
                    ui: 'bdd',
                    colors: true,
                    timeout: 2000
                },
                jestOptions: {
                    testEnvironment: 'node',
                    verbose: true
                }
            }
        });
        
        this._testFramework = null;
        this._testResults = null;
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Detect test framework
        this._testFramework = await this._detectTestFramework();
        
        // Create test directory if it doesn't exist
        const testDir = path.join(process.cwd(), this.getConfig('testDir'));
        await fs.mkdir(testDir, { recursive: true });
        
        this.log('info', `Unit test module initialized (using ${this._testFramework || 'custom'} framework)`);
    }

    /**
     * Detect available test framework
     * @returns {Promise<string|null>} Detected framework name
     * @private
     */
    async _detectTestFramework() {
        try {
            // Check for Jest
            try {
                execSync('npx jest --version', { stdio: 'ignore' });
                return 'jest';
            } catch (error) {
                // Jest not available
            }
            
            // Check for Mocha
            try {
                execSync('npx mocha --version', { stdio: 'ignore' });
                return 'mocha';
            } catch (error) {
                // Mocha not available
            }
            
            // No known framework detected
            this.log('warn', 'No standard test framework (Jest/Mocha) detected, using custom test runner');
            return null;
        } catch (error) {
            this.log('error', 'Error detecting test framework:', error);
            return null;
        }
    }

    /**
     * Run unit tests
     * @param {Object} options - Test options
     * @returns {Promise<Object>} Test results
     */
    async runTests(options = {}) {
        return this.executeOperation('runTests', async () => {
            const testOptions = { ...this.getConfig(), ...options };
            
            this.log('info', 'Running unit tests...');
            
            let results;
            
            // Run tests using the appropriate framework
            switch (this._testFramework) {
                case 'jest':
                    results = await this._runJestTests(testOptions);
                    break;
                case 'mocha':
                    results = await this._runMochaTests(testOptions);
                    break;
                default:
                    results = await this._runCustomTests(testOptions);
                    break;
            }
            
            // Store results
            this._testResults = results;
            
            this.log('info', `Unit tests completed: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);
            
            return results;
        });
    }

    /**
     * Run tests using Jest
     * @param {Object} options - Test options
     * @returns {Promise<Object>} Test results
     * @private
     */
    async _runJestTests(options) {
        return this.executeOperation('runJestTests', async () => {
            try {
                const { default: jest } = await import('jest');
                
                // Configure Jest options
                const jestOptions = {
                    ...options.jestOptions,
                    rootDir: process.cwd(),
                    testMatch: [path.join(options.testDir, options.testPattern)],
                    testPathIgnorePatterns: options.excludePatterns,
                    bail: options.bail,
                    verbose: true,
                    json: true
                };
                
                // Run Jest
                this.log('debug', 'Running Jest with options:', jestOptions);
                
                const { results } = await jest.runCLI(jestOptions, [process.cwd()]);
                
                // Parse results
                return {
                    total: results.numTotalTests,
                    passed: results.numPassedTests,
                    failed: results.numFailedTests,
                    skipped: results.numPendingTests,
                    duration: Date.now() - results.startTime,
                    coverage: results.coverageMap,
                    testResults: results.testResults.map(result => ({
                        name: result.testFilePath,
                        status: result.numFailingTests > 0 ? 'failed' : 'passed',
                        duration: result.perfStats.end - result.perfStats.start,
                        tests: result.testResults.map(test => ({
                            name: test.fullName,
                            status: test.status,
                            duration: test.duration
                        }))
                    }))
                };
            } catch (error) {
                this.log('error', 'Failed to run Jest tests:', error);
                throw error;
            }
        });
    }

    /**
     * Run tests using Mocha
     * @param {Object} options - Test options
     * @returns {Promise<Object>} Test results
     * @private
     */
    async _runMochaTests(options) {
        return this.executeOperation('runMochaTests', async () => {
            try {
                const { default: Mocha } = await import('mocha');
                const { default: glob } = await import('glob');
                
                // Find test files
                const testFiles = await glob(options.testPattern, {
                    cwd: path.join(process.cwd(), options.testDir),
                    ignore: options.excludePatterns,
                    absolute: true
                });
                
                if (testFiles.length === 0) {
                    this.log('warn', 'No test files found');
                    return {
                        total: 0,
                        passed: 0,
                        failed: 0,
                        skipped: 0,
                        duration: 0,
                        testResults: []
                    };
                }
                
                // Configure Mocha
                const mocha = new Mocha({
                    ...options.mochaOptions,
                    bail: options.bail,
                    timeout: options.timeout
                });
                
                // Add test files
                testFiles.forEach(file => mocha.addFile(file));
                
                // Run Mocha
                this.log('debug', `Running Mocha with ${testFiles.length} test files`);
                
                const startTime = Date.now();
                const results = {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0,
                    testResults: []
                };
                
                // Run tests and collect results
                await new Promise((resolve) => {
                    const runner = mocha.run(resolve);
                    
                    let currentSuite = null;
                    let currentTest = null;
                    
                    runner.on('suite', (suite) => {
                        if (suite.root) return;
                        
                        currentSuite = {
                            name: suite.title,
                            file: suite.file,
                            tests: []
                        };
                        
                        results.testResults.push(currentSuite);
                    });
                    
                    runner.on('test', (test) => {
                        currentTest = {
                            name: test.title,
                            fullName: test.fullTitle(),
                            status: 'pending',
                            duration: 0
                        };
                        
                        if (currentSuite) {
                            currentSuite.tests.push(currentTest);
                        }
                    });
                    
                    runner.on('pass', (test) => {
                        results.total++;
                        results.passed++;
                        
                        if (currentTest) {
                            currentTest.status = 'passed';
                            currentTest.duration = test.duration;
                        }
                    });
                    
                    runner.on('fail', (test) => {
                        results.total++;
                        results.failed++;
                        
                        if (currentTest) {
                            currentTest.status = 'failed';
                            currentTest.duration = test.duration;
                            currentTest.error = test.err.message;
                            currentTest.stack = test.err.stack;
                        }
                    });
                    
                    runner.on('pending', (test) => {
                        results.total++;
                        results.skipped++;
                        
                        if (currentTest) {
                            currentTest.status = 'skipped';
                        }
                    });
                });
                
                // Add duration
                results.duration = Date.now() - startTime;
                
                return results;
            } catch (error) {
                this.log('error', 'Failed to run Mocha tests:', error);
                throw error;
            }
        });
    }

    /**
     * Run tests using custom test runner
     * @param {Object} options - Test options
     * @returns {Promise<Object>} Test results
     * @private
     */
    async _runCustomTests(options) {
        return this.executeOperation('runCustomTests', async () => {
            try {
                const { default: glob } = await import('glob');
                
                // Find test files
                const testFiles = await glob(options.testPattern, {
                    cwd: path.join(process.cwd(), options.testDir),
                    ignore: options.excludePatterns,
                    absolute: true
                });
                
                if (testFiles.length === 0) {
                    this.log('warn', 'No test files found');
                    return {
                        total: 0,
                        passed: 0,
                        failed: 0,
                        skipped: 0,
                        duration: 0,
                        testResults: []
                    };
                }
                
                this.log('debug', `Running custom tests with ${testFiles.length} test files`);
                
                const startTime = Date.now();
                const results = {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0,
                    testResults: []
                };
                
                // Run each test file
                for (const file of testFiles) {
                    try {
                        this.log('debug', `Running tests in ${path.basename(file)}`);
                        
                        // Import test file
                        const testModule = require(file);
                        const testFn = testModule.default || testModule;
                        
                        if (typeof testFn !== 'function') {
                            this.log('warn', `Test file ${path.basename(file)} does not export a function`);
                            continue;
                        }
                        
                        // Create test context
                        const testContext = {
                            assert: require('assert'),
                            expect: (value) => ({
                                toBe: (expected) => {
                                    if (value !== expected) {
                                        throw new Error(`Expected ${value} to be ${expected}`);
                                    }
                                    return true;
                                },
                                toEqual: (expected) => {
                                    const isEqual = JSON.stringify(value) === JSON.stringify(expected);
                                    if (!isEqual) {
                                        throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
                                    }
                                    return true;
                                },
                                toBeGreaterThan: (expected) => {
                                    if (value <= expected) {
                                        throw new Error(`Expected ${value} to be greater than ${expected}`);
                                    }
                                    return true;
                                },
                                toBeLessThan: (expected) => {
                                    if (value >= expected) {
                                        throw new Error(`Expected ${value} to be less than ${expected}`);
                                    }
                                    return true;
                                }
                            }),
                            describe: (name, fn) => {
                                // Not implemented in simple runner
                                fn();
                            },
                            it: async (name, fn) => {
                                results.total++;
                                
                                try {
                                    await fn();
                                    results.passed++;
                                    return true;
                                } catch (error) {
                                    results.failed++;
                                    throw error;
                                }
                            },
                            skip: (name, fn) => {
                                results.total++;
                                results.skipped++;
                            }
                        };
                        
                        // Run tests
                        await testFn(testContext, options);
                        
                        this.log('debug', `Completed tests in ${path.basename(file)}`);
                    } catch (error) {
                        this.log('error', `Error running tests in ${path.basename(file)}:`, error);
                        results.failed++;
                    }
                }
                
                // Add duration
                results.duration = Date.now() - startTime;
                
                return results;
            } catch (error) {
                this.log('error', 'Failed to run custom tests:', error);
                throw error;
            }
        });
    }

    /**
     * Get test results
     * @returns {Object} Test results
     */
    getTestResults() {
        return this._testResults || {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            testResults: []
        };
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down unit test module');
        await super.shutdown();
    }
}

module.exports = UnitModule; 