/**
 * JMF Hosting Discord Bot - End-to-End Test Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides end-to-end testing capabilities for the test manager,
 * including test discovery, execution, and reporting for tests that verify
 * the entire system works together.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const { execSync, spawn } = require('child_process');
const os = require('os');

class E2EModule extends BaseModule {
    /**
     * Create a new end-to-end test module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager, {
            name: 'e2e',
            version: '1.0.0',
            defaultConfig: {
                testDir: 'tests/e2e',
                testPattern: '**/*.test.js',
                excludePatterns: ['**/node_modules/**', '**/dist/**'],
                timeout: 30000,
                bail: false,
                reporters: ['console'],
                setupScripts: [],
                teardownScripts: [],
                environmentSetup: {
                    startBot: true,
                    botOptions: {
                        configPath: 'config.test.json',
                        logLevel: 'debug',
                        disableCommands: ['admin', 'dangerous'],
                        mockDiscord: true
                    },
                    browserOptions: {
                        headless: true,
                        browser: 'chromium',
                        slowMo: 0,
                        timeout: 30000
                    }
                },
                recordVideo: false,
                screenshotOnFailure: true,
                screenshotDir: 'tests/screenshots'
            }
        });
        
        this._testResults = null;
        this._botProcess = null;
        this._browser = null;
        this._testEnvironment = null;
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Create test directory if it doesn't exist
        const testDir = path.join(process.cwd(), this.getConfig('testDir'));
        await fs.mkdir(testDir, { recursive: true });
        
        // Create screenshot directory if it doesn't exist and screenshots are enabled
        if (this.getConfig('screenshotOnFailure')) {
            const screenshotDir = path.join(process.cwd(), this.getConfig('screenshotDir'));
            await fs.mkdir(screenshotDir, { recursive: true });
        }
        
        this.log('info', 'End-to-end test module initialized');
    }

    /**
     * Set up the test environment
     * @returns {Promise<Object>} Environment details
     */
    async setupTestEnvironment() {
        return this.executeOperation('setupTestEnvironment', async () => {
            const envConfig = this.getConfig('environmentSetup');
            
            this.log('info', 'Setting up end-to-end test environment');
            
            // Create environment object to track resources
            this._testEnvironment = {
                startTime: Date.now(),
                services: {},
                mocks: {},
                cleanup: []
            };
            
            // Start the bot if configured
            if (envConfig.startBot) {
                await this._startBot(envConfig.botOptions);
            }
            
            // Set up browser for UI testing if needed
            await this._setupBrowser(envConfig.browserOptions);
            
            // Run any setup scripts
            await this._runScripts(this.getConfig('setupScripts'));
            
            this.log('info', 'Test environment setup complete');
            
            return this._testEnvironment;
        });
    }

    /**
     * Start the bot for testing
     * @param {Object} options - Bot options
     * @returns {Promise<void>}
     * @private
     */
    async _startBot(options) {
        return this.executeOperation('startBot', async () => {
            try {
                this.log('info', 'Starting bot for E2E testing');
                
                // Find the bot entry point
                const botEntryPoint = path.join(process.cwd(), 'index.js');
                
                try {
                    await fs.access(botEntryPoint);
                } catch (error) {
                    throw new Error('Bot entry point not found: index.js');
                }
                
                // Prepare environment variables for the bot
                const env = {
                    ...process.env,
                    NODE_ENV: 'test',
                    LOG_LEVEL: options.logLevel || 'debug',
                    CONFIG_PATH: options.configPath || 'config.test.json',
                    DISABLE_COMMANDS: options.disableCommands ? options.disableCommands.join(',') : '',
                    MOCK_DISCORD: options.mockDiscord ? 'true' : 'false'
                };
                
                // Start the bot as a separate process
                this.log('debug', 'Spawning bot process');
                
                this._botProcess = spawn('node', [botEntryPoint], {
                    env,
                    stdio: ['ignore', 'pipe', 'pipe']
                });
                
                // Handle bot output
                this._botProcess.stdout.on('data', (data) => {
                    this.log('debug', `[Bot] ${data.toString().trim()}`);
                });
                
                this._botProcess.stderr.on('data', (data) => {
                    this.log('error', `[Bot Error] ${data.toString().trim()}`);
                });
                
                // Handle bot exit
                this._botProcess.on('exit', (code) => {
                    if (code !== null) {
                        this.log('warn', `Bot process exited with code ${code}`);
                    }
                    this._botProcess = null;
                });
                
                // Add cleanup function
                this._testEnvironment.cleanup.push(async () => {
                    if (this._botProcess) {
                        this.log('debug', 'Stopping bot process');
                        this._botProcess.kill();
                        this._botProcess = null;
                    }
                });
                
                // Wait for bot to start
                this.log('debug', 'Waiting for bot to start');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Store bot info
                this._testEnvironment.services.bot = {
                    pid: this._botProcess.pid,
                    status: 'running'
                };
                
                this.log('info', 'Bot started for E2E testing');
            } catch (error) {
                this.log('error', 'Failed to start bot for testing:', error);
                throw error;
            }
        });
    }

    /**
     * Set up browser for UI testing
     * @param {Object} options - Browser options
     * @returns {Promise<void>}
     * @private
     */
    async _setupBrowser(options) {
        return this.executeOperation('setupBrowser', async () => {
            try {
                // Only set up browser if needed for tests
                const testFiles = await this._findTestFiles();
                const needsBrowser = await this._checkIfTestsNeedBrowser(testFiles);
                
                if (!needsBrowser) {
                    this.log('debug', 'No tests require browser, skipping browser setup');
                    return;
                }
                
                this.log('info', 'Setting up browser for E2E testing');
                
                try {
                    const { default: playwright } = await import('playwright');
                    
                    // Launch browser
                    const browserType = options.browser || 'chromium';
                    this.log('debug', `Launching ${browserType} browser`);
                    
                    this._browser = await playwright[browserType].launch({
                        headless: options.headless !== false,
                        slowMo: options.slowMo || 0
                    });
                    
                    // Add cleanup function
                    this._testEnvironment.cleanup.push(async () => {
                        if (this._browser) {
                            this.log('debug', 'Closing browser');
                            await this._browser.close();
                            this._browser = null;
                        }
                    });
                    
                    // Store browser info
                    this._testEnvironment.services.browser = {
                        type: browserType,
                        status: 'running'
                    };
                    
                    this.log('info', `Browser (${browserType}) started for E2E testing`);
                } catch (error) {
                    this.log('warn', 'Failed to set up browser:', error);
                    this.log('warn', 'Make sure playwright is installed: npm install playwright');
                }
            } catch (error) {
                this.log('error', 'Failed to set up browser for testing:', error);
                throw error;
            }
        });
    }

    /**
     * Check if any tests require a browser
     * @param {string[]} testFiles - List of test files
     * @returns {Promise<boolean>} True if any tests need a browser
     * @private
     */
    async _checkIfTestsNeedBrowser(testFiles) {
        // Simple check: look for browser-related keywords in test files
        for (const file of testFiles) {
            try {
                const content = await fs.readFile(file, 'utf8');
                if (content.includes('browser') || 
                    content.includes('page') || 
                    content.includes('playwright') || 
                    content.includes('puppeteer') ||
                    content.includes('selenium')) {
                    return true;
                }
            } catch (error) {
                // Ignore file read errors
            }
        }
        
        return false;
    }

    /**
     * Find test files
     * @returns {Promise<string[]>} List of test files
     * @private
     */
    async _findTestFiles() {
        const { default: glob } = await import('glob');
        
        const testOptions = this.getConfig();
        
        return glob(testOptions.testPattern, {
            cwd: path.join(process.cwd(), testOptions.testDir),
            ignore: testOptions.excludePatterns,
            absolute: true
        });
    }

    /**
     * Run setup or teardown scripts
     * @param {string[]} scripts - List of script paths to run
     * @returns {Promise<void>}
     * @private
     */
    async _runScripts(scripts) {
        return this.executeOperation('runScripts', async () => {
            if (!scripts || scripts.length === 0) {
                return;
            }
            
            this.log('debug', `Running ${scripts.length} scripts`);
            
            for (const scriptPath of scripts) {
                try {
                    const fullPath = path.join(process.cwd(), scriptPath);
                    
                    // Check if script exists
                    try {
                        await fs.access(fullPath);
                    } catch (error) {
                        this.log('warn', `Script not found: ${scriptPath}`);
                        continue;
                    }
                    
                    this.log('debug', `Running script: ${scriptPath}`);
                    
                    // Run script
                    if (scriptPath.endsWith('.js')) {
                        // Run JavaScript script
                        const script = require(fullPath);
                        if (typeof script === 'function') {
                            await script(this._testEnvironment);
                        } else if (typeof script.default === 'function') {
                            await script.default(this._testEnvironment);
                        } else {
                            this.log('warn', `Script does not export a function: ${scriptPath}`);
                        }
                    } else {
                        // Run shell script
                        execSync(`sh ${fullPath}`, {
                            stdio: 'inherit',
                            env: {
                                ...process.env,
                                TEST_ENV: JSON.stringify(this._testEnvironment)
                            }
                        });
                    }
                    
                    this.log('debug', `Script completed: ${scriptPath}`);
                } catch (error) {
                    this.log('error', `Error running script ${scriptPath}:`, error);
                    throw error;
                }
            }
            
            this.log('debug', 'All scripts completed');
        });
    }

    /**
     * Run end-to-end tests
     * @param {Object} options - Test options
     * @returns {Promise<Object>} Test results
     */
    async runTests(options = {}) {
        return this.executeOperation('runTests', async () => {
            const testOptions = { ...this.getConfig(), ...options };
            
            this.log('info', 'Running end-to-end tests...');
            
            // Set up test environment if not already set up
            if (!this._testEnvironment) {
                await this.setupTestEnvironment();
            }
            
            try {
                // Find test files
                const testFiles = await this._findTestFiles();
                
                if (testFiles.length === 0) {
                    this.log('warn', 'No end-to-end test files found');
                    return {
                        total: 0,
                        passed: 0,
                        failed: 0,
                        skipped: 0,
                        duration: 0,
                        testResults: []
                    };
                }
                
                this.log('debug', `Found ${testFiles.length} end-to-end test files`);
                
                // Run tests
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
                        this.log('debug', `Running E2E tests in ${path.basename(file)}`);
                        
                        // Import test file
                        const testModule = require(file);
                        const testFn = testModule.default || testModule;
                        
                        if (typeof testFn !== 'function') {
                            this.log('warn', `Test file ${path.basename(file)} does not export a function`);
                            continue;
                        }
                        
                        // Create test result object
                        const fileResult = {
                            file,
                            name: path.basename(file),
                            status: 'passed',
                            tests: [],
                            startTime: Date.now(),
                            endTime: 0,
                            duration: 0,
                            artifacts: []
                        };
                        
                        results.testResults.push(fileResult);
                        
                        // Create test context
                        const testContext = {
                            environment: this._testEnvironment,
                            browser: this._browser,
                            assert: require('assert'),
                            describe: (name, fn) => {
                                // Simple implementation for tracking
                                fn();
                            },
                            it: async (name, fn) => {
                                const testResult = {
                                    name,
                                    status: 'pending',
                                    startTime: Date.now(),
                                    endTime: 0,
                                    duration: 0,
                                    artifacts: []
                                };
                                
                                fileResult.tests.push(testResult);
                                results.total++;
                                
                                try {
                                    // Create a new browser page for each test
                                    let page = null;
                                    if (this._browser) {
                                        page = await this._browser.newPage();
                                        
                                        // Set up page event handlers
                                        page.on('console', msg => {
                                            this.log('debug', `[Browser Console] ${msg.text()}`);
                                        });
                                        
                                        page.on('pageerror', error => {
                                            this.log('error', `[Browser Error] ${error.message}`);
                                        });
                                        
                                        // Start recording video if enabled
                                        if (testOptions.recordVideo) {
                                            const videoPath = path.join(
                                                process.cwd(),
                                                testOptions.screenshotDir,
                                                `${path.basename(file, '.test.js')}_${name.replace(/\s+/g, '_')}.webm`
                                            );
                                            
                                            await page.video().start({
                                                path: videoPath,
                                                width: 1280,
                                                height: 720
                                            });
                                            
                                            testResult.artifacts.push({
                                                type: 'video',
                                                path: videoPath
                                            });
                                        }
                                    }
                                    
                                    // Run the test with the page
                                    await fn(page);
                                    
                                    // Stop recording video if enabled
                                    if (page && testOptions.recordVideo) {
                                        await page.video().stop();
                                    }
                                    
                                    // Close the page
                                    if (page) {
                                        await page.close();
                                    }
                                    
                                    testResult.status = 'passed';
                                    testResult.endTime = Date.now();
                                    testResult.duration = testResult.endTime - testResult.startTime;
                                    
                                    results.passed++;
                                } catch (error) {
                                    testResult.status = 'failed';
                                    testResult.endTime = Date.now();
                                    testResult.duration = testResult.endTime - testResult.startTime;
                                    testResult.error = error.message;
                                    testResult.stack = error.stack;
                                    
                                    // Take screenshot on failure if enabled
                                    if (this._browser && testOptions.screenshotOnFailure) {
                                        try {
                                            const page = await this._browser.newPage();
                                            const screenshotPath = path.join(
                                                process.cwd(),
                                                testOptions.screenshotDir,
                                                `failure_${path.basename(file, '.test.js')}_${name.replace(/\s+/g, '_')}.png`
                                            );
                                            
                                            await page.screenshot({ path: screenshotPath, fullPage: true });
                                            await page.close();
                                            
                                            testResult.artifacts.push({
                                                type: 'screenshot',
                                                path: screenshotPath
                                            });
                                            
                                            this.log('debug', `Failure screenshot saved to ${screenshotPath}`);
                                        } catch (screenshotError) {
                                            this.log('error', 'Failed to take failure screenshot:', screenshotError);
                                        }
                                    }
                                    
                                    fileResult.status = 'failed';
                                    results.failed++;
                                    
                                    this.log('error', `Test failed: ${name}`, error);
                                    
                                    if (testOptions.bail) {
                                        throw error;
                                    }
                                }
                            },
                            skip: (name) => {
                                const testResult = {
                                    name,
                                    status: 'skipped',
                                    startTime: Date.now(),
                                    endTime: Date.now(),
                                    duration: 0
                                };
                                
                                fileResult.tests.push(testResult);
                                results.total++;
                                results.skipped++;
                            }
                        };
                        
                        // Run tests
                        await testFn(testContext, testOptions);
                        
                        // Update file result
                        fileResult.endTime = Date.now();
                        fileResult.duration = fileResult.endTime - fileResult.startTime;
                        
                        this.log('debug', `Completed E2E tests in ${path.basename(file)}`);
                    } catch (error) {
                        if (testOptions.bail) {
                            this.log('error', `Aborting tests due to failure in ${path.basename(file)}:`, error);
                            break;
                        } else {
                            this.log('error', `Error running tests in ${path.basename(file)}:`, error);
                        }
                    }
                }
                
                // Add duration
                results.duration = Date.now() - startTime;
                
                // Store results
                this._testResults = results;
                
                this.log('info', `End-to-end tests completed: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);
                
                return results;
            } finally {
                // Don't tear down the environment here, as it might be needed for other tests
                // The teardown will be handled by the teardownTestEnvironment method
            }
        });
    }

    /**
     * Tear down the test environment
     * @returns {Promise<void>}
     */
    async teardownTestEnvironment() {
        return this.executeOperation('teardownTestEnvironment', async () => {
            if (!this._testEnvironment) {
                this.log('debug', 'No test environment to tear down');
                return;
            }
            
            this.log('info', 'Tearing down end-to-end test environment');
            
            try {
                // Run teardown scripts
                await this._runScripts(this.getConfig('teardownScripts'));
                
                // Run cleanup functions in reverse order
                for (const cleanup of [...this._testEnvironment.cleanup].reverse()) {
                    try {
                        await cleanup();
                    } catch (error) {
                        this.log('error', 'Error during environment cleanup:', error);
                    }
                }
                
                this.log('info', 'Test environment teardown complete');
            } catch (error) {
                this.log('error', 'Failed to tear down test environment:', error);
                throw error;
            } finally {
                this._testEnvironment = null;
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
        this.log('debug', 'Shutting down end-to-end test module');
        
        // Tear down test environment if it exists
        if (this._testEnvironment) {
            await this.teardownTestEnvironment();
        }
        
        await super.shutdown();
    }
}

module.exports = E2EModule; 