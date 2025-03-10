#!/bin/bash

#      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗
#      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
#      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   
# ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   
# ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   
#  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   
#
# JMF Hosting Discord Bot GitHub Update Script
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
#
# This script updates the bot from GitHub and rebuilds the Docker container

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
echo -e "\n${BOLD}      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗${NC}"
echo -e "${BOLD}      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝${NC}"
echo -e "${BOLD}      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   ${NC}"
echo -e "${BOLD} ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   ${NC}"
echo -e "${BOLD} ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   ${NC}"
echo -e "${BOLD}  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   ${NC}"
echo -e "\n${BOLD}       Discord Bot GitHub Update Script${NC}"
echo -e "${BOLD}       © 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${BOLD}       Developed by Nanaimo2013${NC}\n"

# Ask for branch
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Git branch [main]:${NC} ")" branch
branch=${branch:-main}

print_section "Checking Git Repository"

# Check if git is installed
if ! command -v git &> /dev/null; then
  print_error "Git is not installed. Please install git and try again."
  exit 1
fi

# Check if it's a git repository
if [ ! -d ".git" ]; then
  print_warning "Not a git repository. Initializing..."
  git init
  git remote add origin https://github.com/Nanaimo2013/jmf-bot.git
  print_success "Git repository initialized"
else
  print_success "Git repository found"
fi

# Check remote origin
remote_url=$(git config --get remote.origin.url)
if [ -z "$remote_url" ]; then
  print_warning "Remote origin not set. Setting it now..."
  git remote add origin https://github.com/Nanaimo2013/jmf-bot.git
  print_success "Remote origin set"
elif [[ "$remote_url" != *"github.com"*"/jmf-bot"* ]]; then
  print_warning "Remote origin does not point to the JMF Bot repository. Updating..."
  git remote set-url origin https://github.com/Nanaimo2013/jmf-bot.git
  print_success "Remote origin updated"
else
  print_success "Remote origin correctly configured"
fi

print_section "Fetching Updates from GitHub"

# Stash any local changes
print_status "Stashing local changes"
git stash

# Fetch latest changes
print_status "Fetching latest changes from GitHub"
git fetch --all

# Check if branch exists
if ! git show-ref --verify --quiet refs/remotes/origin/$branch; then
  print_error "Branch '$branch' does not exist on remote. Available branches:"
  git branch -r | grep -v '\->' | sed 's/origin\//  /'
  exit 1
fi

# Reset to the specified branch
print_status "Updating to latest version from branch: $branch"
git reset --hard "origin/$branch"

# Check if update was successful
if [ $? -eq 0 ]; then
  print_success "Successfully updated to the latest version"
  
  # Get the latest commit info
  COMMIT_HASH=$(git rev-parse --short HEAD)
  COMMIT_DATE=$(git log -1 --format=%cd --date=local)
  COMMIT_MSG=$(git log -1 --format=%s)
  
  print_info "Latest commit: $COMMIT_HASH ($COMMIT_DATE)"
  print_info "Commit message: $COMMIT_MSG"
else
  print_error "Failed to update from GitHub"
  exit 1
fi

print_section "Docker Container Management"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  print_error "Docker is not installed. Please install Docker and try again."
  exit 1
fi

# Check if Docker Compose is installed
if command -v docker-compose &> /dev/null; then
  use_compose=true
  print_success "Docker Compose is installed"
else
  use_compose=false
  print_warning "Docker Compose is not installed. Using Docker commands directly."
fi

# Ask if user wants to rebuild the container
read -p "$(echo -e "${CYAN}${BOLD}?${NC} ${CYAN}Rebuild and restart the Docker container? (y/n) [y]:${NC} ")" rebuild
rebuild=${rebuild:-y}

if [[ "$rebuild" =~ ^[Yy]$ ]]; then
  # Check if the container is running
  if docker ps -q --filter "name=jmf-bot" | grep -q .; then
    print_status "Stopping existing container"
    docker stop jmf-bot
    docker rm jmf-bot
    print_success "Container stopped and removed"
  fi
  
  if [ "$use_compose" = true ]; then
    print_status "Building and starting container with Docker Compose"
    docker-compose up -d --build
    
    if [ $? -eq 0 ]; then
      print_success "Container rebuilt and started successfully"
    else
      print_error "Failed to rebuild and start container"
      exit 1
    fi
  else
    print_status "Building Docker image"
    docker build -t jmf-bot:latest .
    
    if [ $? -eq 0 ]; then
      print_success "Docker image built successfully"
      
      print_status "Starting container"
      docker run -d --name jmf-bot \
        -v "$(pwd)/.env:/usr/src/app/.env" \
        -v "$(pwd)/config.json:/usr/src/app/config.json" \
        -v "$(pwd)/logs:/usr/src/app/logs" \
        -v "$(pwd)/data:/usr/src/app/data" \
        jmf-bot:latest
      
      if [ $? -eq 0 ]; then
        print_success "Container started successfully"
      else
        print_error "Failed to start container"
        exit 1
      fi
    else
      print_error "Failed to build Docker image"
      exit 1
    fi
  fi
else
  print_info "Skipping container rebuild"
fi

print_section "Container Status"

# Check container status
if docker ps -q --filter "name=jmf-bot" | grep -q .; then
  print_success "JMF Bot container is running"
  
  # Get container info
  CONTAINER_ID=$(docker ps -q --filter "name=jmf-bot")
  CONTAINER_CREATED=$(docker inspect -f '{{ .Created }}' $CONTAINER_ID)
  CONTAINER_STATUS=$(docker inspect -f '{{ .State.Status }}' $CONTAINER_ID)
  
  print_info "Container ID: $CONTAINER_ID"
  print_info "Created: $CONTAINER_CREATED"
  print_info "Status: $CONTAINER_STATUS"
  
  print_info "To view logs: docker logs -f jmf-bot"
else
  print_error "JMF Bot container is not running"
fi

print_section "Update Complete"

echo -e "${GREEN}${BOLD}${ROCKET} JMF Hosting Discord Bot has been successfully updated!${NC}"
echo -e "\n${PURPLE}${BOLD}© 2025 JMFHosting. All Rights Reserved.${NC}"
echo -e "${PURPLE}${BOLD}Developed by Nanaimo2013 (https://github.com/Nanaimo2013)${NC}"
echo -e "${BLUE}${BOLD}Update Date: $(date)${NC}" 