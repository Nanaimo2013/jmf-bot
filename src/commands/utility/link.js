/**
 * JMF Hosting Discord Bot - Link Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command allows users to link their Discord account to their Pterodactyl panel account.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');
const { safeReply, safeDeferReply, isValidInteraction } = require('../../utils/interactionHandler');

class LinkCommand extends Command {
    /**
     * Create a new link command
     */
    constructor() {
        super({
            name: 'link',
            description: 'Link your Discord account to your Pterodactyl panel account',
            cooldown: 10,
            guildOnly: true,
            subcommands: [
                {
                    name: 'account',
                    description: 'Link your Discord account to your Pterodactyl panel account'
                },
                {
                    name: 'status',
                    description: 'Check your account linking status'
                },
                {
                    name: 'unlink',
                    description: 'Unlink your Discord account from your Pterodactyl panel account'
                }
            ]
        });
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            // Check if database is connected
            if (!interaction.client.db || !interaction.client.db.isConnected) {
                return safeReply(interaction, {
                    content: '❌ Database connection is not available. Please try again later or contact an administrator.',
                    ephemeral: true
                });
            }
            
            switch (subcommand) {
                case 'account':
                    await this.handleLinkAccount(interaction);
                    break;
                case 'status':
                    await this.handleLinkStatus(interaction);
                    break;
                case 'unlink':
                    await this.handleUnlinkAccount(interaction);
                    break;
                default:
                    await safeReply(interaction, {
                        content: '❌ Invalid subcommand. Please use `/link account`, `/link status`, or `/link unlink`.',
                        ephemeral: true
                    });
            }
            
            // Record command usage
            await this.recordCommandUsage(interaction, subcommand);
            
        } catch (error) {
            this.handleError('execute', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await safeReply(interaction, {
                    content: `❌ An error occurred: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }
    
    /**
     * Handle the link account subcommand
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async handleLinkAccount(interaction) {
        try {
            await safeDeferReply(interaction, { ephemeral: true });
            
            const userId = interaction.user.id;
            
            // Check if user is already linked
            const existingLink = await interaction.client.db.query(
                'SELECT * FROM account_links WHERE discord_id = ?',
                [userId]
            );
            
            if (existingLink && existingLink.length > 0) {
                return interaction.editReply({
                    content: '❌ Your Discord account is already linked to a panel account. Use `/link status` to check your current link or `/link unlink` to unlink your account.'
                });
            }
            
            // Generate a unique token
            const token = crypto.randomBytes(16).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour
            
            // Store the token in the database
            await interaction.client.db.query(
                'INSERT INTO link_tokens (discord_id, token, expires_at) VALUES (?, ?, ?)',
                [userId, token, expiresAt]
            );
            
            // Create the embed
            const embed = new EmbedBuilder()
                .setColor(this.config.embedColor || '#0099ff')
                .setTitle('Link Your Discord Account')
                .setDescription('To link your Discord account to your Pterodactyl panel account, follow these steps:')
                .addFields(
                    { name: '1. Login to the Panel', value: 'Login to your Pterodactyl panel account at [panel.jmfhosting.com](https://panel.jmfhosting.com)' },
                    { name: '2. Go to Account Settings', value: 'Click on your username in the top-right corner and select "Account Settings"' },
                    { name: '3. Navigate to Discord Tab', value: 'Click on the "Discord" tab in your account settings' },
                    { name: '4. Enter Your Token', value: 'Enter the token below in the "Discord Token" field and click "Link Account"' },
                    { name: 'Your Token (valid for 1 hour)', value: `\`${token}\`` }
                )
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
                .setTimestamp();
            
            // Create the button
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Open Panel')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://panel.jmfhosting.com/account/discord')
                );
            
            // Send the response
            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            
            this.logger.info(`User ${interaction.user.tag} (${userId}) requested account linking token`);
            
        } catch (error) {
            this.handleError('handleLinkAccount', error);
            
            if (isValidInteraction(interaction)) {
                await interaction.editReply({
                    content: '❌ An error occurred while generating your link token. Please try again later or contact an administrator.'
                });
            }
        }
    }
    
    /**
     * Handle the link status subcommand
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async handleLinkStatus(interaction) {
        try {
            await safeDeferReply(interaction, { ephemeral: true });
            
            const userId = interaction.user.id;
            
            // Check if user is linked
            const linkResult = await interaction.client.db.query(
                `SELECT al.*, u.username, u.email, u.root_admin 
                FROM account_links al
                JOIN panel_users u ON al.panel_id = u.id
                WHERE al.discord_id = ?`,
                [userId]
            );
            
            if (!linkResult || linkResult.length === 0) {
                // Check if there's a pending token
                const tokenResult = await interaction.client.db.query(
                    'SELECT * FROM link_tokens WHERE discord_id = ? AND expires_at > NOW()',
                    [userId]
                );
                
                if (tokenResult && tokenResult.length > 0) {
                    const token = tokenResult[0].token;
                    const expiresAt = new Date(tokenResult[0].expires_at);
                    const timeRemaining = Math.floor((expiresAt - new Date()) / 60000); // minutes
                    
                    const embed = new EmbedBuilder()
                        .setColor('#FFA500') // Orange for pending
                        .setTitle('Account Link Pending')
                        .setDescription('You have a pending account link request.')
                        .addFields(
                            { name: 'Token', value: `\`${token}\`` },
                            { name: 'Expires In', value: `${timeRemaining} minutes` },
                            { name: 'Instructions', value: 'To complete linking, login to the panel and enter this token in your account settings.' }
                        )
                        .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
                        .setTimestamp();
                    
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('Open Panel')
                                .setStyle(ButtonStyle.Link)
                                .setURL('https://panel.jmfhosting.com/account/discord'),
                            new ButtonBuilder()
                                .setLabel('Cancel Link')
                                .setStyle(ButtonStyle.Danger)
                                .setCustomId('cancel_link')
                        );
                    
                    const response = await interaction.editReply({
                        embeds: [embed],
                        components: [row]
                    });
                    
                    // Set up collector for cancel button
                    const filter = i => i.customId === 'cancel_link' && i.user.id === interaction.user.id;
                    const collector = response.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes
                    
                    collector.on('collect', async i => {
                        try {
                            await i.deferUpdate();
                            
                            // Delete the token
                            await interaction.client.db.query(
                                'DELETE FROM link_tokens WHERE discord_id = ?',
                                [userId]
                            );
                            
                            const cancelEmbed = new EmbedBuilder()
                                .setColor('#FF0000') // Red for cancelled
                                .setTitle('Account Link Cancelled')
                                .setDescription('Your account link request has been cancelled.')
                                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
                                .setTimestamp();
                            
                            await i.editReply({
                                embeds: [cancelEmbed],
                                components: []
                            });
                            
                            this.logger.info(`User ${interaction.user.tag} (${userId}) cancelled their account linking token`);
                            
                        } catch (error) {
                            this.handleError('cancelLink', error);
                        }
                    });
                    
                    return;
                }
                
                // No link and no pending token
                const embed = new EmbedBuilder()
                    .setColor('#FF0000') // Red for not linked
                    .setTitle('Account Not Linked')
                    .setDescription('Your Discord account is not linked to any panel account.')
                    .addFields(
                        { name: 'Link Your Account', value: 'Use `/link account` to generate a token and link your account.' }
                    )
                    .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
                    .setTimestamp();
                
                return interaction.editReply({
                    embeds: [embed]
                });
            }
            
            // User is linked
            const linkData = linkResult[0];
            const linkedAt = new Date(linkData.linked_at);
            const formattedDate = linkedAt.toLocaleDateString();
            const formattedTime = linkedAt.toLocaleTimeString();
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00') // Green for linked
                .setTitle('Account Linked')
                .setDescription('Your Discord account is linked to a panel account.')
                .addFields(
                    { name: 'Panel Username', value: linkData.username },
                    { name: 'Panel Email', value: linkData.email },
                    { name: 'Admin Status', value: linkData.root_admin ? 'Administrator' : 'User' },
                    { name: 'Linked On', value: `${formattedDate} at ${formattedTime}` }
                )
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
                .setTimestamp();
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Open Panel')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://panel.jmfhosting.com'),
                    new ButtonBuilder()
                        .setLabel('Unlink Account')
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId('unlink_account')
                );
            
            const response = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            
            // Set up collector for unlink button
            const filter = i => i.customId === 'unlink_account' && i.user.id === interaction.user.id;
            const collector = response.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes
            
            collector.on('collect', async i => {
                try {
                    await i.deferUpdate();
                    await this.handleUnlinkAccount(interaction, true);
                } catch (error) {
                    this.handleError('unlinkFromButton', error);
                }
            });
            
        } catch (error) {
            this.handleError('handleLinkStatus', error);
            
            if (isValidInteraction(interaction)) {
                await interaction.editReply({
                    content: '❌ An error occurred while checking your link status. Please try again later or contact an administrator.'
                });
            }
        }
    }
    
    /**
     * Handle the unlink account subcommand
     * @param {CommandInteraction} interaction - The interaction object
     * @param {boolean} fromButton - Whether this was triggered from a button
     * @returns {Promise<void>}
     */
    async handleUnlinkAccount(interaction, fromButton = false) {
        try {
            if (!fromButton) {
                await safeDeferReply(interaction, { ephemeral: true });
            }
            
            const userId = interaction.user.id;
            
            // Check if user is linked
            const linkResult = await interaction.client.db.query(
                'SELECT * FROM account_links WHERE discord_id = ?',
                [userId]
            );
            
            if (!linkResult || linkResult.length === 0) {
                return interaction.editReply({
                    content: '❌ Your Discord account is not linked to any panel account.',
                    components: []
                });
            }
            
            // Delete the link
            await interaction.client.db.query(
                'DELETE FROM account_links WHERE discord_id = ?',
                [userId]
            );
            
            // Also delete any pending tokens
            await interaction.client.db.query(
                'DELETE FROM link_tokens WHERE discord_id = ?',
                [userId]
            );
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000') // Red for unlinked
                .setTitle('Account Unlinked')
                .setDescription('Your Discord account has been unlinked from your panel account.')
                .addFields(
                    { name: 'Re-link Your Account', value: 'Use `/link account` to generate a new token and link your account again.' }
                )
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
                .setTimestamp();
            
            await interaction.editReply({
                embeds: [embed],
                components: []
            });
            
            this.logger.info(`User ${interaction.user.tag} (${userId}) unlinked their panel account`);
            
            // Update roles if needed
            if (this.config.roles?.linkedRole) {
                try {
                    const member = await interaction.guild.members.fetch(userId);
                    if (member.roles.cache.has(this.config.roles.linkedRole)) {
                        await member.roles.remove(this.config.roles.linkedRole);
                        this.logger.debug(`Removed linked role from ${interaction.user.tag} (${userId})`);
                    }
                } catch (roleError) {
                    this.logger.error(`Failed to remove linked role: ${roleError.message}`);
                }
            }
            
        } catch (error) {
            this.handleError('handleUnlinkAccount', error);
            
            if (isValidInteraction(interaction)) {
                await interaction.editReply({
                    content: '❌ An error occurred while unlinking your account. Please try again later or contact an administrator.',
                    components: []
                });
            }
        }
    }
    
    /**
     * Record command usage in the database
     * @param {CommandInteraction} interaction - The interaction object
     * @param {string} subcommand - The subcommand used
     * @returns {Promise<void>}
     */
    async recordCommandUsage(interaction, subcommand) {
        try {
            if (!interaction.client.db || !interaction.client.db.isConnected) {
                return;
            }
            
            await interaction.client.db.query(
                'INSERT INTO command_logs (user_id, command, subcommand, guild_id, channel_id, timestamp) VALUES (?, ?, ?, ?, ?, NOW())',
                [
                    interaction.user.id,
                    this.name,
                    subcommand,
                    interaction.guild?.id || null,
                    interaction.channel?.id || null
                ]
            );
            
            this.logger.debug(this.name, `Recorded usage of ${this.name} ${subcommand} by ${interaction.user.tag} (${interaction.user.id})`);
            
        } catch (error) {
            this.handleError('recordCommandUsage', error);
        }
    }
}

module.exports = LinkCommand; 