# Leveling System

<div align="center">

![Version](https://img.shields.io/badge/Version-1.1.1-blue.svg)
![Status](https://img.shields.io/badge/Status-Active-green.svg)

</div>

## Overview

The JMF Hosting Discord Bot includes a comprehensive leveling system that rewards users for their activity in the server. Users earn XP through messages and voice chat participation, which allows them to level up and unlock special roles and perks.

## Features

- **Balanced XP Progression**: Carefully tuned XP rates for a rewarding but challenging progression
- **Dual XP Sources**: Earn XP from both text messages and voice chat activity
- **Level Roles**: Automatically receive special roles when reaching certain levels
- **XP Multipliers**: Premium users receive XP bonuses based on their tier
- **Leaderboards**: Compete with other users to climb the ranks

## How XP is Earned

### Message XP
- Users earn **3 XP** for every 5th message sent
- Messages must be at least 60 seconds apart to count toward XP (anti-spam)
- XP is only awarded in server channels, not in DMs

### Voice XP
- Users earn **1 XP per minute** of voice activity, awarded every 10 minutes
- Must be in a voice channel with at least one other non-bot user
- Must not be muted or deafened
- AFK channels are excluded from XP gain

## XP Multipliers

Premium users receive XP multipliers based on their tier:

| Role | Multiplier |
|------|------------|
| Premium Tier 1 | 1.1x (10% bonus) |
| Premium Tier 2 | 1.25x (25% bonus) |
| Premium Tier 3 | 1.5x (50% bonus) |

## Leveling Formula

The XP required to reach the next level follows this formula:

```
Required XP = 150 * (current_level ^ 1.8)
```

This creates a progressively steeper curve, making higher levels more challenging to achieve.

### Example XP Requirements

| Level | XP Required |
|-------|-------------|
| 1 → 2 | 150 XP |
| 5 → 6 | 1,989 XP |
| 10 → 11 | 9,487 XP |
| 20 → 21 | 51,175 XP |
| 50 → 51 | 422,372 XP |

## Level Roles

Users automatically receive special roles when reaching certain levels:

| Level | Role |
|-------|------|
| 5 | Level 5 |
| 10 | Level 10 |
| 20 | Level 20 |
| 30 | Level 30 |
| 50 | Level 50 |

## Commands

| Command | Description |
|---------|-------------|
| `/level` | View your current level and XP |
| `/level @user` | View another user's level and XP |
| `/leaderboard` | View the server's level leaderboard |

## Configuration

Server administrators can configure the leveling system through the `config.json` file:

```json
"levelSystem": {
  "enabled": true,
  "xpPerMessage": 3,
  "xpCooldown": 60,
  "voiceXpPerMinute": 1,
  "messageRewardFrequency": 5,
  "voiceRewardFrequency": 10,
  "levelUpMessage": "Congratulations {user}! You've reached level {level}!",
  "levelUpChannel": "⭐︱leveling",
  "levelRoles": {
    "5": "Level 5",
    "10": "Level 10",
    "20": "Level 20",
    "30": "Level 30",
    "50": "Level 50"
  },
  "xpMultipliers": {
    "premiumTier1": 1.1,
    "premiumTier2": 1.25,
    "premiumTier3": 1.5
  },
  "levelFormula": "150 * (level ^ 1.8)"
}
```

## Recent Changes (v1.1.1)

The leveling system was recently rebalanced to provide a more rewarding progression:

- **Reduced XP gain rates**: Message XP reduced from 5 to 3, voice XP reduced from 2 to 1
- **Increased reward frequency**: Now every 5th message (was 3rd) and every 10 minutes of voice (was 5)
- **Steeper level curve**: Formula changed from `100 * (level ^ 1.5)` to `150 * (level ^ 1.8)`
- **Improved tracking**: Better logging and tracking of voice activity

These changes ensure that leveling up remains a meaningful achievement and prevents users from progressing too quickly.

---

<div align="center">

**[📖 Back to Documentation](../README.md)** •
**[💰 Economy System](economy.md)** •
**[⛏️ Mining Game](mining.md)**

</div> 