/**
 * Example Integration Test for JMF Hosting Discord Bot
 * 
 * This file demonstrates how to write integration tests using the test manager.
 */

/**
 * Example database service to test
 */
class DatabaseService {
    constructor() {
        this.data = new Map();
    }

    async connect() {
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
    }

    async get(key) {
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 50));
        return this.data.get(key);
    }

    async set(key, value) {
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 50));
        this.data.set(key, value);
        return true;
    }

    async delete(key) {
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 50));
        return this.data.delete(key);
    }
}

/**
 * Example API service that uses the database
 */
class ApiService {
    constructor(database) {
        this.database = database;
    }

    async initialize() {
        await this.database.connect();
        return true;
    }

    async getUser(userId) {
        const user = await this.database.get(`user:${userId}`);
        return user;
    }

    async createUser(userId, userData) {
        await this.database.set(`user:${userId}`, userData);
        return userData;
    }

    async updateUser(userId, userData) {
        const existingUser = await this.database.get(`user:${userId}`);
        if (!existingUser) {
            throw new Error(`User ${userId} not found`);
        }
        
        const updatedUser = { ...existingUser, ...userData };
        await this.database.set(`user:${userId}`, updatedUser);
        return updatedUser;
    }

    async deleteUser(userId) {
        return this.database.delete(`user:${userId}`);
    }
}

/**
 * Main test function
 * @param {Object} test - Test context with assertion utilities and environment
 */
module.exports = async function(test) {
    // Services to test
    let database;
    let api;
    
    // Setup before tests
    test.describe('API Service Integration Tests', () => {
        // Setup before each test
        database = new DatabaseService();
        api = new ApiService(database);
        
        // Test API initialization
        test.it('should initialize the API service', async () => {
            const result = await api.initialize();
            test.assert.strictEqual(result, true);
        });
        
        // Test user creation and retrieval
        test.it('should create and retrieve a user', async () => {
            const userData = { name: 'Test User', email: 'test@example.com' };
            
            // Create user
            await api.createUser('123', userData);
            
            // Retrieve user
            const user = await api.getUser('123');
            
            test.assert.deepStrictEqual(user, userData);
        });
        
        // Test user update
        test.it('should update a user', async () => {
            const userData = { name: 'Test User', email: 'test@example.com' };
            const updateData = { email: 'updated@example.com' };
            
            // Create user
            await api.createUser('456', userData);
            
            // Update user
            const updatedUser = await api.updateUser('456', updateData);
            
            test.assert.strictEqual(updatedUser.name, userData.name);
            test.assert.strictEqual(updatedUser.email, updateData.email);
            
            // Verify update in database
            const user = await api.getUser('456');
            test.assert.deepStrictEqual(user, updatedUser);
        });
        
        // Test error handling
        test.it('should throw an error when updating non-existent user', async () => {
            const updateData = { email: 'updated@example.com' };
            
            try {
                await api.updateUser('999', updateData);
                // If we get here, the test should fail
                test.assert.fail('Expected an error but none was thrown');
            } catch (error) {
                test.assert.strictEqual(error.message, 'User 999 not found');
            }
        });
        
        // Test user deletion
        test.it('should delete a user', async () => {
            const userData = { name: 'Test User', email: 'test@example.com' };
            
            // Create user
            await api.createUser('789', userData);
            
            // Verify user exists
            let user = await api.getUser('789');
            test.assert.deepStrictEqual(user, userData);
            
            // Delete user
            const result = await api.deleteUser('789');
            test.assert.strictEqual(result, true);
            
            // Verify user no longer exists
            user = await api.getUser('789');
            test.assert.strictEqual(user, undefined);
        });
    });
};

// If this file is run directly, execute the tests
if (require.main === module) {
    const { TestManager } = require('../index');
    const IntegrationModule = require('../modules/integration.module');
    
    async function runTest() {
        const testManager = new TestManager();
        await testManager.initialize();
        
        // Register the integration test module
        const integrationModule = new IntegrationModule(testManager);
        await integrationModule.initialize();
        
        // Set up test environment
        await integrationModule.setupTestEnvironment();
        
        try {
            // Run the tests in this file
            const results = await integrationModule.runTests({
                testDir: __dirname,
                testPattern: 'integration.test.example.js'
            });
            
            console.log('Test Results:', results);
            
            return results;
        } finally {
            // Tear down test environment
            await integrationModule.teardownTestEnvironment();
            
            // Shutdown
            await integrationModule.shutdown();
            await testManager.shutdown();
        }
    }
    
    runTest().catch(console.error);
} 