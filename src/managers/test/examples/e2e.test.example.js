/**
 * Example End-to-End Test for JMF Hosting Discord Bot
 * 
 * This file demonstrates how to write end-to-end tests using the test manager.
 * It simulates testing the bot's response to commands and interactions.
 */

/**
 * Mock Discord client for testing
 */
class MockDiscordClient {
    constructor() {
        this.users = new Map();
        this.channels = new Map();
        this.messages = [];
        this.commands = new Map();
        this.eventHandlers = new Map();
    }

    // User methods
    async createUser(id, username, isBot = false) {
        const user = { id, username, bot: isBot, createdAt: new Date() };
        this.users.set(id, user);
        return user;
    }

    async getUser(id) {
        return this.users.get(id);
    }

    // Channel methods
    async createChannel(id, name, type = 'text') {
        const channel = { 
            id, 
            name, 
            type,
            send: async (content) => this.sendMessage(id, 'bot', content)
        };
        this.channels.set(id, channel);
        return channel;
    }

    async getChannel(id) {
        return this.channels.get(id);
    }

    // Message methods
    async sendMessage(channelId, userId, content) {
        const user = await this.getUser(userId);
        const channel = await this.getChannel(channelId);
        
        if (!user || !channel) {
            throw new Error('User or channel not found');
        }
        
        const message = {
            id: `msg_${Date.now()}`,
            content,
            author: user,
            channel,
            createdAt: new Date(),
            reply: async (replyContent) => {
                return this.sendMessage(channelId, 'bot', replyContent);
            }
        };
        
        this.messages.push(message);
        
        // Trigger message event
        this.triggerEvent('messageCreate', message);
        
        return message;
    }

    // Command methods
    async registerCommand(name, handler) {
        this.commands.set(name, handler);
    }

    async executeCommand(name, options, userId, channelId) {
        const handler = this.commands.get(name);
        const user = await this.getUser(userId);
        const channel = await this.getChannel(channelId);
        
        if (!handler) {
            throw new Error(`Command ${name} not registered`);
        }
        
        if (!user || !channel) {
            throw new Error('User or channel not found');
        }
        
        const interaction = {
            commandName: name,
            options: {
                _hoistedOptions: options,
                getString: (name) => options.find(o => o.name === name)?.value,
                getInteger: (name) => parseInt(options.find(o => o.name === name)?.value, 10),
                getBoolean: (name) => options.find(o => o.name === name)?.value === 'true',
                getUser: (name) => this.users.get(options.find(o => o.name === name)?.value)
            },
            user,
            channel,
            reply: async (content) => {
                return this.sendMessage(channelId, 'bot', content);
            },
            deferReply: async () => Promise.resolve(),
            editReply: async (content) => {
                return this.sendMessage(channelId, 'bot', content);
            }
        };
        
        // Execute command
        return handler(interaction);
    }

    // Event methods
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        
        this.eventHandlers.get(eventName).push(handler);
    }

    triggerEvent(eventName, ...args) {
        const handlers = this.eventHandlers.get(eventName) || [];
        
        for (const handler of handlers) {
            handler(...args);
        }
    }
}

/**
 * Main test function
 * @param {Object} test - Test context with assertion utilities and environment
 */
module.exports = async function(test) {
    // Mock Discord client
    let client;
    
    // Bot instance (would be the actual bot in a real test)
    let bot;
    
    // Setup before tests
    test.describe('Discord Bot End-to-End Tests', () => {
        // Setup before each test
        test.it('should set up the test environment', async () => {
            // Create mock Discord client
            client = new MockDiscordClient();
            
            // Create test users
            await client.createUser('user1', 'TestUser1');
            await client.createUser('bot1', 'BotUser1', true);
            
            // Create test channels
            await client.createChannel('channel1', 'general');
            await client.createChannel('channel2', 'bot-commands');
            
            // Register mock commands
            await client.registerCommand('ping', async (interaction) => {
                await interaction.reply('Pong!');
            });
            
            await client.registerCommand('echo', async (interaction) => {
                const text = interaction.options.getString('text');
                await interaction.reply(`You said: ${text}`);
            });
            
            // In a real test, you would initialize your actual bot here
            // For this example, we'll just use the mock client
            bot = {
                client,
                isReady: true
            };
            
            test.assert.ok(bot.isReady, 'Bot should be ready');
        });
        
        // Test basic command
        test.it('should respond to ping command', async () => {
            // Execute ping command
            await client.executeCommand('ping', [], 'user1', 'channel1');
            
            // Check the last message
            const lastMessage = client.messages[client.messages.length - 1];
            
            test.assert.strictEqual(lastMessage.content, 'Pong!');
            test.assert.strictEqual(lastMessage.author.bot, true);
        });
        
        // Test command with parameters
        test.it('should echo text back to the user', async () => {
            // Execute echo command with text parameter
            const testText = 'Hello, world!';
            await client.executeCommand('echo', [
                { name: 'text', value: testText }
            ], 'user1', 'channel1');
            
            // Check the last message
            const lastMessage = client.messages[client.messages.length - 1];
            
            test.assert.strictEqual(lastMessage.content, `You said: ${testText}`);
            test.assert.strictEqual(lastMessage.author.bot, true);
        });
        
        // Test user message response
        test.it('should respond to user messages', async () => {
            // Set up message handler
            client.on('messageCreate', async (message) => {
                if (message.author.bot) return;
                
                if (message.content.toLowerCase().includes('hello')) {
                    await message.reply('Hello there!');
                }
            });
            
            // Send a message as a user
            await client.sendMessage('channel1', 'user1', 'Hello bot!');
            
            // Check the last message (should be the bot's reply)
            const lastMessage = client.messages[client.messages.length - 1];
            
            test.assert.strictEqual(lastMessage.content, 'Hello there!');
            test.assert.strictEqual(lastMessage.author.bot, true);
        });
        
        // Test multiple interactions
        test.it('should handle a conversation flow', async () => {
            // Set up a more complex message handler for testing conversation
            client.on('messageCreate', async (message) => {
                if (message.author.bot) return;
                
                const content = message.content.toLowerCase();
                
                if (content.includes('how are you')) {
                    await message.reply("I'm doing well, thanks for asking! How can I help you today?");
                } else if (content.includes('help')) {
                    await message.reply('Available commands: !ping, !echo <text>');
                }
            });
            
            // Start a conversation
            await client.sendMessage('channel2', 'user1', 'Hey bot, how are you?');
            
            // Check bot's response
            let lastMessage = client.messages[client.messages.length - 1];
            test.assert.strictEqual(lastMessage.content, "I'm doing well, thanks for asking! How can I help you today?");
            
            // Continue conversation
            await client.sendMessage('channel2', 'user1', 'I need some help');
            
            // Check bot's response
            lastMessage = client.messages[client.messages.length - 1];
            test.assert.strictEqual(lastMessage.content, 'Available commands: !ping, !echo <text>');
            
            // Use a command
            await client.executeCommand('echo', [
                { name: 'text', value: 'Testing the echo command' }
            ], 'user1', 'channel2');
            
            // Check bot's response
            lastMessage = client.messages[client.messages.length - 1];
            test.assert.strictEqual(lastMessage.content, 'You said: Testing the echo command');
        });
    });
};

// If this file is run directly, execute the tests
if (require.main === module) {
    const { TestManager } = require('../index');
    const E2EModule = require('../modules/e2e.module');
    
    async function runTest() {
        const testManager = new TestManager();
        await testManager.initialize();
        
        // Register the E2E test module
        const e2eModule = new E2EModule(testManager);
        await e2eModule.initialize();
        
        // Set up test environment
        await e2eModule.setupTestEnvironment();
        
        try {
            // Run the tests in this file
            const results = await e2eModule.runTests({
                testDir: __dirname,
                testPattern: 'e2e.test.example.js',
                environmentSetup: {
                    startBot: false // Don't start the actual bot for this example
                }
            });
            
            console.log('Test Results:', results);
            
            return results;
        } finally {
            // Tear down test environment
            await e2eModule.teardownTestEnvironment();
            
            // Shutdown
            await e2eModule.shutdown();
            await testManager.shutdown();
        }
    }
    
    runTest().catch(console.error);
} 