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
VERSION="1.2.0"

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

# Log directory and file
LOG_DIR="/var/log/jmf-bot"
LOG_FILE="$LOG_DIR/update-$(date +%Y%m%d-%H%M%S).log"

# Function to check if running as root
check_root() {
  if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}${BOLD}${CROSS_MARK} This script must be run as root${NC}"
    exit 1
  fi
}

# Function to print status message
print_status() {
  echo -e "${BLUE}${BOLD}${GEAR} [STATUS] ${NC}$1"
  echo "$(date +"%Y-%m-%d %H:%M:%S") [STATUS] $1" >> "$LOG_FILE"
}

# Function to print success message
print_success() {
  echo -e "${GREEN}${BOLD}${CHECK_MARK} [SUCCESS] ${NC}$1"
  echo "$(date +"%Y-%m-%d %H:%M:%S") [SUCCESS] $1" >> "$LOG_FILE"
}

# Function to print error message
print_error() {
  echo -e "${RED}${BOLD}${CROSS_MARK} [ERROR] ${NC}$1"
  echo "$(date +"%Y-%m-%d %H:%M:%S") [ERROR] $1" >> "$LOG_FILE"
}

# Function to print warning message
print_warning() {
  echo -e "${YELLOW}${BOLD}${WARNING} [WARNING] ${NC}$1"
  echo "$(date +"%Y-%m-%d %H:%M:%S") [WARNING] $1" >> "$LOG_FILE"
}

# Function to print info message
print_info() {
  echo -e "${CYAN}${BOLD}${INFO} [INFO] ${NC}$1"
  echo "$(date +"%Y-%m-%d %H:%M:%S") [INFO] $1" >> "$LOG_FILE"
}

# Function to print section header
print_section() {
  echo -e "\n${PURPLE}${BOLD}${STAR} $1${NC}"
  echo "$(date +"%Y-%m-%d %H:%M:%S") [SECTION] $1" >> "$LOG_FILE"
}

# Function to backup the installation
backup_installation() {
  local install_dir=$1
  local backup_dir="${install_dir}_backup_$(date +%Y%m%d%H%M%S)"
  
  print_status "Creating backup of $install_dir to $backup_dir"
  
  # Create backup
  cp -r "$install_dir" "$backup_dir" >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    print_success "Backup created successfully at $backup_dir"
    return 0
  else
    print_error "Failed to create backup"
    print_info "Detailed error log: $LOG_FILE"
    return 1
  fi
}

# Function to restart the service
restart_service() {
  print_status "Restarting JMF Bot service"
  
  # Check if service exists
  if ! systemctl list-unit-files | grep -q jmf-bot.service; then
    print_error "JMF Bot service not found"
    return 1
  fi
  
  # Restart service
  systemctl restart jmf-bot >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    print_success "Service restarted successfully"
    
    # Display service status
    print_info "Service status:"
    systemctl status jmf-bot --no-pager | head -n 20 >> "$LOG_FILE"
    systemctl status jmf-bot --no-pager | head -n 20
    
    return 0
  else
    print_error "Failed to restart service"
    print_info "Detailed error log: $LOG_FILE"
    return 1
  fi
}

# Function to update from GitHub
update_from_github() {
  local install_dir=$1
  local branch=$2
  
  print_status "Updating from GitHub"
  
  # Navigate to installation directory
  cd "$install_dir" || {
    print_error "Failed to navigate to installation directory"
    return 1
  }
  
  # Check if .git directory exists
  if [ ! -d "$install_dir/.git" ]; then
    print_error "Not a git repository: $install_dir"
    return 1
  fi
  
  # Fetch latest changes
  print_status "Fetching latest changes from GitHub"
  git fetch --all >> "$LOG_FILE" 2>&1
  
  if [ $? -ne 0 ]; then
    print_error "Failed to fetch from GitHub"
    print_info "Detailed error log: $LOG_FILE"
    return 1
  fi
  
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

# Function to update database schema
update_database_schema() {
  local install_dir=$1
  
  print_status "Updating database schema"
  
  # Navigate to installation directory
  cd "$install_dir" || {
    print_error "Failed to navigate to installation directory"
    return 1
  }
  
  # Check if schema.sql exists
  if [ ! -f "$install_dir/schema.sql" ]; then
    print_error "schema.sql not found"
    return 1
  }
  
  # Check if .env file exists and contains database configuration
  if [ ! -f "$install_dir/.env" ]; then
    print_error ".env file not found"
    return 1
  }
  
  # Get database type from .env
  DB_TYPE=$(grep "DB_TYPE=" "$install_dir/.env" | cut -d= -f2)
  
  if [ -z "$DB_TYPE" ]; then
    print_warning "DB_TYPE not found in .env file, assuming sqlite"
    DB_TYPE="sqlite"
  fi
  
  # Update schema based on database type
  if [ "$DB_TYPE" = "sqlite" ]; then
    # Get database path from .env
    DB_PATH=$(grep "DB_PATH=" "$install_dir/.env" | cut -d= -f2)
    
    if [ -z "$DB_PATH" ]; then
      print_warning "DB_PATH not found in .env file, using default path"
      DB_PATH="./data/database.sqlite"
    fi
    
    # Resolve relative path
    if [[ "$DB_PATH" == ./* ]]; then
      DB_PATH="$install_dir/${DB_PATH#./}"
    fi
    
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "$DB_PATH")" >> "$LOG_FILE" 2>&1
    
    print_status "Updating SQLite database at $DB_PATH"
    
    # Check if sqlite3 is installed
    if ! command -v sqlite3 &> /dev/null; then
      print_error "sqlite3 command not found. Please install sqlite3."
      return 1
    fi
    
    # Apply schema
    sqlite3 "$DB_PATH" < "$install_dir/schema.sql" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      print_success "Database schema updated successfully"
      return 0
    else
      print_error "Failed to update database schema"
      print_info "Detailed error log: $LOG_FILE"
      return 1
    fi
  elif [ "$DB_TYPE" = "mysql" ]; then
    # Get MySQL configuration from .env
    DB_HOST=$(grep "DB_HOST=" "$install_dir/.env" | cut -d= -f2)
    DB_PORT=$(grep "DB_PORT=" "$install_dir/.env" | cut -d= -f2)
    DB_DATABASE=$(grep "DB_DATABASE=" "$install_dir/.env" | cut -d= -f2)
    DB_USERNAME=$(grep "DB_USERNAME=" "$install_dir/.env" | cut -d= -f2)
    DB_PASSWORD=$(grep "DB_PASSWORD=" "$install_dir/.env" | cut -d= -f2)
    
    # Check if all required variables are set
    if [ -z "$DB_HOST" ] || [ -z "$DB_DATABASE" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
      print_error "MySQL configuration incomplete in .env file"
      return 1
    fi
    
    # Set default port if not specified
    if [ -z "$DB_PORT" ]; then
      DB_PORT="3306"
    fi
    
    print_status "Updating MySQL database at $DB_HOST:$DB_PORT/$DB_DATABASE"
    
    # Check if mysql client is installed
    if ! command -v mysql &> /dev/null; then
      print_error "mysql command not found. Please install MySQL client."
      return 1
    fi
    
    # Apply schema
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" < "$install_dir/schema.sql" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      print_success "Database schema updated successfully"
      return 0
    else
      print_error "Failed to update database schema"
      print_info "Detailed error log: $LOG_FILE"
      return 1
    fi
  else
    print_error "Unsupported database type: $DB_TYPE"
    return 1
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
  node src/deploy-commands.js --guild >> "$LOG_FILE" 2>&1
  
  if [ $? -eq 0 ]; then
    print_success "Slash commands deployed successfully"
    return 0
  else
    print_error "Failed to deploy slash commands"
    print_info "Detailed error log: $LOG_FILE"
    return 1
  fi
}

# Main function
main() {
  # Clear screen
  clear
  
  # Print header
  echo -e "${BOLD}      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗${NC}"
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
  
  # Ask if user wants to update the database schema
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Update database schema? (y/n) [y]:${NC} ")" update_schema
  update_schema=${update_schema:-y}
  
  if [[ "$update_schema" =~ ^[Yy]$ ]]; then
    print_section "Updating Database Schema"
    update_database_schema "$install_dir"
  else
    print_info "Skipping database schema update"
  fi
  
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