#!/bin/bash

#      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗
#      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
#      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   
# ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   
# ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   
#  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   
#
# JMF Hosting Discord Bot Updater
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
#
# This script updates the JMF Hosting Discord Bot without requiring a full reinstallation

# Version
VERSION="1.0.0"

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
ROCKET="🚀"

# Default installation directory
DEFAULT_INSTALL_DIR="/opt/jmf-bot"

# Log file
LOG_DIR="/var/log/jmf-bot"
LOG_FILE="${LOG_DIR}/update-$(date +%Y%m%d-%H%M%S).log"

# Function to print status messages
print_status() {
  echo -e "${BLUE}${BOLD}${GEAR} [STATUS]${NC} $1"
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] STATUS: $1" >> "$LOG_FILE"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}${BOLD}${CHECK_MARK} [SUCCESS]${NC} $1"
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] SUCCESS: $1" >> "$LOG_FILE"
}

# Function to print error messages
print_error() {
  echo -e "${RED}${BOLD}${CROSS_MARK} [ERROR]${NC} $1"
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] ERROR: $1" >> "$LOG_FILE"
}

# Function to print warning messages
print_warning() {
  echo -e "${YELLOW}${BOLD}${WARNING} [WARNING]${NC} $1"
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] WARNING: $1" >> "$LOG_FILE"
}

# Function to print info messages
print_info() {
  echo -e "${CYAN}${BOLD}${INFO} [INFO]${NC} $1"
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] INFO: $1" >> "$LOG_FILE"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if running as root
check_root() {
  if [ "$(id -u)" -ne 0 ]; then
    print_error "This script must be run as root"
    exit 1
  fi
}

# Function to create backup
create_backup() {
  local install_dir=$1
  local backup_dir="${install_dir}_backup_$(date +%Y%m%d%H%M%S)"
  
  print_status "Creating backup of current installation to $backup_dir"
  
  if cp -r "$install_dir" "$backup_dir"; then
    print_success "Backup completed"
    return 0
  else
    print_error "Failed to create backup"
    return 1
  fi
}

# Function to update the bot
update_bot() {
  local install_dir=$1
  local service_user=$2
  
  # Check if the installation directory exists
  if [ ! -d "$install_dir" ]; then
    print_error "Installation directory does not exist: $install_dir"
    exit 1
  fi
  
  # Create backup
  create_backup "$install_dir"
  
  # Navigate to installation directory
  cd "$install_dir" || {
    print_error "Failed to navigate to installation directory"
    exit 1
  }
  
  # Pull latest changes from git
  print_status "Pulling latest changes from git repository"
  if sudo -u "$service_user" git pull; then
    print_success "Git pull completed"
  else
    print_warning "Git pull failed. Continuing with update process"
  fi
  
  # Install dependencies
  print_status "Installing dependencies"
  if npm install --include=dev; then
    print_success "Dependencies installed successfully"
  else
    print_error "Failed to install dependencies"
    exit 1
  fi
  
  # Set proper file permissions
  print_status "Setting proper file permissions"
  chown -R "$service_user":"$service_user" "$install_dir"
  chmod -R 755 "$install_dir"
  
  # Deploy slash commands if deploy-commands.js exists
  if [ -f "$install_dir/src/deploy-commands.js" ]; then
    print_status "Deploying slash commands"
    if sudo -u "$service_user" npm run deploy; then
      print_success "Slash commands deployed successfully"
    else
      print_warning "Failed to deploy slash commands. Continuing with update process"
    fi
  fi
  
  # Restart the service
  print_status "Restarting the JMF Bot service"
  if systemctl restart jmf-bot; then
    print_success "Service restarted successfully"
  else
    print_error "Failed to restart service"
    exit 1
  fi
  
  # Check service status
  print_status "Checking service status"
  systemctl status jmf-bot --no-pager
  
  print_success "Update completed successfully!"
}

# Main function
main() {
  echo -e "\n${BOLD}      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗${NC}"
  echo -e "${BOLD}      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝${NC}"
  echo -e "${BOLD}      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   ${NC}"
  echo -e "${BOLD} ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   ${NC}"
  echo -e "${BOLD} ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   ${NC}"
  echo -e "${BOLD}  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   ${NC}"
  echo -e "\n${BOLD}       Discord Bot Updater v${VERSION}${NC}"
  echo -e "${BOLD}       © 2025 JMFHosting. All Rights Reserved.${NC}"
  echo -e "${BOLD}       Developed by Nanaimo2013${NC}\n"
  
  # Check if running as root
  check_root
  
  # Create log directory if it doesn't exist
  mkdir -p "$LOG_DIR"
  
  print_info "Update log: $LOG_FILE"
  
  # Ask for installation directory
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Installation directory [${DEFAULT_INSTALL_DIR}]:${NC} ")" install_dir
  install_dir=${install_dir:-$DEFAULT_INSTALL_DIR}
  
  # Ask for service user
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Service user [jmf-bot]:${NC} ")" service_user
  service_user=${service_user:-jmf-bot}
  
  # Confirm update
  echo -e "\n${YELLOW}${BOLD}${WARNING} Warning:${NC} This will update the JMF Hosting Discord Bot."
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Do you want to continue? (y/n):${NC} ")" confirm
  
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    update_bot "$install_dir" "$service_user"
    
    echo -e "\n${GREEN}${BOLD}${ROCKET} JMF Hosting Discord Bot has been successfully updated!${NC}"
    echo -e "\n${BOLD}© 2025 JMFHosting. All Rights Reserved.${NC}"
    echo -e "${BOLD}Developed by Nanaimo2013 (https://github.com/Nanaimo2013)${NC}"
    echo -e "${BOLD}Update Date: $(date)${NC}"
  else
    print_info "Update cancelled"
  fi
}

# Run the main function
main 