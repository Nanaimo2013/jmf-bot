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
VERSION="1.2.1"

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
  
  # Test Discord token format - make this a warning only, not an error
  if [[ ! $BOT_TOKEN =~ ^[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}$ ]]; then
    print_warning "$WARNING" "Discord token format looks unusual. This is just a warning, installation will continue."
    log "WARNING" "Discord token format looks unusual"
    
    read -p "$(echo -e "${YELLOW}${BOLD}?${NC} ${YELLOW}Are you sure your Discord token is correct? (y/n):${NC} ")" CONFIRM_TOKEN
    if [[ ! "$CONFIRM_TOKEN" =~ ^[Yy]$ ]]; then
      print_error "$CROSS_MARK" "Installation cancelled due to token concerns"
      log "ERROR" "Installation cancelled due to token concerns"
      exit 1
    fi
  else
    print_success "$CHECK_MARK" "Discord token format looks valid"
    log "SUCCESS" "Discord token format looks valid"
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

# Function to install database dependencies
install_database_dependencies() {
  print_status "$GEAR" "Installing database dependencies..."
  log "INFO" "Installing database dependencies"
  
  if [ "$DB_TYPE" = "sqlite" ]; then
    print_status "$GEAR" "Installing SQLite dependencies..."
    apt-get install -y sqlite3 >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      print_success "$CHECK_MARK" "SQLite dependencies installed successfully"
      log "SUCCESS" "SQLite dependencies installed successfully"
    else
      print_warning "$WARNING" "Failed to install SQLite dependencies"
      log "WARNING" "Failed to install SQLite dependencies"
    fi
  elif [ "$DB_TYPE" = "mysql" ]; then
    print_status "$GEAR" "Installing MySQL client dependencies..."
    apt-get install -y mysql-client >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
      print_success "$CHECK_MARK" "MySQL client dependencies installed successfully"
      log "SUCCESS" "MySQL client dependencies installed successfully"
    else
      print_warning "$WARNING" "Failed to install MySQL client dependencies"
      log "WARNING" "Failed to install MySQL client dependencies"
    fi
  fi
}

# Function to test the bot
test_bot() {
  print_status "$GEAR" "Testing bot functionality..."
  log "INFO" "Testing bot functionality"
  
  # Test if the bot can start
  cd "$INSTALL_DIR"
  
  # Create a temporary test script
  cat > test_bot.js << EOF
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// Create a client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Log when the client is ready
client.once('ready', () => {
  console.log('Bot test successful! Bot is able to connect to Discord.');
  process.exit(0);
});

// Handle errors
client.on('error', (error) => {
  console.error('Error during bot test:', error.message);
  process.exit(1);
});

// Set a timeout in case the bot doesn't connect
setTimeout(() => {
  console.error('Bot test timed out after 30 seconds.');
  process.exit(1);
}, 30000);

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Failed to login to Discord:', error.message);
  process.exit(1);
});
EOF

  # Run the test script
  print_status "$GEAR" "Attempting to connect to Discord..."
  node test_bot.js > test_output.log 2>&1 &
  TEST_PID=$!
  
  # Wait for the test to complete (max 30 seconds)
  TIMEOUT=30
  while [ $TIMEOUT -gt 0 ] && kill -0 $TEST_PID 2>/dev/null; do
    sleep 1
    TIMEOUT=$((TIMEOUT - 1))
  done
  
  # Check if the process is still running
  if kill -0 $TEST_PID 2>/dev/null; then
    kill $TEST_PID
    print_error "$CROSS_MARK" "Bot test timed out"
    log "ERROR" "Bot test timed out"
    cat test_output.log >> "$LOG_FILE"
    return 1
  fi
  
  # Check the output
  if grep -q "Bot test successful" test_output.log; then
    print_success "$CHECK_MARK" "Bot successfully connected to Discord"
    log "SUCCESS" "Bot successfully connected to Discord"
    return 0
  else
    print_error "$CROSS_MARK" "Bot failed to connect to Discord"
    log "ERROR" "Bot failed to connect to Discord"
    cat test_output.log >> "$LOG_FILE"
    
    # Show the error message
    ERROR_MSG=$(grep -i "error" test_output.log | head -1)
    if [ -n "$ERROR_MSG" ]; then
      print_error "$CROSS_MARK" "Error: $ERROR_MSG"
      log "ERROR" "Error: $ERROR_MSG"
    fi
    
    return 1
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

# Ask for Pterodactyl API configuration
echo -e "\n${YELLOW}${BOLD}${STAR} Pterodactyl API Configuration:${NC}"
echo -e "${BLUE}${BOLD}${INFO} Pterodactyl has two API types:${NC}"
echo -e "  ${CYAN}${BOLD}1. Application API${NC} (Admin level, for managing servers, users, nodes)"
echo -e "  ${CYAN}${BOLD}2. Client API${NC} (User level, for controlling your own servers)"
echo -e "${BLUE}${BOLD}${INFO} The bot typically needs Application API access for full functionality.${NC}"

read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Which API type do you want to use? (1=Application, 2=Client) [1]:${NC} ")" API_TYPE
API_TYPE=${API_TYPE:-1}

read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Pterodactyl Panel URL (e.g., https://panel.jmfhosting.com):${NC} ")" PANEL_URL
log "INFO" "Pterodactyl Panel URL: $PANEL_URL"

# Remove trailing slash if present
PANEL_URL="${PANEL_URL%/}"

# Set the API URL based on the selected API type
if [ "$API_TYPE" = "1" ]; then
  PTERODACTYL_API_URL="${PANEL_URL}/api/application"
  print_info "$INFO" "Using Application API: $PTERODACTYL_API_URL"
  log "INFO" "Using Application API: $PTERODACTYL_API_URL"
  
  echo -e "${BLUE}${BOLD}${INFO} For Application API, you need an API key with these permissions:${NC}"
  echo -e "  ${CYAN}- Read & Write permissions for Servers${NC}"
  echo -e "  ${CYAN}- Read permissions for Users, Nodes, and Allocations${NC}"
else
  PTERODACTYL_API_URL="${PANEL_URL}/api/client"
  print_info "$INFO" "Using Client API: $PTERODACTYL_API_URL"
  log "INFO" "Using Client API: $PTERODACTYL_API_URL"
  
  echo -e "${BLUE}${BOLD}${INFO} For Client API, you need an API key created in your user account settings.${NC}"
  echo -e "${YELLOW}${BOLD}${WARNING} Note: Client API has limited functionality and may not support all bot features.${NC}"
fi

read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Pterodactyl API Key:${NC} ")" PTERODACTYL_API_KEY
log "INFO" "Pterodactyl API Key provided (hidden for security)"

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
    # Test with the API key to get a more accurate response
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $PTERODACTYL_API_KEY" "$PTERODACTYL_API_URL" 2>> "$LOG_FILE")
    
    if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
      print_success "$CHECK_MARK" "Connection to Pterodactyl API successful (HTTP $HTTP_STATUS)"
      log "SUCCESS" "Connection to Pterodactyl API successful (HTTP $HTTP_STATUS)"
    else
      print_warning "$WARNING" "Could not connect to Pterodactyl API (HTTP $HTTP_STATUS). Please verify the URL and API key"
      log "WARNING" "Could not connect to Pterodactyl API (HTTP $HTTP_STATUS)"
      
      # Provide more detailed information based on status code
      if [ "$HTTP_STATUS" -eq 401 ] || [ "$HTTP_STATUS" -eq 403 ]; then
        print_warning "$WARNING" "Authentication failed. Please check your API key."
        log "WARNING" "Authentication failed. Please check your API key."
        
        if [ "$API_TYPE" = "1" ]; then
          print_info "$INFO" "For Application API, make sure you created the key in the admin panel under 'Application API'."
        else
          print_info "$INFO" "For Client API, make sure you created the key in your account settings under 'API Credentials'."
        fi
      elif [ "$HTTP_STATUS" -eq 404 ]; then
        print_warning "$WARNING" "API endpoint not found. Please check the URL."
        log "WARNING" "API endpoint not found. Please check the URL."
        
        # Suggest trying the other API type
        if [ "$API_TYPE" = "1" ]; then
          print_info "$INFO" "You might want to try the Client API instead: ${PANEL_URL}/api/client"
        else
          print_info "$INFO" "You might want to try the Application API instead: ${PANEL_URL}/api/application"
        fi
      fi
    fi
  else
    print_warning "$WARNING" "curl not found, skipping Pterodactyl API connection test"
    log "WARNING" "curl not found, skipping Pterodactyl API connection test"
  fi
fi

# Ask for service user
DEFAULT_USER="jmf-bot"
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Run bot as user [$DEFAULT_USER]:${NC} ")" SERVICE_USER
SERVICE_USER=${SERVICE_USER:-$DEFAULT_USER}
log "INFO" "Service user set to: $SERVICE_USER"

# Run configuration tests
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

# Ask for database configuration
echo -e "\n${YELLOW}${BOLD}${STAR} Database Configuration:${NC}"
DEFAULT_DB_TYPE="sqlite"
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Database type (sqlite/mysql) [$DEFAULT_DB_TYPE]:${NC} ")" DB_TYPE
DB_TYPE=${DB_TYPE:-$DEFAULT_DB_TYPE}
log "INFO" "Database type set to: $DB_TYPE"

if [ "$DB_TYPE" = "mysql" ]; then
  # Ask for MySQL configuration
  DEFAULT_DB_HOST="localhost"
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}MySQL Host [$DEFAULT_DB_HOST]:${NC} ")" DB_HOST
  DB_HOST=${DB_HOST:-$DEFAULT_DB_HOST}
  
  DEFAULT_DB_PORT="3306"
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}MySQL Port [$DEFAULT_DB_PORT]:${NC} ")" DB_PORT
  DB_PORT=${DB_PORT:-$DEFAULT_DB_PORT}
  
  DEFAULT_DB_NAME="jmf_bot"
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}MySQL Database Name [$DEFAULT_DB_NAME]:${NC} ")" DB_NAME
  DB_NAME=${DB_NAME:-$DEFAULT_DB_NAME}
  
  DEFAULT_DB_USER="jmf_bot"
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}MySQL Username [$DEFAULT_DB_USER]:${NC} ")" DB_USER
  DB_USER=${DB_USER:-$DEFAULT_DB_USER}
  
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}MySQL Password:${NC} ")" DB_PASSWORD
  
  # Test MySQL connection
  print_status "$GEAR" "Testing MySQL connection..."
  if command_exists mysql; then
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e ";" 2>> "$LOG_FILE"; then
      print_success "$CHECK_MARK" "MySQL connection successful"
      
      # Check if database exists, create if not
      if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME" 2>> "$LOG_FILE"; then
        print_warning "$WARNING" "Database '$DB_NAME' does not exist. Creating it..."
        if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE $DB_NAME" 2>> "$LOG_FILE"; then
          print_success "$CHECK_MARK" "Database '$DB_NAME' created successfully"
        else
          print_error "$CROSS_MARK" "Failed to create database '$DB_NAME'"
          log "ERROR" "Failed to create database '$DB_NAME'"
          exit 1
        fi
      fi
    else
      print_error "$CROSS_MARK" "Failed to connect to MySQL. Please check your credentials"
      log "ERROR" "Failed to connect to MySQL"
      
      read -p "$(echo -e "${YELLOW}${BOLD}?${NC} ${YELLOW}Would you like to switch to SQLite instead? (y/n):${NC} ")" SWITCH_TO_SQLITE
      if [[ "$SWITCH_TO_SQLITE" =~ ^[Yy]$ ]]; then
        DB_TYPE="sqlite"
        print_success "$CHECK_MARK" "Switched to SQLite database"
        log "SUCCESS" "Switched to SQLite database"
      else
        exit 1
      fi
    fi
  else
    print_warning "$WARNING" "MySQL client not found, cannot test connection"
    log "WARNING" "MySQL client not found, cannot test connection"
    
    read -p "$(echo -e "${YELLOW}${BOLD}?${NC} ${YELLOW}Continue anyway? (y/n):${NC} ")" CONTINUE_MYSQL
    if [[ ! "$CONTINUE_MYSQL" =~ ^[Yy]$ ]]; then
      print_info "$INFO" "Switching to SQLite database"
      DB_TYPE="sqlite"
    fi
  fi
fi

# If using SQLite, set default path
if [ "$DB_TYPE" = "sqlite" ]; then
  DB_PATH="./data/database.sqlite"
  print_info "$INFO" "SQLite database will be created at: $INSTALL_DIR/$DB_PATH"
  log "INFO" "SQLite database will be created at: $INSTALL_DIR/$DB_PATH"
fi

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
apt-get install -y git curl wget jq >> "$LOG_FILE" 2>&1

# Install database dependencies
install_database_dependencies

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

# Install dependencies with better error handling
print_status "$GEAR" "Installing dependencies..."
cd "$INSTALL_DIR"

# Install sqlite3 and sqlite packages first if using SQLite
if [ "$DB_TYPE" = "sqlite" ]; then
  print_status "$GEAR" "Installing SQLite dependencies..."
  npm install sqlite3 sqlite --no-save --legacy-peer-deps >> "$LOG_FILE" 2>&1
  if [ $? -ne 0 ]; then
    print_warning "$WARNING" "Failed to install SQLite dependencies separately, will try with full install"
    log "WARNING" "Failed to install SQLite dependencies separately"
  else
    print_success "$CHECK_MARK" "SQLite dependencies installed successfully"
  fi
fi

# Install all dependencies
npm install --production --legacy-peer-deps >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
  print_warning "$WARNING" "Initial npm install failed, trying with force flag..."
  npm install --production --legacy-peer-deps --force >> "$LOG_FILE" 2>&1
  if [ $? -ne 0 ]; then
    print_error "$CROSS_MARK" "Failed to install dependencies. Check the log file for details."
    
    # Try to fix common issues
    print_status "$GEAR" "Attempting to fix common dependency issues..."
    
    # Fix canvas issues
    if grep -q "canvas" "$LOG_FILE"; then
      print_status "$GEAR" "Installing canvas dependencies..."
      apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev >> "$LOG_FILE" 2>&1
      npm install canvas --build-from-source --legacy-peer-deps >> "$LOG_FILE" 2>&1
    fi
    
    # Try one more time
    print_status "$GEAR" "Trying npm install one more time..."
    npm install --production --legacy-peer-deps --force >> "$LOG_FILE" 2>&1
    if [ $? -ne 0 ]; then
      print_error "$CROSS_MARK" "Failed to install dependencies after multiple attempts. Check the log file for details."
      exit 1
    else
      print_success "$CHECK_MARK" "Dependencies installed successfully after fixes"
    fi
  else
    print_success "$CHECK_MARK" "Dependencies installed successfully with force flag"
  fi
else
  print_success "$CHECK_MARK" "Dependencies installed successfully"
fi

# Create .env file
print_status "$GEAR" "Creating environment configuration"
log "INFO" "Creating environment configuration"

# Ask for additional Discord configuration
echo -e "\n${YELLOW}${BOLD}${STAR} Discord Bot Configuration:${NC}"
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Bot Client ID (required for slash commands):${NC} ")" CLIENT_ID
log "INFO" "Bot Client ID provided"

read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Bot Owner Discord ID:${NC} ")" OWNER_ID
log "INFO" "Bot Owner ID provided"

read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Guild ID for development and testing:${NC} ")" GUILD_ID
log "INFO" "Guild ID provided"

# Create the .env file
cat > "$INSTALL_DIR/.env" << EOF
# Discord Bot Token (Required)
DISCORD_TOKEN=$BOT_TOKEN

# Discord Bot Configuration
CLIENT_ID=$CLIENT_ID
OWNER_ID=$OWNER_ID
GUILD_ID=$GUILD_ID

# Pterodactyl API
PTERODACTYL_API_URL=$PTERODACTYL_API_URL
PTERODACTYL_API_KEY=$PTERODACTYL_API_KEY

# Database Configuration
EOF

# Add database configuration based on type
if [ "$DB_TYPE" = "mysql" ]; then
  cat >> "$INSTALL_DIR/.env" << EOF
DB_TYPE=mysql
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_DATABASE=$DB_NAME
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# SQLite Configuration (commented out)
# DB_TYPE=sqlite
# DB_PATH=./data/database.sqlite
EOF
else
  cat >> "$INSTALL_DIR/.env" << EOF
DB_TYPE=sqlite
DB_PATH=$DB_PATH

# MySQL Configuration (commented out)
# DB_TYPE=mysql
# DB_HOST=localhost
# DB_PORT=3306
# DB_DATABASE=jmf_bot
# DB_USERNAME=jmf_bot
# DB_PASSWORD=your_secure_password_here
EOF
fi

# Add remaining environment variables
cat >> "$INSTALL_DIR/.env" << EOF

# Environment (development or production)
NODE_ENV=production

# Logging Level (debug, info, warn, error)
LOG_LEVEL=info

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
  },
  "database": {
    "enabled": true,
    "type": "$DB_TYPE"
  }
}
EOF
else
  # Update database configuration in existing config.json
  print_status "$GEAR" "Updating database configuration in config.json"
  log "INFO" "Updating database configuration in config.json"
  
  # Check if jq is installed
  if command_exists jq; then
    # Create a temporary file
    TMP_CONFIG=$(mktemp)
    
    # Update database configuration using jq
    jq ".database = {\"enabled\": true, \"type\": \"$DB_TYPE\"}" "$INSTALL_DIR/config.json" > "$TMP_CONFIG"
    
    # Replace the original file
    mv "$TMP_CONFIG" "$INSTALL_DIR/config.json"
    
    print_success "$CHECK_MARK" "Database configuration updated in config.json"
  else
    print_warning "$WARNING" "jq not found, skipping config.json update"
    log "WARNING" "jq not found, skipping config.json update"
  fi
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
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Do you want to test the bot before starting the service? (y/n):${NC} ")" TEST_BOT
if [[ "$TEST_BOT" =~ ^[Yy]$ ]]; then
  test_bot
  if [ $? -ne 0 ]; then
    print_warning "$WARNING" "Bot test failed. You may need to check your configuration."
    log "WARNING" "Bot test failed"
    
    read -p "$(echo -e "${YELLOW}${BOLD}?${NC} ${YELLOW}Do you still want to start the bot service? (y/n):${NC} ")" START_ANYWAY
    if [[ ! "$START_ANYWAY" =~ ^[Yy]$ ]]; then
      print_info "$INFO" "Service not started. You can start it later with: systemctl start jmf-bot"
      log "INFO" "Service not started by user choice after failed test"
      systemctl daemon-reload >> "$LOG_FILE" 2>&1
      exit 0
    fi
  else
    print_success "$CHECK_MARK" "Bot test successful! The bot is able to connect to Discord."
    log "SUCCESS" "Bot test successful"
  fi
fi

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

# Clean up temporary files
print_status "$GEAR" "Cleaning up temporary files..."
if [ -f "$INSTALL_DIR/test_bot.js" ]; then
  rm "$INSTALL_DIR/test_bot.js"
fi
if [ -f "$INSTALL_DIR/test_output.log" ]; then
  rm "$INSTALL_DIR/test_output.log"
fi
print_success "$CHECK_MARK" "Cleanup completed"

# Print footer
echo -e "\n${PURPLE}${BOLD}© 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${PURPLE}${BOLD}Developed by Nanaimo2013 (https://github.com/Nanaimo2013)${NC}"
echo -e "${BLUE}${BOLD}Installation Date: $(date)${NC}" 