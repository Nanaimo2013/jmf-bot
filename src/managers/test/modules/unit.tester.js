const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const logger = require('../../../utils/logger');

const execAsync = promisify(exec);

class UnitTester {
    constructor(manager) {
        this.manager = manager;
        this.name = 'unit';
        this.testEnvironment = null;
    }

    async setup() {
        try {
            // Set up test environment
            this.testEnvironment = {
                NODE_ENV: 'test',
                ...process.env
            };

            // Install test dependencies if needed
            await execAsync('npm install --save-dev jest @types/jest');
            
            return true;
        } catch (error) {
            logger.error('Failed to set up unit tests:', error);
            throw error;
        }
    }

    async runTests(options = {}) {
        try {
            const testCommand = options.coverage 
                ? 'jest --coverage' 
                : 'jest';

            const { stdout, stderr } = await execAsync(testCommand, {
                env: this.testEnvironment
            });

            // Parse Jest output to get test results
            const results = this.parseJestOutput(stdout);
            
            if (stderr) {
                logger.warn('Warnings during unit tests:', stderr);
            }

            return results;
        } catch (error) {
            logger.error('Unit tests failed:', error);
            return {
                total: 0,
                passed: 0,
                failed: 1,
                skipped: 0,
                error: error.message
            };
        }
    }

    parseJestOutput(output) {
        // Simple parsing of Jest output
        const results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
        };

        try {
            const lines = output.split('\n');
            for (const line of lines) {
                if (line.includes('Tests:')) {
                    const matches = line.match(/(\d+) passed, (\d+) failed, (\d+) skipped/);
                    if (matches) {
                        results.passed = parseInt(matches[1]);
                        results.failed = parseInt(matches[2]);
                        results.skipped = parseInt(matches[3]);
                        results.total = results.passed + results.failed + results.skipped;
                    }
                }
            }
        } catch (error) {
            logger.error('Failed to parse Jest output:', error);
        }

        return results;
    }

    async cleanup() {
        this.testEnvironment = null;
    }
}

module.exports = UnitTester; 