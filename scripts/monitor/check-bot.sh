#!/bin/bash

#      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗
#      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
#      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   
# ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   
# ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   
#  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   
#
# JMF Hosting Discord Bot Status Checker
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
#
# This script checks the status of the JMF Hosting Discord Bot

# Text colors and formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
LIGHT_GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
LIGHT_RED='\033[1;31m'
BLUE='\033[0;34m'
LIGHT_BLUE='\033[1;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Emojis
CHECK_MARK="✅"
CROSS_MARK="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"
GEAR="⚙️"
LOCK="🔒"
GLOBE="🌐"
CLOCK="🕒"
STAR="⭐"
FIRE="🔥"
TOOLS="🛠️"
SHIELD="🛡️"
SPARKLES="✨"
DATABASE="🗄️"
DISCORD="🎮"

# Default installation directory
DEFAULT_INSTALL_DIR="/opt/jmf-bot"

# Function to print status messages
print_status() {
  echo -e "${BLUE}${BOLD}${GEAR} [STATUS]${NC} $1"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}${BOLD}${CHECK_MARK} [SUCCESS]${NC} $1"
}

# Function to print error messages
print_error() {
  echo -e "${RED}${BOLD}${CROSS_MARK} [ERROR]${NC} $1"
}

# Function to print warning messages
print_warning() {
  echo -e "${YELLOW}${BOLD}${WARNING} [WARNING]${NC} $1"
}

# Function to print info messages
print_info() {
  echo -e "${CYAN}${BOLD}${INFO} [INFO]${NC} $1"
}

# Function to print section headers
print_section() {
  echo -e "\n${PURPLE}${BOLD}${STAR} $1${NC}"
}

# Print header
echo -e "
      ${BLUE}██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗${NC}
      ${BLUE}██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝${NC}
      ${BLUE}██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   ${NC}
 ${BLUE}██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   ${NC}
 ${BLUE}╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   ${NC}
  ${BLUE}╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   ${NC}

       ${BOLD}Discord Bot Status Checker${NC}
       ${GRAY}© 2025 JMFHosting. All Rights Reserved.${NC}
       ${GRAY}Developed by Nanaimo2013${NC}
"

# Ask for installation directory
read -p "Installation directory [$DEFAULT_INSTALL_DIR]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-$DEFAULT_INSTALL_DIR}

# Check if directory exists
if [ ! -d "$INSTALL_DIR" ]; then
  print_error "Installation directory does not exist: $INSTALL_DIR"
  exit 1
fi

print_section "Checking Bot Configuration"

# Check if .env file exists
if [ -f "$INSTALL_DIR/.env" ]; then
  print_success ".env file exists"
  
  # Check for required environment variables
  if grep -q "DISCORD_TOKEN=" "$INSTALL_DIR/.env"; then
    print_success "DISCORD_TOKEN is configured"
  else
    print_error "DISCORD_TOKEN is missing in .env file"
  fi
  
  if grep -q "CLIENT_ID=" "$INSTALL_DIR/.env"; then
    print_success "CLIENT_ID is configured"
  else
    print_error "CLIENT_ID is missing in .env file"
  fi
  
  if grep -q "GUILD_ID=" "$INSTALL_DIR/.env"; then
    print_success "GUILD_ID is configured"
  else
    print_warning "GUILD_ID is missing in .env file (only needed for guild-specific commands)"
  fi
else
  print_error ".env file does not exist"
fi

print_section "Checking Bot Service"

# Check if service is installed
if systemctl list-unit-files | grep -q "jmf-bot.service"; then
  print_success "JMF Bot service is installed"
  
  # Check if service is running
  if systemctl is-active --quiet jmf-bot; then
    print_success "JMF Bot service is running"
    
    # Get uptime
    UPTIME=$(systemctl show jmf-bot -p ActiveEnterTimestamp --value)
    if [ -n "$UPTIME" ]; then
      print_info "Service running since: $UPTIME"
    fi
  else
    print_error "JMF Bot service is not running"
    
    # Check service status
    STATUS=$(systemctl status jmf-bot --no-pager | grep "Active:" | sed 's/^[ \t]*//')
    if [ -n "$STATUS" ]; then
      print_info "Service status: $STATUS"
    fi
  fi
else
  print_error "JMF Bot service is not installed"
fi

print_section "Checking Bot Commands"

# Check if deploy-commands.js exists
if [ -f "$INSTALL_DIR/src/deploy-commands.js" ]; then
  print_success "deploy-commands.js exists"
  
  # Count commands
  cd "$INSTALL_DIR" || exit 1
  COMMAND_COUNT=$(find src/commands -name "*.js" | wc -l)
  print_info "Found approximately $COMMAND_COUNT command files"
  
  # Check if commands are deployed
  print_info "To deploy commands, run: cd $INSTALL_DIR && npm run deploy"
else
  print_error "deploy-commands.js does not exist"
fi

print_section "Checking Bot Logs"

# Check if logs directory exists
if [ -d "$INSTALL_DIR/logs" ]; then
  print_success "Logs directory exists"
  
  # Count log files
  LOG_COUNT=$(find "$INSTALL_DIR/logs" -name "*.log" | wc -l)
  print_info "Found $LOG_COUNT log files"
  
  # Show latest log file
  LATEST_LOG=$(find "$INSTALL_DIR/logs" -name "*.log" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")
  if [ -n "$LATEST_LOG" ]; then
    print_info "Latest log file: $LATEST_LOG"
    print_info "Last 5 log entries:"
    echo -e "${GRAY}$(tail -n 5 "$LATEST_LOG")${NC}"
  fi
else
  print_warning "Logs directory does not exist"
fi

print_section "Troubleshooting Tips"

echo -e "${BOLD}If your bot is not responding to commands:${NC}"
echo -e "1. Check that the bot is running: ${CYAN}systemctl status jmf-bot${NC}"
echo -e "2. Check the logs for errors: ${CYAN}journalctl -u jmf-bot -f${NC}"
echo -e "3. Verify your .env file has the correct DISCORD_TOKEN and CLIENT_ID"
echo -e "4. Make sure slash commands are deployed: ${CYAN}cd $INSTALL_DIR && npm run deploy${NC}"
echo -e "5. Try restarting the bot: ${CYAN}systemctl restart jmf-bot${NC}"
echo -e "6. Check Discord Developer Portal to ensure the bot has proper intents enabled"
echo -e "7. Verify the bot has been invited to your server with proper permissions"

echo -e "\n${BOLD}${GREEN}Status check completed!${NC}"
echo -e "${GRAY}© 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${GRAY}Developed by Nanaimo2013 (https://github.com/Nanaimo2013)${NC}"
echo -e "${GRAY}Check Date: $(date)${NC}" 