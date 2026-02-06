/**
 * JMF Hosting Discord Bot - Note Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command allows moderators to add notes to a user's case file.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const userLogger = require('../../utils/userLogger');

class NoteCommand extends Command {
    /**
     * Create a new note command
     */
    constructor() {
        super({
            name: 'note',
            description: 'Add a note to a user\'s case file',
            cooldown: 5,
            guildOnly: true,
            requiredPermissions: [PermissionFlagsBits.ModerateMembers],
            options: [
                {
                    name: 'user',
                    description: 'The user to add a note to',
                    type: 'USER',
                    required: true
                },
                {
                    name: 'content',
                    description: 'The content of the note',
                    type: 'STRING',
                    required: true
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
            const content = interaction.options.getString('content');
            
            // Add the note to the user's case file
            const note = await userLogger.logNote(targetUser, interaction.user, content, interaction.client);
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor('#00FFFF')
                .setTitle('Note Added')
                .setDescription(`✅ Note #${note.id} has been added to **${targetUser.tag}**'s case file.`)
                .addFields(
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Staff', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Note', value: content, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Log command usage
            this.logger.info(`${interaction.user.tag} (${interaction.user.id}) added a note to ${targetUser.tag} (${targetUser.id}) in ${interaction.guild.name} (${interaction.guild.id})`);
            
            // Log to database if available
            if (interaction.client.db && interaction.client.db.isConnected) {
                try {
                    await interaction.client.db.query(
                        'INSERT INTO moderation_logs (guild_id, user_id, moderator_id, action, reason, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                        [
                            interaction.guild.id,
                            targetUser.id,
                            interaction.user.id,
                            'note',
                            content.substring(0, 100), // Use first 100 chars as reason
                            JSON.stringify({ 
                                noteId: note.id,
                                fullContent: content
                            })
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

module.exports = NoteCommand; 