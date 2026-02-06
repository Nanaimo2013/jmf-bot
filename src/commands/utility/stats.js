/**
 * JMF Hosting Discord Bot - Stats Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command displays JMF Hosting statistics including server, member, and system information.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { PermissionFlagsBits } = require('discord.js');
const { createServerStatsEmbed } = require('../../embeds/server-stats-embed');

class StatsCommand extends Command {
    /**
     * Create a new stats command
     */
    constructor() {
        super({
            name: 'stats',
            description: 'Display JMF Hosting statistics',
            cooldown: 15,
            guildOnly: true,
            options: [
                {
                    name: 'ephemeral',
                    description: 'Whether to show the stats only to you (default: false)',
                    type: 'BOOLEAN',
                    required: false
                },
                {
                    name: 'detailed',
                    description: 'Whether to show detailed statistics (requires permission)',
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
            const ephemeral = interaction.options.getBoolean('ephemeral') || false;
            const detailed = interaction.options.getBoolean('detailed') || false;
            
            await interaction.deferReply({ ephemeral });
            
            // Check if user has permission for detailed stats
            const hasDetailedPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                                        (this.config.roles?.statsAccessRole && interaction.member.roles.cache.has(this.config.roles.statsAccessRole));
            
            const isAuthorized = detailed ? hasDetailedPermission : true;
            
            // Gather statistics
            const stats = await this.gatherStatistics(interaction, isAuthorized);
            
            // Create the embed
            const { embed, components } = createServerStatsEmbed({
                ...stats,
                guild: interaction.guild,
                isAuthorized
            });
            
            const message = await interaction.editReply({ 
                embeds: [embed], 
                components: components 
            });
            
            // Set up collector for refresh button
            if (!ephemeral) {
                const filter = i => i.customId === 'refresh_stats' && i.user.id === interaction.user.id;
                const collector = message.createMessageComponentCollector({ filter, time: 600000 }); // 10 minutes
                
                collector.on('collect', async i => {
                    try {
                        await i.deferUpdate();
                        
                        // Gather fresh statistics
                        const updatedStats = await this.gatherStatistics(interaction, isAuthorized);
                        
                        // Create updated embed
                        const { embed: updatedEmbed } = createServerStatsEmbed({
                            ...updatedStats,
                            guild: interaction.guild,
                            isAuthorized
                        });
                        
                        await i.editReply({ embeds: [updatedEmbed], components });
                    } catch (error) {
                        this.handleError('refresh', error);
                    }
                });
                
                collector.on('end', () => {
                    // Remove buttons when collector ends
                    interaction.editReply({ components: [] }).catch(() => {});
                });
            }
            
            // Log command usage
            this.logger.debug(this.name, `Stats command executed by ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild.name} (${interaction.guild.id})`);
            
        } catch (error) {
            this.handleError('execute', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ content: '❌ An error occurred while fetching statistics.' }).catch(() => {});
            } else if (!interaction.replied) {
                await interaction.reply({ content: '❌ An error occurred while fetching statistics.', ephemeral: true }).catch(() => {});
            }
        }
    }
    
    /**
     * Gather statistics from various sources
     * @param {CommandInteraction} interaction - The interaction
     * @param {boolean} isAuthorized - Whether the user is authorized for detailed stats
     * @returns {Object} - Statistics object
     */
    async gatherStatistics(interaction, isAuthorized) {
        try {
            const guild = interaction.guild;
            const client = interaction.client;
            
            // Member statistics
            const members = {
                total: guild.memberCount,
                humans: guild.members.cache.filter(member => !member.user.bot).size,
                bots: guild.members.cache.filter(member => member.user.bot).size,
                online: guild.members.cache.filter(member => member.presence?.status === 'online' || member.presence?.status === 'idle' || member.presence?.status === 'dnd').size,
                newToday: guild.members.cache.filter(member => {
                    const oneDayAgo = new Date();
                    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                    return member.joinedAt > oneDayAgo;
                }).size
            };
            
            // Try to get server statistics from the game servers module
            let servers = {
                total: 0,
                active: 0,
                suspended: 0,
                cpuUsage: 0,
                ramUsage: 0
            };
            
            if (client.gameServers && client.gameServers.isInitialized) {
                try {
                    const serverStats = await client.gameServers.getServerStats();
                    if (serverStats) {
                        servers = {
                            total: serverStats.total || 0,
                            active: serverStats.active || 0,
                            suspended: serverStats.suspended || 0,
                            cpuUsage: serverStats.cpuUsage || 0,
                            ramUsage: serverStats.ramUsage || 0
                        };
                    }
                } catch (error) {
                    this.logger.error(`Error fetching server stats: ${error.message}`);
                }
            }
            
            // Try to get node statistics
            let nodes = {
                total: 0,
                online: 0,
                offline: 0,
                averageLoad: 0,
                totalStorage: '0 GB'
            };
            
            if (client.gameServers && client.gameServers.isInitialized) {
                try {
                    const nodeStats = await client.gameServers.getNodeStats();
                    if (nodeStats) {
                        nodes = {
                            total: nodeStats.total || 0,
                            online: nodeStats.online || 0,
                            offline: nodeStats.offline || 0,
                            averageLoad: nodeStats.averageLoad || 0,
                            totalStorage: nodeStats.totalStorage || '0 GB'
                        };
                    }
                } catch (error) {
                    this.logger.error(`Error fetching node stats: ${error.message}`);
                }
            }
            
            // Try to get customer statistics
            let customers = {
                total: 0,
                active: 0,
                newThisMonth: 0,
                supportTickets: 0,
                satisfactionRate: 0
            };
            
            // Try to get ticket statistics
            if (client.tickets) {
                try {
                    const ticketStats = await client.tickets.getTicketStats();
                    if (ticketStats) {
                        customers.supportTickets = ticketStats.activeTickets || 0;
                    }
                } catch (error) {
                    this.logger.error(`Error fetching ticket stats: ${error.message}`);
                }
            }
            
            // System status
            const system = {
                apiStatus: true,
                databaseStatus: client.db && client.db.isConnected,
                websiteStatus: true,
                gamePanelStatus: client.gameServers && client.gameServers.isInitialized,
                billingStatus: true
            };
            
            // Financial statistics (only if authorized)
            let financial = null;
            if (isAuthorized) {
                financial = {
                    monthlyRevenue: 0,
                    annualRevenue: 0,
                    averageOrder: 0,
                    activeSubscriptions: 0,
                    renewalRate: 0
                };
                
                // This would be populated from a real financial system
            }
            
            return {
                members,
                servers,
                nodes,
                customers,
                system,
                financial
            };
        } catch (error) {
            this.handleError('gatherStatistics', error);
            return {
                members: { total: 0, humans: 0, bots: 0, online: 0, newToday: 0 },
                servers: { total: 0, active: 0, suspended: 0, cpuUsage: 0, ramUsage: 0 },
                nodes: { total: 0, online: 0, offline: 0, averageLoad: 0, totalStorage: '0 GB' },
                customers: { total: 0, active: 0, newThisMonth: 0, supportTickets: 0, satisfactionRate: 0 },
                system: { apiStatus: false, databaseStatus: false, websiteStatus: false, gamePanelStatus: false, billingStatus: false },
                financial: null
            };
        }
    }
}

module.exports = StatsCommand; 