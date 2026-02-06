/**
 * JMF Hosting Discord Bot - Kick Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command allows moderators to kick users from the server.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const userLogger = require('../../utils/userLogger');

class KickCommand extends Command {
    /**
     * Create a new kick command
     */
    constructor() {
        super({
            name: 'kick',
            description: 'Kick a user from the server',
            cooldown: 5,
            guildOnly: true,
            requiredPermissions: [PermissionFlagsBits.KickMembers],
            options: [
                {
                    name: 'user',
                    description: 'The user to kick',
                    type: 'USER',
                    required: true
                },
                {
                    name: 'reason',
                    description: 'The reason for kicking the user',
                    type: 'STRING',
                    required: false
                },
                {
                    name: 'silent',
                    description: 'Whether to silently kick the user (don\'t send them a DM)',
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
            const silent = interaction.options.getBoolean('silent') || false;
            
            // Check if the user is trying to kick themselves
            if (targetUser.id === interaction.user.id) {
                return interaction.editReply({ content: '❌ You cannot kick yourself.' });
            }
            
            // Check if the user is trying to kick a bot
            if (targetUser.bot) {
                return interaction.editReply({ content: '❌ You cannot kick a bot using this command.' });
            }
            
            // Get the target member
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            
            // Check if the member exists
            if (!targetMember) {
                return interaction.editReply({ content: '❌ This user is not in the server.' });
            }
            
            // Check if the bot can kick the target
            if (!targetMember.kickable) {
                return interaction.editReply({ content: '❌ I cannot kick this user. They may have higher permissions than me.' });
            }
            
            // Check if the user has a higher role than the target
            const executorMember = await interaction.guild.members.fetch(interaction.user.id);
            if (targetMember.roles.highest.position >= executorMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                return interaction.editReply({ content: '❌ You cannot kick this user as they have the same or higher role than you.' });
            }
            
            // Create kick embed to send to the user
            const kickEmbed = new EmbedBuilder()
                .setColor('#FF7F00')
                .setTitle(`You have been kicked from ${interaction.guild.name}`)
                .setDescription(`**Reason:** ${reason}`)
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            // Send DM to the user if not silent
            if (!silent) {
                try {
                    await targetUser.send({ embeds: [kickEmbed] });
                } catch (error) {
                    this.logger.warn(`Could not send DM to ${targetUser.tag} (${targetUser.id}): ${error.message}`);
                }
            }
            
            // Kick the user
            await targetMember.kick(reason);
            
            // Log the kick
            await userLogger.logKick(targetUser, interaction.user, reason, interaction.client);
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#FF7F00')
                .setTitle('User Kicked')
                .setDescription(`✅ **${targetUser.tag}** has been kicked from the server.`)
                .addFields(
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Silent', value: silent ? 'Yes' : 'No', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Log command usage
            this.logger.info(`${interaction.user.tag} (${interaction.user.id}) kicked ${targetUser.tag} (${targetUser.id}) in ${interaction.guild.name} (${interaction.guild.id}) for: ${reason}`);
            
            // Log to database if available
            if (interaction.client.db && interaction.client.db.isConnected) {
                try {
                    await interaction.client.db.query(
                        'INSERT INTO moderation_logs (guild_id, user_id, moderator_id, action, reason, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                        [
                            interaction.guild.id,
                            targetUser.id,
                            interaction.user.id,
                            'kick',
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
            
            if (interaction.deferred) {
                await interaction.editReply({ content: `❌ An error occurred: ${error.message}` }).catch(() => {});
            } else if (!interaction.replied) {
                await interaction.reply({ content: `❌ An error occurred: ${error.message}`, ephemeral: true }).catch(() => {});
            }
        }
    }
}

module.exports = KickCommand; 