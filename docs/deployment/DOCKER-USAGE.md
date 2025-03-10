# Docker Usage Guide for JMF Bot

This guide explains how to use Docker to run and manage your JMF Hosting Discord Bot.

## Prerequisites

- Docker installed on your server
- Docker Compose (recommended but optional)
- Git installed on your server

## Quick Start

The easiest way to update and run your bot is to use the provided update script:

```bash
# Make the script executable (first time only)
chmod +x update-bot.sh

# Run the update script
./update-bot.sh
```

This script will:
1. Fetch the latest changes from GitHub
2. Build a new Docker image
3. Stop any existing container
4. Start a new container with the updated code

## Manual Docker Commands

If you prefer to run commands manually:

### Building the Docker Image

```bash
# Build the image
docker build -t jmf-bot:latest .
```

### Running the Container

```bash
# Run the container
docker run -d --name jmf-bot \
  -v "$(pwd)/.env:/usr/src/app/.env" \
  -v "$(pwd)/config.json:/usr/src/app/config.json" \
  -v "$(pwd)/logs:/usr/src/app/logs" \
  -v "$(pwd)/data:/usr/src/app/data" \
  jmf-bot:latest
```

### Using Docker Compose

```bash
# Start the container
docker-compose up -d

# Rebuild and start the container
docker-compose up -d --build

# Stop the container
docker-compose down
```

## Managing the Container

```bash
# View container logs
docker logs -f jmf-bot

# Stop the container
docker stop jmf-bot

# Start a stopped container
docker start jmf-bot

# Remove the container
docker rm jmf-bot

# List running containers
docker ps

# List all containers (including stopped ones)
docker ps -a
```

## Troubleshooting

### Container fails to build

If the container fails to build due to native module dependencies, make sure the Dockerfile includes all necessary build dependencies:

```dockerfile
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev
```

### Container starts but bot doesn't connect

1. Check the logs: `docker logs -f jmf-bot`
2. Verify your `.env` file has the correct `DISCORD_TOKEN` and `CLIENT_ID`
3. Make sure the bot has been invited to your server with the correct permissions

### Volume mounting issues

If you're having issues with volume mounting, check that the paths in your `docker-compose.yml` or `docker run` command are correct for your environment.

## GitHub Fetch Command

To manually fetch the latest changes from GitHub:

```bash
# Fetch all branches
git fetch --all

# Reset to the main branch (or your preferred branch)
git reset --hard origin/main
```

## Updating the Bot

To update your bot to the latest version:

1. Pull the latest changes from GitHub
2. Rebuild the Docker image
3. Restart the container

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart with Docker Compose
docker-compose up -d --build

# Or with Docker directly
docker build -t jmf-bot:latest .
docker stop jmf-bot
docker rm jmf-bot
docker run -d --name jmf-bot \
  -v "$(pwd)/.env:/usr/src/app/.env" \
  -v "$(pwd)/config.json:/usr/src/app/config.json" \
  -v "$(pwd)/logs:/usr/src/app/logs" \
  -v "$(pwd)/data:/usr/src/app/data" \
  jmf-bot:latest
```

Or simply use the provided update script: `./update-bot.sh` 