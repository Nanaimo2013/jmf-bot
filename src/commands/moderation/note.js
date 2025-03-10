/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const userLogger = require('../../utils/userLogger');
const logger = require('../../utils/logger');
const config = require('../../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add a note to a user\'s case file')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to add a note to')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('content')
        .setDescription('The content of the note')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
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
        .setFooter({ text: config.footerText });
      
      await interaction.editReply({ embeds: [successEmbed] });
      
    } catch (error) {
      logger.error(`Error in note command: ${error.message}`);
      await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
    }
  }
}; 