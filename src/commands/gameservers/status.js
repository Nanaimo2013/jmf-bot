/**
 * JMF Hosting Discord Bot - Game Server Status Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command allows users to check the status of game servers.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const Command = require('../base.command');
const { EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class StatusCommand extends Command {
    /**
     * Create a new status command
     */
    constructor() {
        super({
            name: 'status',
            description: 'Check the status of a game server',
            cooldown: 10,
            guildOnly: false,
            options: [
                {
                    name: 'server',
                    description: 'The server to check (leave empty for all servers)',
                    type: 'STRING',
                    required: false,
                    autocomplete: true
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
            await interaction.deferReply();
            
            const serverId = interaction.options.getString('server');
            
            if (serverId) {
                // Check status of a specific server
                await this.checkServerStatus(interaction, serverId);
            } else {
                // Check status of all servers
                await this.checkAllServers(interaction);
            }
            
            // Log command usage
            this.logger.debug(this.name, `Status command executed by ${interaction.user.tag} (${interaction.user.id}) for server: ${serverId || 'all'}`);
            
        } catch (error) {
            this.handleError('execute', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ content: `❌ An error occurred: ${error.message}` }).catch(() => {});
            } else if (!interaction.replied) {
                await interaction.reply({ content: `❌ An error occurred: ${error.message}`, ephemeral: true }).catch(() => {});
            }
        }
    }
    
    /**
     * Handle autocomplete for server option
     * @param {AutocompleteInteraction} interaction - The autocomplete interaction
     * @returns {Promise<void>}
     */
    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const servers = await this.fetchAllServers();
            
            if (!servers || !servers.data) {
                return interaction.respond([]);
            }
            
            const choices = servers.data.map(server => ({
                name: `${server.attributes.name} (${server.attributes.identifier})`,
                value: server.attributes.identifier
            }));
            
            const filtered = choices.filter(choice => 
                choice.name.toLowerCase().includes(focusedValue.toLowerCase())
            );
            
            await interaction.respond(filtered.slice(0, 25));
            
        } catch (error) {
            this.handleError('autocomplete', error);
            await interaction.respond([]);
        }
    }
    
    /**
     * Check the status of a specific server
     * @param {CommandInteraction} interaction - The interaction object
     * @param {string} serverId - The server ID to check
     * @returns {Promise<void>}
     */
    async checkServerStatus(interaction, serverId) {
        try {
            const server = await this.fetchServer(serverId);
            
            if (!server || !server.attributes) {
                return interaction.editReply({ content: `❌ Server with ID \`${serverId}\` not found.` });
            }
            
            const serverData = server.attributes;
            const utilization = await this.fetchServerUtilization(serverId);
            
            const statusEmoji = this.getStatusEmoji(serverData.status);
            const statusColor = this.getStatusColor(serverData.status);
            const gameType = this.determineGameType(serverData.description);
            
            const embed = new EmbedBuilder()
                .setColor(statusColor)
                .setTitle(`${statusEmoji} ${serverData.name}`)
                .setDescription(serverData.description || 'No description available')
                .addFields(
                    { name: 'Status', value: `${statusEmoji} ${serverData.status}`, inline: true },
                    { name: 'Game', value: gameType, inline: true },
                    { name: 'Node', value: serverData.node || 'Unknown', inline: true },
                    { name: 'CPU Usage', value: utilization ? `${utilization.cpu.toFixed(2)}%` : 'Unknown', inline: true },
                    { name: 'Memory Usage', value: utilization ? `${(utilization.memory / 1024 / 1024).toFixed(2)} MB` : 'Unknown', inline: true },
                    { name: 'Disk Usage', value: utilization ? `${(utilization.disk / 1024 / 1024).toFixed(2)} MB` : 'Unknown', inline: true }
                )
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            this.handleError('checkServerStatus', error);
            await interaction.editReply({ content: `❌ Failed to fetch server status: ${error.message}` });
        }
    }
    
    /**
     * Check the status of all servers
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async checkAllServers(interaction) {
        try {
            const servers = await this.fetchAllServers();
            
            if (!servers || !servers.data || servers.data.length === 0) {
                return interaction.editReply({ content: '❌ No servers found or API is unavailable.' });
            }
            
            // Group servers by status
            const serversByStatus = {
                running: [],
                starting: [],
                stopping: [],
                offline: [],
                other: []
            };
            
            for (const server of servers.data) {
                const status = server.attributes.status;
                const statusEmoji = this.getStatusEmoji(status);
                const gameType = this.determineGameType(server.attributes.description);
                
                const serverInfo = `${statusEmoji} **${server.attributes.name}** (${gameType})`;
                
                if (status === 'running') {
                    serversByStatus.running.push(serverInfo);
                } else if (status === 'starting') {
                    serversByStatus.starting.push(serverInfo);
                } else if (status === 'stopping') {
                    serversByStatus.stopping.push(serverInfo);
                } else if (status === 'offline') {
                    serversByStatus.offline.push(serverInfo);
                } else {
                    serversByStatus.other.push(`${serverInfo} - Status: ${status}`);
                }
            }
            
            const embed = new EmbedBuilder()
                .setColor(this.config.embedColor || '#0099ff')
                .setTitle('Game Server Status')
                .setDescription(`Total Servers: ${servers.data.length}`)
                .setFooter({ text: this.config.footerText || 'JMF Hosting Bot' })
                .setTimestamp();
            
            if (serversByStatus.running.length > 0) {
                embed.addFields({ name: '🟢 Running', value: serversByStatus.running.join('\n') || 'None' });
            }
            
            if (serversByStatus.starting.length > 0) {
                embed.addFields({ name: '🟡 Starting', value: serversByStatus.starting.join('\n') || 'None' });
            }
            
            if (serversByStatus.stopping.length > 0) {
                embed.addFields({ name: '🟠 Stopping', value: serversByStatus.stopping.join('\n') || 'None' });
            }
            
            if (serversByStatus.offline.length > 0) {
                embed.addFields({ name: '🔴 Offline', value: serversByStatus.offline.join('\n') || 'None' });
            }
            
            if (serversByStatus.other.length > 0) {
                embed.addFields({ name: '⚪ Other', value: serversByStatus.other.join('\n') || 'None' });
            }
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            this.handleError('checkAllServers', error);
            await interaction.editReply({ content: `❌ Failed to fetch servers: ${error.message}` });
        }
    }
    
    /**
     * Fetch all servers from the API
     * @returns {Promise<Object>} The servers data
     */
    async fetchAllServers() {
        try {
            if (!this.config.gameServers?.apiUrl || !this.config.gameServers?.apiKey) {
                throw new Error('Game servers API configuration is missing');
            }
            
            const response = await fetch(`${this.config.gameServers.apiUrl}/api/application/servers`, {
                headers: {
                    'Authorization': `Bearer ${this.config.gameServers.apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            this.handleError('fetchAllServers', error);
            return null;
        }
    }
    
    /**
     * Fetch a specific server from the API
     * @param {string} serverId - The server ID to fetch
     * @returns {Promise<Object>} The server data
     */
    async fetchServer(serverId) {
        try {
            if (!this.config.gameServers?.apiUrl || !this.config.gameServers?.apiKey) {
                throw new Error('Game servers API configuration is missing');
            }
            
            const response = await fetch(`${this.config.gameServers.apiUrl}/api/application/servers/${serverId}`, {
                headers: {
                    'Authorization': `Bearer ${this.config.gameServers.apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            
            const data = await response.json();
            return data.data;
            
        } catch (error) {
            this.handleError('fetchServer', error);
            return null;
        }
    }
    
    /**
     * Fetch server utilization from the API
     * @param {string} serverId - The server ID to fetch utilization for
     * @returns {Promise<Object>} The utilization data
     */
    async fetchServerUtilization(serverId) {
        try {
            if (!this.config.gameServers?.apiUrl || !this.config.gameServers?.apiKey) {
                throw new Error('Game servers API configuration is missing');
            }
            
            const response = await fetch(`${this.config.gameServers.apiUrl}/api/application/servers/${serverId}/resources`, {
                headers: {
                    'Authorization': `Bearer ${this.config.gameServers.apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            
            const data = await response.json();
            return data.attributes.resources;
            
        } catch (error) {
            this.handleError('fetchServerUtilization', error);
            return null;
        }
    }
    
    /**
     * Determine the game type from the server description
     * @param {string} description - The server description
     * @returns {string} The game type
     */
    determineGameType(description) {
        if (!description) return 'Unknown';
        
        const gameTypes = {
            'minecraft': 'Minecraft',
            'mc': 'Minecraft',
            'ark': 'ARK: Survival Evolved',
            'rust': 'Rust',
            'csgo': 'CS:GO',
            'counter-strike': 'CS:GO',
            'valheim': 'Valheim',
            'terraria': 'Terraria',
            'gmod': 'Garry\'s Mod',
            'garrys mod': 'Garry\'s Mod'
        };
        
        const lowerDesc = description.toLowerCase();
        for (const [key, value] of Object.entries(gameTypes)) {
            if (lowerDesc.includes(key)) {
                return value;
            }
        }
        
        return 'Game Server';
    }
    
    /**
     * Get the status emoji for a server status
     * @param {string} status - The server status
     * @returns {string} The status emoji
     */
    getStatusEmoji(status) {
        switch (status) {
            case 'running':
                return '🟢';
            case 'starting':
                return '🟡';
            case 'stopping':
                return '🟠';
            case 'offline':
                return '🔴';
            default:
                return '⚪';
        }
    }
    
    /**
     * Get the status color for a server status
     * @param {string} status - The server status
     * @returns {string} The status color
     */
    getStatusColor(status) {
        switch (status) {
            case 'running':
                return '#00FF00';
            case 'starting':
                return '#FFFF00';
            case 'stopping':
                return '#FFA500';
            case 'offline':
                return '#FF0000';
            default:
                return '#808080';
        }
    }
}

module.exports = StatusCommand; 