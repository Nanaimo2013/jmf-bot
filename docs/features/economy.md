# Economy System

## Overview

The Economy System provides a virtual currency system for the server, allowing users to earn, spend, and trade currency through various activities and features.

## Configuration

The economy system is configured in `config.json` under the `economy` section:

```json
{
  "economy": {
    "enabled": true,
    "startingBalance": 100,
    "currencyName": "Coins",
    "currencySymbol": "🪙",
    "dailyReward": {
      "min": 50,
      "max": 200,
      "cooldown": 86400
    },
    "workReward": {
      "min": 10,
      "max": 50,
      "cooldown": 3600
    },
    "gambleMinAmount": 10,
    "interestRate": 0.01,
    "interestInterval": 86400,
    "transferFee": 0.05,
    "transferEnabled": true
  }
}
```

## Features

### Currency Management
- Virtual currency system
- Multiple earning methods
- Secure transactions
- Balance tracking

### Reward Systems
- Daily rewards
- Work commands
- Activity bonuses
- Special events

### Trading System
- User-to-user transfers
- Trading fees
- Transaction history
- Market system

### Shop System
- Item purchases
- Role purchases
- Special perks
- Limited-time offers

## Commands

### Basic Commands
- `/balance`: Check current balance
- `/daily`: Claim daily reward
- `/work`: Earn currency through work
- `/transfer`: Transfer currency to others

### Shop Commands
- `/shop`: View available items
- `/buy`: Purchase items
- `/sell`: Sell items
- `/inventory`: View owned items

### Management Commands
- `/economy add`: Add currency to user
- `/economy remove`: Remove currency from user
- `/economy set`: Set user's balance
- `/economy reset`: Reset user's economy data

## Transaction System

### Basic Transaction
```javascript
const transaction = {
  type: "transfer",
  from: "user1",
  to: "user2",
  amount: 100,
  fee: 5,
  timestamp: Date.now(),
  description: "Payment for services"
};
```

### Transaction Types
- User transfers
- Shop purchases
- Reward claims
- System adjustments

## Shop System

### Item Structure
```javascript
const shopItem = {
  id: "vip_role",
  name: "VIP Role",
  cost: 500000,
  description: "Get the VIP role for 1 week",
  duration: 604800,
  type: "role",
  effects: {
    "role": "VIP",
    "perks": ["color", "icon", "xpBoost"]
  }
};
```

### Categories
- Roles and Permissions
- Cosmetic Items
- Boosters
- Special Features

## Earning Methods

### Work System
```javascript
const workReward = {
  baseAmount: {min: 10, max: 50},
  bonuses: {
    streak: 1.1,
    premium: 1.25,
    event: 1.5
  },
  cooldown: 3600,
  jobs: [
    "Miner",
    "Farmer",
    "Fisher",
    "Hunter"
  ]
};
```

### Daily Rewards
```javascript
const dailyReward = {
  baseAmount: {min: 50, max: 200},
  streakBonus: 1.1,
  maxStreak: 7,
  cooldown: 86400,
  bonusDay: "Sunday"
};
```

## Economy Events

### Event Types
- Double earnings
- Reduced shop prices
- Special rewards
- Limited-time items

### Event Structure
```javascript
const economyEvent = {
  name: "Weekend Bonus",
  type: "multiplier",
  value: 2,
  duration: 172800,
  affects: ["work", "daily"],
  announcement: "Double earnings weekend!"
};
```

## API Integration

```javascript
// Economy endpoints
GET /api/economy/balance
POST /api/economy/transfer
GET /api/economy/transactions
POST /api/economy/purchase

// Shop endpoints
GET /api/shop/items
POST /api/shop/buy
GET /api/shop/inventory
```

## Database Schema

### User Economy
```sql
CREATE TABLE user_economy (
  user_id TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  last_daily TIMESTAMP,
  last_work TIMESTAMP,
  work_streak INTEGER DEFAULT 0
);
```

### Transactions
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  type TEXT,
  from_user TEXT,
  to_user TEXT,
  amount INTEGER,
  fee INTEGER,
  timestamp TIMESTAMP,
  description TEXT
);
```

## Best Practices

1. **Balance Management**
   - Regular backups
   - Transaction logging
   - Error handling
   - Atomic transactions

2. **Economy Balance**
   - Inflation control
   - Regular adjustments
   - Fair distribution
   - Value maintenance

3. **Security**
   - Transaction verification
   - Anti-exploit measures
   - Rate limiting
   - Audit logging

## Troubleshooting

### Common Issues

1. **Transaction Failures**
   - Insufficient funds
   - Rate limiting
   - Permission issues
   - Invalid amounts

2. **Reward Issues**
   - Cooldown tracking
   - Streak calculation
   - Bonus application
   - Event multipliers

3. **Shop Issues**
   - Item availability
   - Price verification
   - Role assignment
   - Duration tracking

## Development

### Adding New Features

1. **New Reward Types**
   ```javascript
   const newReward = {
     name: "Quest Reward",
     baseAmount: {min: 100, max: 500},
     requirements: {
       level: 10,
       questCompleted: true
     }
   };
   ```

2. **New Shop Items**
   ```javascript
   const newItem = {
     name: "Custom Command",
     cost: 1000000,
     type: "feature",
     duration: 2592000,
     limit: 1
   };
   ```

### Testing

- Transaction testing
- Balance verification
- Event simulation
- Load testing 