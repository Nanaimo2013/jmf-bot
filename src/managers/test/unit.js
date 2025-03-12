const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const logger = new Logger('UnitTest');

async function runJest(testPath) {
    return new Promise((resolve, reject) => {
        const jest = spawn('npx', ['jest', testPath, '--verbose'], {
            stdio: 'inherit'
        });

        jest.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Jest tests failed with code ${code}`));
            }
        });

        jest.on('error', (err) => {
            reject(err);
        });
    });
}

async function findTestFiles() {
    const testDir = path.join('src', '__tests__', 'unit');
    await fs.ensureDir(testDir);

    const files = await fs.readdir(testDir);
    return files.filter(f => f.endsWith('.test.js') || f.endsWith('.spec.js'));
}

async function validateTestFiles(files) {
    if (files.length === 0) {
        logger.warn('No unit test files found');
        return false;
    }

    let allValid = true;
    for (const file of files) {
        try {
            const testPath = path.join('src', '__tests__', 'unit', file);
            const content = await fs.readFile(testPath, 'utf8');
            
            // Basic validation that it looks like a test file
            if (!content.includes('describe(') || !content.includes('test(') || !content.includes('expect(')) {
                logger.warn(`Test file ${file} may not be properly formatted`);
                allValid = false;
            }
        } catch (error) {
            logger.error(`Error validating test file ${file}:`, error);
            allValid = false;
        }
    }

    return allValid;
}

export default async function unit() {
    try {
        logger.info('Starting unit tests...');

        // Find test files
        const testFiles = await findTestFiles();
        
        // Validate test files
        const isValid = await validateTestFiles(testFiles);
        if (!isValid) {
            logger.warn('Some test files may have issues');
        }

        // Run tests
        const testPath = path.join('src', '__tests__', 'unit');
        await runJest(testPath);

        logger.success('Unit tests completed successfully');
        return true;
    } catch (error) {
        logger.error('Unit tests failed:', error);
        throw error;
    }
} 