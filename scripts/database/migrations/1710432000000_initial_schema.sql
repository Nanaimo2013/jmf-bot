-- Migration: Initial Schema
-- Version: 1710432000000
-- Created: 2025-03-12T00:00:00.000Z

-- Up
BEGIN;

-- Enable foreign key support for SQLite
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(32) NOT NULL,
    discriminator VARCHAR(4) NOT NULL,
    avatar_url TEXT,
    credits INTEGER DEFAULT 0,
    experience INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    reputation INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guilds table
CREATE TABLE guilds (
    guild_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_id VARCHAR(20) NOT NULL,
    icon_url TEXT,
    prefix VARCHAR(10) DEFAULT '!',
    language VARCHAR(5) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    welcome_channel_id VARCHAR(20),
    log_channel_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Guild members table
CREATE TABLE guild_members (
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    nickname VARCHAR(32),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    experience INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    warnings INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Roles table
CREATE TABLE roles (
    role_id VARCHAR(20) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    color INTEGER,
    position INTEGER NOT NULL,
    permissions BIGINT NOT NULL,
    is_managed BOOLEAN DEFAULT FALSE,
    is_mentionable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Member roles table
CREATE TABLE member_roles (
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    role_id VARCHAR(20),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(20),
    PRIMARY KEY (guild_id, user_id, role_id),
    FOREIGN KEY (guild_id, user_id) REFERENCES guild_members(guild_id, user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Commands table
CREATE TABLE commands (
    command_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    usage TEXT,
    category VARCHAR(50),
    cooldown INTEGER DEFAULT 0,
    required_permissions BIGINT DEFAULT 0,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_guild_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Command aliases table
CREATE TABLE command_aliases (
    alias VARCHAR(50),
    command_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (alias, command_id),
    FOREIGN KEY (command_id) REFERENCES commands(command_id) ON DELETE CASCADE
);

-- Command usage table
CREATE TABLE command_usage (
    usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL,
    guild_id VARCHAR(20),
    user_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    execution_time INTEGER,
    FOREIGN KEY (command_id) REFERENCES commands(command_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Guild settings table
CREATE TABLE guild_settings (
    guild_id VARCHAR(20) PRIMARY KEY,
    welcome_message TEXT,
    farewell_message TEXT,
    auto_role_id VARCHAR(20),
    mute_role_id VARCHAR(20),
    level_up_message TEXT,
    level_up_channel_id VARCHAR(20),
    moderation_enabled BOOLEAN DEFAULT TRUE,
    economy_enabled BOOLEAN DEFAULT TRUE,
    leveling_enabled BOOLEAN DEFAULT TRUE,
    music_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (auto_role_id) REFERENCES roles(role_id) ON DELETE SET NULL,
    FOREIGN KEY (mute_role_id) REFERENCES roles(role_id) ON DELETE SET NULL
);

-- Custom commands table
CREATE TABLE custom_commands (
    command_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    response TEXT NOT NULL,
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uses INTEGER DEFAULT 0,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Warnings table
CREATE TABLE warnings (
    warning_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id, user_id) REFERENCES guild_members(guild_id, user_id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Mutes table
CREATE TABLE mutes (
    mute_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NOT NULL,
    reason TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id, user_id) REFERENCES guild_members(guild_id, user_id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Bans table
CREATE TABLE bans (
    ban_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NOT NULL,
    reason TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Reminders table
CREATE TABLE reminders (
    reminder_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20) NOT NULL,
    guild_id VARCHAR(20),
    channel_id VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    remind_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_guilds_name ON guilds(name);
CREATE INDEX idx_guild_members_experience ON guild_members(guild_id, experience DESC);
CREATE INDEX idx_roles_guild_position ON roles(guild_id, position);
CREATE INDEX idx_command_usage_used_at ON command_usage(used_at DESC);
CREATE INDEX idx_warnings_user ON warnings(guild_id, user_id);
CREATE INDEX idx_mutes_expires_at ON mutes(expires_at);
CREATE INDEX idx_bans_expires_at ON bans(expires_at);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);

COMMIT;

-- Down
BEGIN;

DROP INDEX IF EXISTS idx_reminders_remind_at;
DROP INDEX IF EXISTS idx_bans_expires_at;
DROP INDEX IF EXISTS idx_mutes_expires_at;
DROP INDEX IF EXISTS idx_warnings_user;
DROP INDEX IF EXISTS idx_command_usage_used_at;
DROP INDEX IF EXISTS idx_roles_guild_position;
DROP INDEX IF EXISTS idx_guild_members_experience;
DROP INDEX IF EXISTS idx_guilds_name;
DROP INDEX IF EXISTS idx_users_username;

DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS bans;
DROP TABLE IF EXISTS mutes;
DROP TABLE IF EXISTS warnings;
DROP TABLE IF EXISTS custom_commands;
DROP TABLE IF EXISTS guild_settings;
DROP TABLE IF EXISTS command_usage;
DROP TABLE IF EXISTS command_aliases;
DROP TABLE IF EXISTS commands;
DROP TABLE IF EXISTS member_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS guild_members;
DROP TABLE IF EXISTS guilds;
DROP TABLE IF EXISTS users;

COMMIT; 