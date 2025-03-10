#!/bin/bash

# JMF Hosting Discord Bot - Database Update Script
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}"
echo "      ██╗███╗   ███╗███████╗    ██████╗  ██████╗ ████████╗"
echo "      ██║████╗ ████║██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝"
echo "      ██║██╔████╔██║█████╗█████╗██████╔╝██║   ██║   ██║   "
echo " ██   ██║██║╚██╔╝██║██╔══╝╚════╝██╔══██╗██║   ██║   ██║   "
echo " ╚█████╔╝██║ ╚═╝ ██║██║         ██████╔╝╚██████╔╝   ██║   "
echo "  ╚════╝ ╚═╝     ╚═╝╚═╝         ╚═════╝  ╚═════╝    ╚═╝   "
echo -e "${NC}"
echo -e "${CYAN}========== JMF Hosting Discord Bot - Database Update ==========${NC}"
echo -e "${CYAN}========== Version 1.0.0 ==========${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    echo -e "${GREEN}Loading environment variables from .env file...${NC}"
    source <(grep -v '^#' .env | sed -E 's/(.*)=.*/export \1/')
else
    echo -e "${YELLOW}Warning: .env file not found. Using default values.${NC}"
fi

# Set database path
DB_PATH=${DB_PATH:-"./data/database.sqlite"}
DB_TYPE=${DB_TYPE:-"sqlite"}

# Check if database directory exists
DB_DIR=$(dirname "$DB_PATH")
if [ ! -d "$DB_DIR" ]; then
    echo -e "${YELLOW}Creating database directory: $DB_DIR${NC}"
    mkdir -p "$DB_DIR"
fi

# Create backup of the database
if [ -f "$DB_PATH" ]; then
    BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d%H%M%S)"
    echo -e "${YELLOW}Creating backup of database at: $BACKUP_PATH${NC}"
    cp "$DB_PATH" "$BACKUP_PATH"
fi

# Function to run the database fix script
run_database_fix() {
    echo -e "${BLUE}Running database fix script...${NC}"
    node fix-database.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Database fix script completed successfully.${NC}"
    else
        echo -e "${RED}Error: Database fix script failed.${NC}"
        exit 1
    fi
}

# Function to apply SQLite schema
apply_sqlite_schema() {
    echo -e "${BLUE}Applying SQLite schema...${NC}"
    
    # Check if unified schema file exists
    if [ ! -f "src/database/schema/unified-schema.sql" ]; then
        echo -e "${RED}Error: unified-schema.sql not found at src/database/schema/unified-schema.sql${NC}"
        exit 1
    fi
    
    # Check if sqlite3 command is available
    if command -v sqlite3 &> /dev/null; then
        echo -e "${GREEN}Using sqlite3 command to apply schema...${NC}"
        sqlite3 "$DB_PATH" < src/database/schema/unified-schema.sql
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}SQLite schema applied successfully.${NC}"
        else
            echo -e "${RED}Error: Failed to apply SQLite schema.${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}sqlite3 command not found. Using Node.js to apply schema...${NC}"
        node scripts/database/apply-unified-schema.js
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}SQLite schema applied successfully using Node.js.${NC}"
        else
            echo -e "${RED}Error: Failed to apply SQLite schema using Node.js.${NC}"
            exit 1
        fi
    fi
}

# Function to apply MySQL schema
apply_mysql_schema() {
    echo -e "${BLUE}Applying MySQL schema...${NC}"
    
    # Check if unified schema file exists
    if [ ! -f "src/database/schema/unified-schema.sql" ]; then
        echo -e "${RED}Error: unified-schema.sql not found at src/database/schema/unified-schema.sql${NC}"
        exit 1
    fi
    
    # Check if MySQL credentials are set
    if [ -z "$DB_HOST" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_DATABASE" ]; then
        echo -e "${RED}Error: MySQL credentials not set in .env file.${NC}"
        exit 1
    fi
    
    # Check if mysql command is available
    if command -v mysql &> /dev/null; then
        echo -e "${GREEN}Using mysql command to apply schema...${NC}"
        
        # Set password option if provided
        MYSQL_PWD_OPTION=""
        if [ ! -z "$DB_PASSWORD" ]; then
            MYSQL_PWD_OPTION="-p$DB_PASSWORD"
        fi
        
        # Apply schema
        mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USERNAME" $MYSQL_PWD_OPTION "$DB_DATABASE" < src/database/schema/unified-schema.sql
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}MySQL schema applied successfully.${NC}"
        else
            echo -e "${RED}Error: Failed to apply MySQL schema.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Error: mysql command not found. Cannot apply MySQL schema.${NC}"
        exit 1
    fi
}

# Function to fix account_links table
fix_account_links() {
    echo -e "${BLUE}Fixing account_links table...${NC}"
    node fix-account-links.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}account_links table fixed successfully.${NC}"
    else
        echo -e "${RED}Error: Failed to fix account_links table.${NC}"
        exit 1
    fi
}

# Function to fix account_links panel_id
fix_account_links_panel_id() {
    echo -e "${BLUE}Fixing account_links panel_id...${NC}"
    node fix-account-links-panel-id.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}account_links panel_id fixed successfully.${NC}"
    else
        echo -e "${RED}Error: Failed to fix account_links panel_id.${NC}"
        exit 1
    fi
}

# Function to fix market listings
fix_market_listings() {
    echo -e "${BLUE}Fixing market listings...${NC}"
    node fix-market-listings.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Market listings fixed successfully.${NC}"
    else
        echo -e "${RED}Error: Failed to fix market listings.${NC}"
        exit 1
    fi
}

# Function to fix market purchases
fix_market_purchases() {
    echo -e "${BLUE}Fixing market purchases...${NC}"
    node fix-market-purchase.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Market purchases fixed successfully.${NC}"
    else
        echo -e "${RED}Error: Failed to fix market purchases.${NC}"
        exit 1
    fi
}

# Main function
main() {
    echo -e "${CYAN}Starting database update process...${NC}"
    
    # Run the appropriate schema update based on database type
    if [ "$DB_TYPE" = "mysql" ]; then
        apply_mysql_schema
    else
        apply_sqlite_schema
    fi
    
    # Run the database fix script
    run_database_fix
    
    # Fix specific tables
    fix_account_links
    fix_account_links_panel_id
    fix_market_listings
    fix_market_purchases
    
    echo -e "${GREEN}Database update completed successfully!${NC}"
    echo -e "${YELLOW}Please restart the bot to apply the changes.${NC}"
}

# Run the main function
main 