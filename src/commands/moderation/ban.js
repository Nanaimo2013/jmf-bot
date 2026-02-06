/**
 * JMF Hosting Discord Bot - Ban Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command allows moderators to ban users from the server.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const userLogger = require('../../utils/userLogger');

class BanCommand extends Command {
    /**
     * Create a new ban command
     */
    constructor() {
        super({
            name: 'ban',
            description: 'Ban a user from the server',
            cooldown: 5,
            guildOnly: true,
            requiredPermissions: [PermissionFlagsBits.BanMembers],
            options: [
                {
                    name: 'user',
                    description: 'The user to ban',
                    type: 'USER',
                    required: true
                },
                {
                    name: 'reason',
                    description: 'The reason for banning the user',
                    type: 'STRING',
                    required: false
                },
                {
                    name: 'delete_days',
                    description: 'Number of days of messages to delete (0-7)',
                    type: 'INTEGER',
                    required: false,
                    minValue: 0,
                    maxValue: 7
                },
                {
                    name: 'silent',
                    description: 'Whether to silently ban the user (don\'t send them a DM)',
                    type: 'BOOLEAN',
                    required: false
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
            await interaction.deferReply({ ephemeral: true });
            
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const deleteDays = interaction.options.getInteger('delete_days') || 1;
            const silent = interaction.options.getBoolean('silent') || false;
            
            // Check if the user is trying to ban themselves
            if (targetUser.id === interaction.user.id) {
                return interaction.editReply({ content: '❌ You cannot ban yourself.' });
            }
            
            // Check if the user is trying to ban a bot
            if (targetUser.bot) {
                return interaction.editReply({ content: '❌ You cannot ban a bot using this command.' });
            }
            
            // Get the target member if they are in the server
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            
            // If the member is in the server, perform additional checks
            if (targetMember) {
                // Check if the bot can ban the target
                if (!targetMember.bannable) {
                    return interaction.editReply({ content: '❌ I cannot ban this user. They may have higher permissions than me.' });
                }
                
                // Check if the user has a higher role than the target
                const executorMember = await interaction.guild.members.fetch(interaction.user.id);
                if (targetMember.roles.highest.position >= executorMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                    return interaction.editReply({ content: '❌ You cannot ban this user as they have the same or higher role than you.' });
                }
            }
            
            // Create ban embed to send to the user
            const banEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`You have been banned from ${interaction.guild.name}`)
                .setDescription(`**Reason:** ${reason}`)
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            // Send DM to the user if not silent and they are in the server
            if (!silent && targetMember) {
                try {
                    await targetUser.send({ embeds: [banEmbed] });
                } catch (error) {
                    this.logger.warn(`Could not send DM to ${targetUser.tag} (${targetUser.id}): ${error.message}`);
                }
            }
            
            // Ban the user
            await interaction.guild.members.ban(targetUser, { 
                reason: reason,
                deleteMessageSeconds: deleteDays * 86400 // Convert days to seconds
            });
            
            // Log the ban
            await userLogger.logBan(targetUser, interaction.user, reason, deleteDays, interaction.client);
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('User Banned')
                .setDescription(`✅ **${targetUser.tag}** has been banned from the server.`)
                .addFields(
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Message Deletion', value: `${deleteDays} day${deleteDays === 1 ? '' : 's'}`, inline: true },
                    { name: 'Silent', value: silent ? 'Yes' : 'No', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Log command usage
            this.logger.info(`${interaction.user.tag} (${interaction.user.id}) banned ${targetUser.tag} (${targetUser.id}) in ${interaction.guild.name} (${interaction.guild.id}) for: ${reason}`);
            
            // Log to database if available
            if (interaction.client.db && interaction.client.db.isConnected) {
                try {
                    await interaction.client.db.query(
                        'INSERT INTO moderation_logs (guild_id, user_id, moderator_id, action, reason, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                        [
                            interaction.guild.id,
                            targetUser.id,
                            interaction.user.id,
                            'ban',
                            reason,
                            JSON.stringify({ deleteDays, silent })
                        ]
                    );
                } catch (dbError) {
                    this.handleError('database', dbError);
                }
            }
            
        } catch (error) {
            this.handleError('execute', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ content: `❌ An error occurred: ${error.message}` }).catch(() => {});
            } else if (!interaction.replied) {
                await interaction.reply({ content: `❌ An error occurred: ${error.message}`, ephemeral: true }).catch(() => {});
            }
        }
    }
}

module.exports = BanCommand; 