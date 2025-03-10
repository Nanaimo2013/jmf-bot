#!/bin/bash
#
# JMF Hosting Discord Bot
# 
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
# 
# This script updates the JMF Hosting Discord Bot

# Version
VERSION="1.2.1"

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
BOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Create log directory if it doesn't exist
LOG_DIR="/var/log/jmf-bot"
mkdir -p "$LOG_DIR"

# Create log file
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="$LOG_DIR/update-$TIMESTAMP.log"
touch "$LOG_FILE"

# Log function
log() {
    echo "$(date +"%Y-%m-%d %H:%M:%S") $1" >> "$LOG_FILE"
}

# Log with echo
log_echo() {
    echo "$1"
    log "$1"
}

# Header
echo -e "\n       ${BLUE}Discord Bot Updater v${VERSION}${NC}"
echo -e "       ${YELLOW}© 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "       ${YELLOW}Developed by Nanaimo2013${NC}\n"

print_info "Update log: $LOG_FILE"

# Ask for installation directory
read -p "? Installation directory [/opt/jmf-bot]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/jmf-bot}

# Ask for git branch
read -p "? Git branch [main]: " GIT_BRANCH
GIT_BRANCH=${GIT_BRANCH:-main}

# Ask for backup
read -p "? Create backup before updating? (y/n) [y]: " CREATE_BACKUP
CREATE_BACKUP=${CREATE_BACKUP:-y}

# Create backup
if [[ "$CREATE_BACKUP" =~ ^[Yy]$ ]]; then
    BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d%H%M%S)"
    print_status "Creating backup of $INSTALL_DIR to $BACKUP_DIR"
    log "Creating backup to $BACKUP_DIR"
    
    cp -r "$INSTALL_DIR" "$BACKUP_DIR"
    
    if [ $? -eq 0 ]; then
        print_success "Backup created successfully at $BACKUP_DIR"
        log "Backup created successfully"
    else
        print_error "Failed to create backup"
        log "[ERROR] Failed to create backup"
        exit 1
    fi
fi

# Change to installation directory
cd "$INSTALL_DIR" || {
    print_error "Failed to change to installation directory: $INSTALL_DIR"
    log "[ERROR] Failed to change to installation directory: $INSTALL_DIR"
    exit 1
}

# Update from GitHub
print_section "Updating from GitHub"
print_status "Updating from GitHub"
log "[SECTION] Updating from GitHub"

# Configure Git safe directory
print_status "Configuring Git safe directory"
git config --global --add safe.directory "$INSTALL_DIR"

# Fetch latest changes
print_status "Fetching latest changes from GitHub"
git fetch origin "$GIT_BRANCH" >> "$LOG_FILE" 2>&1

# Reset to origin branch
print_status "Resetting to origin/$GIT_BRANCH"
git reset --hard "origin/$GIT_BRANCH" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    print_success "Successfully updated to the latest version"
    
    # Get latest commit info
    COMMIT_HASH=$(git rev-parse --short HEAD)
    COMMIT_DATE=$(git log -1 --format="%cd" --date=format:"%a %b %d %H:%M:%S %Y")
    COMMIT_MSG=$(git log -1 --pretty=%B)
    
    print_info "Latest commit: $COMMIT_HASH ($COMMIT_DATE)"
    print_info "Commit message: $COMMIT_MSG"
    
    log "Updated to commit $COMMIT_HASH ($COMMIT_DATE)"
    log "Commit message: $COMMIT_MSG"
else
    print_error "Failed to update from GitHub"
    log "[ERROR] Failed to update from GitHub"
    exit 1
fi

# Install dependencies
print_section "Installing Dependencies"
print_status "Installing dependencies"
log "[SECTION] Installing Dependencies"

npm install --production >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
    log "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    log "[ERROR] Failed to install dependencies"
    exit 1
fi

# Ask to update database schema
read -p "? Update database schema? (y/n) [y]: " UPDATE_SCHEMA
UPDATE_SCHEMA=${UPDATE_SCHEMA:-y}

if [[ "$UPDATE_SCHEMA" =~ ^[Yy]$ ]]; then
    print_section "Updating Database Schema"
    print_status "Updating database schema"
    log "[SECTION] Updating Database Schema"
    
    # Determine database type from .env file
    DB_TYPE="sqlite"
    if [ -f "$INSTALL_DIR/.env" ]; then
        DB_TYPE_FROM_ENV=$(grep "DB_TYPE" "$INSTALL_DIR/.env" | cut -d '=' -f2)
        if [ ! -z "$DB_TYPE_FROM_ENV" ]; then
            DB_TYPE=$(echo "$DB_TYPE_FROM_ENV" | tr -d '[:space:]')
        fi
    fi
    
    print_info "Database type set to: $DB_TYPE"
    log "Database type set to: $DB_TYPE"
    
    # Ask which schema to use
    echo "Available schema options:"
    echo "1) Unified schema (MySQL compatible)"
    echo "2) SQLite schema (SQLite optimized)"
    read -p "? Choose schema [1-2] (Default: 2 for SQLite, 1 for MySQL): " SCHEMA_CHOICE
    
    # Set default based on DB_TYPE
    if [ -z "$SCHEMA_CHOICE" ]; then
        if [ "$DB_TYPE" == "mysql" ]; then
            SCHEMA_CHOICE="1"
        else
            SCHEMA_CHOICE="2"
        fi
    fi
    
    # Set schema file based on choice
    if [ "$SCHEMA_CHOICE" == "1" ]; then
        SCHEMA_FILE="$INSTALL_DIR/src/database/schema/unified-schema.sql"
        print_info "Using unified schema file: $SCHEMA_FILE"
        log "Using unified schema file: $SCHEMA_FILE"
    else
        SCHEMA_FILE="$INSTALL_DIR/src/database/schema/sqlite-schema.sql"
        print_info "Using SQLite schema file: $SCHEMA_FILE"
        log "Using SQLite schema file: $SCHEMA_FILE"
    fi
    
    # Check if schema file exists
    if [ ! -f "$SCHEMA_FILE" ]; then
        print_error "Schema file not found: $SCHEMA_FILE"
        log "[ERROR] Schema file not found: $SCHEMA_FILE"
        exit 1
    fi
    
    # Update database based on type
    if [ "$DB_TYPE" == "mysql" ]; then
        # MySQL update logic
        print_status "Updating MySQL database"
        log "Updating MySQL database"
        
        # Get MySQL credentials from .env
        DB_HOST=$(grep "DB_HOST" "$INSTALL_DIR/.env" | cut -d '=' -f2 | tr -d '[:space:]')
        DB_PORT=$(grep "DB_PORT" "$INSTALL_DIR/.env" | cut -d '=' -f2 | tr -d '[:space:]')
        DB_DATABASE=$(grep "DB_DATABASE" "$INSTALL_DIR/.env" | cut -d '=' -f2 | tr -d '[:space:]')
        DB_USERNAME=$(grep "DB_USERNAME" "$INSTALL_DIR/.env" | cut -d '=' -f2 | tr -d '[:space:]')
        DB_PASSWORD=$(grep "DB_PASSWORD" "$INSTALL_DIR/.env" | cut -d '=' -f2 | tr -d '[:space:]')
        
        # Apply schema
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" < "$SCHEMA_FILE" >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            print_success "Database schema updated successfully"
            log "Database schema updated successfully"
        else
            print_error "Failed to update database schema"
            log "[ERROR] Failed to update database schema"
            log "Detailed error log: $LOG_FILE"
        fi
    else
        # SQLite update logic
        print_status "Updating SQLite database at $INSTALL_DIR/data/database.sqlite"
        log "Updating SQLite database at $INSTALL_DIR/data/database.sqlite"
        
        # Create data directory if it doesn't exist
        mkdir -p "$INSTALL_DIR/data"
        
        # Apply schema
        sqlite3 "$INSTALL_DIR/data/database.sqlite" < "$SCHEMA_FILE" >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            print_success "Database schema updated successfully"
            log "Database schema updated successfully"
        else
            print_error "Failed to update database schema"
            log "[ERROR] Failed to update database schema"
            print_info "Detailed error log: $LOG_FILE"
        fi
    fi
fi

# Deploy slash commands
print_section "Deploying Slash Commands"
print_status "Deploying slash commands"
log "[SECTION] Deploying Slash Commands"

node "$INSTALL_DIR/src/deploy-commands.js" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    print_success "Slash commands deployed successfully"
    log "Slash commands deployed successfully"
else
    print_error "Failed to deploy slash commands"
    log "[ERROR] Failed to deploy slash commands"
    print_info "Detailed error log: $LOG_FILE"
fi

# Ask to restart the bot service
read -p "? Restart the bot service? (y/n) [y]: " RESTART_SERVICE
RESTART_SERVICE=${RESTART_SERVICE:-y}

if [[ "$RESTART_SERVICE" =~ ^[Yy]$ ]]; then
    print_section "Restarting Service"
    print_status "Restarting JMF Bot service"
    log "[SECTION] Restarting Service"
    
    systemctl restart jmf-bot >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Service restarted successfully"
        log "Service restarted successfully"
        
        # Show service status
        print_info "Service status:"
        systemctl status jmf-bot --no-pager
        
        # Log service status
        systemctl status jmf-bot --no-pager >> "$LOG_FILE" 2>&1
    else
        print_error "Failed to restart service"
        log "[ERROR] Failed to restart service"
    fi
fi

# Service management info
print_section "Service Management:"
print_info "  Status:   systemctl status jmf-bot"
print_info "  Logs:     journalctl -u jmf-bot -f"
print_info "  Restart:  systemctl restart jmf-bot"
print_info "  Stop:     systemctl stop jmf-bot"
print_info "  Start:    systemctl start jmf-bot"
print_info "  Update Log: $LOG_FILE"

echo -e "\n${GREEN}🚀 JMF Hosting Discord Bot has been successfully updated!${NC}\n"

# Footer
echo -e "${YELLOW}© 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${YELLOW}Developed by Nanaimo2013 (https://github.com/Nanaimo2013)${NC}"
echo -e "${YELLOW}Update Date: $(date)${NC}"

exit 0 