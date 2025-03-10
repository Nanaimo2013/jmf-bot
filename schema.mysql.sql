-- MySQL schema for JMF Bot
-- This is a copy of the original schema.sql file, optimized for MySQL

-- User data table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(100),
    discriminator VARCHAR(10),
    avatar VARCHAR(100),
    bot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    xp INT DEFAULT 0,
    level INT DEFAULT 0,
    balance BIGINT DEFAULT 0,
    bank BIGINT DEFAULT 0,
    reputation INT DEFAULT 0,
    warnings INT DEFAULT 0,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    INDEX idx_username (username)
);

-- Guild data table
CREATE TABLE IF NOT EXISTS guilds (
    guild_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100),
    owner_id VARCHAR(20),
    icon VARCHAR(100),
    member_count INT DEFAULT 0,
    created_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    prefix VARCHAR(10) DEFAULT '!',
    INDEX idx_guild_name (name)
);

-- Guild members table
CREATE TABLE IF NOT EXISTS guild_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    nickname VARCHAR(100),
    joined_at TIMESTAMP,
    roles TEXT,
    UNIQUE KEY guild_user_unique (guild_id, user_id),
    INDEX idx_guild_members_guild (guild_id),
    INDEX idx_guild_members_user (user_id)
);

-- Economy transactions table
CREATE TABLE IF NOT EXISTS economy_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    amount BIGINT,
    type VARCHAR(20),
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_economy_user (user_id),
    INDEX idx_economy_type (type)
);

-- Mining data table
CREATE TABLE IF NOT EXISTS mining_data (
    user_id VARCHAR(20) PRIMARY KEY,
    last_mined TIMESTAMP,
    mining_streak INT DEFAULT 0,
    total_mined BIGINT DEFAULT 0
);

-- Mining transactions table
CREATE TABLE IF NOT EXISTS mining_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    amount BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mining_user (user_id)
);

-- Commands usage table
CREATE TABLE IF NOT EXISTS commands (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    command VARCHAR(50),
    args TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_commands_guild (guild_id),
    INDEX idx_commands_user (user_id),
    INDEX idx_commands_command (command)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(20),
    guild_id VARCHAR(20),
    channel_id VARCHAR(20),
    user_id VARCHAR(20),
    content TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    INDEX idx_messages_guild (guild_id),
    INDEX idx_messages_channel (channel_id),
    INDEX idx_messages_user (user_id)
);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    moderator_id VARCHAR(20),
    action VARCHAR(20),
    reason TEXT,
    duration INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_moderation_guild (guild_id),
    INDEX idx_moderation_user (user_id),
    INDEX idx_moderation_action (action)
);

-- Leveling table
CREATE TABLE IF NOT EXISTS leveling (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    xp INT DEFAULT 0,
    level INT DEFAULT 0,
    last_xp_earned TIMESTAMP,
    UNIQUE KEY guild_user_unique (guild_id, user_id),
    INDEX idx_leveling_guild (guild_id),
    INDEX idx_leveling_user (user_id)
);

-- Leveling rewards table
CREATE TABLE IF NOT EXISTS leveling_rewards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    level INT,
    role_id VARCHAR(20),
    UNIQUE KEY guild_level_unique (guild_id, level),
    INDEX idx_rewards_guild (guild_id)
);

-- Verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP,
    UNIQUE KEY guild_user_unique (guild_id, user_id),
    INDEX idx_verifications_guild (guild_id),
    INDEX idx_verifications_user (user_id)
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20),
    guild_id VARCHAR(20),
    channel_id VARCHAR(20),
    user_id VARCHAR(20),
    subject TEXT,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    closed_by VARCHAR(20),
    INDEX idx_tickets_guild (guild_id),
    INDEX idx_tickets_user (user_id),
    INDEX idx_tickets_status (status)
);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20),
    message_id VARCHAR(20),
    user_id VARCHAR(20),
    content TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_messages_ticket (ticket_id),
    INDEX idx_ticket_messages_user (user_id)
);

-- Button interactions table
CREATE TABLE IF NOT EXISTS button_interactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    custom_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_button_guild (guild_id),
    INDEX idx_button_user (user_id)
);

-- Select menu interactions table
CREATE TABLE IF NOT EXISTS select_menu_interactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    custom_id VARCHAR(100),
    `values` TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_select_guild (guild_id),
    INDEX idx_select_user (user_id)
);

-- Modal submissions table
CREATE TABLE IF NOT EXISTS modal_submissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    custom_id VARCHAR(100),
    `values` TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_modal_guild (guild_id),
    INDEX idx_modal_user (user_id)
);

-- AI chat interactions table
CREATE TABLE IF NOT EXISTS ai_chat_interactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    channel_id VARCHAR(20),
    prompt TEXT,
    response TEXT,
    tokens_used INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_guild (guild_id),
    INDEX idx_ai_user (user_id),
    INDEX idx_ai_channel (channel_id)
);

-- Scheduled tasks table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(36),
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    task_type VARCHAR(50),
    data TEXT,
    scheduled_for TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP,
    INDEX idx_tasks_guild (guild_id),
    INDEX idx_tasks_user (user_id),
    INDEX idx_tasks_type (task_type),
    INDEX idx_tasks_scheduled (scheduled_for)
);

-- Bot statistics table
CREATE TABLE IF NOT EXISTS bot_statistics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    date DATE,
    commands_used INT DEFAULT 0,
    messages_seen INT DEFAULT 0,
    users_joined INT DEFAULT 0,
    users_left INT DEFAULT 0,
    errors_encountered INT DEFAULT 0,
    uptime_seconds INT DEFAULT 0,
    UNIQUE KEY date_unique (date),
    INDEX idx_stats_date (date)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    category VARCHAR(50),
    `key` VARCHAR(50),
    value TEXT,
    UNIQUE KEY guild_category_key_unique (guild_id, category, `key`),
    INDEX idx_settings_guild (guild_id),
    INDEX idx_settings_category (category)
);

-- Ticket actions table
CREATE TABLE IF NOT EXISTS ticket_actions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20),
    user_id VARCHAR(20),
    action VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_actions_ticket (ticket_id),
    INDEX idx_ticket_actions_user (user_id)
);

-- Account links table
CREATE TABLE IF NOT EXISTS account_links (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    discord_id VARCHAR(20) UNIQUE,
    pterodactyl_id INT,
    verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    INDEX idx_account_links_discord (discord_id),
    INDEX idx_account_links_pterodactyl (pterodactyl_id)
); 