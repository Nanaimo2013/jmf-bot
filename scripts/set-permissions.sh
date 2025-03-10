#!/bin/bash

#      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗
#      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
#      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   
# ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   
# ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   
#  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   
#
# JMF Hosting Discord Bot Permissions Setup
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
#
# This script sets the correct permissions for all files in the JMF Bot directory

# Text colors and formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis
CHECK_MARK="✅"
CROSS_MARK="❌"
WARNING="⚠️"
INFO="ℹ️"
GEAR="⚙️"

# Print functions
print_status() { echo -e "${BLUE}${BOLD}${GEAR} [STATUS]${NC} $1"; }
print_success() { echo -e "${GREEN}${BOLD}${CHECK_MARK} [SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}${BOLD}${CROSS_MARK} [ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}${BOLD}${WARNING} [WARNING]${NC} $1"; }
print_info() { echo -e "${CYAN}${BOLD}${INFO} [INFO]${NC} $1"; }

# Print header
echo -e "\n${BOLD}      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗${NC}"
echo -e "${BOLD}      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝${NC}"
echo -e "${BOLD}      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   ${NC}"
echo -e "${BOLD} ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   ${NC}"
echo -e "${BOLD} ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   ${NC}"
echo -e "${BOLD}  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   ${NC}"
echo -e "\n${BOLD}       Discord Bot Permissions Setup${NC}"
echo -e "${BOLD}       © 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${BOLD}       Developed by Nanaimo2013${NC}\n"

# Get the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BOT_DIR="$(dirname "$SCRIPT_DIR")"

print_info "Setting permissions for JMF Bot in directory: $BOT_DIR"

# Set permissions for directories
print_status "Setting directory permissions..."
find "$BOT_DIR" -type d -exec chmod 755 {} \;
print_success "Directory permissions set"

# Set permissions for script files
print_status "Setting script file permissions..."
find "$BOT_DIR" -name "*.sh" -exec chmod 755 {} \;
print_success "Script file permissions set"

# Set permissions for regular files
print_status "Setting regular file permissions..."
find "$BOT_DIR" -type f -not -name "*.sh" -exec chmod 644 {} \;
print_success "Regular file permissions set"

# Set permissions for data directory
if [ -d "$BOT_DIR/data" ]; then
    print_status "Setting data directory permissions..."
    chmod -R 755 "$BOT_DIR/data"
    print_success "Data directory permissions set"
fi

# Set permissions for logs directory
if [ -d "$BOT_DIR/logs" ]; then
    print_status "Setting logs directory permissions..."
    chmod -R 755 "$BOT_DIR/logs"
    print_success "Logs directory permissions set"
fi

# Set permissions for .env file if it exists
if [ -f "$BOT_DIR/.env" ]; then
    print_status "Setting .env file permissions..."
    chmod 600 "$BOT_DIR/.env"
    print_success ".env file permissions set"
fi

print_success "All permissions have been set successfully!"
echo -e "\n${GREEN}${BOLD}${CHECK_MARK} JMF Hosting Discord Bot permissions setup complete!${NC}" 