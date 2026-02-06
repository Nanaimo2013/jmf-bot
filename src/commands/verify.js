/**
 * JMF Hosting Discord Bot - Verify Command
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This command handles user verification operations.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { Command } = require('./base.command');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

class VerifyCommand extends Command {
    /**
     * Create a new verify command
     */
    constructor() {
        super({
            name: 'verify',
            description: 'Verification commands',
            cooldown: 5,
            modOnly: true,
            requiredPermissions: [PermissionFlagsBits.ManageRoles],
            guildOnly: true
        });
        
        // Add subcommands to the slash command data
        this.data
            .addSubcommand(subcommand =>
                subcommand
                    .setName('user')
                    .setDescription('Manually verify a user')
                    .addUserOption(option =>
                        option
                            .setName('user')
                            .setDescription('User to verify')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('role')
                    .setDescription('Set the verified role')
                    .addRoleOption(option =>
                        option
                            .setName('role')
                            .setDescription('Role to give to verified users')
                            .setRequired(true)
                    )
            );
    }
    
    /**
     * Execute the command
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            // Handle subcommands
            switch (subcommand) {
                case 'user':
                    await this.verifyUser(interaction);
                    break;
                case 'role':
                    await this.setVerifiedRole(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            this.handleError('execute', error);
            
            // Reply to the interaction if not already replied
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while executing this command.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
    
    /**
     * Verify a user
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async verifyUser(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const targetMember = await interaction.guild.members.fetch(targetUser.id);
            
            // Get verification module
            const verificationModule = global.managers?.bot?.moduleRegistry?.getModule('verification');
            
            if (!verificationModule) {
                return interaction.reply({
                    content: '❌ Verification module is not available.',
                    ephemeral: true
                });
            }
            
            // Get verified role ID from config
            const verifiedRoleId = this.config.verification?.roleId;
            
            if (!verifiedRoleId) {
                return interaction.reply({
                    content: '❌ Verified role is not set. Use `/verify role` to set it first.',
                    ephemeral: true
                });
            }
            
            // Get the role
            const verifiedRole = await interaction.guild.roles.fetch(verifiedRoleId);
            
            if (!verifiedRole) {
                return interaction.reply({
                    content: '❌ Verified role not found. It may have been deleted.',
                    ephemeral: true
                });
            }
            
            // Check if user already has the role
            if (targetMember.roles.cache.has(verifiedRoleId)) {
                return interaction.reply({
                    content: `✅ ${targetUser.tag} is already verified.`,
                    ephemeral: true
                });
            }
            
            // Add the role
            await targetMember.roles.add(verifiedRole);
            
            // Log verification in database
            if (this.database) {
                await this.database.query(
                    'INSERT INTO verifications (user_id, guild_id, verified_by, verified_at) VALUES (?, ?, ?, ?)',
                    [targetUser.id, interaction.guild.id, interaction.user.id, new Date().toISOString()]
                );
            }
            
            // Log the action
            this.logger.info(this.name, `User ${targetUser.tag} (${targetUser.id}) manually verified by ${interaction.user.tag} (${interaction.user.id})`);
            
            return interaction.reply({
                content: `✅ Successfully verified ${targetUser.tag}.`,
                ephemeral: true
            });
        } catch (error) {
            this.handleError('verifyUser', error);
            
            await interaction.reply({
                content: `❌ An error occurred while verifying the user: ${error.message}`,
                ephemeral: true
            }).catch(() => {});
        }
    }
    
    /**
     * Set the verified role
     * @param {CommandInteraction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async setVerifiedRole(interaction) {
        try {
            const role = interaction.options.getRole('role');
            
            // Get config manager
            const configManager = global.managers.config;
            
            if (!configManager) {
                return interaction.reply({
                    content: '❌ Configuration manager is not available.',
                    ephemeral: true
                });
            }
            
            // Update config
            configManager.set('verification.roleId', role.id);
            
            // Save config
            await configManager.save();
            
            // Log the action
            this.logger.info(this.name, `Verification role set to ${role.name} (${role.id}) by ${interaction.user.tag} (${interaction.user.id})`);
            
            return interaction.reply({
                content: `✅ Verified role set to ${role.name}.`,
                ephemeral: true
            });
        } catch (error) {
            this.handleError('setVerifiedRole', error);
            
            await interaction.reply({
                content: `❌ An error occurred while setting the verified role: ${error.message}`,
                ephemeral: true
            }).catch(() => {});
        }
    }
}

module.exports = new VerifyCommand(); 