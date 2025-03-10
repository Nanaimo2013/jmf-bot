#!/bin/bash

# JMF Hosting Discord Bot
# 
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
# 
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if Node.js is installed
if ! command_exists node; then
  print_message "$RED" "Error: Node.js is not installed. Please install Node.js before running this script."
  exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
  print_message "$RED" "Error: npm is not installed. Please install npm before running this script."
  exit 1
fi

# Print banner
print_message "$BLUE" "========================================"
print_message "$BLUE" "  JMF Bot SQLite Database Schema Fix"
print_message "$BLUE" "========================================"
echo ""

# Check if fix-database.js exists
if [ ! -f "fix-database.js" ]; then
  print_message "$RED" "Error: fix-database.js not found. Make sure you're running this script from the project root directory."
  exit 1
fi

# Create a backup of the database
DB_PATH="./data/database.sqlite"
if [ -f "$DB_PATH" ]; then
  BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d%H%M%S)"
  print_message "$YELLOW" "Creating database backup at $BACKUP_PATH..."
  cp "$DB_PATH" "$BACKUP_PATH"
  if [ $? -eq 0 ]; then
    print_message "$GREEN" "Database backup created successfully."
  else
    print_message "$RED" "Failed to create database backup."
    exit 1
  fi
else
  print_message "$YELLOW" "Database file not found at $DB_PATH. A new database will be created."
fi

# Install required dependencies if needed
print_message "$YELLOW" "Checking for required dependencies..."
if ! npm list sqlite3 > /dev/null 2>&1; then
  print_message "$YELLOW" "Installing sqlite3 package..."
  npm install sqlite3 --no-save
  if [ $? -ne 0 ]; then
    print_message "$RED" "Failed to install sqlite3 package."
    exit 1
  fi
fi

# Run the fix script
print_message "$YELLOW" "Running database schema fix script..."
node fix-database.js
if [ $? -eq 0 ]; then
  print_message "$GREEN" "Database schema fix completed successfully."
else
  print_message "$RED" "Database schema fix failed. Check the logs for details."
  print_message "$YELLOW" "If needed, you can restore the database from the backup at $BACKUP_PATH"
  exit 1
fi

print_message "$GREEN" "All done! You can now restart your bot."
echo ""
print_message "$BLUE" "========================================" 