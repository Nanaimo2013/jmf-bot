# JMF Hosting Discord Bot Configuration

This directory contains the configuration files for the JMF Hosting Discord Bot.

## Configuration Files

### Main Configuration (`config.json`)

The main configuration file contains all non-sensitive bot settings. This is your personal configuration file and should not be committed to version control.

### Example Configuration (`config.json.example`)

This is the template configuration file that gets committed to version control. New users should copy this file to `config.json` and update the values accordingly.

### Environment Variables (`.env`)

Contains all sensitive information and environment-specific settings:
- Discord tokens and IDs
- API keys
- Database credentials
- Webhook URLs
- Security keys

## Configuration Structure

The configuration is organized into logical sections:

```json
{
  "bot": {
    // Basic bot settings
  },
  "database": {
    // Database configuration
  },
  "logging": {
    // Logging settings
  },
  "docker": {
    // Docker configuration
  },
  "welcomeSystem": {
    // Welcome message settings
  },
  "leaveSystem": {
    // Leave message settings
  },
  "autoRole": {
    // Automatic role assignment
  },
  "ticketSystem": {
    // Support ticket settings
  },
  "autoMod": {
    // Moderation settings
  },
  "levelSystem": {
    // XP and leveling settings
  },
  "memberCountChannels": {
    // Member count display
  },
  "miningGame": {
    // Mining game settings
  },
  "economy": {
    // Economy system settings
  },
  "verification": {
    // User verification settings
  },
  "channels": {
    // Channel IDs and settings
  },
  "roles": {
    // Role definitions
  }
}
```

## Setup Instructions

1. Copy `config.json.example` to `config.json`
2. Copy `.env.example` to `.env`
3. Update the values in both files according to your needs
4. Never commit `config.json` or `.env` to version control

## Environment Variables

The `.env` file should contain:

```env
# Bot Tokens and IDs
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
OWNER_ID=your_user_id

# Environment
NODE_ENV=production

# Database Configuration
DB_TYPE=sqlite
DB_PATH=./data/database.sqlite

# Game Server Integration
PTERODACTYL_API_KEY=your_api_key
PTERODACTYL_API_URL=your_panel_url

# Security
API_SECRET_KEY=your_secret_key
JWT_SECRET=your_jwt_secret

# Webhooks
MONITORING_WEBHOOK_URL=your_webhook_url
STATUS_WEBHOOK_URL=your_status_webhook_url
```

## Security Notes

- Never commit sensitive information to version control
- Keep your `.env` file secure and backed up
- Regularly rotate API keys and tokens
- Use strong secrets for JWT and API keys 