-- Migration: Initial Schema
-- Version: 1710432000000
-- Created: 2025-03-12T00:00:00.000Z
-- Description: Initial database schema for the JMF Hosting Discord Bot

-- Up
BEGIN;

-- Enable foreign key support for SQLite
PRAGMA foreign_keys = ON;

-- Database version tracking
CREATE TABLE IF NOT EXISTS db_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(32) NOT NULL,
    discriminator VARCHAR(4),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    ban_expires TIMESTAMP,
    credits INTEGER DEFAULT 0,
    experience INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1
);

-- Guilds table
CREATE TABLE IF NOT EXISTS guilds (
    guild_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon_url TEXT,
    owner_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    prefix VARCHAR(10) DEFAULT '!',
    welcome_channel_id VARCHAR(20),
    log_channel_id VARCHAR(20),
    mod_log_channel_id VARCHAR(20),
    automod_enabled BOOLEAN DEFAULT FALSE,
    verification_level INTEGER DEFAULT 0,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Guild Members table
CREATE TABLE IF NOT EXISTS guild_members (
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    nickname VARCHAR(32),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    warnings INTEGER DEFAULT 0,
    is_muted BOOLEAN DEFAULT FALSE,
    mute_expires TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(20) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    color INTEGER,
    position INTEGER,
    is_hoisted BOOLEAN DEFAULT FALSE,
    is_mentionable BOOLEAN DEFAULT FALSE,
    permissions BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Member Roles table
CREATE TABLE IF NOT EXISTS member_roles (
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    role_id VARCHAR(20),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(20),
    PRIMARY KEY (guild_id, user_id, role_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Commands table
CREATE TABLE IF NOT EXISTS commands (
    command_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(32) NOT NULL,
    description TEXT,
    category VARCHAR(32),
    cooldown INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    staff_only BOOLEAN DEFAULT FALSE,
    owner_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Command Usage table
CREATE TABLE IF NOT EXISTS command_usage (
    usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    channel_id VARCHAR(20),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time INTEGER,
    FOREIGN KEY (command_id) REFERENCES commands(command_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Game Servers table
CREATE TABLE IF NOT EXISTS game_servers (
    server_id INTEGER PRIMARY KEY AUTOINCREMENT,
    pterodactyl_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    game_type VARCHAR(50),
    owner_id VARCHAR(20),
    status VARCHAR(20),
    node VARCHAR(50),
    cpu_limit INTEGER,
    memory_limit INTEGER,
    disk_limit INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Server Access table
CREATE TABLE IF NOT EXISTS server_access (
    server_id INTEGER,
    user_id VARCHAR(20),
    access_level VARCHAR(20),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(20),
    PRIMARY KEY (server_id, user_id),
    FOREIGN KEY (server_id) REFERENCES game_servers(server_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Server Backups table
CREATE TABLE IF NOT EXISTS server_backups (
    backup_id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER,
    name VARCHAR(100),
    size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(20),
    status VARCHAR(20),
    download_url TEXT,
    FOREIGN KEY (server_id) REFERENCES game_servers(server_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Marketplace table
CREATE TABLE IF NOT EXISTS marketplace (
    listing_id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id VARCHAR(20),
    item_type VARCHAR(50),
    title VARCHAR(100),
    description TEXT,
    price INTEGER,
    currency VARCHAR(10) DEFAULT 'credits',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Marketplace Purchases table
CREATE TABLE IF NOT EXISTS marketplace_purchases (
    purchase_id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER,
    buyer_id VARCHAR(20),
    price_paid INTEGER,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20),
    FOREIGN KEY (listing_id) REFERENCES marketplace(listing_id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    channel_id VARCHAR(20),
    creator_id VARCHAR(20),
    assigned_to VARCHAR(20),
    subject VARCHAR(200),
    status VARCHAR(20) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    closed_by VARCHAR(20),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (closed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Ticket Messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    message_id VARCHAR(20) PRIMARY KEY,
    ticket_id INTEGER,
    author_id VARCHAR(20),
    content TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Automod Rules table
CREATE TABLE IF NOT EXISTS automod_rules (
    rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    name VARCHAR(100),
    type VARCHAR(50),
    action VARCHAR(50),
    duration INTEGER,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(20),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Automod Actions table
CREATE TABLE IF NOT EXISTS automod_actions (
    action_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    channel_id VARCHAR(20),
    message_id VARCHAR(20),
    action_type VARCHAR(50),
    reason TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rule_id) REFERENCES automod_rules(rule_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_guilds_name ON guilds(name);
CREATE INDEX IF NOT EXISTS idx_guild_members_last_active ON guild_members(last_active);
CREATE INDEX IF NOT EXISTS idx_commands_name ON commands(name);
CREATE INDEX IF NOT EXISTS idx_command_usage_used_at ON command_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_game_servers_owner ON game_servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace(status);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- Insert initial version
INSERT INTO db_version (version, description) VALUES (1710432000000, 'Initial schema');

COMMIT;

-- Down
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_logs_created_at;
DROP INDEX IF EXISTS idx_tickets_status;
DROP INDEX IF EXISTS idx_marketplace_status;
DROP INDEX IF EXISTS idx_game_servers_owner;
DROP INDEX IF EXISTS idx_command_usage_used_at;
DROP INDEX IF EXISTS idx_commands_name;
DROP INDEX IF EXISTS idx_guild_members_last_active;
DROP INDEX IF EXISTS idx_guilds_name;
DROP INDEX IF EXISTS idx_users_username;

-- Drop tables in reverse order to handle foreign key constraints
DROP TABLE IF EXISTS automod_actions;
DROP TABLE IF EXISTS automod_rules;
DROP TABLE IF EXISTS ticket_messages;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS marketplace_purchases;
DROP TABLE IF EXISTS marketplace;
DROP TABLE IF EXISTS server_backups;
DROP TABLE IF EXISTS server_access;
DROP TABLE IF EXISTS game_servers;
DROP TABLE IF EXISTS command_usage;
DROP TABLE IF EXISTS commands;
DROP TABLE IF EXISTS member_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS guild_members;
DROP TABLE IF EXISTS guilds;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS db_version;

COMMIT; 