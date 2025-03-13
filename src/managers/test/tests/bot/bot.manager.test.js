/**
 * JMF Hosting Discord Bot - Bot Manager Test
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This file contains tests for the Bot Manager, including tests for
 * command loading, event handling, interaction processing, and more.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const path = require('path');
const { TestManager } = require('../../test.manager');
const BotManager = require('../../../bot/bot.manager');
const LoggerManager = require('../../../logger/logger.manager');
const DatabaseManager = require('../../../database');
const { Collection, Client, Events } = require('discord.js');
const fs = require('fs').promises;

/**
 * Run bot manager tests
 * @param {Object} options - Test options
 * @returns {Promise<Object>} - Test results
 */
async function runBotManagerTests(options = {}) {
    // Create test manager
    const testManager = new TestManager({
        name: 'bot-manager-tests',
        logLevel: options.logLevel || 'info'
    });
    
    // Register test suite
    testManager.registerTestSuite({
        name: 'Bot Manager Tests',
        description: 'Tests for the Discord bot manager',
        
        // Setup function - runs before all tests
        setup: async () => {
            // Create logger manager
            const loggerManager = new LoggerManager();
            await loggerManager.initialize({
                level: 'debug',
                directory: path.join(process.cwd(), 'logs', 'tests', 'bot')
            });
            
            // Create database manager
            const dbManager = new DatabaseManager();
            await dbManager.initialize({
                client: 'sqlite',
                connection: {
                    filename: ':memory:'
                },
                useNullAsDefault: true
            });
            
            // Create bot manager with test configuration
            const botManager = new BotManager({
                defaultConfig: {
                    token: 'test-token',
                    clientId: 'test-client-id',
                    guildId: 'test-guild-id',
                    prefix: '!',
                    owners: ['test-owner-id'],
                    devMode: true,
                    testGuildId: 'test-guild-id',
                    commandsPath: path.join(process.cwd(), 'src', 'commands'),
                    eventsPath: path.join(process.cwd(), 'src', 'events'),
                    embedsPath: path.join(process.cwd(), 'src', 'embeds'),
                    cooldowns: {
                        default: 3,
                        commands: {
                            ping: 1
                        }
                    }
                }
            });
            
            // Register dependencies
            botManager.registerManager('logger', loggerManager);
            botManager.registerManager('database', dbManager);
            
            // Create test environment
            const testEnv = await botManager.createTestEnvironment();
            
            // Create mock commands for testing
            botManager.commands = new Collection();
            botManager.commands.set('ping', {
                data: { name: 'ping', description: 'Ping command' },
                execute: jest.fn().mockResolvedValue(true),
                cooldown: 1
            });
            
            botManager.commands.set('echo', {
                data: { name: 'echo', description: 'Echo command' },
                execute: jest.fn().mockImplementation(async (interaction) => {
                    const text = interaction.options.getString('text');
                    await interaction.reply(text);
                    return true;
                })
            });
            
            botManager.commands.set('owner', {
                data: { name: 'owner', description: 'Owner-only command' },
                execute: jest.fn().mockResolvedValue(true),
                ownerOnly: true
            });
            
            // Create mock events for testing
            botManager.events = new Collection();
            botManager.events.set('ready', {
                name: 'ready',
                once: true,
                execute: jest.fn()
            });
            
            botManager.events.set('messageCreate', {
                name: 'messageCreate',
                once: false,
                execute: jest.fn()
            });
            
            return {
                botManager,
                loggerManager,
                dbManager,
                mockClient: testEnv.mockClient
            };
        },
        
        // Teardown function - runs after all tests
        teardown: async (context) => {
            await context.botManager.cleanupTestEnvironment();
            await context.dbManager.shutdown();
            await context.loggerManager.shutdown();
        },
        
        // Test cases
        tests: [
            {
                name: 'should initialize bot manager',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Check if bot manager is initialized
                    testManager.assert.strictEqual(botManager.isInitialized(), true, 'Bot manager should be initialized');
                    
                    // Check if client is created
                    testManager.assert.notStrictEqual(botManager.client, null, 'Client should be created');
                    
                    // Check if commands and events collections are created
                    testManager.assert.strictEqual(botManager.commands instanceof Collection, true, 'Commands collection should be created');
                    testManager.assert.strictEqual(botManager.events instanceof Collection, true, 'Events collection should be created');
                }
            },
            
            {
                name: 'should load commands from directory',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Create temporary command files for testing
                    const tempDir = path.join(process.cwd(), 'temp', 'commands', 'test');
                    await fs.mkdir(tempDir, { recursive: true });
                    
                    // Create test command file
                    const commandContent = `
                        module.exports = {
                            data: {
                                name: 'test',
                                description: 'Test command'
                            },
                            execute: async (interaction) => {
                                await interaction.reply('Test command executed');
                            }
                        };
                    `;
                    
                    await fs.writeFile(path.join(tempDir, 'test.js'), commandContent);
                    
                    // Set commands path to temp directory
                    botManager._config.commandsPath = path.join(process.cwd(), 'temp', 'commands');
                    
                    // Clear existing commands
                    botManager.commands.clear();
                    
                    // Load commands
                    await botManager._loadCommands();
                    
                    // Check if command was loaded
                    testManager.assert.strictEqual(botManager.commands.has('test'), true, 'Test command should be loaded');
                    
                    // Clean up
                    await fs.rm(path.join(process.cwd(), 'temp'), { recursive: true, force: true });
                }
            },
            
            {
                name: 'should load events from directory',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Create temporary event files for testing
                    const tempDir = path.join(process.cwd(), 'temp', 'events');
                    await fs.mkdir(tempDir, { recursive: true });
                    
                    // Create test event file
                    const eventContent = `
                        module.exports = {
                            name: 'testEvent',
                            once: false,
                            execute: async (manager, ...args) => {
                                // Test event handler
                            }
                        };
                    `;
                    
                    await fs.writeFile(path.join(tempDir, 'testEvent.js'), eventContent);
                    
                    // Set events path to temp directory
                    botManager._config.eventsPath = path.join(process.cwd(), 'temp', 'events');
                    
                    // Clear existing events
                    botManager.events.clear();
                    
                    // Load events
                    await botManager._loadEvents();
                    
                    // Check if event was loaded
                    testManager.assert.strictEqual(botManager.events.has('testEvent'), true, 'Test event should be loaded');
                    
                    // Clean up
                    await fs.rm(path.join(process.cwd(), 'temp'), { recursive: true, force: true });
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
                    testManager.assert.strictEqual(pingCommand.execute.mock.calls.length, 1, 'Ping command should be executed');
                    testManager.assert.deepStrictEqual(pingCommand.execute.mock.calls[0][0], mockInteraction, 'Command should be executed with the interaction');
                }
            },
            
            {
                name: 'should enforce command cooldowns',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Reset cooldowns
                    botManager.cooldowns.clear();
                    
                    // Create mock interaction
                    const mockInteraction = {
                        commandName: 'ping',
                        user: { id: '123456789', tag: 'TestUser#1234' },
                        reply: jest.fn().mockResolvedValue(true)
                    };
                    
                    // First execution should work
                    await botManager._handleCommandInteraction(mockInteraction);
                    testManager.assert.strictEqual(botManager.commands.get('ping').execute.mock.calls.length, 1, 'Command should be executed on first call');
                    
                    // Reset mock
                    botManager.commands.get('ping').execute.mockClear();
                    mockInteraction.reply.mockClear();
                    
                    // Second execution should be on cooldown
                    await botManager._handleCommandInteraction(mockInteraction);
                    testManager.assert.strictEqual(botManager.commands.get('ping').execute.mock.calls.length, 0, 'Command should not be executed when on cooldown');
                    testManager.assert.strictEqual(mockInteraction.reply.mock.calls.length, 1, 'Cooldown message should be sent');
                    testManager.assert.strictEqual(mockInteraction.reply.mock.calls[0][0].content.includes('Please wait'), true, 'Cooldown message should mention waiting');
                    
                    // Wait for cooldown to expire
                    await new Promise(resolve => setTimeout(resolve, 1100));
                    
                    // Reset mocks
                    botManager.commands.get('ping').execute.mockClear();
                    mockInteraction.reply.mockClear();
                    
                    // Third execution should work again
                    await botManager._handleCommandInteraction(mockInteraction);
                    testManager.assert.strictEqual(botManager.commands.get('ping').execute.mock.calls.length, 1, 'Command should be executed after cooldown expires');
                }
            },
            
            {
                name: 'should enforce owner-only commands',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Create mock interaction for non-owner
                    const nonOwnerInteraction = {
                        commandName: 'owner',
                        user: { id: 'non-owner-id', tag: 'NonOwner#1234' },
                        reply: jest.fn().mockResolvedValue(true)
                    };
                    
                    // Handle non-owner interaction
                    await botManager._handleCommandInteraction(nonOwnerInteraction);
                    
                    // Check if command was not executed
                    const ownerCommand = botManager.commands.get('owner');
                    testManager.assert.strictEqual(ownerCommand.execute.mock.calls.length, 0, 'Owner command should not be executed by non-owner');
                    testManager.assert.strictEqual(nonOwnerInteraction.reply.mock.calls.length, 1, 'Permission denied message should be sent');
                    testManager.assert.strictEqual(nonOwnerInteraction.reply.mock.calls[0][0].content.includes('only be used by the bot owner'), true, 'Message should mention owner-only');
                    
                    // Reset mocks
                    ownerCommand.execute.mockClear();
                    
                    // Create mock interaction for owner
                    const ownerInteraction = {
                        commandName: 'owner',
                        user: { id: 'test-owner-id', tag: 'Owner#1234' },
                        reply: jest.fn().mockResolvedValue(true)
                    };
                    
                    // Handle owner interaction
                    await botManager._handleCommandInteraction(ownerInteraction);
                    
                    // Check if command was executed
                    testManager.assert.strictEqual(ownerCommand.execute.mock.calls.length, 1, 'Owner command should be executed by owner');
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
                    testManager.assert.strictEqual(botManager.commands.get('ping').buttons['ping_refresh'].mock.calls.length, 1, 'Button handler should be called');
                    testManager.assert.deepStrictEqual(botManager.commands.get('ping').buttons['ping_refresh'].mock.calls[0][0], mockInteraction, 'Button handler should be called with the interaction');
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
                    testManager.assert.strictEqual(botManager.commands.get('ping').selectMenus['ping_options'].mock.calls.length, 1, 'Select menu handler should be called');
                    testManager.assert.deepStrictEqual(botManager.commands.get('ping').selectMenus['ping_options'].mock.calls[0][0], mockInteraction, 'Select menu handler should be called with the interaction');
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
                    testManager.assert.strictEqual(botManager.commands.get('ping').modals['ping_feedback'].mock.calls.length, 1, 'Modal handler should be called');
                    testManager.assert.deepStrictEqual(botManager.commands.get('ping').modals['ping_feedback'].mock.calls[0][0], mockInteraction, 'Modal handler should be called with the interaction');
                }
            },
            
            {
                name: 'should register commands with Discord API',
                run: async (context) => {
                    const { botManager } = context;
                    
                    // Mock REST API
                    botManager.rest = {
                        put: jest.fn().mockResolvedValue([])
                    };
                    
                    // Register commands
                    await botManager._registerCommands();
                    
                    // Check if REST API was called
                    testManager.assert.strictEqual(botManager.rest.put.mock.calls.length, 1, 'REST API should be called to register commands');
                }
            },
            
            {
                name: 'should get bot status',
                run: async (context) => {
                    const { botManager, mockClient } = context;
                    
                    // Set up mock client properties
                    mockClient.user = { tag: 'TestBot#0000', id: '000000000000000000' };
                    mockClient.ws = { status: 0, ping: 42 };
                    mockClient.uptime = 60000;
                    mockClient.guilds = { cache: new Map([['guild1', {}], ['guild2', {}]]) };
                    mockClient.users = { cache: new Map([['user1', {}], ['user2', {}], ['user3', {}]]) };
                    
                    // Get status
                    const status = await botManager.getStatus();
                    
                    // Check status properties
                    testManager.assert.strictEqual(status.name, 'bot', 'Status should have correct name');
                    testManager.assert.strictEqual(status.version, '1.1.0', 'Status should have correct version');
                    testManager.assert.strictEqual(status.client.tag, 'TestBot#0000', 'Status should have correct client tag');
                    testManager.assert.strictEqual(status.client.ping, 42, 'Status should have correct ping');
                    testManager.assert.strictEqual(status.client.uptime, 60000, 'Status should have correct uptime');
                    testManager.assert.strictEqual(status.client.guilds, 2, 'Status should have correct guild count');
                    testManager.assert.strictEqual(status.client.users, 3, 'Status should have correct user count');
                    testManager.assert.strictEqual(status.commands, 3, 'Status should have correct command count');
                    testManager.assert.strictEqual(status.events, 2, 'Status should have correct event count');
                }
            },
            
            {
                name: 'should shut down gracefully',
                run: async (context) => {
                    const { botManager, mockClient } = context;
                    
                    // Mock client destroy method
                    mockClient.destroy = jest.fn();
                    
                    // Shut down
                    await botManager.shutdown();
                    
                    // Check if client was destroyed
                    testManager.assert.strictEqual(mockClient.destroy.mock.calls.length, 1, 'Client should be destroyed during shutdown');
                    testManager.assert.strictEqual(botManager.client, null, 'Client should be set to null after shutdown');
                }
            }
        ]
    });
    
    // Initialize test manager
    await testManager.initialize();
    
    // Run the tests
    const results = await testManager.runTests('Bot Manager Tests');
    
    // Return results
    return results;
}

// Export the test function
module.exports = { runBotManagerTests };

// Run tests if this file is executed directly
if (require.main === module) {
    runBotManagerTests().then(results => {
        console.log(`Bot Manager Tests: ${results.passed}/${results.total} tests passed`);
        process.exit(results.failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('Error running bot manager tests:', error);
        process.exit(1);
    });
} 