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

## Endpoints

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

**Response:**

```json
{
  "success": true,
  "message": "Server restart initiated"
}
```

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