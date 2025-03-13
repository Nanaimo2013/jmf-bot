/**
 * Example Unit Test for JMF Hosting Discord Bot
 * 
 * This file demonstrates how to write unit tests using the test manager.
 */

/**
 * Example function to test
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum of a and b
 */
function add(a, b) {
    return a + b;
}

/**
 * Example function with async behavior
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {Promise<number>} Promise that resolves to the sum of a and b
 */
async function addAsync(a, b) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(a + b);
        }, 100);
    });
}

/**
 * Main test function
 * @param {Object} test - Test context with assertion utilities
 */
module.exports = async function(test) {
    // Basic test
    test.it('should add two numbers correctly', () => {
        const result = add(2, 3);
        test.assert.strictEqual(result, 5);
    });
    
    // Test with expect syntax
    test.it('should add two numbers correctly using expect', () => {
        const result = add(4, 5);
        test.expect(result).toBe(9);
    });
    
    // Async test
    test.it('should add two numbers asynchronously', async () => {
        const result = await addAsync(6, 7);
        test.assert.strictEqual(result, 13);
    });
    
    // Test that should be skipped
    test.skip('this test is skipped', () => {
        test.assert.strictEqual(1, 2); // This would fail if not skipped
    });
    
    // Test with setup and teardown
    let testValue;
    
    // Setup before test
    testValue = 10;
    
    test.it('should use the setup value', () => {
        testValue += 5;
        test.assert.strictEqual(testValue, 15);
    });
    
    // Teardown after test
    testValue = null;
};

// If this file is run directly, execute the tests
if (require.main === module) {
    const { TestManager } = require('../index');
    const UnitModule = require('../modules/unit.module');
    
    async function runTest() {
        const testManager = new TestManager();
        await testManager.initialize();
        
        // Register the unit test module
        const unitModule = new UnitModule(testManager);
        await unitModule.initialize();
        
        // Run the tests in this file
        const results = await unitModule.runTests({
            testDir: __dirname,
            testPattern: 'unit.test.example.js'
        });
        
        console.log('Test Results:', results);
        
        // Shutdown
        await unitModule.shutdown();
        await testManager.shutdown();
        
        return results;
    }
    
    runTest().catch(console.error);
} 