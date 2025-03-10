#!/bin/bash

#      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗
#      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
#      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   
# ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   
# ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   
#  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   
#
# JMF Hosting Discord Bot Installer
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
#
# This script installs the JMF Hosting Discord Bot on a VM instance
# without interfering with existing services like Pterodactyl Panel

# Version
VERSION="1.2.0"

# Text colors and formatting
BOLD='\033[1m'
ITALIC='\033[3m'
UNDERLINE='\033[4m'
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

# Log file
LOG_DIR="/var/log/jmf-bot"
LOG_FILE="$LOG_DIR/install-$(date +%Y%m%d-%H%M%S).log"

# Create log directory
mkdir -p "$LOG_DIR"
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

# Function to log messages
log() {
  local level="$1"
  local message="$2"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Function to print and log status messages
print_status() {
  local emoji="$1"
  local message="$2"
  echo -e "${YELLOW}$emoji ${BOLD}[STATUS]${NC} ${YELLOW}$message${NC}"
  log "STATUS" "$message"
}

# Function to print and log success messages
print_success() {
  local emoji="$1"
  local message="$2"
  echo -e "${GREEN}$emoji ${BOLD}[SUCCESS]${NC} ${GREEN}$message${NC}"
  log "SUCCESS" "$message"
}

# Function to print and log error messages
print_error() {
  local emoji="$1"
  local message="$2"
  echo -e "${RED}$emoji ${BOLD}[ERROR]${NC} ${RED}$message${NC}"
  log "ERROR" "$message"
}

# Function to print and log info messages
print_info() {
  local emoji="$1"
  local message="$2"
  echo -e "${BLUE}$emoji ${BOLD}[INFO]${NC} ${BLUE}$message${NC}"
  log "INFO" "$message"
}

# Function to print and log warning messages
print_warning() {
  local emoji="$1"
  local message="$2"
  echo -e "${YELLOW}$emoji ${BOLD}[WARNING]${NC} ${YELLOW}$message${NC}"
  log "WARNING" "$message"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_system_requirements() {
  print_status "$GEAR" "Checking system requirements..."
  
  # Check OS
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
    log "INFO" "Detected OS: $OS $VER"
    print_info "$INFO" "Detected OS: $OS $VER"
  else
    log "WARNING" "Could not detect OS"
    print_warning "$WARNING" "Could not detect OS. Proceeding anyway..."
  fi
  
  # Check CPU
  CPU_CORES=$(grep -c ^processor /proc/cpuinfo)
  if [ "$CPU_CORES" -lt 2 ]; then
    print_warning "$WARNING" "Only $CPU_CORES CPU core detected. Recommended: 2+ cores"
    log "WARNING" "Only $CPU_CORES CPU core detected"
  else
    print_info "$INFO" "CPU: $CPU_CORES cores detected"
    log "INFO" "CPU: $CPU_CORES cores detected"
  fi
  
  # Check RAM
  TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
  if [ "$TOTAL_RAM" -lt 1024 ]; then
    print_warning "$WARNING" "Only $TOTAL_RAM MB RAM detected. Recommended: 1024+ MB"
    log "WARNING" "Only $TOTAL_RAM MB RAM detected"
  else
    print_info "$INFO" "RAM: $TOTAL_RAM MB detected"
    log "INFO" "RAM: $TOTAL_RAM MB detected"
  fi
  
  # Check disk space
  DISK_SPACE=$(df -m / | awk 'NR==2 {print $4}')
  if [ "$DISK_SPACE" -lt 1024 ]; then
    print_warning "$WARNING" "Only $DISK_SPACE MB free disk space. Recommended: 1024+ MB"
    log "WARNING" "Only $DISK_SPACE MB free disk space"
  else
    print_info "$INFO" "Disk: $DISK_SPACE MB free space detected"
    log "INFO" "Disk: $DISK_SPACE MB free space detected"
  fi
  
  # Check if systemd is available
  if ! command_exists systemctl; then
    print_error "$CROSS_MARK" "systemd is required but not found"
    log "ERROR" "systemd is required but not found"
    exit 1
  fi
  
  print_success "$CHECK_MARK" "System requirements check completed"
}

# Function to check for existing installations
check_existing_installation() {
  print_status "$GEAR" "Checking for existing installations..."
  
  if [ -d "$INSTALL_DIR" ]; then
    print_warning "$WARNING" "Installation directory already exists: $INSTALL_DIR"
    log "WARNING" "Installation directory already exists: $INSTALL_DIR"
    
    read -p "$(echo -e "${YELLOW}${BOLD}?${NC} ${YELLOW}Do you want to backup and replace the existing installation? (y/n):${NC} ")" REPLACE
    if [[ "$REPLACE" =~ ^[Yy]$ ]]; then
      BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d%H%M%S)"
      print_status "$GEAR" "Backing up existing installation to $BACKUP_DIR"
      log "INFO" "Backing up existing installation to $BACKUP_DIR"
      mv "$INSTALL_DIR" "$BACKUP_DIR"
      mkdir -p "$INSTALL_DIR"
      print_success "$CHECK_MARK" "Backup completed"
    else
      print_error "$CROSS_MARK" "Installation cancelled by user"
      log "ERROR" "Installation cancelled by user (existing directory)"
      exit 1
    fi
  fi
  
  if systemctl list-unit-files | grep -q "jmf-bot.service"; then
    print_warning "$WARNING" "JMF Bot service already exists"
    log "WARNING" "JMF Bot service already exists"
    
    read -p "$(echo -e "${YELLOW}${BOLD}?${NC} ${YELLOW}Do you want to replace the existing service? (y/n):${NC} ")" REPLACE_SERVICE
    if [[ ! "$REPLACE_SERVICE" =~ ^[Yy]$ ]]; then
      print_error "$CROSS_MARK" "Installation cancelled by user"
      log "ERROR" "Installation cancelled by user (existing service)"
      exit 1
    fi
  fi
  
  print_success "$CHECK_MARK" "Existing installation check completed"
}

# Function to safely install Node.js
install_nodejs() {
  print_status "$GEAR" "Checking Node.js installation..."
  
  # Check if Node.js is already installed
  if command_exists node; then
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
    
    print_info "$INFO" "Node.js version $NODE_VERSION is installed"
    log "INFO" "Node.js version $NODE_VERSION is installed"
    
    if [ "$MAJOR_VERSION" -lt 16 ]; then
      print_warning "$WARNING" "Node.js version $NODE_VERSION is too old. Minimum required is v16"
      log "WARNING" "Node.js version $NODE_VERSION is too old. Minimum required is v16"
      
      read -p "$(echo -e "${YELLOW}${BOLD}?${NC} ${YELLOW}Do you want to upgrade Node.js to v18 LTS? (y/n):${NC} ")" UPGRADE_NODE
      
      if [[ "$UPGRADE_NODE" =~ ^[Yy]$ ]]; then
        print_status "$GEAR" "Installing Node.js 18 LTS..."
        log "INFO" "Installing Node.js 18 LTS..."
        
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash - >> "$LOG_FILE" 2>&1
        apt-get install -y nodejs >> "$LOG_FILE" 2>&1
        
        NEW_NODE_VERSION=$(node -v)
        print_success "$CHECK_MARK" "Node.js upgraded to $NEW_NODE_VERSION"
        log "SUCCESS" "Node.js upgraded to $NEW_NODE_VERSION"
      else
        print_error "$CROSS_MARK" "Node.js version is too old and upgrade was declined. Installation cannot continue"
        log "ERROR" "Node.js version is too old and upgrade was declined"
        exit 1
      fi
    else
      print_success "$CHECK_MARK" "Node.js version $NODE_VERSION is sufficient"
      log "SUCCESS" "Node.js version $NODE_VERSION is sufficient"
    fi
  else
    print_info "$INFO" "Node.js is not installed"
    log "INFO" "Node.js is not installed"
    
    print_status "$GEAR" "Installing Node.js 18 LTS..."
    log "INFO" "Installing Node.js 18 LTS..."
    
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - >> "$LOG_FILE" 2>&1
    apt-get install -y nodejs >> "$LOG_FILE" 2>&1
    
    NEW_NODE_VERSION=$(node -v)
    print_success "$CHECK_MARK" "Node.js installed: $NEW_NODE_VERSION"
    log "SUCCESS" "Node.js installed: $NEW_NODE_VERSION"
  fi
}

# Function to test the bot configuration
test_bot_configuration() {
  print_status "$GEAR" "Testing bot configuration..."
  log "INFO" "Testing bot configuration"
  
  # Test Discord token format
  if [[ ! $BOT_TOKEN =~ ^[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}$ ]]; then
    print_warning "$WARNING" "Discord token format looks invalid. Please verify it's correct"
    log "WARNING" "Discord token format looks invalid"
  else
    print_success "$CHECK_MARK" "Discord token format looks valid"
    log "SUCCESS" "Discord token format looks valid"
  fi
  
  # Test Pterodactyl API URL
  if [[ ! $PTERODACTYL_API_URL =~ ^https?:// ]]; then
    print_warning "$WARNING" "Pterodactyl API URL should start with http:// or https://"
    log "WARNING" "Pterodactyl API URL format is invalid"
  else
    print_success "$CHECK_MARK" "Pterodactyl API URL format looks valid"
    log "SUCCESS" "Pterodactyl API URL format looks valid"
    
    # Test connection to Pterodactyl API
    print_status "$GEAR" "Testing connection to Pterodactyl API..."
    log "INFO" "Testing connection to Pterodactyl API"
    
    if command_exists curl; then
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PTERODACTYL_API_URL" 2>> "$LOG_FILE")
      
      if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
        print_success "$CHECK_MARK" "Connection to Pterodactyl API successful (HTTP $HTTP_STATUS)"
        log "SUCCESS" "Connection to Pterodactyl API successful (HTTP $HTTP_STATUS)"
      else
        print_warning "$WARNING" "Could not connect to Pterodactyl API (HTTP $HTTP_STATUS). Please verify the URL"
        log "WARNING" "Could not connect to Pterodactyl API (HTTP $HTTP_STATUS)"
      fi
    else
      print_warning "$WARNING" "curl not found, skipping Pterodactyl API connection test"
      log "WARNING" "curl not found, skipping Pterodactyl API connection test"
    fi
  fi
  
  # Test if user exists
  if id "$SERVICE_USER" &>/dev/null; then
    print_success "$CHECK_MARK" "Service user '$SERVICE_USER' exists"
    log "SUCCESS" "Service user '$SERVICE_USER' exists"
  else
    print_warning "$WARNING" "Service user '$SERVICE_USER' does not exist. Will be created if needed"
    log "WARNING" "Service user '$SERVICE_USER' does not exist"
  fi
  
  print_success "$CHECK_MARK" "Configuration tests completed"
  log "SUCCESS" "Configuration tests completed"
}

# Function to create a non-root user if needed
create_service_user() {
  if [ "$SERVICE_USER" != "root" ] && ! id "$SERVICE_USER" &>/dev/null; then
    print_status "$GEAR" "Creating service user: $SERVICE_USER"
    log "INFO" "Creating service user: $SERVICE_USER"
    
    useradd -m -s /bin/bash "$SERVICE_USER" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      print_success "$CHECK_MARK" "Service user '$SERVICE_USER' created successfully"
      log "SUCCESS" "Service user '$SERVICE_USER' created successfully"
    else
      print_error "$CROSS_MARK" "Failed to create service user '$SERVICE_USER'"
      log "ERROR" "Failed to create service user '$SERVICE_USER'"
      exit 1
    fi
  fi
}

# Print banner
clear
echo -e "${BLUE}${BOLD}"
echo "      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗"
echo "      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝"
echo "      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   "
echo " ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   "
echo " ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   "
echo "  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   "

echo -e "${NC}"
echo -e "${CYAN}${BOLD}       Discord Bot Installer v${VERSION}${NC}"
echo -e "${PURPLE}${BOLD}       © 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${PURPLE}${BOLD}       Developed by Nanaimo2013${NC}"
echo ""

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  print_error "$CROSS_MARK" "Please run as root or with sudo"
  log "ERROR" "Script not run as root"
  exit 1
fi

# Log start of installation
log "INFO" "Starting JMF Bot installation (version $VERSION)"
print_info "$INFO" "Installation log: $LOG_FILE"

# Check system requirements
check_system_requirements

# Ask for installation directory
DEFAULT_INSTALL_DIR="/opt/jmf-bot"
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Installation directory [$DEFAULT_INSTALL_DIR]:${NC} ")" INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-$DEFAULT_INSTALL_DIR}
log "INFO" "Installation directory set to: $INSTALL_DIR"

# Check for existing installations
check_existing_installation

# Ask for configuration
echo -e "\n${YELLOW}${BOLD}${STAR} Please provide the following information:${NC}"

read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Discord Bot Token:${NC} ")" BOT_TOKEN
log "INFO" "Discord Bot Token provided (hidden for security)"

read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Pterodactyl API URL (e.g., https://panel.jmfhosting.com):${NC} ")" PTERODACTYL_API_URL
log "INFO" "Pterodactyl API URL: $PTERODACTYL_API_URL"

read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Pterodactyl API Key:${NC} ")" PTERODACTYL_API_KEY
log "INFO" "Pterodactyl API Key provided (hidden for security)"

# Ask for service user
DEFAULT_USER="root"
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Run bot as user [$DEFAULT_USER]:${NC} ")" SERVICE_USER
SERVICE_USER=${SERVICE_USER:-$DEFAULT_USER}
log "INFO" "Service user set to: $SERVICE_USER"

# Test configuration
test_bot_configuration

# Ask for resource limits
DEFAULT_CPU_QUOTA="50%"
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}CPU quota [$DEFAULT_CPU_QUOTA]:${NC} ")" CPU_QUOTA
CPU_QUOTA=${CPU_QUOTA:-$DEFAULT_CPU_QUOTA}
log "INFO" "CPU quota set to: $CPU_QUOTA"

DEFAULT_MEMORY_LIMIT="500M"
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Memory limit [$DEFAULT_MEMORY_LIMIT]:${NC} ")" MEMORY_LIMIT
MEMORY_LIMIT=${MEMORY_LIMIT:-$DEFAULT_MEMORY_LIMIT}
log "INFO" "Memory limit set to: $MEMORY_LIMIT"

# Confirm installation
echo -e "\n${YELLOW}${BOLD}${STAR} Installation Summary:${NC}"
echo -e "${BLUE}${BOLD}${GLOBE} Installation Directory:${NC} $INSTALL_DIR"
echo -e "${BLUE}${BOLD}${LOCK} Service User:${NC} $SERVICE_USER"
echo -e "${BLUE}${BOLD}${GLOBE} Pterodactyl API URL:${NC} $PTERODACTYL_API_URL"
echo -e "${BLUE}${BOLD}${GEAR} CPU Quota:${NC} $CPU_QUOTA"
echo -e "${BLUE}${BOLD}${GEAR} Memory Limit:${NC} $MEMORY_LIMIT"
echo -e "\n${YELLOW}${BOLD}${WARNING} Warning:${NC} This will install the JMF Hosting Discord Bot on your system."

read -p "$(echo -e "${YELLOW}${BOLD}?${NC} ${YELLOW}Do you want to continue? (y/n):${NC} ")" CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  print_error "$CROSS_MARK" "Installation cancelled by user"
  log "ERROR" "Installation cancelled by user at confirmation prompt"
  exit 1
fi

# Create installation directory
print_status "$GEAR" "Creating installation directory at $INSTALL_DIR"
log "INFO" "Creating installation directory at $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# Create service user if needed
create_service_user

# Install required packages without affecting existing ones
print_status "$GEAR" "Installing required packages"
log "INFO" "Installing required packages"
apt-get update >> "$LOG_FILE" 2>&1
apt-get install -y git curl wget >> "$LOG_FILE" 2>&1

# Install Node.js safely
install_nodejs

# Clone the repository
print_status "$GEAR" "Cloning the JMF Hosting Discord Bot repository"
log "INFO" "Cloning the JMF Hosting Discord Bot repository"
git clone https://github.com/Nanaimo2013/Jmf-Bot.git "$INSTALL_DIR" >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
  print_error "$CROSS_MARK" "Failed to clone repository"
  log "ERROR" "Failed to clone repository"
  exit 1
fi

# Set proper ownership
if [ "$SERVICE_USER" != "root" ]; then
  print_status "$GEAR" "Setting ownership to $SERVICE_USER"
  log "INFO" "Setting ownership to $SERVICE_USER"
  chown -R $SERVICE_USER:$SERVICE_USER "$INSTALL_DIR"
fi

# Create data directory
print_status "$GEAR" "Creating data directories"
log "INFO" "Creating data directories"
mkdir -p "$INSTALL_DIR/data"
mkdir -p "$INSTALL_DIR/data/users"
mkdir -p "$INSTALL_DIR/logs"

# Install dependencies
print_status "$GEAR" "Installing Node.js dependencies"
log "INFO" "Installing Node.js dependencies"
cd "$INSTALL_DIR"
npm install --production >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
  print_error "$CROSS_MARK" "Failed to install Node.js dependencies"
  log "ERROR" "Failed to install Node.js dependencies"
  exit 1
fi

# Create .env file
print_status "$GEAR" "Creating environment configuration"
log "INFO" "Creating environment configuration"
cat > "$INSTALL_DIR/.env" << EOF
# Discord Bot Token
DISCORD_TOKEN=$BOT_TOKEN

# Pterodactyl API
PTERODACTYL_API_URL=$PTERODACTYL_API_URL
PTERODACTYL_API_KEY=$PTERODACTYL_API_KEY

# Environment
NODE_ENV=production

# Installation Info
INSTALL_DATE=$(date +"%Y-%m-%d %H:%M:%S")
INSTALL_VERSION=$VERSION
EOF

# Create config.json if it doesn't exist
if [ ! -f "$INSTALL_DIR/config.json" ]; then
  print_status "$GEAR" "Creating default config.json"
  log "INFO" "Creating default config.json"
  cat > "$INSTALL_DIR/config.json" << EOF
{
  "embedColor": "#0099ff",
  "footerText": "JMF Hosting",
  "channels": {
    "logs": "",
    "joinLeave": "",
    "moderationLogs": "",
    "nodes": "",
    "status": ""
  }
}
EOF
fi

# Set proper permissions
if [ "$SERVICE_USER" != "root" ]; then
  print_status "$GEAR" "Setting proper file permissions"
  log "INFO" "Setting proper file permissions"
  chown -R $SERVICE_USER:$SERVICE_USER "$INSTALL_DIR"
  chmod 600 "$INSTALL_DIR/.env"
  chmod 644 "$INSTALL_DIR/config.json"
fi

# Create systemd service with safer configuration
print_status "$GEAR" "Creating systemd service"
log "INFO" "Creating systemd service"
cat > /etc/systemd/system/jmf-bot.service << EOF
[Unit]
Description=JMF Hosting Discord Bot
Documentation=https://github.com/Nanaimo2013/Jmf-Bot
After=network.target
# Add dependencies if needed
# Requires=mysql.service

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node src/index.js
ExecStop=/bin/kill -s SIGTERM \$MAINPID
Restart=on-failure
RestartSec=10
# Set resource limits to prevent excessive resource usage
CPUQuota=$CPU_QUOTA
MemoryLimit=$MEMORY_LIMIT
# Security enhancements
PrivateTmp=true
NoNewPrivileges=true
# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=jmf-bot
# Environment
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Ask before enabling and starting the service
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Do you want to enable and start the bot service now? (y/n):${NC} ")" START_SERVICE
if [[ "$START_SERVICE" =~ ^[Yy]$ ]]; then
  # Reload systemd
  print_status "$GEAR" "Reloading systemd"
  log "INFO" "Reloading systemd"
  systemctl daemon-reload >> "$LOG_FILE" 2>&1

  # Enable and start the service
  print_status "$GEAR" "Enabling and starting the JMF Bot service"
  log "INFO" "Enabling and starting the JMF Bot service"
  systemctl enable jmf-bot >> "$LOG_FILE" 2>&1
  systemctl start jmf-bot >> "$LOG_FILE" 2>&1

  # Check if service is running
  sleep 2
  if systemctl is-active --quiet jmf-bot; then
    print_success "$ROCKET" "JMF Hosting Discord Bot has been successfully installed and started!"
    log "SUCCESS" "JMF Hosting Discord Bot has been successfully installed and started"
    
    # Show service status
    echo -e "\n${CYAN}${BOLD}${STAR} Service Status:${NC}"
    systemctl status jmf-bot --no-pager | grep -v "Loaded:" | grep -v "Active:"
  else
    print_error "$CROSS_MARK" "Failed to start the bot service"
    log "ERROR" "Failed to start the bot service"
    echo -e "\n${RED}${BOLD}${INFO} Checking service logs:${NC}"
    journalctl -u jmf-bot -n 10 --no-pager
  fi
else
  print_status "$INFO" "Service not started. You can start it later with: systemctl start jmf-bot"
  log "INFO" "Service not started by user choice"
  systemctl daemon-reload >> "$LOG_FILE" 2>&1
fi

# Print important information
echo -e "\n${YELLOW}${BOLD}${STAR} Important Information:${NC}"
echo -e "${BLUE}${BOLD}${GEAR} Configuration:${NC} Edit $INSTALL_DIR/config.json to configure channel IDs"
echo -e "${BLUE}${BOLD}${GEAR} Service Management:${NC}"
echo -e "  ${CYAN}${INFO} Status:${NC}   systemctl status jmf-bot"
echo -e "  ${CYAN}${INFO} Logs:${NC}     journalctl -u jmf-bot -f"
echo -e "  ${CYAN}${INFO} Restart:${NC}  systemctl restart jmf-bot"
echo -e "  ${CYAN}${INFO} Stop:${NC}     systemctl stop jmf-bot"
echo -e "  ${CYAN}${INFO} Start:${NC}    systemctl start jmf-bot"
echo -e "${BLUE}${BOLD}${GEAR} Installation Log:${NC} $LOG_FILE"

# Print completion message
echo -e "\n${GREEN}${BOLD}${SPARKLES} Installation completed successfully! ${SPARKLES}${NC}"
log "SUCCESS" "Installation completed successfully"

# Print footer
echo -e "\n${PURPLE}${BOLD}© 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${PURPLE}${BOLD}Developed by Nanaimo2013 (https://github.com/Nanaimo2013)${NC}"
echo -e "${BLUE}${BOLD}Installation Date: $(date)${NC}" 