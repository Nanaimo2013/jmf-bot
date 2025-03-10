# JMF Hosting Discord Server Template

## Server Overview
This template provides a complete structure for the JMF Hosting Discord server, including categories, channels, roles, permissions, and a custom bot configuration.

## Server Name
**JMF Hosting**

## Server Icon
A professional logo representing JMF Hosting's game server services.

## Server Boost Level Goals
- Level 1: Custom server invite background, animated server icon
- Level 2: 720p 60fps streaming, custom server banner
- Level 3: 100 emoji slots, 384kbps audio quality

## Role Structure
Roles are listed in order of hierarchy (highest to lowest):

### Staff Roles
1. **Owner** - `#FF0000` (Red)
   - Server owner with all permissions
   - Distinctive role icon: Crown

2. **Administrator** - `#FF7700` (Orange)
   - Full administrative access
   - Can manage all aspects of the server except critical settings
   - Distinctive role icon: Shield

3. **Moderator** - `#FFAA00` (Amber)
   - Can manage messages, members, and enforce rules
   - Can create temporary mutes and kicks
   - Distinctive role icon: Hammer

4. **Support Staff** - `#FFDD00` (Yellow)
   - Handles customer support tickets
   - Limited moderation capabilities
   - Distinctive role icon: Headset

### Special Roles
5. **Developer** - `#00AAFF` (Light Blue)
   - For JMF Hosting development team
   - Access to development channels
   - Distinctive role icon: Code brackets

6. **Partner** - `#AA00FF` (Purple)
   - For official business partners
   - Special recognition in the community
   - Distinctive role icon: Handshake

7. **Content Creator** - `#FF00AA` (Pink)
   - For streamers and content creators who promote JMF Hosting
   - Special perks and recognition
   - Distinctive role icon: Camera

### Subscription Roles (Automatically assigned based on subscription level)
8. **Premium Tier 3** - `#00FFAA` (Turquoise)
   - Highest tier subscribers
   - Maximum perks and benefits
   - Distinctive role icon: Diamond

9. **Premium Tier 2** - `#00DDFF` (Cyan)
   - Mid-tier subscribers
   - Enhanced perks
   - Distinctive role icon: Gold bar

10. **Premium Tier 1** - `#00BBFF` (Sky Blue)
    - Entry-level subscribers
    - Basic perks
    - Distinctive role icon: Silver coin

### Community Roles
11. **Active Member** - `#00FF00` (Green)
    - For active community members (auto-assigned based on activity)
    - Minor perks for engagement
    - Distinctive role icon: Star

12. **Member** - `#AAAAAA` (Gray)
    - Default role for all verified members
    - Basic server access
    - No distinctive icon

13. **Bot** - `#7289DA` (Discord Blue)
    - For all server bots
    - Permissions as needed for functionality
    - Distinctive role icon: Robot

14. **Unverified** - `#555555` (Dark Gray)
    - Default role for new members before verification
    - Limited server access
    - No distinctive icon

## Category and Channel Structure

### 📢 INFORMATION
- `📌︱welcome` (Read-only) - Server rules, verification instructions
- `📣︱announcements` (Read-only) - Official JMF Hosting announcements
- `🔔︱updates` (Read-only) - Service updates and maintenance notices
- `🎭︱roles` (Read-only) - Self-assignable roles for notifications
- `❓︱faq` (Read-only) - Frequently asked questions about services
- `🔐︱verification` (Read-only) - Channel for new users to verify

### 🎮 COMMUNITY
- `💬︱general` - General discussion
- `👋︱introductions` - New members can introduce themselves
- `😂︱memes` - Gaming and hosting related memes
- `📸︱screenshots` - Share game screenshots
- `💡︱suggestions` - Suggest improvements for JMF Hosting services
- `🎲︱off-topic` - Discussions not related to gaming or hosting
- `🎉︱events` - Community events and giveaways

### 🎫 SUPPORT
- `🎫︱create-ticket` - Channel to create support tickets
- `ℹ️︱support-info` (Read-only) - How to get help with JMF services
- `🔧︱common-issues` (Read-only) - Solutions to common problems
- `📝︱feedback` - Share your experience with our services

### 🎲 GAMES
- `⛏️︱minecraft` - Minecraft discussion
- `🔫︱rust` - Rust discussion
- `🦖︱ark` - ARK: Survival Evolved discussion
- `🧟︱project-zomboid` - Project Zomboid discussion
- `⚔️︱valheim` - Valheim discussion
- `🎮︱other-games` - Discussion for other supported games
- `👥︱looking-for-group` - Find people to play with

### 🔧 TUTORIALS
- `🔰︱server-setup` (Read-only) - Guides for setting up game servers
- `🧩︱plugin-guides` (Read-only) - Information about popular plugins
- `🛠️︱mod-guides` (Read-only) - Information about popular mods
- `⚡︱optimization` (Read-only) - Server optimization tips
- `📚︱resources` (Read-only) - Useful resources and links

### 📊 STATUS
- `🖥️︱node-status` (Read-only) - Real-time status of hosting nodes
- `⚙️︱service-status` (Read-only) - Status of the bot and panel
- `🔧︱maintenance-announcements` (Read-only) - Scheduled maintenance information
- `📈︱uptime` (Read-only) - Historical uptime statistics

### 💰 ECONOMY & GAMES
- `⭐︱leveling` - Level up announcements and progress tracking
- `🏆︱leaderboard` - Server-wide leaderboards for levels and economy
- `⛏️︱mining` - Mining game commands and activities
- `🛒︱shop` - Purchase items, upgrades, and perks
- `🎒︱inventory` - View your items and resources
- `💰︱economy` - Economy commands and transactions

### 💬 VOICE CHANNELS
- `🔊︱General Voice` - General voice chat
- `🎮︱Gaming 1` - Voice channel for gaming
- `🎮︱Gaming 2` - Additional voice channel for gaming
- `🎮︱Gaming 3` - Additional voice channel for gaming
- `🎧︱Music` - Voice channel with music bot
- `🎫︱Support Room 1` - Voice support channel
- `🎫︱Support Room 2` - Additional voice support channel
- `🔒︱Staff Voice` - Private voice channel for staff
- `🎤︱Streaming` - For members who are streaming

### 👥 STAFF AREA (Staff only)
- `📢︱staff-announcements` - Important information for staff
- `💬︱staff-chat` - General staff discussion
- `📝︱mod-logs` - Logs of moderation actions
- `🎫︱ticket-logs` - Logs of support tickets
- `🤖︱bot-commands` - Channel for using bot commands
- `📋︱staff-tasks` - Task management for staff members

### 💻 DEVELOPMENT (Developers only)
- `📢︱dev-announcements` - Development announcements
- `💬︱dev-chat` - Developer discussion
- `🔄︱github-feed` - Automated GitHub updates
- `🐛︱bug-reports` - Internal bug tracking
- `🚀︱feature-requests` - New feature ideas and planning
- `📊︱dev-metrics` - Development metrics and statistics

## Custom Bot Configuration

### JMF Helper Bot
A custom Discord bot for JMF Hosting with the following features:

#### Welcome System
- Sends a personalized welcome message with server information when a new user joins
- DMs new users with verification instructions
- Assigns the Unverified role to new members

#### Verification System
- Users must react to a message or use a command to verify
- Upon verification, removes Unverified role and assigns Member role
- Can optionally require email verification for added security

#### Ticket System
- Creates support tickets when users react to a message or use a command
- Creates private channels for each ticket
- Logs all ticket activity
- Allows staff to close, reopen, or archive tickets

#### Server Statistics
- Displays real-time server statistics in voice channel names:
  - Member count
  - Online member count
  - Ticket count

#### Moderation Tools
- Command for temporary mutes, kicks, and bans
- Warning system with escalating consequences
- Anti-spam and anti-raid protection
- Logging of all moderation actions
- User case files with complete history

#### Utility Commands
- Server information command
- User information command
- Role information command
- Help command with detailed command descriptions
- Ping command to check bot latency

#### Game Server Integration
- Check game server status
- View online players
- Basic server management commands (restart, stop, start)
- Link Discord accounts to JMF Hosting accounts

#### Status Monitoring
- Node status system with real-time updates
- Service status monitoring for bot and panel
- Automatic updates every few minutes
- Color-coded status indicators

#### Auto-Moderation
- Filters inappropriate content
- Prevents excessive caps, emojis, or mentions
- Anti-spam measures
- Link filtering with whitelist

#### Role Management
- Self-assignable roles through reactions
- Temporary roles
- Role persistence (saves roles when members leave and rejoin)

#### Leveling System
- Experience points for activity
- Level-up announcements
- Role rewards for reaching certain levels
- Leaderboard command

#### Custom Commands
- Create custom commands for frequently asked questions
- Store and display server-specific information

#### Scheduled Announcements
- Regular reminders about rules
- Automated announcements for maintenance
- Customizable announcement schedule

## Bot Implementation

### Technology Stack
- **Language**: JavaScript/TypeScript with Node.js
- **Framework**: Discord.js
- **Database**: JSON file storage for persistent data
- **Hosting**: Dedicated VPS or cloud service for reliability

### Key Files Structure
```
jmf-bot/
├── src/
│   ├── commands/
│   │   ├── moderation/
│   │   ├── tickets/
│   │   ├── utility/
│   │   ├── gameservers/
│   │   └── admin/
│   ├── events/
│   ├── modules/
│   │   ├── welcome.js
│   │   ├── verification.js
│   │   ├── tickets.js
│   │   ├── automod.js
│   │   └── leveling.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── userLogger.js
│   │   └── statusMonitor.js
│   └── index.js
├── data/
│   ├── users/
│   └── nodes.json
├── config.json
├── .env
├── package.json
└── README.md
```

### Deployment Instructions
1. Set up a Node.js environment
2. Install dependencies
3. Configure the bot token and settings
4. Deploy to a reliable hosting service
5. Set up monitoring to ensure uptime

## Implementation Plan

1. **Initial Setup** (Day 1)
   - Create server with basic structure
   - Set up roles and permissions
   - Configure welcome channel and rules

2. **Bot Development** (Days 2-7)
   - Develop core bot functionality
   - Implement welcome and verification systems
   - Create ticket system
   - Add moderation tools

3. **Testing** (Days 8-9)
   - Test all bot features
   - Verify permissions are correctly set
   - Ensure all systems work as expected

4. **Launch** (Day 10)
   - Invite community members
   - Monitor for any issues
   - Gather feedback for improvements

## Maintenance Plan

- Regular bot updates (bi-weekly)
- Channel cleanup (monthly)
- Role and permission audit (monthly)
- Feedback collection from community (ongoing)
- Staff training on bot usage and moderation (as needed)
- Node status monitoring (continuous)
- Service status checks (every few minutes)

---

This template provides a comprehensive foundation for the JMF Hosting Discord server. Adjust channels, roles, and bot features as needed based on community size and specific requirements. 