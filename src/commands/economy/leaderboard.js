/**
 * JMF Hosting Discord Bot - Leaderboard Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command allows users to view various server leaderboards.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

class LeaderboardCommand extends Command {
    /**
     * Create a new leaderboard command
     */
    constructor() {
        super({
            name: 'leaderboard',
            description: 'View the server\'s leaderboards',
            cooldown: 10,
            guildOnly: true,
            options: [
                {
                    name: 'category',
                    description: 'The leaderboard category to view',
                    type: 'STRING',
                    required: false,
                    choices: [
                        { name: 'Economy', value: 'economy' },
                        { name: 'Mining', value: 'mining' },
                        { name: 'Levels', value: 'levels' }
                    ]
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
                this.logger.warn(`Interaction already acknowledged for command: leaderboard`);
                return;
            }
            
            await interaction.deferReply();
            
            const category = interaction.options.getString('category') || 'economy';
            const economy = interaction.client.economy;
            const mining = interaction.client.mining;
            const leveling = interaction.client.leveling;
            
            let embed;
            
            // Create buttons for switching between leaderboard types
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('economy_leaderboard')
                        .setLabel('Economy')
                        .setStyle(category === 'economy' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('💰'),
                    new ButtonBuilder()
                        .setCustomId('mining_leaderboard')
                        .setLabel('Mining')
                        .setStyle(category === 'mining' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('⛏️'),
                    new ButtonBuilder()
                        .setCustomId('levels_leaderboard')
                        .setLabel('Levels')
                        .setStyle(category === 'levels' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('🏆')
                );
            
            // Get the appropriate leaderboard based on category
            switch (category) {
                case 'economy':
                    if (economy && economy.createLeaderboardEmbed) {
                        embed = await economy.createLeaderboardEmbed(interaction.guild);
                    } else {
                        embed = new EmbedBuilder()
                            .setTitle('Economy Leaderboard')
                            .setDescription('Economy module is not initialized')
                            .setColor(this.config.embedColor || '#0099ff')
                            .setTimestamp();
                    }
                    break;
                case 'mining':
                    if (mining && mining.isInitialized) {
                        embed = await this.createMiningLeaderboard(interaction.guild, mining);
                    } else {
                        embed = new EmbedBuilder()
                            .setTitle('Mining Leaderboard')
                            .setDescription('Mining module is not initialized')
                            .setColor(this.config.embedColor || '#0099ff')
                            .setTimestamp();
                    }
                    break;
                case 'levels':
                    if (leveling && leveling.isInitialized) {
                        embed = await leveling.createLeaderboardEmbed(interaction.guild);
                    } else {
                        embed = new EmbedBuilder()
                            .setTitle('Levels Leaderboard')
                            .setDescription('Leveling module is not initialized')
                            .setColor(this.config.embedColor || '#0099ff')
                            .setTimestamp();
                    }
                    break;
                default:
                    embed = await economy.createLeaderboardEmbed(interaction.guild);
            }
            
            await interaction.editReply({ embeds: [embed], components: [row] });
            
            // Set up collector for button interactions
            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
            
            collector.on('collect', async i => {
                try {
                    let newEmbed;
                    
                    if (i.customId === 'economy_leaderboard') {
                        newEmbed = await economy.createLeaderboardEmbed(interaction.guild);
                        
                        // Update button styles
                        row.components.forEach(button => {
                            button.setStyle(button.data.custom_id === 'economy_leaderboard' ? ButtonStyle.Primary : ButtonStyle.Secondary);
                        });
                    } else if (i.customId === 'mining_leaderboard') {
                        if (mining && mining.isInitialized) {
                            newEmbed = await this.createMiningLeaderboard(interaction.guild, mining);
                        } else {
                            newEmbed = new EmbedBuilder()
                                .setTitle('Mining Leaderboard')
                                .setDescription('Mining module is not initialized')
                                .setColor(this.config.embedColor || '#0099ff')
                                .setTimestamp();
                        }
                        
                        // Update button styles
                        row.components.forEach(button => {
                            button.setStyle(button.data.custom_id === 'mining_leaderboard' ? ButtonStyle.Primary : ButtonStyle.Secondary);
                        });
                    } else if (i.customId === 'levels_leaderboard') {
                        if (leveling && leveling.isInitialized) {
                            newEmbed = await leveling.createLeaderboardEmbed(interaction.guild);
                        } else {
                            newEmbed = new EmbedBuilder()
                                .setTitle('Levels Leaderboard')
                                .setDescription('Leveling module is not initialized')
                                .setColor(this.config.embedColor || '#0099ff')
                                .setTimestamp();
                        }
                        
                        // Update button styles
                        row.components.forEach(button => {
                            button.setStyle(button.data.custom_id === 'levels_leaderboard' ? ButtonStyle.Primary : ButtonStyle.Secondary);
                        });
                    }
                    
                    await i.update({ embeds: [newEmbed], components: [row] });
                } catch (error) {
                    this.handleError('button_interaction', error);
                }
            });
            
            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => {});
            });
            
            // Log command usage
            this.logger.info(`${interaction.user.tag} (${interaction.user.id}) viewed ${category} leaderboard in ${interaction.guild?.name || 'DM'}`);
            
        } catch (error) {
            this.handleError('execute', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ content: 'An error occurred while fetching the leaderboard.' }).catch(() => {});
            } else if (!interaction.replied) {
                await interaction.reply({ content: 'An error occurred while fetching the leaderboard.', ephemeral: true }).catch(() => {});
            }
        }
    }
    
    /**
     * Create mining leaderboard embed
     * @param {Guild} guild - Discord guild
     * @param {Object} mining - Mining module
     * @returns {EmbedBuilder} Mining leaderboard embed
     */
    async createMiningLeaderboard(guild, mining) {
        try {
            const db = mining.db;
            
            if (!db || !db.isConnected) {
                return new EmbedBuilder()
                    .setTitle('Mining Leaderboard')
                    .setDescription('No mining data available')
                    .setColor(this.config.embedColor || '#0099ff')
                    .setTimestamp();
            }
            
            // Get top miners by level and XP
            const miners = await db.query(
                'SELECT user_id, level, xp FROM user_mining_data ORDER BY level DESC, xp DESC LIMIT 10'
            );
            
            if (!miners || miners.length === 0) {
                return new EmbedBuilder()
                    .setTitle('Mining Leaderboard')
                    .setDescription('No miners found in the leaderboard')
                    .setColor(this.config.embedColor || '#0099ff')
                    .setTimestamp();
            }
            
            // Format leaderboard entries
            let description = '';
            const medals = ['🥇', '🥈', '🥉'];
            
            for (let i = 0; i < miners.length; i++) {
                const entry = miners[i];
                const user = await guild.members.fetch(entry.user_id).catch(() => null);
                const username = user ? user.user.username : 'Unknown User';
                const rank = i < 3 ? medals[i] : `${i + 1}.`;
                
                description += `${rank} **${username}** - Level ${entry.level} (${entry.xp} XP)\n`;
            }
            
            // Get total resources mined
            const totalResources = await db.query(
                'SELECT SUM(quantity) as total FROM user_mining_inventory'
            );
            
            const totalMined = totalResources[0]?.total || 0;
            
            const embed = new EmbedBuilder()
                .setTitle('⛏️ Mining Leaderboard')
                .setDescription(description)
                .setColor(this.config.embedColor || '#0099ff')
                .addFields(
                    { name: '🧱 Total Resources Mined', value: `${totalMined.toLocaleString()}`, inline: true },
                    { name: '👥 Total Miners', value: `${miners.length}`, inline: true }
                )
                .setFooter({ 
                    text: `${this.config.footerText || 'JMF Hosting Bot'} • Updated`,
                    iconURL: guild.iconURL({ dynamic: true })
                })
                .setTimestamp();
            
            return embed;
        } catch (error) {
            this.handleError('createMiningLeaderboard', error);
            return new EmbedBuilder()
                .setTitle('Mining Leaderboard')
                .setDescription('An error occurred while creating the mining leaderboard')
                .setColor(this.config.embedColor || '#0099ff')
                .setTimestamp();
        }
    }
}

module.exports = LeaderboardCommand; 