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
const verification = require('../modules/verification');
const logger = require('../utils/logger');
const config = require('../../config.json');

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
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Handle verify user subcommand
      if (subcommand === 'user') {
        const targetUser = interaction.options.getUser('user');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember) {
          return interaction.reply({
            content: 'Could not find that user in the server.',
            ephemeral: true
          });
        }
        
        // Get verified role
        const verifiedRole = interaction.guild.roles.cache.find(
          role => role.name === (config.verification?.verifiedRole || 'Member')
        );
        
        if (!verifiedRole) {
          return interaction.reply({
            content: 'Verified role not found. Please set up the verification system first.',
            ephemeral: true
          });
        }
        
        // Check if user is already verified
        if (targetMember.roles.cache.has(verifiedRole.id)) {
          return interaction.reply({
            content: `${targetUser} is already verified.`,
            ephemeral: true
          });
        }
        
        // Get unverified role
        const unverifiedRole = interaction.guild.roles.cache.find(
          role => role.name === (config.verification?.unverifiedRole || 'Unverified')
        );
        
        // Add verified role
        await targetMember.roles.add(verifiedRole);
        
        // Remove unverified role if it exists
        if (unverifiedRole && targetMember.roles.cache.has(unverifiedRole.id)) {
          await targetMember.roles.remove(unverifiedRole);
        }
        
        // Record verification in database
        if (interaction.client.db && interaction.client.db.isConnected) {
          try {
            await interaction.client.db.query(
              'INSERT INTO verifications (user_id, guild_id, timestamp) VALUES (?, ?, ?)',
              [targetMember.id, interaction.guild.id, new Date()]
            );
          } catch (error) {
            logger.error(`Failed to record verification in database: ${error.message}`);
          }
        }
        
        // Send confirmation
        return interaction.reply({
          content: `${targetUser} has been manually verified.`,
          ephemeral: true
        });
      }
      
      // Handle verify role subcommand
      else if (subcommand === 'role') {
        const role = interaction.options.getRole('role');
        
        // Check if bot can manage the role
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.reply({
            content: `I cannot assign the role ${role} as it is positioned higher than or equal to my highest role.`,
            ephemeral: true
          });
        }
        
        // Update settings in database
        if (interaction.client.db && interaction.client.db.isConnected) {
          try {
            await interaction.client.db.query(
              'INSERT INTO settings (guild_id, module, setting_key, setting_value, updated_by) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = NOW()',
              [interaction.guild.id, 'verification', 'verifiedRole', role.id, interaction.user.id]
            );
          } catch (error) {
            logger.error(`Failed to update verification role in database: ${error.message}`);
          }
        }
        
        // Send confirmation
        return interaction.reply({
          content: `Verified role has been set to ${role}.`,
          ephemeral: true
        });
      }
    } catch (error) {
      logger.error(`Error in verify command: ${error.message}`);
      return interaction.reply({
        content: 'An error occurred while executing this command.',
        ephemeral: true
      });
    }
  }
}; 