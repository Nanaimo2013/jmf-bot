#!/bin/bash
#
# JMF Hosting Discord Bot
# 
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
# 
# This script fixes issues that occurred during the bot update

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions for formatted output
print_status() {
    echo -e "${BLUE}⚙️ [STATUS] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ [SUCCESS] $1${NC}"
}

print_error() {
    echo -e "${RED}❌ [ERROR] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ [WARNING] $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ [INFO] $1${NC}"
}

print_section() {
    echo -e "\n${YELLOW}⭐ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BOT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to the bot directory
cd "$BOT_DIR" || {
    print_error "Failed to change to bot directory: $BOT_DIR"
    exit 1
}

print_section "JMF Bot Update Fix Script"
print_info "Bot directory: $BOT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

# Install required packages
print_section "Installing Required Packages"
print_status "Installing sqlite3 package"
npm install sqlite3 --no-save || {
    print_error "Failed to install sqlite3 package"
    exit 1
}
print_success "Installed required packages"

# Fix SQLite schema issues
print_section "Fixing SQLite Schema Issues"
print_status "Running SQLite schema fix script"
node "$SCRIPT_DIR/database/fix-sqlite-schema.js" || {
    print_error "Failed to run SQLite schema fix script"
    exit 1
}
print_success "SQLite schema fix completed"

# Fix automod.js file
print_section "Fixing Automod.js File"
print_status "Running automod.js fix script"
node "$SCRIPT_DIR/fix-automod.js" || {
    print_error "Failed to run automod.js fix script"
    exit 1
}
print_success "Automod.js fix completed"

# Deploy slash commands
print_section "Deploying Slash Commands"
print_status "Deploying slash commands"
node src/deploy-commands.js || {
    print_warning "Failed to deploy slash commands"
    # Continue anyway
}

# Restart the bot service
print_section "Restarting Bot Service"
print_status "Restarting JMF Bot service"
systemctl restart jmf-bot || {
    print_error "Failed to restart JMF Bot service"
    exit 1
}
print_success "Service restarted successfully"

# Check service status
print_info "Service status:"
systemctl status jmf-bot --no-pager

print_section "Fix Complete"
print_success "JMF Hosting Discord Bot update issues have been fixed!"
print_info "If you encounter any further issues, please check the logs:"
print_info "  - Service logs: journalctl -u jmf-bot -f"
print_info "  - Bot logs: /var/log/jmf-bot/bot.log"

echo -e "\n${GREEN}🚀 JMF Hosting Discord Bot is now ready!${NC}\n" 