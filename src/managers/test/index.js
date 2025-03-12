const { BaseManager } = require('../base.manager');
const { Logger } = require('../logger');
const path = require('path');

class TestManager extends BaseManager {
    constructor() {
        super('TestManager');
        this.logger = new Logger('TestManager');
    }

    async init() {
        this.logger.info('Starting test suite...');
        
        try {
            // Run unit tests
            await this.runUnitTests();
            
            // Run integration tests
            await this.runIntegrationTests();
            
            // Run end-to-end tests
            await this.runE2ETests();
            
            this.logger.success('All tests completed successfully!');
        } catch (error) {
            this.logger.error('Tests failed:', error);
            process.exit(1);
        }
    }

    async runUnitTests() {
        this.logger.info('Running unit tests...');
        const { default: unit } = await import('./unit.js');
        await unit();
    }

    async runIntegrationTests() {
        this.logger.info('Running integration tests...');
        const { default: integration } = await import('./integration.js');
        await integration();
    }

    async runE2ETests() {
        this.logger.info('Running end-to-end tests...');
        const { default: e2e } = await import('./e2e.js');
        await e2e();
    }
}

// Run the test manager
const manager = new TestManager();
manager.init().catch(console.error); 