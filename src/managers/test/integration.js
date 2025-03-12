const { Logger } = require('../logger');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const logger = new Logger('IntegrationTest');

async function setupTestDatabase() {
    const testDbPath = path.join('data', 'test.sqlite');
    
    // Remove existing test database
    await fs.remove(testDbPath);
    
    // Create new test database
    const db = await open({
        filename: testDbPath,
        driver: sqlite3.Database
    });
    
    // Run migrations on test database
    const migrationsDir = path.join('src', 'database', 'migrations');
    const migrations = await fs.readdir(migrationsDir);
    
    for (const migration of migrations.sort()) {
        const sql = await fs.readFile(path.join(migrationsDir, migration), 'utf8');
        await db.exec(sql.split('-- Down')[0]); // Only run the "Up" part
    }
    
    await db.close();
    logger.info('Test database setup completed');
}

async function setupTestEnvironment() {
    // Create test config
    const testConfig = {
        database: {
            type: 'sqlite',
            path: path.join('data', 'test.sqlite')
        },
        discord: {
            token: 'test_token',
            clientId: 'test_client_id',
            guildId: 'test_guild_id'
        }
    };
    
    await fs.writeJson(path.join('config', 'test.json'), testConfig, { spaces: 2 });
    logger.info('Test configuration created');
}

async function runIntegrationTests() {
    return new Promise((resolve, reject) => {
        const jest = spawn('npx', [
            'jest',
            path.join('src', '__tests__', 'integration'),
            '--verbose',
            '--runInBand' // Run tests serially
        ], {
            stdio: 'inherit',
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });

        jest.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Integration tests failed with code ${code}`));
            }
        });

        jest.on('error', (err) => {
            reject(err);
        });
    });
}

async function validateIntegrationTests() {
    const testDir = path.join('src', '__tests__', 'integration');
    await fs.ensureDir(testDir);
    
    const files = await fs.readdir(testDir);
    const testFiles = files.filter(f => f.endsWith('.test.js') || f.endsWith('.spec.js'));
    
    if (testFiles.length === 0) {
        logger.warn('No integration test files found');
        return false;
    }
    
    let allValid = true;
    for (const file of testFiles) {
        try {
            const testPath = path.join(testDir, file);
            const content = await fs.readFile(testPath, 'utf8');
            
            // Check for integration test patterns
            if (!content.includes('describe(') || 
                !content.includes('beforeAll(') || 
                !content.includes('afterAll(')) {
                logger.warn(`Integration test file ${file} may be missing setup/teardown`);
                allValid = false;
            }
        } catch (error) {
            logger.error(`Error validating integration test file ${file}:`, error);
            allValid = false;
        }
    }
    
    return allValid;
}

async function cleanup() {
    // Remove test database
    await fs.remove(path.join('data', 'test.sqlite'));
    
    // Remove test config
    await fs.remove(path.join('config', 'test.json'));
    
    logger.info('Test environment cleaned up');
}

export default async function integration() {
    try {
        logger.info('Starting integration tests...');
        
        // Validate tests
        const isValid = await validateIntegrationTests();
        if (!isValid) {
            logger.warn('Some integration tests may have issues');
        }
        
        // Setup test environment
        await setupTestEnvironment();
        await setupTestDatabase();
        
        // Run tests
        await runIntegrationTests();
        
        // Cleanup
        await cleanup();
        
        logger.success('Integration tests completed successfully');
        return true;
    } catch (error) {
        logger.error('Integration tests failed:', error);
        throw error;
    }
} 