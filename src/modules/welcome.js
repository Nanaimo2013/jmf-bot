/**
 * JMF Hosting Discord Bot - Welcome Module
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This module handles welcome messages for new members.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Module = require('./base.module');
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');
const path = require('path');

// Try to import canvas, but handle gracefully if it fails
let Canvas = null;
let canvasAvailable = false;

try {
    Canvas = require('canvas');
    canvasAvailable = true;
} catch (error) {
    console.warn('Canvas module not available, welcome images will be disabled:', error.message);
    canvasAvailable = false;
}

class WelcomeModule extends Module {
    /**
     * Create a new welcome module
     */
    constructor() {
        super({
            name: 'welcome',
            description: 'Handles welcome messages for new members',
            enabled: true,
            dependencies: ['database', 'logger']
        });

        this.welcomeChannel = null;
        this.leaveChannel = null;
        this.welcomeMessage = 'Welcome to {server}, {user}!';
        this.leaveMessage = '{user} has left {server}.';
        this.welcomeImage = true;
        this.leaveImage = false;
        this.verifiedUsers = new Set();
    }

    /**
     * Initialize the welcome module
     */
    async initialize() {
        try {
            await super.initialize();
            
            // Load configuration
            await this.loadConfig();
            
            // Load verified users from database
            await this.loadVerifiedUsers();
            
            this.logger.info('Welcome module initialized successfully');
            return true;
        } catch (error) {
            this.logger.error(`Failed to initialize welcome module: ${error.message}`);
            return false;
        }
    }

    /**
     * Load configuration from database
     */
    async loadConfig() {
        try {
            if (!this.database) {
                this.logger.warn('Database not available, using default configuration');
                return;
            }

            const config = await this.database.query('SELECT * FROM welcome_config WHERE guild_id = ?', ['global']);
            if (config.length > 0) {
                const settings = config[0];
                this.welcomeChannel = settings.welcome_channel;
                this.leaveChannel = settings.leave_channel;
                this.welcomeMessage = settings.welcome_message || this.welcomeMessage;
                this.leaveMessage = settings.leave_message || this.leaveMessage;
                this.welcomeImage = settings.welcome_image === 1;
                this.leaveImage = settings.leave_image === 1;
            }
        } catch (error) {
            this.logger.error(`Failed to load welcome configuration: ${error.message}`);
        }
    }

    /**
     * Load verified users from database
     */
    async loadVerifiedUsers() {
        try {
            if (!this.database) {
                this.logger.warn('Database not available, skipping verified users load');
                return;
            }

            const users = await this.database.query('SELECT user_id FROM verifications WHERE status = ?', ['verified']);
            this.verifiedUsers = new Set(users.map(u => u.user_id));
        } catch (error) {
            this.logger.error(`Failed to load verified users: ${error.message}`);
        }
    }

    /**
     * Handle new member join
     */
    async handleMemberJoin(member) {
        try {
            if (!this.welcomeChannel) {
                this.logger.warn('Welcome channel not configured');
                return;
            }

            const channel = member.guild.channels.cache.get(this.welcomeChannel);
            if (!channel) {
                this.logger.warn(`Welcome channel ${this.welcomeChannel} not found`);
                return;
            }

            // Create welcome message
            const message = this.welcomeMessage
                .replace(/{user}/g, member.user.toString())
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount.toString());

            const embed = new EmbedBuilder()
                .setTitle('Welcome!')
                .setDescription(message)
                .setColor('#00ff00')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            // Add welcome image if enabled and canvas is available
            if (this.welcomeImage && canvasAvailable) {
                try {
                    const imageBuffer = await this.createWelcomeImage(member);
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
                    embed.setImage('attachment://welcome.png');
                    
                    await channel.send({ embeds: [embed], files: [attachment] });
                } catch (error) {
                    this.logger.error(`Failed to create welcome image: ${error.message}`);
                    await channel.send({ embeds: [embed] });
                }
            } else {
                await channel.send({ embeds: [embed] });
            }

            // Add verification button if user is not verified
            if (!this.verifiedUsers.has(member.id)) {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`verify_${member.id}`)
                            .setLabel('Verify')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('✅')
                    );

                await channel.send({ 
                    content: `${member.user}, please verify yourself to access all server features!`,
                    components: [row] 
                });
            }

        } catch (error) {
            this.logger.error(`Failed to handle member join: ${error.message}`);
        }
    }

    /**
     * Handle member leave
     */
    async handleMemberLeave(member) {
        try {
            if (!this.leaveChannel) {
                return;
            }

            const channel = member.guild.channels.cache.get(this.leaveChannel);
            if (!channel) {
                this.logger.warn(`Leave channel ${this.leaveChannel} not found`);
                return;
            }

            const message = this.leaveMessage
                .replace(/{user}/g, member.user.toString())
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount.toString());

            const embed = new EmbedBuilder()
                .setTitle('Member Left')
                .setDescription(message)
                .setColor('#ff0000')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await channel.send({ embeds: [embed] });

        } catch (error) {
            this.logger.error(`Failed to handle member leave: ${error.message}`);
        }
    }

    /**
     * Create welcome image (only if canvas is available)
     */
    async createWelcomeImage(member) {
        if (!canvasAvailable || !Canvas) {
            throw new Error('Canvas not available');
        }

        const canvas = Canvas.createCanvas(800, 300);
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 800, 300);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 300);

        // Welcome text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Welcome!', 400, 100);

        // Username
        ctx.font = '32px Arial';
        ctx.fillText(member.user.username, 400, 150);

        // Server name
        ctx.font = '24px Arial';
        ctx.fillText(`to ${member.guild.name}`, 400, 180);

        // Member count
        ctx.font = '20px Arial';
        ctx.fillText(`Member #${member.guild.memberCount}`, 400, 220);

        return canvas.toBuffer('image/png');
    }

    /**
     * Handle verification button click
     */
    async handleVerification(interaction) {
        try {
            const userId = interaction.customId.split('_')[1];
            
            if (interaction.user.id !== userId) {
                await interaction.reply({ 
                    content: 'This verification button is not for you!', 
                    ephemeral: true 
                });
                return;
            }

            // Add user to verified users
            this.verifiedUsers.add(userId);
            
            // Update database
            if (this.database) {
                await this.database.query(
                    'INSERT OR REPLACE INTO verifications (user_id, guild_id, status, verified_at) VALUES (?, ?, ?, ?)',
                    [userId, interaction.guild.id, 'verified', new Date().toISOString()]
                );
            }

            await interaction.reply({ 
                content: '✅ You have been verified! Welcome to the server!', 
                ephemeral: true 
            });

        } catch (error) {
            this.logger.error(`Failed to handle verification: ${error.message}`);
            await interaction.reply({ 
                content: '❌ Verification failed. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    /**
     * Start the welcome module
     */
    async start() {
        try {
            await super.start();
            
            // Set up event listeners
            this.bot.on('guildMemberAdd', (member) => {
                this.handleMemberJoin(member);
            });

            this.bot.on('guildMemberRemove', (member) => {
                this.handleMemberLeave(member);
            });

            this.bot.on('interactionCreate', (interaction) => {
                if (interaction.isButton() && interaction.customId.startsWith('verify_')) {
                    this.handleVerification(interaction);
                }
            });

            this.logger.info('Welcome module started successfully');
            return true;
        } catch (error) {
            this.logger.error(`Failed to start welcome module: ${error.message}`);
            return false;
        }
    }

    /**
     * Stop the welcome module
     */
    async stop() {
        try {
            await super.stop();
            this.logger.info('Welcome module stopped');
            return true;
        } catch (error) {
            this.logger.error(`Failed to stop welcome module: ${error.message}`);
            return false;
        }
    }
}

module.exports = WelcomeModule;
