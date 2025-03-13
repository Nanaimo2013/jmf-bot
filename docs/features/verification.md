# Verification System

## Overview

The verification system ensures that new users go through a verification process before gaining full access to the server. This helps protect against bots and ensures users acknowledge server rules.

## Configuration

The verification system can be configured in `config.json` under the `verification` section:

```json
{
  "verification": {
    "enabled": true,
    "verifiedRole": "Member",
    "unverifiedRole": "Unverified",
    "message": "Welcome to the server! Please click the button below to verify yourself and gain access to the server.",
    "buttonText": "Verify",
    "successMessage": "You have been successfully verified! You now have access to the server.",
    "embedColor": "#00FF00",
    "sendWelcomeMessage": true,
    "welcomeChannel": "welcome",
    "instructionsChannel": "verification"
  }
}
```

## Features

- **Role Management**: Automatically assigns/removes verified/unverified roles
- **Custom Messages**: Configurable welcome and success messages
- **Button Verification**: Simple one-click verification process
- **Welcome Messages**: Optional welcome messages in designated channels
- **Embed Customization**: Customizable embed colors and formatting

## Commands

### User Commands

- `/verify`: Initiates the verification process
- `/rules`: Displays server rules and verification instructions

### Admin Commands

- `/verification setup`: Sets up the verification system
- `/verification toggle`: Enables/disables the verification system
- `/verification config`: Configures verification settings

## Usage

1. **Initial Setup**
   ```bash
   /verification setup
   ```
   This creates the necessary channels and roles if they don't exist.

2. **Configuring Messages**
   ```bash
   /verification config message "Your custom verification message"
   /verification config success "Your custom success message"
   ```

3. **Managing Roles**
   ```bash
   /verification config role verified Member
   /verification config role unverified Unverified
   ```

## Events

The verification system responds to these events:
- `guildMemberAdd`: Assigns unverified role to new members
- `interactionCreate`: Handles verification button clicks
- `ready`: Sets up verification system on bot start

## Error Handling

- Invalid role configurations
- Missing permissions
- Channel access issues
- Rate limiting protection

## Best Practices

1. **Role Hierarchy**
   - Ensure bot role is above managed roles
   - Keep verified role permissions restricted
   - Set appropriate channel permissions

2. **Channel Setup**
   - Restrict unverified users to verification channel
   - Make rules visible to unverified users
   - Keep verification instructions clear and concise

3. **Message Content**
   - Include clear instructions
   - Reference server rules
   - Explain the verification process
   - Use appropriate formatting

## Troubleshooting

### Common Issues

1. **Roles Not Assigning**
   - Check bot permissions
   - Verify role hierarchy
   - Ensure roles exist

2. **Button Not Working**
   - Check bot permissions
   - Verify interaction permissions
   - Check rate limiting

3. **Welcome Messages Not Sending**
   - Verify channel permissions
   - Check channel IDs
   - Ensure welcome messages are enabled

### Debug Commands

```bash
/verification debug roles
/verification debug permissions
/verification debug channels
```

## Security Considerations

- Rate limiting on verification attempts
- Logging of verification actions
- Anti-spam measures
- Role permission restrictions

## API Integration

The verification system exposes these API endpoints:

```javascript
GET /api/verification/status
POST /api/verification/verify
GET /api/verification/stats
```

## Examples

### Custom Verification Setup

```javascript
// Custom verification with additional checks
await verification.setup({
  requireAccount: true,
  minAccountAge: 7,
  requireCaptcha: true
});
```

### Advanced Configuration

```javascript
// Multiple verification steps
await verification.configure({
  steps: ['captcha', 'rules', 'agreement'],
  timeout: 300,
  maxAttempts: 3
});
``` 