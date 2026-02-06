/**
 * JMF Hosting Discord Bot - Warn Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command allows moderators to warn users for breaking rules.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class WarnCommand extends Command {
    /**
     * Create a new warn command
     */
    constructor() {
        super({
            name: 'warn',
            description: 'Warns a user for breaking the rules',
            cooldown: 5,
            guildOnly: true,
            requiredPermissions: [PermissionFlagsBits.ModerateMembers],
            options: [
                {
                    name: 'user',
                    description: 'The user to warn',
                    type: 'USER',
                    required: true
                },
                {
                    name: 'reason',
                    description: 'The reason for the warning',
                    type: 'STRING',
                    required: true
                },
                {
                    name: 'silent',
                    description: 'Whether to send the warning silently (only visible to moderators)',
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
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const silent = interaction.options.getBoolean('silent') || false;
            
            // Check if user is trying to warn themselves
            if (targetUser.id === interaction.user.id) {
                return interaction.reply({ 
                    content: '❌ You cannot warn yourself.', 
                    ephemeral: true 
                });
            }
            
            // Check if user is trying to warn a bot
            if (targetUser.bot) {
                return interaction.reply({ 
                    content: '❌ You cannot warn a bot.', 
                    ephemeral: true 
                });
            }
            
            // Get the member object
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            
            // Check if the target user has a higher role than the moderator
            if (targetMember) {
                const moderator = interaction.member;
                
                if (targetMember.roles.highest.position >= moderator.roles.highest.position && interaction.guild.ownerId !== moderator.id) {
                    return interaction.reply({ 
                        content: '❌ You cannot warn a member with a higher or equal role.', 
                        ephemeral: true 
                    });
                }
            }
            
            // Create warning embed for the user
            const warningEmbed = new EmbedBuilder()
                .setColor('#FF9900')
                .setTitle('⚠️ Warning')
                .setDescription(`You have been warned in **${interaction.guild.name}**`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Moderator', value: interaction.user.tag }
                )
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            // Send warning to the user
            try {
                await targetUser.send({ embeds: [warningEmbed] });
            } catch (error) {
                this.logger.warn(`Could not send DM to ${targetUser.tag}: ${error.message}`);
            }
            
            // Create warning log embed
            const logEmbed = new EmbedBuilder()
                .setColor('#FF9900')
                .setTitle('User Warned')
                .setDescription(`${targetUser.tag} has been warned`)
                .addFields(
                    { name: 'User', value: `${targetUser} (${targetUser.id})` },
                    { name: 'Reason', value: reason },
                    { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})` }
                )
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            // Log the warning to the mod-logs channel
            const modLogsChannel = interaction.guild.channels.cache.find(
                channel => channel.name === this.config.channels?.modLogs || 'mod-logs'
            );
            
            if (modLogsChannel) {
                await modLogsChannel.send({ embeds: [logEmbed] });
            }
            
            // Reply to the interaction
            if (silent) {
                await interaction.reply({ 
                    content: `✅ ${targetUser.tag} has been warned silently for: ${reason}`, 
                    ephemeral: true 
                });
            } else {
                // Create public warning message
                const publicEmbed = new EmbedBuilder()
                    .setColor('#FF9900')
                    .setDescription(`⚠️ ${targetUser} has been warned by ${interaction.user} for: ${reason}`);
                
                await interaction.reply({ embeds: [publicEmbed] });
            }
            
            // Log command usage
            this.logger.info(`${interaction.user.tag} (${interaction.user.id}) warned ${targetUser.tag} (${targetUser.id}) in ${interaction.guild.name} (${interaction.guild.id}) for: ${reason}`);
            
            // Log to database if available
            if (interaction.client.db && interaction.client.db.isConnected) {
                try {
                    await interaction.client.db.query(
                        'INSERT INTO moderation_logs (guild_id, user_id, moderator_id, action, reason, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                        [
                            interaction.guild.id,
                            targetUser.id,
                            interaction.user.id,
                            'warn',
                            reason,
                            JSON.stringify({ silent })
                        ]
                    );
                } catch (dbError) {
                    this.handleError('database', dbError);
                }
            }
            
        } catch (error) {
            this.handleError('execute', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: `❌ An error occurred: ${error.message}`, 
                    ephemeral: true 
                }).catch(() => {});
            }
        }
    }
}

module.exports = WarnCommand; 