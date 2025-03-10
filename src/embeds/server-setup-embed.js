/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

/**
 * Creates a server setup guide embed for the JMF Hosting Discord server
 * @returns {EmbedBuilder} The server setup embed
 */
function createServerSetupEmbed() {
  const serverSetupEmbed = new EmbedBuilder()
    .setTitle('🔧 Game Server Setup Guide')
    .setColor(config.embedColor || '#00AAFF')
    .setDescription('Welcome to JMF Hosting! This guide will help you set up and configure your new game server. Follow these steps to get started:')
    .addFields(
      { 
        name: '1️⃣ Accessing Your Control Panel',
        value: '• Go to [panel.jmfhosting.com](https://panel.jmfhosting.com)\n• Log in with the credentials sent to your email\n• Once logged in, you\'ll see your server(s) listed on the dashboard\n• Click on your server to access its control panel',
        inline: false 
      },
      { 
        name: '2️⃣ Starting Your Server',
        value: '• In the control panel, click the "Start" button in the top-right corner\n• Wait for the server to initialize (this may take a few minutes)\n• You can monitor the startup process in the console tab\n• Once started, the status will change to "Online"',
        inline: false 
      },
      { 
        name: '3️⃣ Basic Configuration',
        value: '• Navigate to the "File Manager" tab\n• For most games, look for a configuration file (e.g., server.properties for Minecraft)\n• Edit the file to change settings like server name, password, game mode, etc.\n• Save your changes and restart the server for them to take effect',
        inline: false 
      },
      { 
        name: '4️⃣ Installing Mods/Plugins',
        value: '• Go to the "Mods" or "Plugins" section (if available for your game)\n• Browse the available mods/plugins or upload your own\n• Enable the ones you want to use\n• For manual installation, upload mod files to the appropriate directory using the File Manager\n• Restart your server after installing mods',
        inline: false 
      },
      { 
        name: '5️⃣ Managing Players',
        value: '• Most games have admin/op commands or configuration files for player management\n• For Minecraft: Use the "op" command in the console to give admin rights\n• For other games: Check game-specific documentation in our knowledge base\n• You can also set up whitelists or ban lists through the appropriate configuration files',
        inline: false 
      },
      { 
        name: '6️⃣ Backups and Restoration',
        value: '• Regular backups are automatically created for your server\n• You can create manual backups from the "Backups" tab\n• To restore a backup, select it from the list and click "Restore"\n• We recommend creating a backup before making major changes',
        inline: false 
      },
      { 
        name: '7️⃣ Troubleshooting Common Issues',
        value: '• **Server won\'t start**: Check the console for error messages\n• **Can\'t connect**: Verify the server is online and you\'re using the correct IP/port\n• **Lag issues**: Check resource usage in the panel and consider upgrading if consistently high\n• **Mod conflicts**: Try disabling mods one by one to identify the problem',
        inline: false 
      },
      { 
        name: '📚 Game-Specific Guides',
        value: 'For detailed setup instructions for specific games, check our knowledge base at [help.jmfhosting.com](https://help.jmfhosting.com) or create a support ticket in <#createTicket>.',
        inline: false 
      }
    )
    .setFooter({ 
      text: config.footerText || 'JMF Hosting | Game Server Solutions'
    })
    .setTimestamp();

  return serverSetupEmbed;
}

module.exports = { createServerSetupEmbed }; 