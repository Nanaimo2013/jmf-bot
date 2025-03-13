/**
 * JMF Hosting Discord Bot - Coverage Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides code coverage capabilities for the test manager,
 * including instrumentation, collection, and reporting of code coverage metrics.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');

class CoverageModule extends BaseModule {
    /**
     * Create a new coverage module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager, {
            name: 'coverage',
            version: '1.0.0',
            defaultConfig: {
                enabled: true,
                reportDir: 'coverage',
                tempDir: '.nyc_output',
                include: ['src/**/*.js'],
                exclude: [
                    'src/**/*.test.js',
                    'src/**/*.spec.js',
                    'src/**/*.mock.js',
                    'src/tests/**',
                    'node_modules/**'
                ],
                reporters: ['lcov', 'text', 'html'],
                watermarks: {
                    statements: [50, 80],
                    branches: [50, 80],
                    functions: [50, 80],
                    lines: [50, 80]
                },
                thresholds: {
                    statements: 70,
                    branches: 60,
                    functions: 70,
                    lines: 70
                },
                checkThresholds: false,
                instrumenter: 'nyc', // 'nyc' or 'istanbul'
                perFile: true,
                clean: true
            }
        });
        
        this._coverageData = null;
        this._instrumenter = null;
        this._isInstrumented = false;
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Create coverage directory if it doesn't exist
        const reportDir = path.join(process.cwd(), this.getConfig('reportDir'));
        await fs.mkdir(reportDir, { recursive: true });
        
        // Create temp directory if it doesn't exist
        const tempDir = path.join(process.cwd(), this.getConfig('tempDir'));
        await fs.mkdir(tempDir, { recursive: true });
        
        this.log('info', 'Coverage module initialized');
    }

    /**
     * Instrument code for coverage
     * @returns {Promise<void>}
     */
    async instrumentCode() {
        return this.executeOperation('instrumentCode', async () => {
            if (!this.getConfig('enabled')) {
                this.log('debug', 'Coverage is disabled, skipping instrumentation');
                return;
            }
            
            if (this._isInstrumented) {
                this.log('debug', 'Code is already instrumented');
                return;
            }
            
            this.log('info', 'Instrumenting code for coverage');
            
            const instrumenter = this.getConfig('instrumenter');
            
            try {
                switch (instrumenter) {
                    case 'nyc':
                        await this._instrumentWithNyc();
                        break;
                    case 'istanbul':
                        await this._instrumentWithIstanbul();
                        break;
                    default:
                        throw new Error(`Unsupported instrumenter: ${instrumenter}`);
                }
                
                this._isInstrumented = true;
                
                this.log('info', 'Code instrumentation complete');
            } catch (error) {
                this.log('error', 'Failed to instrument code:', error);
                throw error;
            }
        });
    }

    /**
     * Instrument code using NYC
     * @returns {Promise<void>}
     * @private
     */
    async _instrumentWithNyc() {
        return this.executeOperation('instrumentWithNyc', async () => {
            try {
                // Check if nyc is installed
                try {
                    execSync('npx nyc --version', { stdio: 'ignore' });
                } catch (error) {
                    this.log('warn', 'NYC is not installed. Installing...');
                    execSync('npm install --no-save nyc', { stdio: 'inherit' });
                }
                
                // Clean previous coverage data if configured
                if (this.getConfig('clean')) {
                    await this._cleanCoverageData();
                }
                
                // Set up NYC environment variables
                process.env.NYC_CONFIG = JSON.stringify({
                    cwd: process.cwd(),
                    include: this.getConfig('include'),
                    exclude: this.getConfig('exclude'),
                    reporter: this.getConfig('reporters'),
                    'report-dir': this.getConfig('reportDir'),
                    'temp-dir': this.getConfig('tempDir'),
                    all: true
                });
                
                // Load NYC programmatically
                const { default: NYC } = await import('nyc');
                
                // Create NYC instance
                this._instrumenter = new NYC({
                    cwd: process.cwd(),
                    include: this.getConfig('include'),
                    exclude: this.getConfig('exclude'),
                    reporter: this.getConfig('reporters'),
                    'report-dir': this.getConfig('reportDir'),
                    'temp-dir': this.getConfig('tempDir'),
                    all: true
                });
                
                // Instrument code
                await this._instrumenter.wrap();
                
                this.log('debug', 'Code instrumented with NYC');
            } catch (error) {
                this.log('error', 'Failed to instrument code with NYC:', error);
                throw error;
            }
        });
    }

    /**
     * Instrument code using Istanbul
     * @returns {Promise<void>}
     * @private
     */
    async _instrumentWithIstanbul() {
        return this.executeOperation('instrumentWithIstanbul', async () => {
            try {
                // Check if istanbul is installed
                try {
                    execSync('npx istanbul --version', { stdio: 'ignore' });
                } catch (error) {
                    this.log('warn', 'Istanbul is not installed. Installing...');
                    execSync('npm install --no-save istanbul', { stdio: 'inherit' });
                }
                
                // Clean previous coverage data if configured
                if (this.getConfig('clean')) {
                    await this._cleanCoverageData();
                }
                
                // Set up Istanbul environment variables
                process.env.ISTANBUL_COVER_CONFIG = JSON.stringify({
                    root: process.cwd(),
                    include: this.getConfig('include'),
                    exclude: this.getConfig('exclude'),
                    reporter: this.getConfig('reporters'),
                    'report-dir': this.getConfig('reportDir'),
                    'temp-dir': this.getConfig('tempDir')
                });
                
                // Load Istanbul programmatically
                const { createInstrumenter } = await import('istanbul-lib-instrument');
                const { createCoverageMap } = await import('istanbul-lib-coverage');
                
                // Create instrumenter
                this._instrumenter = createInstrumenter({
                    coverageVariable: '__coverage__',
                    preserveComments: true,
                    compact: false,
                    esModules: true,
                    autoWrap: true
                });
                
                // Create coverage map
                this._coverageData = createCoverageMap({});
                
                // Hook into require to instrument code on the fly
                const { hookRequire } = await import('istanbul-lib-hook');
                
                // Match files to instrument
                const { matcherFor } = await import('istanbul-lib-source-maps');
                const matcher = matcherFor({
                    includes: this.getConfig('include'),
                    excludes: this.getConfig('exclude')
                });
                
                // Hook require
                hookRequire(
                    (filePath) => matcher(filePath),
                    (code, filePath) => this._instrumenter.instrumentSync(code, filePath)
                );
                
                this.log('debug', 'Code instrumented with Istanbul');
            } catch (error) {
                this.log('error', 'Failed to instrument code with Istanbul:', error);
                throw error;
            }
        });
    }

    /**
     * Clean previous coverage data
     * @returns {Promise<void>}
     * @private
     */
    async _cleanCoverageData() {
        return this.executeOperation('cleanCoverageData', async () => {
            try {
                this.log('debug', 'Cleaning previous coverage data');
                
                // Clean report directory
                const reportDir = path.join(process.cwd(), this.getConfig('reportDir'));
                await fs.rm(reportDir, { recursive: true, force: true });
                await fs.mkdir(reportDir, { recursive: true });
                
                // Clean temp directory
                const tempDir = path.join(process.cwd(), this.getConfig('tempDir'));
                await fs.rm(tempDir, { recursive: true, force: true });
                await fs.mkdir(tempDir, { recursive: true });
                
                this.log('debug', 'Previous coverage data cleaned');
            } catch (error) {
                this.log('error', 'Failed to clean coverage data:', error);
                throw error;
            }
        });
    }

    /**
     * Collect coverage data
     * @returns {Promise<Object>} Coverage data
     */
    async collectCoverage() {
        return this.executeOperation('collectCoverage', async () => {
            if (!this.getConfig('enabled')) {
                this.log('debug', 'Coverage is disabled, skipping collection');
                return null;
            }
            
            if (!this._isInstrumented) {
                this.log('warn', 'Code is not instrumented, cannot collect coverage');
                return null;
            }
            
            this.log('info', 'Collecting coverage data');
            
            const instrumenter = this.getConfig('instrumenter');
            
            try {
                let coverageData;
                
                switch (instrumenter) {
                    case 'nyc':
                        coverageData = await this._collectNycCoverage();
                        break;
                    case 'istanbul':
                        coverageData = await this._collectIstanbulCoverage();
                        break;
                    default:
                        throw new Error(`Unsupported instrumenter: ${instrumenter}`);
                }
                
                this._coverageData = coverageData;
                
                this.log('info', 'Coverage data collected');
                
                return coverageData;
            } catch (error) {
                this.log('error', 'Failed to collect coverage data:', error);
                throw error;
            }
        });
    }

    /**
     * Collect coverage data from NYC
     * @returns {Promise<Object>} Coverage data
     * @private
     */
    async _collectNycCoverage() {
        return this.executeOperation('collectNycCoverage', async () => {
            try {
                if (!this._instrumenter) {
                    throw new Error('NYC instrumenter not initialized');
                }
                
                // Get coverage data from global variable
                const coverageData = global.__coverage__ || {};
                
                // Write coverage data to disk
                const tempDir = path.join(process.cwd(), this.getConfig('tempDir'));
                const coverageFile = path.join(tempDir, 'coverage.json');
                
                await fs.writeFile(coverageFile, JSON.stringify(coverageData), 'utf8');
                
                this.log('debug', 'NYC coverage data collected');
                
                return coverageData;
            } catch (error) {
                this.log('error', 'Failed to collect NYC coverage data:', error);
                throw error;
            }
        });
    }

    /**
     * Collect coverage data from Istanbul
     * @returns {Promise<Object>} Coverage data
     * @private
     */
    async _collectIstanbulCoverage() {
        return this.executeOperation('collectIstanbulCoverage', async () => {
            try {
                // Get coverage data from global variable
                const coverageData = global.__coverage__ || {};
                
                // Write coverage data to disk
                const tempDir = path.join(process.cwd(), this.getConfig('tempDir'));
                const coverageFile = path.join(tempDir, 'coverage.json');
                
                await fs.writeFile(coverageFile, JSON.stringify(coverageData), 'utf8');
                
                this.log('debug', 'Istanbul coverage data collected');
                
                return coverageData;
            } catch (error) {
                this.log('error', 'Failed to collect Istanbul coverage data:', error);
                throw error;
            }
        });
    }

    /**
     * Generate coverage reports
     * @returns {Promise<Object>} Report summary
     */
    async generateReports() {
        return this.executeOperation('generateReports', async () => {
            if (!this.getConfig('enabled')) {
                this.log('debug', 'Coverage is disabled, skipping report generation');
                return null;
            }
            
            if (!this._coverageData && !this._isInstrumented) {
                this.log('warn', 'No coverage data available, cannot generate reports');
                return null;
            }
            
            this.log('info', 'Generating coverage reports');
            
            const instrumenter = this.getConfig('instrumenter');
            
            try {
                let reportSummary;
                
                switch (instrumenter) {
                    case 'nyc':
                        reportSummary = await this._generateNycReports();
                        break;
                    case 'istanbul':
                        reportSummary = await this._generateIstanbulReports();
                        break;
                    default:
                        throw new Error(`Unsupported instrumenter: ${instrumenter}`);
                }
                
                // Check thresholds if configured
                if (this.getConfig('checkThresholds')) {
                    await this._checkThresholds(reportSummary);
                }
                
                this.log('info', 'Coverage reports generated');
                
                return reportSummary;
            } catch (error) {
                this.log('error', 'Failed to generate coverage reports:', error);
                throw error;
            }
        });
    }

    /**
     * Generate coverage reports using NYC
     * @returns {Promise<Object>} Report summary
     * @private
     */
    async _generateNycReports() {
        return this.executeOperation('generateNycReports', async () => {
            try {
                if (!this._instrumenter) {
                    throw new Error('NYC instrumenter not initialized');
                }
                
                // Generate reports
                await this._instrumenter.writeCoverageFile();
                
                // Run NYC report command
                const reporters = this.getConfig('reporters').join(',');
                const reportDir = this.getConfig('reportDir');
                const tempDir = this.getConfig('tempDir');
                
                execSync(`npx nyc report --reporter=${reporters} --report-dir=${reportDir} --temp-dir=${tempDir}`, {
                    stdio: 'inherit'
                });
                
                // Read summary report
                const summaryPath = path.join(process.cwd(), reportDir, 'coverage-summary.json');
                let summary;
                
                try {
                    const summaryData = await fs.readFile(summaryPath, 'utf8');
                    summary = JSON.parse(summaryData);
                } catch (error) {
                    this.log('warn', 'Could not read coverage summary:', error);
                    summary = {
                        total: {
                            lines: { pct: 0 },
                            statements: { pct: 0 },
                            functions: { pct: 0 },
                            branches: { pct: 0 }
                        }
                    };
                }
                
                // Format summary
                const reportSummary = {
                    lines: summary.total.lines.pct,
                    statements: summary.total.statements.pct,
                    functions: summary.total.functions.pct,
                    branches: summary.total.branches.pct,
                    files: Object.keys(summary).filter(key => key !== 'total').length,
                    reportPath: path.join(reportDir, 'index.html')
                };
                
                this.log('debug', 'NYC reports generated');
                
                return reportSummary;
            } catch (error) {
                this.log('error', 'Failed to generate NYC reports:', error);
                throw error;
            }
        });
    }

    /**
     * Generate coverage reports using Istanbul
     * @returns {Promise<Object>} Report summary
     * @private
     */
    async _generateIstanbulReports() {
        return this.executeOperation('generateIstanbulReports', async () => {
            try {
                // Run Istanbul report command
                const reporters = this.getConfig('reporters').join(' ');
                const reportDir = this.getConfig('reportDir');
                const tempDir = this.getConfig('tempDir');
                
                execSync(`npx istanbul report ${reporters} --dir=${reportDir} --root=${tempDir}`, {
                    stdio: 'inherit'
                });
                
                // Read summary report
                const summaryPath = path.join(process.cwd(), reportDir, 'coverage-summary.json');
                let summary;
                
                try {
                    const summaryData = await fs.readFile(summaryPath, 'utf8');
                    summary = JSON.parse(summaryData);
                } catch (error) {
                    this.log('warn', 'Could not read coverage summary:', error);
                    summary = {
                        total: {
                            lines: { pct: 0 },
                            statements: { pct: 0 },
                            functions: { pct: 0 },
                            branches: { pct: 0 }
                        }
                    };
                }
                
                // Format summary
                const reportSummary = {
                    lines: summary.total.lines.pct,
                    statements: summary.total.statements.pct,
                    functions: summary.total.functions.pct,
                    branches: summary.total.branches.pct,
                    files: Object.keys(summary).filter(key => key !== 'total').length,
                    reportPath: path.join(reportDir, 'index.html')
                };
                
                this.log('debug', 'Istanbul reports generated');
                
                return reportSummary;
            } catch (error) {
                this.log('error', 'Failed to generate Istanbul reports:', error);
                throw error;
            }
        });
    }

    /**
     * Check coverage thresholds
     * @param {Object} summary - Coverage summary
     * @returns {Promise<boolean>} True if thresholds are met
     * @private
     */
    async _checkThresholds(summary) {
        return this.executeOperation('checkThresholds', async () => {
            try {
                const thresholds = this.getConfig('thresholds');
                
                this.log('debug', 'Checking coverage thresholds');
                
                const failures = [];
                
                // Check each threshold
                if (summary.statements < thresholds.statements) {
                    failures.push(`Statements: ${summary.statements}% < ${thresholds.statements}%`);
                }
                
                if (summary.branches < thresholds.branches) {
                    failures.push(`Branches: ${summary.branches}% < ${thresholds.branches}%`);
                }
                
                if (summary.functions < thresholds.functions) {
                    failures.push(`Functions: ${summary.functions}% < ${thresholds.functions}%`);
                }
                
                if (summary.lines < thresholds.lines) {
                    failures.push(`Lines: ${summary.lines}% < ${thresholds.lines}%`);
                }
                
                // Report failures
                if (failures.length > 0) {
                    this.log('warn', 'Coverage thresholds not met:');
                    failures.forEach(failure => this.log('warn', `- ${failure}`));
                    return false;
                }
                
                this.log('debug', 'All coverage thresholds met');
                return true;
            } catch (error) {
                this.log('error', 'Failed to check coverage thresholds:', error);
                throw error;
            }
        });
    }

    /**
     * Get coverage summary
     * @returns {Object} Coverage summary
     */
    getCoverageSummary() {
        if (!this._coverageData) {
            return {
                lines: 0,
                statements: 0,
                functions: 0,
                branches: 0,
                files: 0,
                reportPath: null
            };
        }
        
        // Return cached summary if available
        if (this._coverageSummary) {
            return this._coverageSummary;
        }
        
        // Try to read summary from disk
        try {
            const reportDir = this.getConfig('reportDir');
            const summaryPath = path.join(process.cwd(), reportDir, 'coverage-summary.json');
            
            const summaryData = fs.readFileSync(summaryPath, 'utf8');
            const summary = JSON.parse(summaryData);
            
            this._coverageSummary = {
                lines: summary.total.lines.pct,
                statements: summary.total.statements.pct,
                functions: summary.total.functions.pct,
                branches: summary.total.branches.pct,
                files: Object.keys(summary).filter(key => key !== 'total').length,
                reportPath: path.join(reportDir, 'index.html')
            };
            
            return this._coverageSummary;
        } catch (error) {
            // Return default summary if file not found
            return {
                lines: 0,
                statements: 0,
                functions: 0,
                branches: 0,
                files: 0,
                reportPath: null
            };
        }
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down coverage module');
        
        // Generate final reports if instrumented
        if (this._isInstrumented && !this._coverageSummary) {
            try {
                await this.collectCoverage();
                await this.generateReports();
            } catch (error) {
                this.log('error', 'Error generating final coverage reports:', error);
            }
        }
        
        await super.shutdown();
    }
}

module.exports = CoverageModule; 