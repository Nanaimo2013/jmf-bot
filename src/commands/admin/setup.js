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
const config = require('../../../config.json');
const logger = require('../../utils/logger');
const verification = require('../../modules/verification');
const tickets = require('../../modules/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-setup')
    .setDescription('Set up the Discord server with roles, channels, and permissions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const guild = interaction.guild;
      
      // Step 1: Create roles
      await interaction.editReply('🔄 Creating roles...');
      const roles = await this.createRoles(guild);
      
      // Step 2: Create categories and channels
      await interaction.editReply('🔄 Creating categories and channels...');
      const categories = await this.createCategories(guild, roles);
      
      // Step 3: Set up verification and ticket systems
      await interaction.editReply('🔄 Setting up verification and ticket systems...');
      await this.setupSystems(guild, categories, roles);
      
      // Step 4: Create server rules
      await interaction.editReply('🔄 Creating server rules...');
      await this.createServerRules(guild, categories);
      
      // Complete
      await interaction.editReply('✅ Server setup complete! JMF Hosting Discord server is now ready.');
    } catch (error) {
      logger.error(`Error in setup command: ${error.message}`);
      await interaction.editReply(`❌ An error occurred during setup: ${error.message}`);
    }
  },
  
  /**
   * Create all roles for the server
   * @param {Guild} guild - The Discord guild
   * @returns {Object} The created roles
   */
  async createRoles(guild) {
    const roles = {};
    
    // Staff Roles
    roles.owner = await this.createRole(guild, config.roles.owner, '#FF0000', PermissionFlagsBits.Administrator);
    roles.admin = await this.createRole(guild, config.roles.admin, '#FF7700', PermissionFlagsBits.Administrator);
    roles.moderator = await this.createRole(guild, config.roles.moderator, '#FFAA00', PermissionFlagsBits.ModerateMembers);
    roles.support = await this.createRole(guild, config.roles.support, '#FFDD00', PermissionFlagsBits.ManageMessages);
    
    // Special Roles
    roles.developer = await this.createRole(guild, config.roles.developer, '#00AAFF');
    roles.partner = await this.createRole(guild, config.roles.partner, '#AA00FF');
    roles.contentCreator = await this.createRole(guild, config.roles.contentCreator, '#FF00AA');
    
    // Subscription Roles
    roles.premiumTier3 = await this.createRole(guild, config.roles.premiumTier3, '#00FFAA');
    roles.premiumTier2 = await this.createRole(guild, config.roles.premiumTier2, '#00DDFF');
    roles.premiumTier1 = await this.createRole(guild, config.roles.premiumTier1, '#00BBFF');
    
    // Community Roles
    roles.activeMember = await this.createRole(guild, config.roles.activeMember, '#00FF00');
    roles.member = await this.createRole(guild, config.roles.member, '#AAAAAA');
    roles.bot = await this.createRole(guild, config.roles.bot, '#7289DA');
    roles.unverified = await this.createRole(guild, config.roles.unverified, '#555555');
    
    logger.info(`Created ${Object.keys(roles).length} roles in guild: ${guild.name}`);
    return roles;
  },
  
  /**
   * Create a role with the specified name, color, and permissions
   * @param {Guild} guild - The Discord guild
   * @param {string} name - The role name
   * @param {string} color - The role color
   * @param {bigint} permission - The permission to grant
   * @returns {Role} The created role
   */
  async createRole(guild, name, color, permission = null) {
    // Check if role already exists
    let role = guild.roles.cache.find(r => r.name === name);
    
    if (role) {
      logger.info(`Role already exists: ${name}`);
      return role;
    }
    
    // Create role options
    const roleOptions = {
      name: name,
      color: color,
      mentionable: true,
      reason: 'JMF Hosting server setup'
    };
    
    // Add permissions if specified
    if (permission) {
      roleOptions.permissions = permission;
    }
    
    // Create the role
    role = await guild.roles.create(roleOptions);
    logger.info(`Created role: ${name}`);
    
    return role;
  },
  
  /**
   * Create all categories and channels for the server
   * @param {Guild} guild - The Discord guild
   * @param {Object} roles - The server roles
   * @returns {Object} The created categories
   */
  async createCategories(guild, roles) {
    logger.info('Creating categories and channels...');
    
    // Define permissions for each category
    const everyonePerms = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages] }
    ];
    
    const staffPerms = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: roles.owner.id, allow: [PermissionFlagsBits.ViewChannel] },
      { id: roles.admin.id, allow: [PermissionFlagsBits.ViewChannel] },
      { id: roles.moderator.id, allow: [PermissionFlagsBits.ViewChannel] },
      { id: roles.support.id, allow: [PermissionFlagsBits.ViewChannel] }
    ];
    
    const devPerms = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: roles.owner.id, allow: [PermissionFlagsBits.ViewChannel] },
      { id: roles.admin.id, allow: [PermissionFlagsBits.ViewChannel] },
      { id: roles.developer.id, allow: [PermissionFlagsBits.ViewChannel] }
    ];
    
    // Create categories
    const categories = {};
    
    // Information category
    categories.information = await this.createCategory(guild, '📢 INFORMATION', everyonePerms);
    await this.createChannel(guild, 'welcome', categories.information, 0, 'Server rules and information', everyonePerms);
    await this.createChannel(guild, 'announcements', categories.information, 0, 'Official announcements', everyonePerms);
    await this.createChannel(guild, 'updates', categories.information, 0, 'Service updates and maintenance notices', everyonePerms);
    await this.createChannel(guild, 'roles', categories.information, 0, 'Self-assignable roles', everyonePerms);
    await this.createChannel(guild, 'faq', categories.information, 0, 'Frequently asked questions', everyonePerms);
    await this.createChannel(guild, 'verification', categories.information, 0, 'Verify to access the server', everyonePerms);
    
    // Update channel names with prefixes
    await this.updateChannelNames(guild, categories.information, {
      'welcome': '📌︱welcome',
      'announcements': '📣︱announcements',
      'updates': '🔔︱updates',
      'roles': '🎭︱roles',
      'faq': '❓︱faq',
      'verification': '🔐︱verification'
    });
    
    // Community category
    categories.community = await this.createCategory(guild, '🎮 COMMUNITY');
    await this.createChannel(guild, 'general', categories.community, 0, 'General discussion');
    await this.createChannel(guild, 'introductions', categories.community, 0, 'Introduce yourself to the community');
    await this.createChannel(guild, 'memes', categories.community, 0, 'Share your memes');
    await this.createChannel(guild, 'screenshots', categories.community, 0, 'Share your screenshots');
    await this.createChannel(guild, 'suggestions', categories.community, 0, 'Suggest improvements');
    await this.createChannel(guild, 'off-topic', categories.community, 0, 'Off-topic discussions');
    await this.createChannel(guild, 'events', categories.community, 0, 'Community events and giveaways');
    
    // Update channel names with prefixes
    await this.updateChannelNames(guild, categories.community, {
      'general': '💬︱general',
      'introductions': '👋︱introductions',
      'memes': '😂︱memes',
      'screenshots': '📸︱screenshots',
      'suggestions': '💡︱suggestions',
      'off-topic': '🎲︱off-topic',
      'events': '🎉︱events'
    });
    
    // Support category
    categories.support = await this.createCategory(guild, '🎫 SUPPORT');
    await this.createChannel(guild, 'create-ticket', categories.support, 0, 'Create a support ticket');
    await this.createChannel(guild, 'support-info', categories.support, 0, 'How to get support', everyonePerms);
    await this.createChannel(guild, 'common-issues', categories.support, 0, 'Solutions to common issues', everyonePerms);
    await this.createChannel(guild, 'feedback', categories.support, 0, 'Share your feedback');
    
    // Update channel names with prefixes
    await this.updateChannelNames(guild, categories.support, {
      'create-ticket': '🎫︱create-ticket',
      'support-info': 'ℹ️︱support-info',
      'common-issues': '🔧︱common-issues',
      'feedback': '📝︱feedback'
    });
    
    // Games category
    categories.games = await this.createCategory(guild, '�� GAMES');
    await this.createChannel(guild, 'minecraft', categories.games, 0, 'Minecraft discussion');
    await this.createChannel(guild, 'rust', categories.games, 0, 'Rust discussion');
    await this.createChannel(guild, 'ark', categories.games, 0, 'ARK: Survival Evolved discussion');
    await this.createChannel(guild, 'project-zomboid', categories.games, 0, 'Project Zomboid discussion');
    await this.createChannel(guild, 'valheim', categories.games, 0, 'Valheim discussion');
    await this.createChannel(guild, 'other-games', categories.games, 0, 'Other games discussion');
    await this.createChannel(guild, 'looking-for-group', categories.games, 0, 'Find people to play with');
    
    // Update channel names with prefixes
    await this.updateChannelNames(guild, categories.games, {
      'minecraft': '⛏️︱minecraft',
      'rust': '🔫︱rust',
      'ark': '🦖︱ark',
      'project-zomboid': '🧟︱project-zomboid',
      'valheim': '⚔️︱valheim',
      'other-games': '🎮︱other-games',
      'looking-for-group': '👥︱looking-for-group'
    });
    
    // Tutorials category
    categories.tutorials = await this.createCategory(guild, '🔧 TUTORIALS', everyonePerms);
    await this.createChannel(guild, 'server-setup', categories.tutorials, 0, 'Server setup guides', everyonePerms);
    await this.createChannel(guild, 'plugin-guides', categories.tutorials, 0, 'Plugin guides', everyonePerms);
    await this.createChannel(guild, 'mod-guides', categories.tutorials, 0, 'Mod guides', everyonePerms);
    await this.createChannel(guild, 'optimization', categories.tutorials, 0, 'Server optimization tips', everyonePerms);
    await this.createChannel(guild, 'resources', categories.tutorials, 0, 'Useful resources and links', everyonePerms);
    
    // Update channel names with prefixes
    await this.updateChannelNames(guild, categories.tutorials, {
      'server-setup': '🔰︱server-setup',
      'plugin-guides': '🧩︱plugin-guides',
      'mod-guides': '🛠️︱mod-guides',
      'optimization': '⚡︱optimization',
      'resources': '📚︱resources'
    });
    
    // Status category
    categories.status = await this.createCategory(guild, '📊 STATUS', everyonePerms);
    await this.createChannel(guild, 'node-status', categories.status, 0, 'Real-time status of hosting nodes', everyonePerms);
    await this.createChannel(guild, 'service-status', categories.status, 0, 'Status of the bot and panel', everyonePerms);
    await this.createChannel(guild, 'maintenance-announcements', categories.status, 0, 'Scheduled maintenance information', everyonePerms);
    await this.createChannel(guild, 'uptime', categories.status, 0, 'Historical uptime statistics', everyonePerms);
    
    // Update channel names with prefixes
    await this.updateChannelNames(guild, categories.status, {
      'node-status': '🖥️︱node-status',
      'service-status': '⚙️︱service-status',
      'maintenance-announcements': '🔧︱maintenance-announcements',
      'uptime': '📈︱uptime'
    });
    
    // Voice channels category
    categories.voice = await this.createCategory(guild, '💬 VOICE CHANNELS');
    await this.createChannel(guild, 'General Voice', categories.voice, 2);
    await this.createChannel(guild, 'Gaming 1', categories.voice, 2);
    await this.createChannel(guild, 'Gaming 2', categories.voice, 2);
    await this.createChannel(guild, 'Gaming 3', categories.voice, 2);
    await this.createChannel(guild, 'Music', categories.voice, 2);
    await this.createChannel(guild, 'Support Room 1', categories.voice, 2);
    await this.createChannel(guild, 'Support Room 2', categories.voice, 2);
    await this.createChannel(guild, 'Staff Voice', categories.voice, 2, '', staffPerms);
    await this.createChannel(guild, 'Streaming', categories.voice, 2);
    
    // Update channel names with prefixes
    await this.updateChannelNames(guild, categories.voice, {
      'General Voice': '🔊︱General Voice',
      'Gaming 1': '��︱Gaming 1',
      'Gaming 2': '🎮︱Gaming 2',
      'Gaming 3': '🎮︱Gaming 3',
      'Music': '🎧︱Music',
      'Support Room 1': '🎫︱Support Room 1',
      'Support Room 2': '🎫︱Support Room 2',
      'Staff Voice': '🔒︱Staff Voice',
      'Streaming': '🎤︱Streaming'
    });
    
    // Staff area category
    categories.staff = await this.createCategory(guild, '👥 STAFF AREA', staffPerms);
    await this.createChannel(guild, 'staff-announcements', categories.staff, 0, 'Staff announcements', staffPerms);
    await this.createChannel(guild, 'staff-chat', categories.staff, 0, 'Staff discussion', staffPerms);
    await this.createChannel(guild, 'mod-logs', categories.staff, 0, 'Moderation logs', staffPerms);
    await this.createChannel(guild, 'ticket-logs', categories.staff, 0, 'Ticket logs', staffPerms);
    await this.createChannel(guild, 'bot-commands', categories.staff, 0, 'Bot commands', staffPerms);
    await this.createChannel(guild, 'staff-tasks', categories.staff, 0, 'Staff task management', staffPerms);
    
    // Update channel names with prefixes
    await this.updateChannelNames(guild, categories.staff, {
      'staff-announcements': '📢︱staff-announcements',
      'staff-chat': '💬︱staff-chat',
      'mod-logs': '📝︱mod-logs',
      'ticket-logs': '🎫︱ticket-logs',
      'bot-commands': '🤖︱bot-commands',
      'staff-tasks': '📋︱staff-tasks'
    });
    
    // Development category
    categories.development = await this.createCategory(guild, '💻 DEVELOPMENT', devPerms);
    await this.createChannel(guild, 'dev-announcements', categories.development, 0, 'Development announcements', devPerms);
    await this.createChannel(guild, 'dev-chat', categories.development, 0, 'Developer discussion', devPerms);
    await this.createChannel(guild, 'github-feed', categories.development, 0, 'GitHub updates', devPerms);
    await this.createChannel(guild, 'bug-reports', categories.development, 0, 'Bug reports', devPerms);
    await this.createChannel(guild, 'feature-requests', categories.development, 0, 'Feature requests', devPerms);
    await this.createChannel(guild, 'dev-metrics', categories.development, 0, 'Development metrics', devPerms);
    
    // Update channel names with prefixes
    await this.updateChannelNames(guild, categories.development, {
      'dev-announcements': '📢︱dev-announcements',
      'dev-chat': '��︱dev-chat',
      'github-feed': '🔄︱github-feed',
      'bug-reports': '🐛︱bug-reports',
      'feature-requests': '🚀︱feature-requests',
      'dev-metrics': '📊︱dev-metrics'
    });
    
    logger.info('Created categories and channels');
    
    return categories;
  },
  
  /**
   * Create a category with the specified name and permissions
   * @param {Guild} guild - The Discord guild
   * @param {string} name - The category name
   * @param {Array} permissions - The permission overwrites
   * @returns {CategoryChannel} The created category
   */
  async createCategory(guild, name, permissions = []) {
    // Check if category already exists
    let category = guild.channels.cache.find(c => c.name === name && c.type === 4);
    
    if (category) {
      logger.info(`Category already exists: ${name}`);
      return category;
    }
    
    // Create the category
    category = await guild.channels.create({
      name: name,
      type: 4, // CategoryChannel
      permissionOverwrites: permissions,
      reason: 'JMF Hosting server setup'
    });
    
    logger.info(`Created category: ${name}`);
    return category;
  },
  
  /**
   * Create a channel with the specified name, parent, type, and permissions
   * @param {Guild} guild - The Discord guild
   * @param {string} name - The channel name
   * @param {CategoryChannel} parent - The parent category
   * @param {string} type - The channel type
   * @param {string} topic - The channel topic
   * @param {Array} permissions - The permission overwrites
   * @returns {GuildChannel} The created channel
   */
  async createChannel(guild, name, parent, type, topic = '', permissions = null) {
    // Check if channel already exists
    const channelType = type === 'GUILD_TEXT' ? 0 : type === 'GUILD_VOICE' ? 2 : 0;
    let channel = guild.channels.cache.find(c => c.name === name && c.type === channelType);
    
    if (channel) {
      logger.info(`Channel already exists: ${name}`);
      return channel;
    }
    
    // Create channel options
    const channelOptions = {
      name: name,
      type: channelType,
      topic: topic,
      reason: 'JMF Hosting server setup'
    };
    
    // Add parent if specified
    if (parent) {
      channelOptions.parent = parent.id;
    }
    
    // Add permissions if specified
    if (permissions) {
      channelOptions.permissionOverwrites = permissions;
    }
    
    // Create the channel
    channel = await guild.channels.create(channelOptions);
    logger.info(`Created channel: ${name}`);
    
    return channel;
  },
  
  /**
   * Set up verification and ticket systems
   * @param {Guild} guild - The Discord guild
   * @param {Object} categories - The server categories
   * @param {Object} roles - The server roles
   */
  async setupSystems(guild, categories, roles) {
    // Set up verification system
    const verificationChannel = guild.channels.cache.find(
      channel => channel.name === 'verification' && channel.type === 0
    );
    
    if (verificationChannel) {
      // Clear existing messages
      try {
        const messages = await verificationChannel.messages.fetch({ limit: 10 });
        if (messages.size > 0) {
          await verificationChannel.bulkDelete(messages);
        }
      } catch (error) {
        logger.warn(`Could not clear messages in verification channel: ${error.message}`);
      }
      
      // Create verification message
      await verification.createVerificationMessage(verificationChannel);
      logger.info('Set up verification system');
    }
    
    // Set up ticket system
    const ticketChannel = guild.channels.cache.find(
      channel => channel.name === config.channels.createTicket && channel.type === 0
    );
    
    if (ticketChannel) {
      // Clear existing messages
      try {
        const messages = await ticketChannel.messages.fetch({ limit: 10 });
        if (messages.size > 0) {
          await ticketChannel.bulkDelete(messages);
        }
      } catch (error) {
        logger.warn(`Could not clear messages in ticket channel: ${error.message}`);
      }
      
      // Create ticket message
      await tickets.createTicketMessage(ticketChannel);
      logger.info('Set up ticket system');
    }
  },
  
  /**
   * Create server rules in the welcome channel
   * @param {Guild} guild - The Discord guild
   * @param {Object} categories - The server categories
   */
  async createServerRules(guild, categories) {
    const welcomeChannel = guild.channels.cache.find(
      channel => channel.name === config.channels.welcome && channel.type === 0
    );
    
    if (!welcomeChannel) {
      logger.warn('Welcome channel not found');
      return;
    }
    
    // Clear existing messages
    try {
      const messages = await welcomeChannel.messages.fetch({ limit: 10 });
      if (messages.size > 0) {
        await welcomeChannel.bulkDelete(messages);
      }
    } catch (error) {
      logger.warn(`Could not clear messages in welcome channel: ${error.message}`);
    }
    
    // Create welcome banner
    const { EmbedBuilder } = require('discord.js');
    
    // Welcome Banner
    const welcomeBanner = new EmbedBuilder()
      .setColor('#00AAFF')
      .setTitle('🎮 Welcome to JMF Hosting! 🎮')
      .setDescription("**Premium Game Server Hosting Solutions**\n\nWelcome to the official JMF Hosting Discord server! We provide high-performance, reliable game server hosting with 24/7 support.\n\nPlease take a moment to read our server rules below.")
      .setImage('https://i.imgur.com/XaFYhoO.png') // Replace with your actual server banner
      .setTimestamp()
      .setFooter({ text: config.footerText });
    
    await welcomeChannel.send({ embeds: [welcomeBanner] });
    
    // General Rules Embed
    const generalRulesEmbed = new EmbedBuilder()
      .setColor('#FF7700')
      .setTitle('📜 General Rules')
      .setDescription('These rules apply to all channels and interactions within our server.')
      .addFields(
        { name: '1️⃣ Be Respectful', value: '• Treat all members with respect\n• No harassment, hate speech, or discrimination\n• Be mindful of others in voice channels' },
        { name: '2️⃣ No Spam', value: '• Avoid excessive messages, emojis, or mentions\n• Don\'t post the same content in multiple channels\n• No self-promotion without permission' },
        { name: '3️⃣ No NSFW Content', value: '• Keep all content appropriate for all ages\n• No explicit, graphic, or adult content\n• No inappropriate profile pictures or names' },
        { name: '4️⃣ No Advertising', value: '• Do not advertise other services without permission\n• No unsolicited DMs to members\n• No server invites except in designated channels' },
        { name: '5️⃣ Use Appropriate Channels', value: '• Post content in the relevant channels\n• Keep discussions on-topic\n• Read channel descriptions and pinned messages' },
        { name: '6️⃣ Follow Discord\'s TOS', value: '• Adhere to [Discord\'s Terms of Service](https://discord.com/terms)\n• Follow [Discord\'s Community Guidelines](https://discord.com/guidelines)' }
      );
    
    await welcomeChannel.send({ embeds: [generalRulesEmbed] });
    
    // Support Rules Embed
    const supportRulesEmbed = new EmbedBuilder()
      .setColor('#00AAFF')
      .setTitle('🎫 Support Rules')
      .setDescription('Follow these guidelines when seeking help with JMF Hosting services.')
      .addFields(
        { name: '1️⃣ Be Patient', value: '• Our staff will assist you as soon as possible\n• Don\'t ping staff members repeatedly\n• Support is provided during our operating hours' },
        { name: '2️⃣ Provide Details', value: '• When seeking help, provide as much information as possible\n• Include error messages, screenshots, and server IDs\n• Explain what you\'ve already tried' },
        { name: '3️⃣ Use Tickets for Support', value: '• Create a ticket in <#create-ticket> for personalized assistance\n• Don\'t ask for support in general channels\n• One issue per ticket for better tracking' },
        { name: '4️⃣ Follow Staff Instructions', value: '• Follow the guidance provided by our support team\n• Be cooperative during the troubleshooting process\n• Let us know if our solutions worked' }
      );
    
    await welcomeChannel.send({ embeds: [supportRulesEmbed] });
    
    // Voice Chat Rules Embed
    const voiceRulesEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎤 Voice Chat Rules')
      .setDescription('Guidelines for using voice channels in our server.')
      .addFields(
        { name: '1️⃣ No Disruptive Behavior', value: '• Avoid loud noises, music, or soundboards without permission\n• Don\'t interrupt others when they\'re speaking\n• Keep background noise to a minimum' },
        { name: '2️⃣ No Channel Hopping', value: '• Don\'t repeatedly join and leave voice channels\n• Stay in channels appropriate for your activity\n• Don\'t follow others between channels' },
        { name: '3️⃣ Respect Privacy', value: '• Do not record voice conversations without consent\n• Don\'t share private conversations\n• Respect others\' right to privacy' }
      );
    
    await welcomeChannel.send({ embeds: [voiceRulesEmbed] });
    
    // Enforcement Embed
    const enforcementEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('⚖️ Rule Enforcement')
      .setDescription('Violations of these rules may result in the following actions:')
      .addFields(
        { name: '⚠️ Warnings', value: 'Minor or first-time violations', inline: true },
        { name: '🔇 Temporary Mutes', value: 'Repeated minor violations', inline: true },
        { name: '👢 Kicks', value: 'Serious violations', inline: true },
        { name: '⏱️ Temporary Bans', value: 'Multiple serious violations', inline: true },
        { name: '🚫 Permanent Bans', value: 'Extreme violations or repeated offenses', inline: true }
      )
      .setFooter({ text: 'The severity of the action will depend on the nature and frequency of the violation.' });
    
    await welcomeChannel.send({ embeds: [enforcementEmbed] });
    
    // Agreement Embed
    const agreementEmbed = new EmbedBuilder()
      .setColor('#AA00FF')
      .setTitle('✅ Agreement')
      .setDescription('By participating in this server, you agree to follow these rules. Thank you for being part of our community!\n\n**To gain access to the rest of the server, please visit the <#verification> channel and follow the instructions there.**')
      .setTimestamp();
    
    await welcomeChannel.send({ embeds: [agreementEmbed] });
    
    logger.info('Created server rules with embeds and emojis');
  },
  
  /**
   * Update channel names with prefixes
   * @param {Guild} guild - The Discord guild
   * @param {CategoryChannel} category - The category containing the channels
   * @param {Object} nameMap - Map of old names to new names with prefixes
   */
  async updateChannelNames(guild, category, nameMap) {
    try {
      const channels = category.children.cache;
      
      for (const [id, channel] of channels) {
        const newName = nameMap[channel.name];
        if (newName && channel.name !== newName) {
          await channel.setName(newName);
          logger.info(`Renamed channel ${channel.name} to ${newName}`);
        }
      }
    } catch (error) {
      logger.error(`Error updating channel names: ${error.message}`);
    }
  }
}; 