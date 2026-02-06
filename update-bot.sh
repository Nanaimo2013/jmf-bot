#!/bin/bash
# JMF Bot Update Script
# This script updates the bot from GitHub and rebuilds the Docker container

echo "=== JMF Bot Update Script ==="
echo "Updating from GitHub..."

# Pull latest changes
git pull origin main

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please create a .env file with your Discord bot token and other settings."
    echo "You can copy .env.example to .env and edit it."
    exit 1
fi

# Check if config directory exists
if [ ! -d config ]; then
    echo "ERROR: config directory not found!"
    echo "Please create a config directory with your configuration files."
    exit 1
fi

# Create necessary directories if they don't exist
mkdir -p logs data/database/backups data/statistics

echo "Building and starting Docker containers..."
docker-compose down
docker-compose up -d --build

echo "=== Update Complete ==="
echo "To view logs: docker-compose logs -f jmf-bot" 