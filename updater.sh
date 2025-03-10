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
# This script updates the JMF Hosting Discord Bot from GitHub

# Version
VERSION="1.0.0"

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

# Function to print section headers
print_section() {
  echo -e "\n${PURPLE}${BOLD}${STAR} $1${NC}"
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] SECTION: $1" >> "$LOG_FILE"
}

# Function to check if running as root
check_root() {
  if [ "$(id -u)" -ne 0 ]; then
    print_error "This script must be run as root"
    exit 1
  fi
}

# Function to backup the current installation
backup_installation() {
  local install_dir=$1
  local backup_dir="${install_dir}_backup_$(date +%Y%m%d%H%M%S)"
  
  print_status "Creating backup of current installation"
  
  # Create backup directory
  mkdir -p "$backup_dir"
  
  # Copy files
  cp -r "$install_dir"/* "$backup_dir"
  
  # Backup .env file separately
  if [ -f "$install_dir/.env" ]; then
    cp "$install_dir/.env" "$backup_dir/.env"
  fi
  
  print_success "Backup created at $backup_dir"
  return 0
}

# Function to update from GitHub
update_from_github() {
  local install_dir=$1
  local branch=$2
  
  print_status "Updating from GitHub (branch: $branch)"
  
  # Navigate to installation directory
  cd "$install_dir" || {
    print_error "Failed to navigate to installation directory"
    return 1
  }
  
  # Check if git is installed
  if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install git and try again."
    return 1
  }
  
  # Check if it's a git repository
  if [ ! -d "$install_dir/.git" ]; then
    print_error "Not a git repository. Cannot update."
    print_info "Attempting to initialize git repository..."
    
    # Initialize git repository
    git init >> "$LOG_FILE" 2>&1
    
    if [ $? -ne 0 ]; then
      print_error "Failed to initialize git repository."
      return 1
    fi
    
    # Add remote origin
    git remote add origin https://github.com/nanaimo2013/jmf-bot.git >> "$LOG_FILE" 2>&1
    
    if [ $? -ne 0 ]; then
      print_error "Failed to add remote origin."
      return 1
    }
    
    print_success "Git repository initialized successfully."
  }
  
  # Check remote origin
  local remote_url=$(git config --get remote.origin.url)
  if [ -z "$remote_url" ]; then
    print_warning "Remote origin not set. Setting it now..."
    git remote add origin https://github.com/nanaimo2013/jmf-bot.git >> "$LOG_FILE" 2>&1
    
    if [ $? -ne 0 ]; then
      print_error "Failed to add remote origin."
      return 1
    }
  elif [[ "$remote_url" != *"github.com"*"/jmf-bot"* ]]; then
    print_warning "Remote origin does not point to the JMF Bot repository. Updating..."
    git remote set-url origin https://github.com/nanaimo2013/jmf-bot.git >> "$LOG_FILE" 2>&1
    
    if [ $? -ne 0 ]; then
      print_error "Failed to update remote origin."
      return 1
    }
  }
  
  # Stash any local changes
  print_status "Stashing local changes"
  git stash >> "$LOG_FILE" 2>&1
  
  # Fetch latest changes
  print_status "Fetching latest changes"
  git fetch --all >> "$LOG_FILE" 2>&1
  
  if [ $? -ne 0 ]; then
    print_error "Failed to fetch latest changes. Check your internet connection."
    print_info "Detailed error log: $LOG_FILE"
    return 1
  }
  
  # Check if branch exists
  if ! git show-ref --verify --quiet refs/remotes/origin/$branch; then
    print_error "Branch '$branch' does not exist on remote. Available branches:"
    git branch -r | grep -v '\->' | sed "s,\x1B\[[0-9;]*[a-zA-Z],,g" | sed 's/origin\//  /' >> "$LOG_FILE" 2>&1
    git branch -r | grep -v '\->' | sed "s,\x1B\[[0-9;]*[a-zA-Z],,g" | sed 's/origin\//  /'
    return 1
  }
  
  # Reset to the specified branch
  print_status "Resetting to origin/$branch"
  git reset --hard "origin/$branch" >> "$LOG_FILE" 2>&1
  
  # Check if update was successful
  if [ $? -eq 0 ]; then
    print_success "Successfully updated to the latest version"
    
    # Get the latest commit info
    COMMIT_HASH=$(git rev-parse --short HEAD)
    COMMIT_DATE=$(git log -1 --format=%cd --date=local)
    COMMIT_MSG=$(git log -1 --format=%s)
    
    print_info "Latest commit: $COMMIT_HASH ($COMMIT_DATE)"
    print_info "Commit message: $COMMIT_MSG"
    
    return 0
  else
    print_error "Failed to update from GitHub"
    print_info "Detailed error log: $LOG_FILE"
    return 1
  fi
}

# Function to install dependencies
install_dependencies() {
  local install_dir=$1
  
  print_status "Installing dependencies"
  
  # Navigate to installation directory
  cd "$install_dir" || {
    print_error "Failed to navigate to installation directory"
    return 1
  }
  
  # Install dependencies
  npm install --production >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
    return 0
  else
    print_warning "Some dependencies may have failed to install"
    print_status "Trying with --force flag"
    
    npm install --production --force >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      print_success "Dependencies installed successfully with --force"
      return 0
    else
      print_error "Failed to install dependencies"
      return 1
    fi
  fi
}

# Function to deploy slash commands
deploy_commands() {
  local install_dir=$1
  
  print_status "Deploying slash commands"
  
  # Navigate to installation directory
  cd "$install_dir" || {
    print_error "Failed to navigate to installation directory"
    return 1
  }
  
  # Check if deploy-commands.js exists
  if [ ! -f "$install_dir/src/deploy-commands.js" ]; then
    print_error "deploy-commands.js not found"
    return 1
  }
  
  # Check if .env file exists and contains DISCORD_TOKEN and CLIENT_ID
  if [ ! -f "$install_dir/.env" ]; then
    print_error ".env file not found"
    return 1
  }
  
  # Check for DISCORD_TOKEN and CLIENT_ID in .env
  if ! grep -q "DISCORD_TOKEN=" "$install_dir/.env" || ! grep -q "CLIENT_ID=" "$install_dir/.env"; then
    print_error "DISCORD_TOKEN or CLIENT_ID not found in .env file"
    print_info "Please make sure your .env file contains both DISCORD_TOKEN and CLIENT_ID"
    return 1
  }
  
  # Deploy commands
  npm run deploy >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    print_success "Slash commands deployed successfully"
    return 0
  else
    print_error "Failed to deploy slash commands"
    print_info "Check the log file for details: $LOG_FILE"
    return 1
  fi
}

# Function to restart the bot service
restart_service() {
  print_status "Restarting JMF Bot service"
  
  # Check if service exists
  if ! systemctl list-unit-files | grep -q "jmf-bot.service"; then
    print_error "JMF Bot service not found"
    return 1
  fi
  
  # Restart service
  systemctl restart jmf-bot
  
  if [ $? -eq 0 ]; then
    print_success "Service restarted successfully"
    
    # Wait a moment for the service to initialize
    sleep 3
    
    # Check if the service is running
    if systemctl is-active --quiet jmf-bot; then
      print_success "JMF Bot service is running"
      return 0
    else
      print_error "JMF Bot service failed to start"
      return 1
    fi
  else
    print_error "Failed to restart service"
    return 1
  fi
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
  
  # Check if the installation directory exists
  if [ ! -d "$install_dir" ]; then
    print_error "Installation directory does not exist: $install_dir"
    exit 1
  fi
  
  # Ask for branch
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Git branch [main]:${NC} ")" branch
  branch=${branch:-main}
  
  # Ask if user wants to create a backup
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Create backup before updating? (y/n) [y]:${NC} ")" create_backup
  create_backup=${create_backup:-y}
  
  if [[ "$create_backup" =~ ^[Yy]$ ]]; then
    backup_installation "$install_dir"
  fi
  
  # Update from GitHub
  print_section "Updating from GitHub"
  update_from_github "$install_dir" "$branch"
  
  # Install dependencies
  print_section "Installing Dependencies"
  install_dependencies "$install_dir"
  
  # Deploy slash commands
  print_section "Deploying Slash Commands"
  deploy_commands "$install_dir"
  
  # Ask if user wants to restart the service
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Restart the bot service? (y/n) [y]:${NC} ")" restart
  restart=${restart:-y}
  
  if [[ "$restart" =~ ^[Yy]$ ]]; then
    print_section "Restarting Service"
    restart_service
  else
    print_info "Skipping service restart"
    print_info "To restart the service manually, run: systemctl restart jmf-bot"
  fi
  
  # Display service management information
  echo -e "\n${YELLOW}${BOLD}${STAR} Service Management:${NC}"
  echo -e "  ${CYAN}${BOLD}${INFO} Status:${NC}   systemctl status jmf-bot"
  echo -e "  ${CYAN}${BOLD}${INFO} Logs:${NC}     journalctl -u jmf-bot -f"
  echo -e "  ${CYAN}${BOLD}${INFO} Restart:${NC}  systemctl restart jmf-bot"
  echo -e "  ${CYAN}${BOLD}${INFO} Stop:${NC}     systemctl stop jmf-bot"
  echo -e "  ${CYAN}${BOLD}${INFO} Start:${NC}    systemctl start jmf-bot"
  echo -e "  ${CYAN}${BOLD}${INFO} Update Log:${NC} $LOG_FILE"
  
  # Print completion message
  echo -e "\n${GREEN}${BOLD}${ROCKET} JMF Hosting Discord Bot has been successfully updated!${NC}"
  echo -e "\n${PURPLE}${BOLD}© 2025 JMFHosting. All Rights Reserved.${NC}"
  echo -e "${PURPLE}${BOLD}Developed by Nanaimo2013 (https://github.com/Nanaimo2013)${NC}"
  echo -e "${BLUE}${BOLD}Update Date: $(date)${NC}"
}

# Run the main function
main 