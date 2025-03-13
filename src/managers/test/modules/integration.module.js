/**
 * JMF Hosting Discord Bot - Integration Test Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides integration testing capabilities for the test manager,
 * including test discovery, execution, and reporting for tests that verify
 * the interaction between multiple components.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const { execSync, spawn } = require('child_process');
const os = require('os');

class IntegrationModule extends BaseModule {
    /**
     * Create a new integration test module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager, {
            name: 'integration',
            version: '1.0.0',
            defaultConfig: {
                testDir: 'tests/integration',
                testPattern: '**/*.test.js',
                excludePatterns: ['**/node_modules/**', '**/dist/**'],
                timeout: 10000,
                bail: false,
                reporters: ['console'],
                setupScripts: [],
                teardownScripts: [],
                environmentSetup: {
                    useDocker: false,
                    dockerComposeFile: 'docker-compose.test.yml',
                    mockServices: true,
                    mockConfig: {
                        database: {
                            type: 'sqlite',
                            memory: true
                        },
                        redis: {
                            mock: true
                        },
                        api: {
                            mock: true,
                            port: 0 // random port
                        }
                    }
                }
            }
        });
        
        this._testResults = null;
        this._mockServers = new Map();
        this._dockerServices = new Map();
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
        
        this.log('info', 'Integration test module initialized');
    }

    /**
     * Set up the test environment
     * @returns {Promise<Object>} Environment details
     */
    async setupTestEnvironment() {
        return this.executeOperation('setupTestEnvironment', async () => {
            const envConfig = this.getConfig('environmentSetup');
            
            this.log('info', 'Setting up integration test environment');
            
            // Create environment object to track resources
            this._testEnvironment = {
                startTime: Date.now(),
                services: {},
                mocks: {},
                cleanup: []
            };
            
            // Set up Docker services if configured
            if (envConfig.useDocker) {
                await this._setupDockerServices(envConfig);
            }
            
            // Set up mock services if configured
            if (envConfig.mockServices) {
                await this._setupMockServices(envConfig.mockConfig);
            }
            
            // Run any setup scripts
            await this._runScripts(this.getConfig('setupScripts'));
            
            this.log('info', 'Test environment setup complete');
            
            return this._testEnvironment;
        });
    }

    /**
     * Set up Docker services for testing
     * @param {Object} config - Docker configuration
     * @returns {Promise<void>}
     * @private
     */
    async _setupDockerServices(config) {
        return this.executeOperation('setupDockerServices', async () => {
            try {
                this.log('info', 'Starting Docker services');
                
                // Check if Docker is available
                try {
                    execSync('docker --version', { stdio: 'ignore' });
                } catch (error) {
                    throw new Error('Docker is not available. Please install Docker to run integration tests with Docker services.');
                }
                
                // Check if docker-compose file exists
                const composeFile = path.join(process.cwd(), config.dockerComposeFile);
                try {
                    await fs.access(composeFile);
                } catch (error) {
                    throw new Error(`Docker Compose file not found: ${config.dockerComposeFile}`);
                }
                
                // Start Docker services
                this.log('debug', `Starting Docker services using ${config.dockerComposeFile}`);
                
                execSync(`docker-compose -f ${composeFile} up -d`, {
                    stdio: 'inherit'
                });
                
                // Add cleanup function
                this._testEnvironment.cleanup.push(async () => {
                    this.log('debug', 'Stopping Docker services');
                    execSync(`docker-compose -f ${composeFile} down`, {
                        stdio: 'inherit'
                    });
                });
                
                // Wait for services to be ready
                this.log('debug', 'Waiting for Docker services to be ready');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Get service info
                const services = execSync(`docker-compose -f ${composeFile} ps --format json`)
                    .toString()
                    .trim()
                    .split('\n')
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch (error) {
                            return null;
                        }
                    })
                    .filter(Boolean);
                
                // Store service info
                for (const service of services) {
                    this._testEnvironment.services[service.Service] = {
                        id: service.ID,
                        name: service.Service,
                        state: service.State,
                        ports: service.Ports
                    };
                }
                
                this.log('info', `Started ${services.length} Docker services`);
            } catch (error) {
                this.log('error', 'Failed to set up Docker services:', error);
                throw error;
            }
        });
    }

    /**
     * Set up mock services for testing
     * @param {Object} config - Mock service configuration
     * @returns {Promise<void>}
     * @private
     */
    async _setupMockServices(config) {
        return this.executeOperation('setupMockServices', async () => {
            try {
                this.log('info', 'Setting up mock services');
                
                // Set up mock database if configured
                if (config.database) {
                    await this._setupMockDatabase(config.database);
                }
                
                // Set up mock Redis if configured
                if (config.redis && config.redis.mock) {
                    await this._setupMockRedis(config.redis);
                }
                
                // Set up mock API if configured
                if (config.api && config.api.mock) {
                    await this._setupMockApi(config.api);
                }
                
                this.log('info', 'Mock services setup complete');
            } catch (error) {
                this.log('error', 'Failed to set up mock services:', error);
                throw error;
            }
        });
    }

    /**
     * Set up a mock database for testing
     * @param {Object} config - Database configuration
     * @returns {Promise<void>}
     * @private
     */
    async _setupMockDatabase(config) {
        return this.executeOperation('setupMockDatabase', async () => {
            try {
                this.log('debug', 'Setting up mock database');
                
                let db;
                
                // Set up database based on type
                switch (config.type) {
                    case 'sqlite':
                        try {
                            const { default: sqlite3 } = await import('sqlite3');
                            
                            // Create in-memory or file-based SQLite database
                            if (config.memory) {
                                db = new sqlite3.Database(':memory:');
                                this.log('debug', 'Created in-memory SQLite database');
                            } else {
                                const dbPath = path.join(os.tmpdir(), `test-${Date.now()}.db`);
                                db = new sqlite3.Database(dbPath);
                                this.log('debug', `Created SQLite database at ${dbPath}`);
                                
                                // Add cleanup function
                                this._testEnvironment.cleanup.push(async () => {
                                    await fs.unlink(dbPath).catch(() => {});
                                });
                            }
                            
                            // Store database connection
                            this._testEnvironment.mocks.database = db;
                            
                            // Add cleanup function
                            this._testEnvironment.cleanup.push(async () => {
                                await new Promise((resolve, reject) => {
                                    db.close(err => {
                                        if (err) reject(err);
                                        else resolve();
                                    });
                                });
                            });
                        } catch (error) {
                            this.log('warn', 'Failed to set up SQLite database:', error);
                            this.log('warn', 'Make sure sqlite3 is installed: npm install sqlite3');
                        }
                        break;
                        
                    default:
                        this.log('warn', `Unsupported database type: ${config.type}`);
                        break;
                }
                
                this.log('debug', 'Mock database setup complete');
            } catch (error) {
                this.log('error', 'Failed to set up mock database:', error);
                throw error;
            }
        });
    }

    /**
     * Set up a mock Redis server for testing
     * @param {Object} config - Redis configuration
     * @returns {Promise<void>}
     * @private
     */
    async _setupMockRedis(config) {
        return this.executeOperation('setupMockRedis', async () => {
            try {
                this.log('debug', 'Setting up mock Redis');
                
                try {
                    const { default: RedisMock } = await import('redis-mock');
                    
                    // Create mock Redis client
                    const redisClient = RedisMock.createClient();
                    
                    // Store Redis client
                    this._testEnvironment.mocks.redis = redisClient;
                    
                    // Add cleanup function
                    this._testEnvironment.cleanup.push(async () => {
                        await new Promise(resolve => {
                            redisClient.quit(() => resolve());
                        });
                    });
                    
                    this.log('debug', 'Mock Redis setup complete');
                } catch (error) {
                    this.log('warn', 'Failed to set up mock Redis:', error);
                    this.log('warn', 'Make sure redis-mock is installed: npm install redis-mock');
                }
            } catch (error) {
                this.log('error', 'Failed to set up mock Redis:', error);
                throw error;
            }
        });
    }

    /**
     * Set up a mock API server for testing
     * @param {Object} config - API configuration
     * @returns {Promise<void>}
     * @private
     */
    async _setupMockApi(config) {
        return this.executeOperation('setupMockApi', async () => {
            try {
                this.log('debug', 'Setting up mock API server');
                
                try {
                    const { default: express } = await import('express');
                    const { default: bodyParser } = await import('body-parser');
                    const { default: http } = await import('http');
                    
                    // Create Express app
                    const app = express();
                    app.use(bodyParser.json());
                    
                    // Add basic routes
                    app.get('/health', (req, res) => {
                        res.json({ status: 'ok' });
                    });
                    
                    app.get('/api/test', (req, res) => {
                        res.json({ message: 'This is a test endpoint' });
                    });
                    
                    // Create HTTP server
                    const server = http.createServer(app);
                    
                    // Start server on random port or specified port
                    const port = config.port || 0;
                    
                    await new Promise((resolve, reject) => {
                        server.listen(port, () => {
                            const address = server.address();
                            this._testEnvironment.mocks.api = {
                                server,
                                port: address.port,
                                url: `http://localhost:${address.port}`
                            };
                            
                            this.log('debug', `Mock API server listening on port ${address.port}`);
                            resolve();
                        });
                        
                        server.on('error', reject);
                    });
                    
                    // Add cleanup function
                    this._testEnvironment.cleanup.push(async () => {
                        await new Promise(resolve => {
                            server.close(() => resolve());
                        });
                    });
                    
                    this.log('debug', 'Mock API server setup complete');
                } catch (error) {
                    this.log('warn', 'Failed to set up mock API server:', error);
                    this.log('warn', 'Make sure express and body-parser are installed: npm install express body-parser');
                }
            } catch (error) {
                this.log('error', 'Failed to set up mock API server:', error);
                throw error;
            }
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
     * Run integration tests
     * @param {Object} options - Test options
     * @returns {Promise<Object>} Test results
     */
    async runTests(options = {}) {
        return this.executeOperation('runTests', async () => {
            const testOptions = { ...this.getConfig(), ...options };
            
            this.log('info', 'Running integration tests...');
            
            // Set up test environment if not already set up
            if (!this._testEnvironment) {
                await this.setupTestEnvironment();
            }
            
            try {
                // Find test files
                const { default: glob } = await import('glob');
                
                const testFiles = await glob(testOptions.testPattern, {
                    cwd: path.join(process.cwd(), testOptions.testDir),
                    ignore: testOptions.excludePatterns,
                    absolute: true
                });
                
                if (testFiles.length === 0) {
                    this.log('warn', 'No integration test files found');
                    return {
                        total: 0,
                        passed: 0,
                        failed: 0,
                        skipped: 0,
                        duration: 0,
                        testResults: []
                    };
                }
                
                this.log('debug', `Found ${testFiles.length} integration test files`);
                
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
                        this.log('debug', `Running integration tests in ${path.basename(file)}`);
                        
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
                            duration: 0
                        };
                        
                        results.testResults.push(fileResult);
                        
                        // Create test context
                        const testContext = {
                            environment: this._testEnvironment,
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
                                    duration: 0
                                };
                                
                                fileResult.tests.push(testResult);
                                results.total++;
                                
                                try {
                                    await fn();
                                    
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
                        
                        this.log('debug', `Completed integration tests in ${path.basename(file)}`);
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
                
                this.log('info', `Integration tests completed: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);
                
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
            
            this.log('info', 'Tearing down integration test environment');
            
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
        this.log('debug', 'Shutting down integration test module');
        
        // Tear down test environment if it exists
        if (this._testEnvironment) {
            await this.teardownTestEnvironment();
        }
        
        await super.shutdown();
    }
}

module.exports = IntegrationModule; 