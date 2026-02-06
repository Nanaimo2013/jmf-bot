/**
 * JMF Hosting Discord Bot - Purge Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command deletes multiple messages at once.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class PurgeCommand extends Command {
    /**
     * Create a new purge command
     */
    constructor() {
        super({
            name: 'purge',
            description: 'Delete multiple messages at once',
            cooldown: 5,
            requiredPermissions: [PermissionFlagsBits.ManageMessages],
            modOnly: true,
            guildOnly: true
        });
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const amount = interaction.options.getInteger('amount');
            const user = interaction.options.getUser('user');
            const contains = interaction.options.getString('contains');
            
            // Fetch messages
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            
            // Filter messages based on options
            let filteredMessages = messages;
            
            if (user) {
                filteredMessages = filteredMessages.filter(msg => msg.author.id === user.id);
            }
            
            if (contains) {
                filteredMessages = filteredMessages.filter(msg => msg.content.includes(contains));
            }
            
            // Take only the requested amount
            filteredMessages = filteredMessages.first(amount);
            
            // Check if there are any messages to delete
            if (filteredMessages.length === 0) {
                return interaction.editReply({ content: '❌ No messages found matching the criteria.' });
            }
            
            // Delete messages
            const deleted = await interaction.channel.bulkDelete(filteredMessages, true);
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(this.config.embedColor || '#0099ff')
                .setTitle('Messages Purged')
                .setDescription(`✅ Successfully deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'}.`)
                .addFields(
                    { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true },
                    { name: 'Amount', value: deleted.size.toString(), inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            if (user) {
                successEmbed.addFields({ name: 'User Filter', value: `${user.tag} (${user.id})`, inline: true });
            }
            
            if (contains) {
                successEmbed.addFields({ name: 'Content Filter', value: contains, inline: true });
            }
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Log the purge
            this.logger.info(this.name, `${interaction.user.tag} (${interaction.user.id}) purged ${deleted.size} messages in #${interaction.channel.name}`);
            
            // Log to database if available
            if (this.database) {
                try {
                    await this.database.query(
                        'INSERT INTO mod_actions (type, user_id, moderator_id, guild_id, channel_id, count, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            'purge',
                            user ? user.id : null,
                            interaction.user.id,
                            interaction.guild.id,
                            interaction.channel.id,
                            deleted.size,
                            contains ? `Contains: ${contains}` : 'No specific reason',
                            new Date()
                        ]
                    );
                } catch (dbError) {
                    this.logger.warn(this.name, `Failed to log purge to database: ${dbError.message}`);
                }
            }
        } catch (error) {
            this.handleError('execute', error);
            
            // Handle specific errors
            if (error.code === 10008) {
                await interaction.editReply({ content: '❌ Some messages are too old to be deleted (older than 14 days).' });
            } else {
                await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
            }
        }
    }
}

module.exports = PurgeCommand; 