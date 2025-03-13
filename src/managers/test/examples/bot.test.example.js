/**
 * JMF Hosting Discord Bot - Bot Manager Test Example
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file provides examples of how to test the Bot Manager and its components
 * using the Test Manager. It includes tests for commands, events, and interactions.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const path = require('path');
const { TestManager } = require('../test.manager');
const BotManager = require('../../bot');
const { Collection } = require('discord.js');
const assert = require('assert');

/**
 * Run bot manager tests
 * @param {Object} options - Test options
 * @returns {Promise<void>}
 */
async function runBotTests(options = {}) {
    // Create test manager
    const testManager = new TestManager({
        name: 'bot-tests',
        logLevel: options.logLevel || 'info'
    });
    
    // Register test suite
    testManager.registerTestSuite({
        name: 'Bot Manager Tests',
        description: 'Tests for the Discord bot manager',
        
        // Setup function - runs before all tests
        setup: async () => {
            // Create bot manager
            const botManager = new BotManager({
                defaultConfig: {
                    token: 'test-token',
                    clientId: 'test-client-id',
                    guildId: 'test-guild-id',
                    commandsPath: path.join(__dirname, 'fixtures', 'commands'),
                    eventsPath: path.join(__dirname, 'fixtures', 'events')
                }
            });
            
            // Create test environment
            const testEnv = await botManager.createTestEnvironment();
            
            // Create mock commands for testing
            botManager.commands = new Collection();
            botManager.commands.set('ping', {
                data: { name: 'ping' },
                execute: jest.fn().mockResolvedValue(true)
            });
            
            botManager.commands.set('echo', {
                data: { name: 'echo' },
                execute: jest.fn().mockImplementation(async (interaction) => {
                    const text = interaction.options.getString('text');
                    await interaction.reply(text);
                    return true;
                })
            });
            
            // Create mock events for testing
            botManager.events = new Collection();
            botManager.events.set('ready', {
                name: 'ready',
                once: true,
                execute: jest.fn()
            });
            
            return {
                botManager,
                mockClient: testEnv.mockClient
            };
        },
        
        // Teardown function - runs after all tests
        teardown: async (context) => {
            await context.botManager.cleanupTestEnvironment();
        },
        
        // Test cases
        tests: [
            {
                name: 'should initialize bot manager',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Check if bot manager is initialized
                    assert.strictEqual(botManager.isInitialized(), true, 'Bot manager should be initialized');
                    
                    // Check if client is created
                    assert.notStrictEqual(botManager.client, null, 'Client should be created');
                    
                    // Check if commands and events collections are created
                    assert.strictEqual(botManager.commands instanceof Collection, true, 'Commands collection should be created');
                    assert.strictEqual(botManager.events instanceof Collection, true, 'Events collection should be created');
                }
            },
            
            {
                name: 'should handle command interactions',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Create mock interaction
                    const mockInteraction = {
                        commandName: 'ping',
                        user: { id: '123456789', tag: 'TestUser#1234' },
                        reply: jest.fn().mockResolvedValue(true),
                        deferReply: jest.fn().mockResolvedValue(true)
                    };
                    
                    // Handle command interaction
                    await botManager._handleCommandInteraction(mockInteraction);
                    
                    // Check if command was executed
                    const pingCommand = botManager.commands.get('ping');
                    expect(pingCommand.execute).toHaveBeenCalledWith(mockInteraction, botManager);
                }
            },
            
            {
                name: 'should handle echo command with parameters',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Create mock interaction with options
                    const mockInteraction = {
                        commandName: 'echo',
                        user: { id: '123456789', tag: 'TestUser#1234' },
                        options: {
                            getString: jest.fn().mockReturnValue('Hello, world!')
                        },
                        reply: jest.fn().mockResolvedValue(true)
                    };
                    
                    // Handle command interaction
                    await botManager._handleCommandInteraction(mockInteraction);
                    
                    // Check if command was executed
                    const echoCommand = botManager.commands.get('echo');
                    expect(echoCommand.execute).toHaveBeenCalledWith(mockInteraction, botManager);
                    
                    // Check if reply was called with the correct text
                    expect(mockInteraction.reply).toHaveBeenCalledWith('Hello, world!');
                }
            },
            
            {
                name: 'should handle button interactions',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Add button handler to ping command
                    botManager.commands.get('ping').buttons = {
                        'ping_refresh': jest.fn().mockResolvedValue(true)
                    };
                    
                    // Create mock button interaction
                    const mockInteraction = {
                        customId: 'ping_refresh',
                        user: { id: '123456789', tag: 'TestUser#1234' },
                        reply: jest.fn().mockResolvedValue(true)
                    };
                    
                    // Handle button interaction
                    await botManager._handleButtonInteraction(mockInteraction);
                    
                    // Check if button handler was called
                    expect(botManager.commands.get('ping').buttons['ping_refresh']).toHaveBeenCalledWith(mockInteraction, botManager);
                }
            },
            
            {
                name: 'should handle select menu interactions',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Add select menu handler to ping command
                    botManager.commands.get('ping').selectMenus = {
                        'ping_options': jest.fn().mockResolvedValue(true)
                    };
                    
                    // Create mock select menu interaction
                    const mockInteraction = {
                        customId: 'ping_options',
                        user: { id: '123456789', tag: 'TestUser#1234' },
                        values: ['option1', 'option2'],
                        reply: jest.fn().mockResolvedValue(true)
                    };
                    
                    // Handle select menu interaction
                    await botManager._handleSelectMenuInteraction(mockInteraction);
                    
                    // Check if select menu handler was called
                    expect(botManager.commands.get('ping').selectMenus['ping_options']).toHaveBeenCalledWith(mockInteraction, botManager);
                }
            },
            
            {
                name: 'should handle modal submit interactions',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Add modal handler to ping command
                    botManager.commands.get('ping').modals = {
                        'ping_feedback': jest.fn().mockResolvedValue(true)
                    };
                    
                    // Create mock modal submit interaction
                    const mockInteraction = {
                        customId: 'ping_feedback',
                        user: { id: '123456789', tag: 'TestUser#1234' },
                        fields: {
                            getTextInputValue: jest.fn().mockReturnValue('Great bot!')
                        },
                        reply: jest.fn().mockResolvedValue(true)
                    };
                    
                    // Handle modal submit interaction
                    await botManager._handleModalSubmitInteraction(mockInteraction);
                    
                    // Check if modal handler was called
                    expect(botManager.commands.get('ping').modals['ping_feedback']).toHaveBeenCalledWith(mockInteraction, botManager);
                }
            },
            
            {
                name: 'should enforce command cooldowns',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Set cooldown configuration
                    botManager._config.cooldowns = {
                        default: 3,
                        commands: {
                            'ping': 1
                        }
                    };
                    
                    // Create mock interaction
                    const mockInteraction = {
                        commandName: 'ping',
                        user: { id: '123456789', tag: 'TestUser#1234' },
                        reply: jest.fn().mockResolvedValue(true)
                    };
                    
                    // First execution should work
                    await botManager._handleCommandInteraction(mockInteraction);
                    expect(botManager.commands.get('ping').execute).toHaveBeenCalled();
                    
                    // Reset mock
                    botManager.commands.get('ping').execute.mockClear();
                    
                    // Second execution should be on cooldown
                    await botManager._handleCommandInteraction(mockInteraction);
                    expect(botManager.commands.get('ping').execute).not.toHaveBeenCalled();
                    expect(mockInteraction.reply).toHaveBeenCalledWith(expect.stringContaining('Please wait'));
                    
                    // Wait for cooldown to expire
                    await new Promise(resolve => setTimeout(resolve, 1100));
                    
                    // Reset mock
                    mockInteraction.reply.mockClear();
                    botManager.commands.get('ping').execute.mockClear();
                    
                    // Third execution should work again
                    await botManager._handleCommandInteraction(mockInteraction);
                    expect(botManager.commands.get('ping').execute).toHaveBeenCalled();
                }
            },
            
            {
                name: 'should get bot status',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Get status
                    const status = await botManager.getStatus();
                    
                    // Check status properties
                    assert.strictEqual(status.name, 'bot', 'Status should have correct name');
                    assert.strictEqual(status.version, '1.1.0', 'Status should have correct version');
                    assert.strictEqual(status.testMode, true, 'Status should indicate test mode');
                    assert.strictEqual(status.commands, 2, 'Status should show correct command count');
                    assert.strictEqual(status.events, 1, 'Status should show correct event count');
                    assert.notStrictEqual(status.client, null, 'Status should include client info');
                }
            }
        ]
    });
    
    // Run the tests
    await testManager.initialize();
    const results = await testManager.runTests('Bot Manager Tests');
    
    // Log results
    console.log(`Bot Manager Tests: ${results.passed}/${results.total} tests passed`);
    
    // Return results
    return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runBotTests().catch(error => {
        console.error('Error running bot tests:', error);
        process.exit(1);
    });
}

module.exports = { runBotTests }; 