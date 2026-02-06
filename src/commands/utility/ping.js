/**
 * JMF Hosting Discord Bot - Ping Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command checks the bot's latency and API response time.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder } = require('discord.js');

class PingCommand extends Command {
    /**
     * Create a new ping command
     */
    constructor() {
        super({
            name: 'ping',
            description: 'Checks the bot\'s latency and API response time',
            cooldown: 5,
            enabled: true
        });
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            // Initial response
            const sent = await interaction.reply({ 
                content: 'Pinging...', 
                fetchReply: true 
            });
            
            // Calculate latencies
            const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);
            
            // Get database status
            let dbLatency = 'N/A';
            if (this.database) {
                try {
                    const dbStatus = await this.database.getStatus();
                    dbLatency = dbStatus.latency || 'N/A';
                } catch (error) {
                    this.logger.warn(this.name, `Failed to get database status: ${error.message}`);
                }
            }
            
            // Create embed
            const pingEmbed = new EmbedBuilder()
                .setColor(this.config.embedColor || '#0099ff')
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: 'Roundtrip Latency', value: `${roundtripLatency}ms`, inline: true },
                    { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
                    { name: 'Database Latency', value: `${dbLatency}ms`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' });
            
            // Edit the reply with the embed
            await interaction.editReply({ 
                content: null, 
                embeds: [pingEmbed] 
            });
            
            // Log the ping
            this.logger.debug(this.name, `Ping command executed by ${interaction.user.tag} (${interaction.user.id}): ${roundtripLatency}ms roundtrip, ${apiLatency}ms API, ${dbLatency}ms DB`);
        } catch (error) {
            this.handleError('execute', error);
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred: ${error.message}`,
                    embeds: []
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: `❌ An error occurred: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
}

module.exports = PingCommand; 