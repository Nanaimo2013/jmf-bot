# JMF Hosting Discord Server & Bot Deployment Guide

This guide provides step-by-step instructions for setting up the JMF Hosting Discord server and deploying the custom bot.

## Discord Server Setup

### 1. Create a New Discord Server

1. Open Discord and click the "+" button on the left sidebar
2. Select "Create My Own"
3. Choose "For a club or community"
4. Name the server "JMF Hosting"
5. Upload the JMF Hosting logo as the server icon

### 2. Set Up Roles

Create the following roles in order (from highest to lowest):

#### Staff Roles
- **Owner** - Color: `#FF0000` (Red)
- **Administrator** - Color: `#FF7700` (Orange)
- **Moderator** - Color: `#FFAA00` (Amber)
- **Support Staff** - Color: `#FFDD00` (Yellow)

#### Special Roles
- **Developer** - Color: `#00AAFF` (Light Blue)
- **Partner** - Color: `#AA00FF` (Purple)
- **Content Creator** - Color: `#FF00AA` (Pink)

#### Subscription Roles
- **Premium Tier 3** - Color: `#00FFAA` (Turquoise)
- **Premium Tier 2** - Color: `#00DDFF` (Cyan)
- **Premium Tier 1** - Color: `#00BBFF` (Sky Blue)

#### Community Roles
- **Active Member** - Color: `#00FF00` (Green)
- **Member** - Color: `#AAAAAA` (Gray)
- **Bot** - Color: `#7289DA` (Discord Blue)
- **Unverified** - Color: `#555555` (Dark Gray)

For each role, set the appropriate permissions as described in the `discord-server-template.md` file.

### 3. Create Categories and Channels

Create the following categories and channels:

#### 📢 INFORMATION
- `#welcome` (Read-only)
- `#announcements` (Read-only)
- `#updates` (Read-only)
- `#roles` (Read-only)
- `#faq` (Read-only)

#### 🎮 COMMUNITY
- `#general`
- `#introductions`
- `#memes`
- `#screenshots`
- `#suggestions`
- `#off-topic`

#### 🎫 SUPPORT
- `#create-ticket`
- `#support-info` (Read-only)
- `#common-issues` (Read-only)

#### 🎲 GAMES
- `#minecraft`
- `#rust`
- `#ark`
- `#other-games`
- `#looking-for-group`

#### 🔧 TUTORIALS
- `#server-setup` (Read-only)
- `#plugin-guides` (Read-only)
- `#mod-guides` (Read-only)
- `#optimization` (Read-only)

#### 💬 VOICE CHANNELS
- `🔊 General Voice`
- `🎮 Gaming 1`
- `🎮 Gaming 2`
- `🎮 Gaming 3`
- `🎧 Music`
- `🎫 Support Room 1`
- `🎫 Support Room 2`
- `🔒 Staff Voice`

#### 👥 STAFF AREA (Staff only)
- `#staff-announcements`
- `#staff-chat`
- `#mod-logs`
- `#ticket-logs`
- `#bot-commands`

#### 💻 DEVELOPMENT (Developers only)
- `#dev-announcements`
- `#dev-chat`
- `#github-feed`
- `#bug-reports`

#### 📊 STATUS (New)
- `#node-status` (Read-only)
- `#service-status` (Read-only)
- `#maintenance-announcements` (Read-only)

### 4. Set Up Channel Permissions

For each channel, set the appropriate permissions for each role. Here are some general guidelines:

- **Information channels**: Everyone can read, only staff can write
- **Community channels**: Everyone can read and write
- **Support channels**: Everyone can read, only staff can write in info channels
- **Game channels**: Everyone can read and write
- **Tutorial channels**: Everyone can read, only staff can write
- **Voice channels**: Everyone can join except staff-only channels
- **Staff channels**: Only visible to staff roles
- **Development channels**: Only visible to the Developer role
- **Status channels**: Everyone can read, only staff can write

### 5. Create Server Rules

In the `#welcome` channel, create a message with the server rules. Here's a template:

```
# JMF Hosting Discord Rules

Welcome to the official JMF Hosting Discord server! Please follow these rules to ensure a positive experience for everyone.

## General Rules

1. **Be respectful** - Treat all members with respect. No harassment, hate speech, or discrimination.

2. **No spam** - Avoid excessive messages, emojis, or mentions.

3. **No NSFW content** - Keep all content appropriate for all ages.

4. **No advertising** - Do not advertise other services without permission.

5. **Use appropriate channels** - Post content in the relevant channels.

6. **Follow Discord's TOS** - Adhere to Discord's Terms of Service and Community Guidelines.

## Support Rules

1. **Be patient** - Our staff will assist you as soon as possible.

2. **Provide details** - When seeking help, provide as much information as possible.

3. **Use tickets for support** - Create a ticket in #create-ticket for personalized assistance.

4. **One issue per ticket** - Create separate tickets for different issues.

## Voice Chat Rules

1. **No disruptive behavior** - Avoid loud noises, music, or soundboards without permission.

2. **No channel hopping** - Don't repeatedly join and leave voice channels.

3. **Respect privacy** - Do not record voice conversations without consent.

## Enforcement

Violations of these rules may result in:
- Warnings
- Temporary mutes
- Kicks
- Temporary bans
- Permanent bans

The severity of the action will depend on the nature and frequency of the violation.

By participating in this server, you agree to follow these rules. Thank you for being part of our community!
```

### 6. Set Up Verification

Create a `#verification` channel where new members must verify themselves to gain access to the rest of the server.

## Bot Deployment

### 1. Create a Discord Bot Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it "JMF Helper"
3. Go to the "Bot" tab and click "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
5. Under "Bot Permissions", enable the necessary permissions or use "Administrator"
6. Save changes

### 2. Invite the Bot to Your Server

1. Go to the "OAuth2" tab, then "URL Generator"
2. Select the "bot" and "applications.commands" scopes
3. Select the necessary bot permissions or use "Administrator"
4. Copy the generated URL and open it in a browser
5. Select your JMF Hosting server and authorize the bot

### 3. Deploy the Bot

#### Option 1: Quick VM Installation (Recommended)

If you're deploying on a VM (including one that already has Pterodactyl Panel):

1. SSH into your VM
2. Run the installer script:
   ```bash
   wget -O install.sh https://raw.githubusercontent.com/Nanaimo2013/Jmf-Bot/main/install.sh
   chmod +x install.sh
   sudo ./install.sh
   ```
3. Follow the prompts to enter your Discord bot token and Pterodactyl API details
4. Configure the channel IDs in `/opt/jmf-bot/config.json`
5. Restart the bot: `sudo systemctl restart jmf-bot`

For detailed VM deployment instructions, see [VM-DEPLOYMENT.md](VM-DEPLOYMENT.md).

#### Option 2: Local Deployment

1. Clone the repository
   ```bash
   git clone https://github.com/Nanaimo2013/Jmf-Bot.git
   cd Jmf-Bot
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create and configure the `.env` file
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your Discord bot token and other required information.

4. Create and configure the `config.json` file
   ```json
   {
     "embedColor": "#0099ff",
     "footerText": "JMF Hosting",
     "channels": {
       "logs": "CHANNEL_ID_HERE",
       "joinLeave": "CHANNEL_ID_HERE",
       "moderationLogs": "CHANNEL_ID_HERE",
       "nodes": "CHANNEL_ID_HERE",
       "status": "CHANNEL_ID_HERE"
     }
   }
   ```

5. Start the bot
   ```bash
   npm start
   ```

#### Option 3: Docker Deployment

1. Build the Docker image
   ```bash
   docker build -t jmf-bot .
   ```
2. Run the Docker container
   ```bash
   docker run -d --name jmf-bot --env-file .env jmf-bot
   ```

### 4. Configure Status Monitoring

The bot includes two status monitoring systems:

#### Node Status System

This system displays the status of your hosting nodes in a dedicated channel:

1. Make sure the `#node-status` channel ID is set in your `config.json` under `channels.nodes`
2. Use the `/node update` command to add your first node:
   ```
   /node update node_id:node1 status:online location:US-East
   ```
3. The status will automatically update every 10 seconds

#### Service Status Monitoring

This system displays the status of the bot and Pterodactyl panel:

1. Make sure the `#service-status` channel ID is set in your `config.json` under `channels.status`
2. Ensure the `PTERODACTYL_API_URL` and `PTERODACTYL_API_KEY` are set in your `.env` file
3. The status will automatically update every few minutes

### 5. Verify Bot Functionality

1. Check that the bot is online in your Discord server
2. Verify that the welcome message appears in the verification channel
3. Test the verification process
4. Test the ticket system
5. Test slash commands like `/ping` and `/serverinfo`
6. Check that the status monitoring is working in the designated channels

## Maintenance

### Regular Updates

1. Pull the latest changes from the repository
   ```bash
   git pull
   ```
2. Install any new dependencies
   ```bash
   npm install
   ```
3. Restart the bot
   ```bash
   # If using Node.js directly
   npm restart
   
   # If using PM2
   pm2 restart jmf-bot
   
   # If using Docker
   docker restart jmf-bot
   
   # If using systemd
   sudo systemctl restart jmf-bot
   ```

### Monitoring

1. Check the logs regularly
   ```bash
   # If using PM2
   pm2 logs jmf-bot
   
   # If using Docker
   docker logs jmf-bot
   
   # If using systemd
   journalctl -u jmf-bot -f
   ```
2. Set up monitoring tools like UptimeRobot to ensure the bot stays online

## Troubleshooting

### Bot is Offline

1. Check if the process is running
   ```bash
   # If using PM2
   pm2 status
   
   # If using Docker
   docker ps
   
   # If using systemd
   systemctl status jmf-bot
   ```
2. Check the logs for errors
3. Verify that the Discord token is correct
4. Ensure the bot has the necessary permissions

### Commands Not Working

1. Check if the bot has the necessary permissions
2. Verify that slash commands are registered
3. Check the logs for command execution errors
4. Try re-deploying the commands

### Status Monitoring Not Working

1. Check that the channel IDs are correctly set in `config.json`
2. Verify that the bot has permission to send messages in those channels
3. For panel status, check that the Pterodactyl API URL and key are correct
4. Check the logs for any errors related to the status monitoring

## Support

If you encounter any issues with the bot or Discord server setup, please contact:

- Email: support@jmfhosting.com
- Discord: Join our [support server](https://discord.gg/jmfhosting)

---

This guide was created for JMF Hosting. For more information, visit [jmfhosting.com](https://jmfhosting.com). 