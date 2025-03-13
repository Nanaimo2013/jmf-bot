# Mining Game System

## Overview

The Mining Game is an engaging economy-based mini-game that allows users to mine resources, upgrade their equipment, and earn in-game currency. The system features multiple mining worlds, upgradeable equipment, and various boosters to enhance the mining experience.

## Configuration

The mining game is configured in `config.json` under the `miningGame` section:

```json
{
  "miningGame": {
    "enabled": true,
    "cooldown": 60,
    "worlds": [
      {
        "name": "Coal Mine",
        "level": 1,
        "resources": [
          {"name": "Coal", "value": 5, "chance": 70, "xp": 2},
          {"name": "Iron Ore", "value": 10, "chance": 25, "xp": 5},
          {"name": "Silver Ore", "value": 25, "chance": 5, "xp": 10}
        ],
        "unlockCost": 0
      }
    ],
    "pickaxes": [
      {"name": "Wooden Pickaxe", "power": 1, "cost": 0, "cooldownReduction": 0},
      {"name": "Stone Pickaxe", "power": 2, "cost": 500, "cooldownReduction": 5}
    ]
  }
}
```

## Features

### Mining Worlds
- Multiple mining locations with different resources
- Progressive difficulty and rewards
- Level requirements for access
- Unique resource pools per world

### Equipment
- **Pickaxes**: Different tiers with varying mining power
- **Armor**: Protection and bonus effects
- **Pets**: Mining companions with special abilities
- **Boosters**: Temporary enhancement items

### Progression System
- Experience points (XP) from mining
- Level-based unlocks
- Equipment upgrades
- World unlocks

## Commands

### Basic Commands
- `/mine`: Perform mining action
- `/inventory`: View collected resources
- `/shop`: Access the mining shop
- `/stats`: View mining statistics

### Equipment Commands
- `/equip`: Manage equipment
- `/upgrade`: Upgrade equipment
- `/pet`: Manage mining pets
- `/booster`: Use/view boosters

### World Commands
- `/worlds`: List available mining worlds
- `/travel`: Move between worlds
- `/explore`: Discover new resources

## Mining Mechanics

### Basic Mining
```javascript
const miningResult = {
  success: true,
  resource: "Iron Ore",
  amount: 1,
  value: 10,
  xp: 5,
  bonuses: {
    petBonus: 1.1,
    equipmentBonus: 1.2,
    boosterBonus: 1.5
  }
};
```

### Resource Chances
- Base chance per resource
- Modified by equipment
- Affected by boosters
- Pet bonuses applied

### Cooldown System
- Base cooldown per action
- Reduced by equipment
- Affected by boosters
- Premium benefits

## Equipment System

### Pickaxes
```javascript
const pickaxe = {
  name: "Iron Pickaxe",
  power: 3,
  durability: 100,
  cooldownReduction: 10,
  bonuses: {
    resourceChance: 1.1,
    valueMultiplier: 1.2
  }
};
```

### Armor
```javascript
const armor = {
  name: "Iron Armor",
  protection: 2,
  xpBoost: 1.1,
  durability: 100,
  setBonus: "Mining Speed +10%"
};
```

### Pets
```javascript
const pet = {
  name: "Mining Rat",
  level: 1,
  bonuses: {
    resourceChance: 1.05,
    cooldownReduction: 5
  },
  abilities: ["Find Rare Resources"]
};
```

## Economy Integration

### Resource Market
- Selling resources
- Market fluctuations
- Trade system
- Resource value calculation

### Currency System
- Mining earnings
- Equipment costs
- World unlock fees
- Premium features

## Progression

### Level System
```javascript
const levelProgress = {
  currentLevel: 10,
  currentXP: 1500,
  nextLevelXP: 2000,
  totalXP: 15000,
  unlockedWorlds: ["Coal Mine", "Gold Mine"],
  availableUpgrades: ["Diamond Pickaxe", "Gold Armor"]
};
```

### Achievements
- Mining milestones
- Equipment collection
- World exploration
- Resource discovery

## Events

- Resource discoveries
- Level-up celebrations
- World unlocks
- Special mining events

## API Integration

```javascript
// Mining endpoints
GET /api/mining/profile
POST /api/mining/mine
GET /api/mining/inventory
POST /api/mining/upgrade

// Equipment endpoints
GET /api/mining/equipment
POST /api/mining/equip
GET /api/mining/shop
```

## Best Practices

1. **Resource Balance**
   - Maintain economy balance
   - Progressive difficulty
   - Fair reward distribution
   - Regular value adjustments

2. **Player Engagement**
   - Regular updates
   - Special events
   - Community challenges
   - Seasonal content

3. **Performance**
   - Efficient calculations
   - Cached results
   - Rate limiting
   - Anti-cheat measures

## Troubleshooting

### Common Issues

1. **Mining Failures**
   - Check cooldown timers
   - Verify equipment durability
   - Confirm world access
   - Check level requirements

2. **Equipment Issues**
   - Verify purchase requirements
   - Check upgrade prerequisites
   - Confirm inventory space
   - Validate currency balance

3. **Progress Issues**
   - Check XP calculations
   - Verify level requirements
   - Confirm unlock conditions
   - Review achievement tracking

## Development

### Adding New Content

1. **New Resources**
   ```javascript
   const newResource = {
     name: "Mythril Ore",
     baseValue: 100,
     rarity: "Legendary",
     worldRestriction: "Ancient Ruins"
   };
   ```

2. **New Equipment**
   ```javascript
   const newPickaxe = {
     name: "Mythril Pickaxe",
     power: 15,
     special: "Void Mining",
     requirements: {
       level: 50,
       resources: {"Mythril Ore": 100}
     }
   };
   ```

### Testing

- Unit tests for mining mechanics
- Integration tests for economy
- Performance benchmarks
- Balance testing 