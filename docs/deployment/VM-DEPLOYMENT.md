# Deploying JMF Discord Bot on the Same VM as Pterodactyl Panel

This guide provides step-by-step instructions for deploying the JMF Hosting Discord bot on the same Google Cloud VM instance that's running your Pterodactyl panel.

## Prerequisites

- A Google Cloud VM instance already running your Pterodactyl panel
- SSH access to the VM
- Node.js 16.9.0 or higher installed
- PM2 process manager (recommended for production)

## Option 1: Quick Installation (Recommended)

We've created an automated installer script that handles all the setup for you:```bash
# Download the installation script
wget -O install.sh https://raw.githubusercontent.com/Nanaimo2013/Jmf-Bot/main/install.sh
chmod +x install.sh

# Run the installation script
./install.sh
```

The installer will:
1. Install all required dependencies
2. Clone the bot repository
3. Set up the bot configuration
4. Create a systemd service for automatic startup
5. Start the bot

After installation, you'll need to:
1. Edit `/opt/jmf-bot/config.json` to configure your channel IDs
2. Restart the bot with `sudo systemctl restart jmf-bot`

## Option 2: Manual Installation

If you prefer to install the bot manually, follow these steps:

### Step 1: Connect to Your VM

```bash
ssh username@your-vm-ip-address
```

### Step 2: Install Required Dependencies

If Node.js is not already installed:

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt-get install -y nodejs

# Verify installation
node -v  # Should show v18.x.x
npm -v   # Should show 8.x.x or higher
```

Install PM2 for process management:

```bash
sudo npm install -g pm2
```

### Step 3: Create a Directory for the Bot

```bash
# Navigate to a suitable location
cd /var/www/  # Or another location of your choice

# Create directory for the bot
sudo mkdir jmf-bot
sudo chown $USER:$USER jmf-bot
cd jmf-bot
```

### Step 4: Clone the Bot Repository

```bash
# Clone the repository
git clone https://github.com/Nanaimo2013/Jmf-Bot.git
cd Jmf-Bot

# Install dependencies
npm install
```

### Step 5: Configure the Bot

Create and edit the `.env` file:

```bash
nano .env
```

Add the following configuration, replacing the placeholders with your actual values:

```
# Discord Bot Token (Required)
DISCORD_TOKEN=your_discord_bot_token_here

# Environment
NODE_ENV=production

# API Keys for Game Server Integration
PTERODACTYL_API_KEY=your_application_api_key_here
PTERODACTYL_API_URL=http://localhost/api  # If panel is on the same VM

# Logging Level
LOG_LEVEL=info
```

Create and edit the `config.json` file:

```bash
nano config.json
```

Add the following configuration:

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

### Step 6: Create Data Directories

```bash
mkdir -p data/users
mkdir -p logs
```

### Step 7: Start the Bot with PM2

```bash
# Start the bot
pm2 start src/index.js --name jmf-bot

# Save the PM2 process list
pm2 save

# Set up PM2 to start on system boot
pm2 startup
# Follow the instructions provided by the command
```

## Step 8: Monitor the Bot

```bash
# Check status
pm2 status

# View logs
pm2 logs jmf-bot

# Monitor resources
pm2 monit
```

## Step 9: Configure Firewall (if needed)

If you're using a firewall, make sure it's not blocking the bot's outgoing connections to Discord:

```bash
# Allow outgoing HTTPS traffic (if not already allowed)
sudo ufw allow out 443/tcp
```

## Step 10: Set Up the Discord Server

1. Create a new Discord server or use an existing one
2. Invite the bot to your server using the OAuth2 URL from the Discord Developer Portal
3. Run the `/setup` command in your Discord server to automatically create all roles, channels, and categories

## Configuring Status Monitoring

The bot includes two status monitoring systems:

### 1. Node Status System

This system displays the status of your hosting nodes in a dedicated channel. To set it up:

1. Create a `#node-status` channel in your Discord server
2. Add the channel ID to your `config.json` file under `channels.nodes`
3. Use the `/node update` command to add your first node:
   ```
   /node update node_id:node1 status:online location:US-East
   ```

The node status will automatically update every 10 seconds.

### 2. Service Status Monitoring

This system displays the status of the bot and Pterodactyl panel in a dedicated channel. To set it up:

1. Create a `#status` channel in your Discord server
2. Add the channel ID to your `config.json` file under `channels.status`
3. Restart the bot

The service status will automatically update every few minutes.

## Maintenance

### Updating the Bot

```bash
# Navigate to the bot directory
cd /opt/jmf-bot  # Or your installation directory

# Pull the latest changes (if using Git)
git pull

# Install any new dependencies
npm install

# Restart the bot
pm2 restart jmf-bot
```

### Viewing Logs

```bash
# View real-time logs
pm2 logs jmf-bot

# View saved logs
less ~/.pm2/logs/jmf-bot-out.log
less ~/.pm2/logs/jmf-bot-error.log
```

### Backing Up the Bot

```bash
# Back up the bot files
tar -czvf jmf-bot-backup.tar.gz /opt/jmf-bot
```

## Troubleshooting

### Bot is Offline

1. Check if the process is running:
   ```bash
   pm2 status
   ```

2. Check the logs for errors:
   ```bash
   pm2 logs jmf-bot
   ```

3. Verify that the Discord token is correct in the `.env` file

### API Connection Issues

If the bot can't connect to the Pterodactyl API:

1. Verify the API URL in the `.env` file
2. Check that the API key has the necessary permissions
3. Ensure there are no firewall rules blocking the connection

### Status Monitoring Not Working

If the status monitoring features aren't working:

1. Check that the channel IDs are correctly set in `config.json`
2. Verify that the bot has permission to send messages in those channels
3. Check the logs for any errors related to the status monitoring

## Resource Management

Since you're running both the Pterodactyl panel and the Discord bot on the same VM, it's important to monitor resource usage to ensure both applications have enough resources.

### Checking System Resources

```bash
# Check CPU and memory usage
htop

# Check disk usage
df -h
```

### Limiting Bot Resources (if needed)

You can limit the resources used by the bot using PM2:

```bash
# Restart the bot with memory limit
pm2 restart jmf-bot --max-memory-restart 200M
```

## Security Considerations

1. **Keep your `.env` file secure** - It contains sensitive information like API keys and tokens
2. **Regularly update dependencies** - Run `npm audit` and `npm update` periodically
3. **Monitor logs for suspicious activity** - Check for unauthorized access attempts
4. **Use a non-root user** - Run the bot as a dedicated user with limited permissions
5. **Back up regularly** - Create backups of your bot files and database

## Conclusion

Your JMF Hosting Discord bot should now be running on the same VM as your Pterodactyl panel. This setup provides a cost-effective and efficient way to manage both services while enabling direct integration between them.

If you encounter any issues or need further assistance, please contact the JMF Hosting support team or join our [Discord server](https://discord.gg/qZBWNjuBzy). 

