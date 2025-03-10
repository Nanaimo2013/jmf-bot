# Pterodactyl Panel Integration

## Overview

This document provides information on how the JMF Hosting Discord Bot integrates with the Pterodactyl Panel for game server management.

## Features

- **Server Status**: Check the status of your game servers directly from Discord
- **Server Control**: Start, stop, and restart your game servers using Discord commands
- **Resource Monitoring**: Monitor CPU, RAM, and disk usage of your servers
- **Console Access**: Access server console logs and send commands
- **User Management**: Link Discord accounts to Pterodactyl accounts

## Configuration

To configure the Pterodactyl integration, you need to set the following in your `config.json` file:

```json
{
  "pterodactyl": {
    "enabled": true,
    "url": "https://panel.yourdomain.com",
    "apiKey": "your-api-key",
    "clientApiKey": "your-client-api-key",
    "updateInterval": 60
  }
}
```

## Commands

### Admin Commands

- `/pterodactyl status` - Check the status of the Pterodactyl panel
- `/pterodactyl servers` - List all servers on the panel
- `/pterodactyl user <user>` - Get information about a user's servers

### User Commands

- `/server list` - List your servers
- `/server info <server>` - Get detailed information about a server
- `/server start <server>` - Start a server
- `/server stop <server>` - Stop a server
- `/server restart <server>` - Restart a server
- `/server console <server>` - View the console of a server
- `/server command <server> <command>` - Send a command to a server

## Troubleshooting

If you encounter issues with the Pterodactyl integration, check the following:

1. Ensure your API key has the necessary permissions
2. Verify the panel URL is correct and accessible
3. Check the bot logs for any error messages
4. Ensure the bot has the necessary Discord permissions

## Security Considerations

- API keys should be kept secure and never shared
- Use environment variables for sensitive information
- Regularly rotate API keys
- Limit the permissions of the API key to only what is necessary

---

© 2025 JMFHosting. All Rights Reserved.  
Developed by [Nanaimo2013](https://github.com/Nanaimo2013) 