#!/bin/bash

#      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗
#      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
#      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   
# ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   
# ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   
#  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   
#
# JMF Hosting Discord Bot Starter
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
#
# This script starts the JMF Hosting Discord Bot with comprehensive testing

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
LOG_FILE="${LOG_DIR}/start-$(date +%Y%m%d-%H%M%S).log"

# Temporary test file for Discord connection
TEMP_TEST_FILE="/tmp/jmf-bot-test.js"

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

# Function to check Node.js version
check_node_version() {
  if command_exists node; then
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    print_info "Node.js version $NODE_VERSION is installed"
    
    # Compare versions (simple comparison, assumes format is x.y.z)
    REQUIRED_VERSION="16.9.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
      print_success "Node.js version $NODE_VERSION is sufficient"
      return 0
    else
      print_error "Node.js version $NODE_VERSION is below the required version $REQUIRED_VERSION"
      return 1
    fi
  else
    print_error "Node.js is not installed"
    return 1
  fi
}

# Function to check npm version
check_npm_version() {
  if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_info "npm version $NPM_VERSION is installed"
    return 0
  else
    print_error "npm is not installed"
    return 1
  fi
}

# Function to check if .env file exists and has required variables
check_env_file() {
  local install_dir=$1
  local env_file="$install_dir/.env"
  
  if [ -f "$env_file" ]; then
    print_info "Found .env file at $env_file"
    
    # Check for required variables
    local missing_vars=0
    
    if ! grep -q "DISCORD_TOKEN=" "$env_file"; then
      print_error "DISCORD_TOKEN is missing in .env file"
      missing_vars=$((missing_vars + 1))
    fi
    
    if ! grep -q "PTERODACTYL_API_KEY=" "$env_file"; then
      print_warning "PTERODACTYL_API_KEY is missing in .env file"
    fi
    
    if ! grep -q "PTERODACTYL_API_URL=" "$env_file"; then
      print_warning "PTERODACTYL_API_URL is missing in .env file"
    fi
    
    if ! grep -q "CLIENT_ID=" "$env_file"; then
      print_warning "CLIENT_ID is missing in .env file (required for slash commands)"
    fi
    
    if [ $missing_vars -eq 0 ]; then
      print_success "All required environment variables are present"
      return 0
    else
      print_error "$missing_vars required environment variables are missing"
      return 1
    fi
  else
    print_error ".env file not found at $env_file"
    print_info "Please create a .env file based on .env.example"
    return 1
  fi
}

# Function to check database configuration
check_database() {
  local install_dir=$1
  local env_file="$install_dir/.env"
  
  if [ -f "$env_file" ]; then
    # Check database type
    if grep -q "DB_TYPE=sqlite" "$env_file"; then
      print_info "Using SQLite database"
      
      # Check if SQLite database file exists or can be created
      DB_PATH=$(grep "DB_PATH=" "$env_file" | cut -d '=' -f 2)
      if [ -z "$DB_PATH" ]; then
        DB_PATH="./data/database.sqlite"
        print_warning "DB_PATH not specified, using default: $DB_PATH"
      fi
      
      # Convert relative path to absolute
      if [[ "$DB_PATH" == ./* ]]; then
        DB_PATH="$install_dir/${DB_PATH#./}"
      fi
      
      # Check if database directory exists
      DB_DIR=$(dirname "$DB_PATH")
      if [ ! -d "$DB_DIR" ]; then
        print_warning "Database directory does not exist: $DB_DIR"
        print_status "Creating database directory"
        mkdir -p "$DB_DIR"
        chown -R jmf-bot:jmf-bot "$DB_DIR"
      fi
      
      # Check if database file exists
      if [ -f "$DB_PATH" ]; then
        print_success "SQLite database file exists: $DB_PATH"
      else
        print_warning "SQLite database file does not exist: $DB_PATH"
        print_info "Database file will be created on first run"
      fi
      
      return 0
    elif grep -q "DB_TYPE=mysql" "$env_file"; then
      print_info "Using MySQL database"
      
      # Check MySQL connection (simplified)
      if command_exists mysql; then
        print_info "MySQL client is installed"
        
        # Extract MySQL credentials from .env
        DB_HOST=$(grep "DB_HOST=" "$env_file" | cut -d '=' -f 2)
        DB_PORT=$(grep "DB_PORT=" "$env_file" | cut -d '=' -f 2)
        DB_DATABASE=$(grep "DB_DATABASE=" "$env_file" | cut -d '=' -f 2)
        DB_USERNAME=$(grep "DB_USERNAME=" "$env_file" | cut -d '=' -f 2)
        DB_PASSWORD=$(grep "DB_PASSWORD=" "$env_file" | cut -d '=' -f 2)
        
        if [ -z "$DB_HOST" ] || [ -z "$DB_DATABASE" ] || [ -z "$DB_USERNAME" ]; then
          print_error "Missing MySQL configuration in .env file"
          return 1
        fi
        
        print_info "MySQL configuration found. Connection will be tested during bot startup"
        return 0
      else
        print_warning "MySQL client is not installed, cannot test connection"
        return 1
      fi
    else
      print_warning "Unknown database type in .env file"
      return 1
    fi
  else
    print_error ".env file not found"
    return 1
  fi
}

# Function to test Discord connection
test_discord_connection() {
  local install_dir=$1
  local env_file="$install_dir/.env"
  
  if [ -f "$env_file" ]; then
    # Extract Discord token
    DISCORD_TOKEN=$(grep "DISCORD_TOKEN=" "$env_file" | cut -d '=' -f 2)
    
    if [ -z "$DISCORD_TOKEN" ]; then
      print_error "DISCORD_TOKEN is missing in .env file"
      return 1
    fi
    
    print_status "Creating temporary test script for Discord connection"
    
    # Create a temporary test script with direct token usage
    cat > "$TEMP_TEST_FILE" << EOF
// Discord connection test script
const { Client, GatewayIntentBits } = require('discord.js');

// Use the token directly instead of relying on dotenv
const TOKEN = '$DISCORD_TOKEN';

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ] 
});

// Log any unhandled errors
process.on('unhandledRejection', error => {
  console.error('UNHANDLED_REJECTION');
  console.error(error.message);
  process.exit(1);
});

client.once('ready', () => {
  console.log('DISCORD_CONNECTION_SUCCESS');
  console.log(\`Bot logged in as \${client.user.tag}\`);
  console.log(\`Bot ID: \${client.user.id}\`);
  console.log(\`Serving \${client.guilds.cache.size} guilds\`);
  client.destroy();
  process.exit(0);
});

client.on('error', (error) => {
  console.error('DISCORD_CONNECTION_ERROR');
  console.error(error.message);
  process.exit(1);
});

// Set a timeout in case the connection hangs
setTimeout(() => {
  console.error('DISCORD_CONNECTION_TIMEOUT');
  process.exit(1);
}, 30000);

// Login with the token directly
client.login(TOKEN).catch(error => {
  console.error('DISCORD_LOGIN_ERROR');
  console.error(error.message);
  process.exit(1);
});
EOF
    
    # Set proper permissions
    chown jmf-bot:jmf-bot "$TEMP_TEST_FILE"
    
    print_status "Testing Discord connection..."
    
    # Run the test script
    cd "$install_dir" || {
      print_error "Failed to navigate to installation directory"
      return 1
    }
    
    # Log the test script for debugging
    echo "Discord test script content:" >> "$LOG_FILE"
    cat "$TEMP_TEST_FILE" | grep -v "TOKEN" >> "$LOG_FILE"
    
    # Capture the output
    TEST_OUTPUT=$(sudo -u jmf-bot node "$TEMP_TEST_FILE" 2>&1)
    TEST_EXIT_CODE=$?
    
    # Log the output for debugging
    echo "Discord test output:" >> "$LOG_FILE"
    echo "$TEST_OUTPUT" >> "$LOG_FILE"
    
    # Clean up
    rm -f "$TEMP_TEST_FILE"
    
    # Check the result
    if [ $TEST_EXIT_CODE -eq 0 ] && echo "$TEST_OUTPUT" | grep -q "DISCORD_CONNECTION_SUCCESS"; then
      print_success "Successfully connected to Discord"
      
      # Extract additional information
      BOT_TAG=$(echo "$TEST_OUTPUT" | grep "Bot logged in as" | cut -d ' ' -f 4)
      BOT_ID=$(echo "$TEST_OUTPUT" | grep "Bot ID:" | cut -d ' ' -f 3)
      GUILD_COUNT=$(echo "$TEST_OUTPUT" | grep "Serving" | cut -d ' ' -f 2)
      
      print_info "Bot logged in as $BOT_TAG"
      print_info "Bot ID: $BOT_ID"
      print_info "Serving $GUILD_COUNT guilds"
      
      return 0
    else
      print_error "Failed to connect to Discord"
      
      if echo "$TEST_OUTPUT" | grep -q "DISCORD_LOGIN_ERROR"; then
        ERROR_MSG=$(echo "$TEST_OUTPUT" | grep -A 1 "DISCORD_LOGIN_ERROR" | tail -n 1)
        print_error "Login error: $ERROR_MSG"
      elif echo "$TEST_OUTPUT" | grep -q "DISCORD_CONNECTION_ERROR"; then
        ERROR_MSG=$(echo "$TEST_OUTPUT" | grep -A 1 "DISCORD_CONNECTION_ERROR" | tail -n 1)
        print_error "Connection error: $ERROR_MSG"
      elif echo "$TEST_OUTPUT" | grep -q "DISCORD_CONNECTION_TIMEOUT"; then
        print_error "Connection timed out"
      elif echo "$TEST_OUTPUT" | grep -q "UNHANDLED_REJECTION"; then
        ERROR_MSG=$(echo "$TEST_OUTPUT" | grep -A 1 "UNHANDLED_REJECTION" | tail -n 1)
        print_error "Unhandled error: $ERROR_MSG"
      else
        print_error "Unknown error"
        # Print the first few lines of output to help diagnose the issue
        echo "$TEST_OUTPUT" | head -n 10 >> "$LOG_FILE"
        print_info "Check the log file for more details: $LOG_FILE"
      fi
      
      return 1
    fi
  else
    print_error ".env file not found"
    return 1
  fi
}

# Function to deploy slash commands
deploy_slash_commands() {
  local install_dir=$1
  
  if [ -f "$install_dir/src/deploy-commands.js" ]; then
    print_status "Deploying slash commands"
    
    cd "$install_dir" || {
      print_error "Failed to navigate to installation directory"
      return 1
    }
    
    # Run the deploy script
    DEPLOY_OUTPUT=$(sudo -u jmf-bot npm run deploy 2>&1)
    DEPLOY_EXIT_CODE=$?
    
    # Log the output
    echo "$DEPLOY_OUTPUT" >> "$LOG_FILE"
    
    # Check the result
    if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
      # Count the number of commands deployed
      if echo "$DEPLOY_OUTPUT" | grep -q "Successfully reloaded"; then
        COMMAND_COUNT=$(echo "$DEPLOY_OUTPUT" | grep "Successfully reloaded" | grep -o '[0-9]\+')
        print_success "Successfully deployed $COMMAND_COUNT slash commands"
      else
        print_success "Slash commands deployed successfully"
      fi
      
      # Check for warnings
      if echo "$DEPLOY_OUTPUT" | grep -q "Duplicate command name"; then
        DUPLICATE_COUNT=$(echo "$DEPLOY_OUTPUT" | grep -c "Duplicate command name")
        print_warning "Found $DUPLICATE_COUNT duplicate command names (see log for details)"
      fi
      
      return 0
    else
      print_error "Failed to deploy slash commands"
      
      # Extract error message
      if echo "$DEPLOY_OUTPUT" | grep -q "Error deploying commands"; then
        ERROR_MSG=$(echo "$DEPLOY_OUTPUT" | grep -A 2 "Error deploying commands" | tail -n 2)
        print_error "Deployment error: $ERROR_MSG"
      else
        print_error "Unknown error during command deployment"
      fi
      
      return 1
    fi
  else
    print_warning "deploy-commands.js not found, skipping slash command deployment"
    return 0
  fi
}

# Function to check Pterodactyl API connection
check_pterodactyl_api() {
  local install_dir=$1
  local env_file="$install_dir/.env"
  
  if [ -f "$env_file" ]; then
    # Extract Pterodactyl API credentials
    API_URL=$(grep "PTERODACTYL_API_URL=" "$env_file" | cut -d '=' -f 2)
    API_KEY=$(grep "PTERODACTYL_API_KEY=" "$env_file" | cut -d '=' -f 2)
    
    if [ -z "$API_URL" ] || [ -z "$API_KEY" ]; then
      print_warning "Pterodactyl API credentials are missing in .env file"
      return 0  # Not critical, return success
    fi
    
    print_status "Testing Pterodactyl API connection"
    
    # Check if curl is installed
    if ! command_exists curl; then
      print_warning "curl not found, skipping Pterodactyl API connection test"
      return 0
    fi
    
    # Test the connection
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $API_KEY" "$API_URL" 2>> "$LOG_FILE")
    
    if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
      print_success "Connection to Pterodactyl API successful (HTTP $HTTP_STATUS)"
      return 0
    else
      print_warning "Could not connect to Pterodactyl API (HTTP $HTTP_STATUS)"
      
      # Provide more detailed information based on status code
      if [ "$HTTP_STATUS" -eq 401 ] || [ "$HTTP_STATUS" -eq 403 ]; then
        print_warning "Authentication failed. Please check your API key."
      elif [ "$HTTP_STATUS" -eq 404 ]; then
        print_warning "API endpoint not found. Please check the URL."
      fi
      
      return 0  # Not critical, return success
    fi
  else
    print_error ".env file not found"
    return 1
  fi
}

# Function to start the bot
start_bot() {
  local install_dir=$1
  local service_user=$2
  
  print_section "Starting JMF Bot Service"
  
  # Check if the service is already running
  if systemctl is-active --quiet jmf-bot; then
    print_warning "JMF Bot service is already running"
    print_status "Restarting the service"
    
    if systemctl restart jmf-bot; then
      print_success "Service restarted successfully"
    else
      print_error "Failed to restart service"
      return 1
    fi
  else
    print_status "Starting the JMF Bot service"
    
    if systemctl start jmf-bot; then
      print_success "Service started successfully"
    else
      print_error "Failed to start service"
      return 1
    fi
  fi
  
  # Check service status
  print_status "Checking service status"
  systemctl status jmf-bot --no-pager
  
  # Wait a moment for the service to initialize
  sleep 3
  
  # Check if the service is still running
  if systemctl is-active --quiet jmf-bot; then
    print_success "JMF Bot service is running"
    return 0
  else
    print_error "JMF Bot service failed to start or crashed"
    
    # Check logs for errors
    print_status "Checking service logs for errors"
    RECENT_LOGS=$(journalctl -u jmf-bot -n 20 --no-pager)
    echo "$RECENT_LOGS" >> "$LOG_FILE"
    
    # Extract error messages
    ERROR_LINES=$(echo "$RECENT_LOGS" | grep -i "error\|exception\|failed")
    if [ -n "$ERROR_LINES" ]; then
      print_error "Found errors in logs:"
      echo "$ERROR_LINES" | while read -r line; do
        print_error "  $line"
      done
    fi
    
    return 1
  fi
}

# Function to display service management commands
display_service_info() {
  echo -e "\n${YELLOW}${BOLD}${STAR} Service Management:${NC}"
  echo -e "  ${CYAN}${BOLD}${INFO} Status:${NC}   systemctl status jmf-bot"
  echo -e "  ${CYAN}${BOLD}${INFO} Logs:${NC}     journalctl -u jmf-bot -f"
  echo -e "  ${CYAN}${BOLD}${INFO} Restart:${NC}  systemctl restart jmf-bot"
  echo -e "  ${CYAN}${BOLD}${INFO} Stop:${NC}     systemctl stop jmf-bot"
  echo -e "  ${CYAN}${BOLD}${INFO} Start:${NC}    systemctl start jmf-bot"
  echo -e "  ${CYAN}${BOLD}${INFO} Start Log:${NC} $LOG_FILE"
}

# Main function
main() {
  echo -e "\n${BOLD}      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗${NC}"
  echo -e "${BOLD}      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝${NC}"
  echo -e "${BOLD}      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   ${NC}"
  echo -e "${BOLD} ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   ${NC}"
  echo -e "${BOLD} ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   ${NC}"
  echo -e "${BOLD}  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   ${NC}"
  echo -e "\n${BOLD}       Discord Bot Starter v${VERSION}${NC}"
  echo -e "${BOLD}       © 2025 JMFHosting. All Rights Reserved.${NC}"
  echo -e "${BOLD}       Developed by Nanaimo2013${NC}\n"
  
  # Check if running as root
  check_root
  
  # Create log directory if it doesn't exist
  mkdir -p "$LOG_DIR"
  
  print_info "Start log: $LOG_FILE"
  
  # Ask for installation directory
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Installation directory [${DEFAULT_INSTALL_DIR}]:${NC} ")" install_dir
  install_dir=${install_dir:-$DEFAULT_INSTALL_DIR}
  
  # Ask for service user
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Service user [jmf-bot]:${NC} ")" service_user
  service_user=${service_user:-jmf-bot}
  
  # Check if the installation directory exists
  if [ ! -d "$install_dir" ]; then
    print_error "Installation directory does not exist: $install_dir"
    exit 1
  fi
  
  # Run pre-flight checks
  print_section "Running Pre-flight Checks"
  
  # Check Node.js and npm
  check_node_version
  check_npm_version
  
  # Check environment configuration
  check_env_file "$install_dir"
  
  # Check database configuration
  check_database "$install_dir"
  
  # Check Pterodactyl API connection
  check_pterodactyl_api "$install_dir"
  
  # Test Discord connection
  print_section "Testing Discord Connection"
  test_discord_connection "$install_dir"
  
  # Deploy slash commands
  print_section "Deploying Slash Commands"
  deploy_slash_commands "$install_dir"
  
  # Ask if user wants to start the bot
  echo -e "\n${YELLOW}${BOLD}${WARNING} Warning:${NC} This will start/restart the JMF Hosting Discord Bot service."
  read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Do you want to continue? (y/n):${NC} ")" confirm
  
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    # Start the bot
    start_bot "$install_dir" "$service_user"
    START_RESULT=$?
    
    # Display service management information
    display_service_info
    
    if [ $START_RESULT -eq 0 ]; then
      echo -e "\n${GREEN}${BOLD}${ROCKET} JMF Hosting Discord Bot has been successfully started!${NC}"
    else
      echo -e "\n${RED}${BOLD}${WARNING} JMF Hosting Discord Bot encountered issues during startup.${NC}"
      echo -e "${RED}${BOLD}Please check the logs for more information.${NC}"
    fi
    
    echo -e "\n${BOLD}© 2025 JMFHosting. All Rights Reserved.${NC}"
    echo -e "${BOLD}Developed by Nanaimo2013 (https://github.com/Nanaimo2013)${NC}"
    echo -e "${BOLD}Start Date: $(date)${NC}"
  else
    print_info "Bot start cancelled"
  fi
}

# Run the main function
main 