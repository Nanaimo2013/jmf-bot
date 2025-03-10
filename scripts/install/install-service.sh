#!/bin/bash

#      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗
#      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
#      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   
# ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   
# ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   
#  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   
#
# JMF Hosting Discord Bot Service Installer
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
#
# This script installs the JMF Hosting Discord Bot as a systemd service

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

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
  print_error "This script must be run as root"
  exit 1
fi

# Print header
echo -e "\n${BOLD}      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗${NC}"
echo -e "${BOLD}      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝${NC}"
echo -e "${BOLD}      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   ${NC}"
echo -e "${BOLD} ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   ${NC}"
echo -e "${BOLD} ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   ${NC}"
echo -e "${BOLD}  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   ${NC}"
echo -e "\n${BOLD}       Discord Bot Service Installer${NC}"
echo -e "${BOLD}       © 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${BOLD}       Developed by Nanaimo2013${NC}\n"

# Ask for installation directory
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Installation directory [${DEFAULT_INSTALL_DIR}]:${NC} ")" install_dir
install_dir=${install_dir:-$DEFAULT_INSTALL_DIR}

# Check if the installation directory exists
if [ ! -d "$install_dir" ]; then
  print_error "Installation directory does not exist: $install_dir"
  exit 1
fi

# Check if service file exists
if [ ! -f "$install_dir/jmf-bot.service" ]; then
  print_error "Service file not found: $install_dir/jmf-bot.service"
  exit 1
fi

print_section "Creating System User"

# Create system user if it doesn't exist
if id "jmf-bot" &>/dev/null; then
  print_info "User 'jmf-bot' already exists"
else
  print_status "Creating system user 'jmf-bot'"
  useradd -r -s /bin/false jmf-bot
  if [ $? -eq 0 ]; then
    print_success "User 'jmf-bot' created successfully"
  else
    print_error "Failed to create user 'jmf-bot'"
    exit 1
  fi
fi

print_section "Setting Permissions"

# Check if permissions script exists
if [ -f "$install_dir/scripts/set-permissions.sh" ]; then
  print_status "Running permissions script"
  chmod +x "$install_dir/scripts/set-permissions.sh"
  "$install_dir/scripts/set-permissions.sh"
  
  if [ $? -eq 0 ]; then
    print_success "Permissions set successfully"
  else
    print_warning "Failed to set permissions"
  fi
else
  print_warning "Permissions script not found: $install_dir/scripts/set-permissions.sh"
  print_status "Setting basic permissions manually"
  
  # Set ownership and permissions
  print_status "Setting ownership and permissions for $install_dir"
  chown -R jmf-bot:jmf-bot "$install_dir"
  chmod -R 750 "$install_dir"
  
  # Set executable permissions for scripts
  find "$install_dir" -name "*.sh" -exec chmod +x {} \;
  
  # Set permissions for data directory
  if [ -d "$install_dir/data" ]; then
    chmod -R 755 "$install_dir/data"
  fi
  
  # Set permissions for logs directory
  if [ -d "$install_dir/logs" ]; then
    chmod -R 755 "$install_dir/logs"
  fi
  
  # Set permissions for .env file
  if [ -f "$install_dir/.env" ]; then
    chmod 600 "$install_dir/.env"
    chown jmf-bot:jmf-bot "$install_dir/.env"
  fi
  
  print_success "Basic permissions set"
fi

print_section "Installing Systemd Service"

# Copy service file to systemd directory
print_status "Copying service file to /etc/systemd/system/"
cp "$install_dir/jmf-bot.service" /etc/systemd/system/

# Reload systemd
print_status "Reloading systemd"
systemctl daemon-reload

# Enable service
print_status "Enabling jmf-bot service"
systemctl enable jmf-bot

print_success "Service installed and enabled successfully"

# Ask if user wants to start the service
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Start the bot service now? (y/n) [y]:${NC} ")" start_service
start_service=${start_service:-y}

if [[ "$start_service" =~ ^[Yy]$ ]]; then
  print_section "Starting Service"
  print_status "Starting jmf-bot service"
  systemctl start jmf-bot
  
  # Check if service started successfully
  if systemctl is-active --quiet jmf-bot; then
    print_success "Service started successfully"
  else
    print_error "Failed to start service"
    print_info "Check service status with: systemctl status jmf-bot"
  fi
else
  print_info "Service not started. You can start it manually with: systemctl start jmf-bot"
fi

print_section "Service Management"

echo -e "  ${CYAN}${BOLD}${INFO} Status:${NC}   systemctl status jmf-bot"
echo -e "  ${CYAN}${BOLD}${INFO} Logs:${NC}     journalctl -u jmf-bot -f"
echo -e "  ${CYAN}${BOLD}${INFO} Restart:${NC}  systemctl restart jmf-bot"
echo -e "  ${CYAN}${BOLD}${INFO} Stop:${NC}     systemctl stop jmf-bot"
echo -e "  ${CYAN}${BOLD}${INFO} Start:${NC}    systemctl start jmf-bot"

print_section "Installation Complete"

echo -e "${GREEN}${BOLD}${ROCKET} JMF Hosting Discord Bot service has been successfully installed!${NC}"
echo -e "\n${PURPLE}${BOLD}© 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${PURPLE}${BOLD}Developed by Nanaimo2013 (https://github.com/Nanaimo2013)${NC}"
echo -e "${BLUE}${BOLD}Installation Date: $(date)${NC}" 