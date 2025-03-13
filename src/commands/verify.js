/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verification commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('Manually verify a user')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to verify')
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
            .setDescription('The role to assign to verified users')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    // Get managers from global object
    const { logger, database, bot } = global.managers;
    
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Handle verify user subcommand
      if (subcommand === 'user') {
        const targetUser = interaction.options.getUser('user');
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        
        // Get verification module from bot manager
        const verificationModule = bot.getModuleRegistry().getModule('verification');
        if (!verificationModule) {
          return interaction.reply({
            content: '❌ Verification module is not available.',
            ephemeral: true
          });
        }
        
        // Get verified role ID from config
        const config = bot.getConfigManager().getConfig();
        const verifiedRoleId = config.verification?.roleId;
        
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
        await database.query(
          'INSERT INTO verifications (user_id, guild_id, verified_by, verified_at) VALUES (?, ?, ?, ?)',
          [targetUser.id, interaction.guild.id, interaction.user.id, new Date().toISOString()]
        );
        
        // Log the action
        logger.info('commands', `User ${targetUser.tag} (${targetUser.id}) manually verified by ${interaction.user.tag} (${interaction.user.id})`);
        
        return interaction.reply({
          content: `✅ Successfully verified ${targetUser.tag}.`,
          ephemeral: true
        });
      }
      
      // Handle set role subcommand
      else if (subcommand === 'role') {
        const role = interaction.options.getRole('role');
        
        // Get config from bot manager
        const configManager = bot.getConfigManager();
        const config = configManager.getConfig();
        
        // Update config
        if (!config.verification) {
          config.verification = {};
        }
        
        config.verification.roleId = role.id;
        
        // Save config
        await configManager.saveConfig();
        
        // Log the action
        logger.info('commands', `Verification role set to ${role.name} (${role.id}) by ${interaction.user.tag} (${interaction.user.id})`);
        
        return interaction.reply({
          content: `✅ Verified role set to ${role.name}.`,
          ephemeral: true
        });
      }
    } catch (error) {
      // Log error
      logger.error('commands', `Error in verify command: ${error.message}`, error.stack);
      
      return interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
        ephemeral: true
      });
    }
  }
}; 