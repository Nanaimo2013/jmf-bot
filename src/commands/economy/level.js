/**
 * JMF Hosting Discord Bot - Level Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command allows users to check their level and XP progress.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const path = require('path');

class LevelCommand extends Command {
    /**
     * Create a new level command
     */
    constructor() {
        super({
            name: 'level',
            description: 'Check your level and XP progress',
            cooldown: 5,
            guildOnly: true,
            options: [
                {
                    name: 'user',
                    description: 'The user to check (defaults to yourself)',
                    type: 'USER',
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
            // Check if the interaction is still valid before deferring
            if (interaction.replied || interaction.deferred) {
                this.logger.warn(`Interaction already acknowledged for command: level`);
                return;
            }
            
            await interaction.deferReply();
            
            // Get the target user (defaults to the command user)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            
            if (!member) {
                return interaction.editReply({ content: 'That user is not in this server.', ephemeral: true });
            }
            
            // Get user's level data
            const leveling = interaction.client.leveling;
            
            if (!leveling || !leveling.getUserData) {
                return interaction.editReply({ content: 'Leveling system is currently unavailable. Please try again later.' });
            }
            
            const userData = await leveling.getUserData(targetUser.id, interaction.guild.id);
            
            // If no data, create default data
            if (!userData) {
                this.logger.warn(`No level data found for user ${targetUser.id} in guild ${interaction.guild.id}`);
                return interaction.editReply({ 
                    content: `No level data found for ${targetUser.username}. They need to send messages to earn XP.`,
                    ephemeral: true
                });
            }
            
            // Ensure userData has all required properties
            const safeUserData = {
                xp: userData.xp || 0,
                level: userData.level || 0,
                totalXP: userData.totalXP || userData.xp || 0,
                totalMessages: userData.totalMessages || 0,
                totalVoiceMinutes: userData.totalVoiceMinutes || 0,
                rank: userData.rank || '?'
            };
            
            // Calculate progress to next level
            const currentXP = safeUserData.xp;
            const currentLevel = safeUserData.level;
            const requiredXP = leveling.calculateRequiredXP(currentLevel);
            const progress = Math.min(Math.floor((currentXP / requiredXP) * 100), 100);
            
            // Format numbers with commas
            const formattedCurrentXP = currentXP.toLocaleString();
            const formattedRequiredXP = requiredXP.toLocaleString();
            const formattedTotalXP = safeUserData.totalXP.toLocaleString();
            const formattedTotalMessages = safeUserData.totalMessages.toLocaleString();
            const formattedVoiceMinutes = safeUserData.totalVoiceMinutes.toLocaleString();
            
            // Generate a visual progress bar using Canvas
            const progressBarImage = await this.generateProgressBar(progress, currentXP, requiredXP, currentLevel);
            const attachment = new AttachmentBuilder(progressBarImage, { name: 'progress-bar.png' });
            
            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s Level Stats`)
                .setDescription(`Here's ${targetUser.id === interaction.user.id ? 'your' : 'their'} current level and XP progress.`)
                .setColor(this.config.embedColor || '#00AAFF')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '🏆 Level', value: `${currentLevel}`, inline: true },
                    { name: '✨ Total XP', value: `${formattedTotalXP}`, inline: true },
                    { name: '📊 Rank', value: `#${safeUserData.rank}`, inline: true },
                    { name: '📝 Messages', value: formattedTotalMessages, inline: true },
                    { name: '🎙️ Voice Time', value: `${formattedVoiceMinutes} mins`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true },
                    { name: `Progress to Level ${currentLevel + 1}`, value: `${progress}% Complete`, inline: false }
                )
                .setImage('attachment://progress-bar.png')
                .setFooter({ text: `${this.config.footerText || 'JMF Hosting'} • Level System` })
                .setTimestamp();
            
            // Add level roles if configured
            if (this.config.levelSystem?.levelRoles && Object.keys(this.config.levelSystem.levelRoles).length > 0) {
                const nextRoleLevels = Object.keys(this.config.levelSystem.levelRoles)
                    .map(Number)
                    .filter(level => level > currentLevel)
                    .sort((a, b) => a - b);
                
                if (nextRoleLevels.length > 0) {
                    const nextRoleLevel = nextRoleLevels[0];
                    const nextRoleName = this.config.levelSystem.levelRoles[nextRoleLevel];
                    embed.addFields({ 
                        name: '🎭 Next Role Reward', 
                        value: `Level ${nextRoleLevel}: ${nextRoleName}`, 
                        inline: false 
                    });
                }
            }
            
            // Add message and voice XP rates if it's the user checking their own level
            if (targetUser.id === interaction.user.id) {
                const messageXP = this.config.levelSystem?.xpPerMessage || 5;
                const voiceXP = this.config.levelSystem?.voiceXpPerMinute || 2;
                
                embed.addFields({ 
                    name: '⚡ XP Rates', 
                    value: `📝 Message: ${messageXP} XP\n🎙️ Voice: ${voiceXP} XP/min`, 
                    inline: false 
                });
            }
            
            await interaction.editReply({ embeds: [embed], files: [attachment] });
            
            // Log command usage
            this.logger.info(`${interaction.user.tag} (${interaction.user.id}) checked level for ${targetUser.tag} (${targetUser.id}) in ${interaction.guild?.name || 'DM'}`);
            
        } catch (error) {
            this.handleError('execute', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ 
                    content: 'An error occurred while fetching level data. Please try again later.',
                    ephemeral: true
                }).catch(() => {});
            } else if (!interaction.replied) {
                await interaction.reply({ 
                    content: 'An error occurred while fetching level data. Please try again later.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Generate a visual progress bar using Canvas
     * @param {number} progress - Progress percentage (0-100)
     * @param {number} currentXP - Current XP
     * @param {number} requiredXP - Required XP for next level
     * @param {number} currentLevel - Current level
     * @returns {Buffer} - Canvas buffer
     */
    async generateProgressBar(progress, currentXP, requiredXP, currentLevel) {
        // Create canvas
        const canvas = Canvas.createCanvas(700, 100);
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#36393f'; // Discord dark theme background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Progress bar background
        ctx.fillStyle = '#4e5d94'; // Darker shade for background
        ctx.beginPath();
        ctx.roundRect(25, 25, 650, 30, 15);
        ctx.fill();
        
        // Progress bar fill
        const fillWidth = Math.max(Math.floor((progress / 100) * 650), 10); // Minimum width of 10px
        const gradient = ctx.createLinearGradient(25, 0, 675, 0);
        gradient.addColorStop(0, '#5865f2'); // Discord blurple
        gradient.addColorStop(1, '#5e8ef7'); // Lighter blue
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(25, 25, fillWidth, 30, 15);
        ctx.fill();
        
        // Add text
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${currentXP.toLocaleString()} / ${requiredXP.toLocaleString()} XP (${progress}%)`, canvas.width / 2, 45);
        
        // Add level indicator
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Level ${currentLevel}`, 25, 80);
        
        // Add next level indicator
        ctx.textAlign = 'right';
        ctx.fillText(`Level ${currentLevel + 1}`, 675, 80);
        
        // Return buffer
        return canvas.toBuffer();
    }
}

module.exports = LevelCommand; 