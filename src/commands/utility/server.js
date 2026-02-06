/**
 * JMF Hosting Discord Bot - Server Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command displays information about the Discord server.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');

class ServerCommand extends Command {
    /**
     * Create a new server command
     */
    constructor() {
        super({
            name: 'server',
            description: 'Displays information about the Discord server',
            cooldown: 10,
            guildOnly: true
        });
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            const { guild } = interaction;
            
            // Get guild information
            const owner = await guild.fetchOwner();
            const createdAt = moment(guild.createdAt).format('MMMM Do YYYY, h:mm:ss a');
            const createdDuration = moment(guild.createdAt).fromNow();
            
            // Get member counts
            const totalMembers = guild.memberCount;
            const botCount = guild.members.cache.filter(member => member.user.bot).size;
            const humanCount = totalMembers - botCount;
            const onlineCount = guild.members.cache.filter(member => member.presence?.status === 'online').size;
            
            // Get channel counts
            const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size;
            const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size;
            const categoryChannels = guild.channels.cache.filter(channel => channel.type === 4).size;
            
            // Get role count
            const roleCount = guild.roles.cache.size - 1; // Subtract @everyone role
            
            // Get boost information
            const boostLevel = guild.premiumTier;
            const boostCount = guild.premiumSubscriptionCount;
            
            // Create embed
            const serverEmbed = new EmbedBuilder()
                .setColor(this.config.embedColor || '#0099ff')
                .setTitle(`${guild.name} Server Information`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
                .addFields(
                    { name: '📋 Server ID', value: guild.id, inline: true },
                    { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
                    { name: '🌍 Region', value: guild.preferredLocale, inline: true },
                    { name: '📆 Created', value: `${createdAt}\n(${createdDuration})`, inline: false },
                    { 
                        name: '👥 Members', 
                        value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}\nOnline: ${onlineCount}`, 
                        inline: true 
                    },
                    { 
                        name: '💬 Channels', 
                        value: `Total: ${textChannels + voiceChannels + categoryChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}`, 
                        inline: true 
                    },
                    { name: '🏷️ Roles', value: `${roleCount}`, inline: true },
                    { 
                        name: '🚀 Boost Status', 
                        value: `Level: ${boostLevel}\nBoosts: ${boostCount}`, 
                        inline: true 
                    }
                )
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            // Add banner if available
            if (guild.banner) {
                serverEmbed.setImage(guild.bannerURL({ size: 1024 }));
            }
            
            // Send the embed
            await interaction.reply({ embeds: [serverEmbed] });
            
            // Log command usage
            this.logger.debug(this.name, `Server command executed by ${interaction.user.tag} (${interaction.user.id}) in ${guild.name} (${guild.id})`);
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

module.exports = ServerCommand; 