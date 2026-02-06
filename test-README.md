# JMF Bot Test Suite

This test suite provides comprehensive testing for all components of the JMF Hosting Discord Bot.

## Features

- Tests all major components of the bot
- Provides detailed, well-formatted logs
- Automatically fixes common issues (optional)
- Saves test results to a log file
- Color-coded output for easy reading

## Running the Tests

You can run the test suite using npm:

```bash
# Run the full test suite
npm run test:all

# Or use the system test alias
npm run test:system
```

## Test Components

The test suite checks the following components:

1. **Configuration**
   - Validates config files
   - Checks for missing or null configuration values

2. **Directory Structure**
   - Ensures all required directories exist
   - Creates missing directories if needed

3. **Database**
   - Tests database connection
   - Validates migration module
   - Checks for pending migrations

4. **Managers**
   - Tests logger manager
   - Tests monitor manager
   - Validates manager initialization

5. **Commands**
   - Loads and validates command files
   - Checks for required properties

6. **Events**
   - Loads and validates event files
   - Checks for required properties

## Configuration

You can configure the test suite by modifying the `config` object at the top of the `test.js` file:

```javascript
const config = {
    testTimeout: 30000, // 30 seconds
    outputFile: path.join(process.cwd(), 'test-results.log'),
    detailedLogs: true,
    fixIssues: true,
    components: {
        managers: true,
        database: true,
        modules: true,
        config: true,
        paths: true,
        migrations: true,
        commands: true,
        events: true
    }
};
```

### Options

- `testTimeout`: Maximum time (in ms) for each test to run before timing out
- `outputFile`: Path to save the test results log
- `detailedLogs`: Whether to include detailed logs in the output
- `fixIssues`: Whether to automatically fix common issues
- `components`: Enable/disable specific test components

## Test Results

The test results are displayed in the console and saved to the specified output file. The results include:

- Total number of tests run
- Number of passed tests
- Number of failed tests
- Number of warnings
- Number of skipped tests
- Total duration of the test run

## Exit Codes

- `0`: All tests passed (warnings are considered passing)
- `1`: One or more tests failed

## Troubleshooting

If you encounter issues with the test suite:

1. Check the test-results.log file for detailed error information
2. Ensure all dependencies are installed
3. Verify that the bot's configuration is correct
4. Check file permissions for directories that need to be created

## Adding Custom Tests

You can add custom tests by creating new test functions and adding them to the `runTests()` function. Each test function should return an object with the following properties:

```javascript
{
    status: 'passed' | 'failed' | 'warning' | 'skipped',
    message: 'Test result message'
}
``` 