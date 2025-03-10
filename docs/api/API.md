# JMF Hosting Bot API Documentation

## Overview

The JMF Hosting Discord Bot provides a RESTful API for integration with other services. This document outlines the available endpoints and how to use them.

## Authentication

All API requests require authentication using an API key. You can generate an API key using the `/api key` command in Discord (admin only).

Include the API key in the `Authorization` header of your requests:

```
Authorization: Bearer YOUR_API_KEY
```

## Base URL

```
https://api.jmfhosting.com/bot/v1
```

## Database Schema

The API interacts with the bot's unified database schema, which includes tables for:

- User management and tracking
- Ticket system
- Economy system
- Mining game
- Leveling system
- Moderation actions
- Server settings

For more details about the database schema, see the [Architecture Documentation](../development/ARCHITECTURE.md).

## Bot API Endpoints

### Server Status

#### GET /status

Returns the current status of the bot and connected services.

**Response:**

```json
{
  "status": "online",
  "uptime": "10d 4h 30m",
  "services": {
    "discord": "connected",
    "database": "connected",
    "pterodactyl": "connected"
  }
}
```

### User Information

#### GET /users/:userId

Returns information about a specific user.

**Parameters:**

- `userId` - Discord user ID

**Response:**

```json
{
  "id": "123456789012345678",
  "username": "username#1234",
  "level": 10,
  "xp": 1500,
  "balance": 2500,
  "verified": true,
  "joinedAt": "2023-01-15T12:30:45Z"
}
```

#### GET /users/:userId/linked-accounts

Returns information about a user's linked accounts.

**Parameters:**

- `userId` - Discord user ID

**Response:**

```json
{
  "discord": {
    "id": "123456789012345678",
    "username": "username#1234"
  },
  "pterodactyl": {
    "id": "1",
    "username": "username",
    "email": "user@example.com"
  }
}
```

#### POST /users/:userId/link

Link a user's Discord account to a Pterodactyl account.

**Parameters:**

- `userId` - Discord user ID

**Request Body:**

```json
{
  "pterodactyl_id": "1",
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Account linked successfully"
}
```

### Economy

#### GET /economy/leaderboard

Returns the economy leaderboard.

**Query Parameters:**

- `limit` - Number of users to return (default: 10)
- `offset` - Offset for pagination (default: 0)

**Response:**

```json
{
  "leaderboard": [
    {
      "userId": "123456789012345678",
      "username": "username#1234",
      "balance": 5000
    },
    {
      "userId": "987654321098765432",
      "username": "anotheruser#5678",
      "balance": 3500
    }
  ],
  "totalUsers": 50,
  "totalCoins": 75000
}
```

#### GET /economy/users/:userId/balance

Returns a user's balance.

**Parameters:**

- `userId` - Discord user ID

**Response:**

```json
{
  "userId": "123456789012345678",
  "balance": 2500,
  "lastDaily": "2023-01-15T12:30:45Z"
}
```

#### POST /economy/users/:userId/transaction

Create a transaction for a user.

**Parameters:**

- `userId` - Discord user ID

**Request Body:**

```json
{
  "amount": 500,
  "reason": "API reward"
}
```

**Response:**

```json
{
  "success": true,
  "newBalance": 3000,
  "transaction": {
    "id": "tx_123456",
    "amount": 500,
    "reason": "API reward",
    "timestamp": "2023-01-15T12:30:45Z"
  }
}
```

### Mining

#### GET /mining/users/:userId/stats

Returns a user's mining stats.

**Parameters:**

- `userId` - Discord user ID

**Response:**

```json
{
  "userId": "123456789012345678",
  "level": 5,
  "xp": 1200,
  "pickaxe": "iron",
  "currentWorld": "overworld",
  "unlockedWorlds": ["overworld", "nether"],
  "lastMine": "2023-01-15T12:30:45Z"
}
```

#### GET /mining/users/:userId/inventory

Returns a user's mining inventory.

**Parameters:**

- `userId` - Discord user ID

**Response:**

```json
{
  "userId": "123456789012345678",
  "inventory": [
    {
      "resourceId": "stone",
      "name": "Stone",
      "quantity": 150
    },
    {
      "resourceId": "iron_ore",
      "name": "Iron Ore",
      "quantity": 75
    }
  ]
}
```

### Server Management

#### GET /servers

Returns a list of all game servers (requires admin API key).

**Response:**

```json
{
  "servers": [
    {
      "id": "abc123",
      "name": "Minecraft Server",
      "status": "running",
      "owner": "123456789012345678"
    },
    {
      "id": "def456",
      "name": "Rust Server",
      "status": "stopped",
      "owner": "987654321098765432"
    }
  ]
}
```

#### GET /servers/:serverId

Returns information about a specific server.

**Parameters:**

- `serverId` - Server ID

**Response:**

```json
{
  "id": "abc123",
  "name": "Minecraft Server",
  "status": "running",
  "owner": "123456789012345678",
  "node": "node1",
  "resources": {
    "cpu": 45,
    "memory": 2048,
    "disk": 10240
  },
  "players": {
    "online": 5,
    "max": 20
  }
}
```

#### POST /servers/:serverId/action

Perform an action on a specific server.

**Parameters:**

- `serverId` - Server ID

**Request Body:**

```json
{
  "action": "restart"
}
```

**Supported Actions:**

- `start`
- `stop`
- `restart`
- `kill`

**Response:**

```json
{
  "success": true,
  "message": "Server restart initiated"
}
```

### Statistics

#### GET /stats/discord

Returns Discord server statistics.

**Response:**

```json
{
  "members": {
    "total": 500,
    "online": 120,
    "bots": 10
  },
  "channels": {
    "text": 20,
    "voice": 5,
    "categories": 8
  },
  "messages": {
    "today": 1500,
    "week": 10500
  }
}
```

#### GET /stats/servers

Returns game server statistics.

**Response:**

```json
{
  "total": 50,
  "online": 35,
  "offline": 15,
  "resources": {
    "cpu": {
      "total": 100,
      "used": 45
    },
    "memory": {
      "total": 32768,
      "used": 16384
    },
    "disk": {
      "total": 1048576,
      "used": 524288
    }
  }
}
```

#### GET /stats/nodes

Returns node statistics.

**Response:**

```json
{
  "total": 5,
  "online": 5,
  "offline": 0,
  "load": {
    "average": 25,
    "highest": 45,
    "lowest": 10
  }
}
```

## Pterodactyl API Integration

The JMF Hosting Bot integrates with the Pterodactyl API to manage game servers. The following endpoints are available through our proxy to simplify authentication and provide additional functionality.

### Locations

#### GET /pterodactyl/locations

List all locations.

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "short": "us1",
      "long": "US East",
      "relationships": {}
    }
  ]
}
```

#### POST /pterodactyl/locations

Create a new location (admin only).

**Request Body:**

```json
{
  "short": "eu1",
  "long": "Europe"
}
```

#### GET /pterodactyl/locations/:locationId

View a specific location.

**Parameters:**

- `locationId` - Location ID

#### PATCH /pterodactyl/locations/:locationId

Update a location (admin only).

**Parameters:**

- `locationId` - Location ID

**Request Body:**

```json
{
  "short": "eu1",
  "long": "Europe West"
}
```

#### DELETE /pterodactyl/locations/:locationId

Delete a location (admin only).

**Parameters:**

- `locationId` - Location ID

### Nests & Eggs

#### GET /pterodactyl/nests

List all nests.

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Minecraft",
      "description": "Minecraft servers",
      "relationships": {}
    }
  ]
}
```

#### GET /pterodactyl/nests/:nestId

View a specific nest.

**Parameters:**

- `nestId` - Nest ID

#### GET /pterodactyl/nests/:nestId/eggs

List all eggs in a nest.

**Parameters:**

- `nestId` - Nest ID

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Vanilla",
      "description": "Vanilla Minecraft server",
      "relationships": {}
    }
  ]
}
```

#### GET /pterodactyl/nests/:nestId/eggs/:eggId

View a specific egg.

**Parameters:**

- `nestId` - Nest ID
- `eggId` - Egg ID

### Nodes

#### GET /pterodactyl/nodes

List all nodes.

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Node 1",
      "location_id": 1,
      "fqdn": "node1.example.com",
      "memory": 32768,
      "memory_overallocate": 0,
      "disk": 1048576,
      "disk_overallocate": 0,
      "relationships": {}
    }
  ]
}
```

#### POST /pterodactyl/nodes

Create a new node (admin only).

**Request Body:**

```json
{
  "name": "Node 2",
  "location_id": 1,
  "fqdn": "node2.example.com",
  "memory": 32768,
  "memory_overallocate": 0,
  "disk": 1048576,
  "disk_overallocate": 0,
  "scheme": "https",
  "daemon_base": "/var/lib/pterodactyl/volumes"
}
```

#### GET /pterodactyl/nodes/deployable

List deployable nodes.

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Node 1",
      "location_id": 1,
      "fqdn": "node1.example.com",
      "memory": 32768,
      "memory_overallocate": 0,
      "disk": 1048576,
      "disk_overallocate": 0,
      "relationships": {}
    }
  ]
}
```

#### GET /pterodactyl/nodes/:nodeId

View a specific node.

**Parameters:**

- `nodeId` - Node ID

#### PATCH /pterodactyl/nodes/:nodeId

Update a node (admin only).

**Parameters:**

- `nodeId` - Node ID

**Request Body:**

```json
{
  "name": "Node 1 Updated",
  "memory": 65536
}
```

#### DELETE /pterodactyl/nodes/:nodeId

Delete a node (admin only).

**Parameters:**

- `nodeId` - Node ID

#### GET /pterodactyl/nodes/:nodeId/allocations

List allocations for a node.

**Parameters:**

- `nodeId` - Node ID

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "ip": "192.168.1.1",
      "port": 25565,
      "assigned": true,
      "relationships": {}
    }
  ]
}
```

#### POST /pterodactyl/nodes/:nodeId/allocations

Create a new allocation (admin only).

**Parameters:**

- `nodeId` - Node ID

**Request Body:**

```json
{
  "ip": "192.168.1.1",
  "ports": ["25566", "25567", "25568"]
}
```

#### DELETE /pterodactyl/nodes/:nodeId/allocations/:allocationId

Delete an allocation (admin only).

**Parameters:**

- `nodeId` - Node ID
- `allocationId` - Allocation ID

#### GET /pterodactyl/nodes/:nodeId/configuration

Get node configuration.

**Parameters:**

- `nodeId` - Node ID

### Servers

#### GET /pterodactyl/servers

List all servers.

**Response:**

```json
{
  "data": [
    {
      "id": "abc123",
      "name": "Minecraft Server",
      "description": "A Minecraft server",
      "relationships": {}
    }
  ]
}
```

#### POST /pterodactyl/servers

Create a new server (admin only).

**Request Body:**

```json
{
  "name": "New Server",
  "user": 1,
  "egg": 1,
  "docker_image": "ghcr.io/pterodactyl/yolks:java_17",
  "startup": "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar",
  "environment": {
    "SERVER_JARFILE": "server.jar",
    "MINECRAFT_VERSION": "latest"
  },
  "limits": {
    "memory": 1024,
    "swap": 0,
    "disk": 5120,
    "io": 500,
    "cpu": 100
  },
  "feature_limits": {
    "databases": 1,
    "backups": 1
  },
  "allocation": {
    "default": 1
  }
}
```

#### GET /pterodactyl/servers/external/:externalId

Get external server by ID.

**Parameters:**

- `externalId` - External ID

#### GET /pterodactyl/servers/:serverId

View a specific server.

**Parameters:**

- `serverId` - Server ID

#### DELETE /pterodactyl/servers/:serverId

Delete a server (admin only).

**Parameters:**

- `serverId` - Server ID

#### PATCH /pterodactyl/servers/:serverId/build

Update server build (admin only).

**Parameters:**

- `serverId` - Server ID

**Request Body:**

```json
{
  "allocation": 1,
  "memory": 2048,
  "swap": 0,
  "disk": 10240,
  "io": 500,
  "cpu": 200,
  "feature_limits": {
    "databases": 2,
    "backups": 2
  }
}
```

#### PATCH /pterodactyl/servers/:serverId/details

Update server details (admin only).

**Parameters:**

- `serverId` - Server ID

**Request Body:**

```json
{
  "name": "Updated Server Name",
  "description": "Updated server description"
}
```

#### PATCH /pterodactyl/servers/:serverId/startup

Update server startup parameters (admin only).

**Parameters:**

- `serverId` - Server ID

**Request Body:**

```json
{
  "startup": "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar",
  "environment": {
    "SERVER_JARFILE": "server.jar",
    "MINECRAFT_VERSION": "1.19.2"
  }
}
```

#### POST /pterodactyl/servers/:serverId/reinstall

Reinstall a server (admin only).

**Parameters:**

- `serverId` - Server ID

#### POST /pterodactyl/servers/:serverId/suspend

Suspend a server (admin only).

**Parameters:**

- `serverId` - Server ID

#### POST /pterodactyl/servers/:serverId/unsuspend

Unsuspend a server (admin only).

**Parameters:**

- `serverId` - Server ID

#### DELETE /pterodactyl/servers/:serverId/:force

Force delete a server (admin only).

**Parameters:**

- `serverId` - Server ID
- `force` - Set to `true` to force delete

### Databases

#### GET /pterodactyl/servers/:serverId/databases

List server databases.

**Parameters:**

- `serverId` - Server ID

**Response:**

```json
{
  "data": [
    {
      "id": "abc123",
      "name": "db1",
      "host": {
        "address": "127.0.0.1",
        "port": 3306
      },
      "relationships": {}
    }
  ]
}
```

#### POST /pterodactyl/servers/:serverId/databases

Create a new database.

**Parameters:**

- `serverId` - Server ID

**Request Body:**

```json
{
  "database": "db2",
  "remote": "%"
}
```

#### GET /pterodactyl/servers/:serverId/databases/:databaseId

View a specific database.

**Parameters:**

- `serverId` - Server ID
- `databaseId` - Database ID

#### DELETE /pterodactyl/servers/:serverId/databases/:databaseId

Delete a database.

**Parameters:**

- `serverId` - Server ID
- `databaseId` - Database ID

#### POST /pterodactyl/servers/:serverId/databases/:databaseId/reset-password

Reset database password.

**Parameters:**

- `serverId` - Server ID
- `databaseId` - Database ID

### Users

#### GET /pterodactyl/users

List all users (admin only).

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "username": "username",
      "email": "user@example.com",
      "relationships": {}
    }
  ]
}
```

#### POST /pterodactyl/users

Create a new user (admin only).

**Request Body:**

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "first_name": "New",
  "last_name": "User",
  "password": "password"
}
```

#### GET /pterodactyl/users/external/:externalId

Get external user by ID (admin only).

**Parameters:**

- `externalId` - External ID

#### GET /pterodactyl/users/:userId

View a specific user (admin only).

**Parameters:**

- `userId` - User ID

#### PATCH /pterodactyl/users/:userId

Update a user (admin only).

**Parameters:**

- `userId` - User ID

**Request Body:**

```json
{
  "username": "updateduser",
  "email": "updated@example.com",
  "first_name": "Updated",
  "last_name": "User"
}
```

#### DELETE /pterodactyl/users/:userId

Delete a user (admin only).

**Parameters:**

- `userId` - User ID

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of a request.

Common error codes:

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a JSON body with more information:

```json
{
  "error": true,
  "code": "INVALID_PARAMETER",
  "message": "The provided parameter is invalid"
}
```

## Rate Limiting

The API enforces rate limiting to prevent abuse. The current limits are:

- 60 requests per minute per API key
- 1000 requests per day per API key

Rate limit headers are included in all responses:

- `X-RateLimit-Limit`: The maximum number of requests allowed in the current period
- `X-RateLimit-Remaining`: The number of requests remaining in the current period
- `X-RateLimit-Reset`: The time at which the current rate limit window resets (Unix timestamp)

---

© 2025 JMFHosting. All Rights Reserved.  
Developed by [Nanaimo2013](https://github.com/Nanaimo2013) 