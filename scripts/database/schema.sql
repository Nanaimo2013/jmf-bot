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
    premium_tier INT DEFAULT 0,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    INDEX idx_name (name)
);

-- Guild members table
CREATE TABLE IF NOT EXISTS guild_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    nickname VARCHAR(100),
    joined_at TIMESTAMP,
    roles TEXT,
    xp INT DEFAULT 0,
    level INT DEFAULT 0,
    warnings INT DEFAULT 0,
    is_muted BOOLEAN DEFAULT FALSE,
    mute_end_time TIMESTAMP NULL,
    UNIQUE KEY unique_member (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Economy transactions table
CREATE TABLE IF NOT EXISTS economy_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    amount BIGINT NOT NULL,
    type ENUM('deposit', 'withdraw', 'transfer', 'shop', 'mining', 'daily', 'weekly', 'work', 'rob', 'gift', 'other') NOT NULL,
    recipient_id VARCHAR(20) NULL,
    reason TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_timestamp (timestamp)
);

-- Mining data table
CREATE TABLE IF NOT EXISTS mining_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    pickaxe_level INT DEFAULT 1,
    pickaxe_durability INT DEFAULT 100,
    last_mined TIMESTAMP NULL,
    total_mined BIGINT DEFAULT 0,
    total_earnings BIGINT DEFAULT 0,
    UNIQUE KEY unique_miner (guild_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Mining transactions table
CREATE TABLE IF NOT EXISTS mining_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    amount INT NOT NULL,
    earnings BIGINT NOT NULL,
    pickaxe_level INT,
    pickaxe_damage INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_timestamp (timestamp)
);

-- Commands usage table
CREATE TABLE IF NOT EXISTS commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20) NULL,
    command VARCHAR(50),
    args TEXT,
    channel_id VARCHAR(20) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time INT DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    INDEX idx_command (command),
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_timestamp (timestamp)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(20),
    user_id VARCHAR(20),
    guild_id VARCHAR(20) NULL,
    channel_id VARCHAR(20),
    content TEXT,
    has_attachments BOOLEAN DEFAULT FALSE,
    has_embeds BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    INDEX idx_message_id (message_id),
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_channel_id (channel_id),
    INDEX idx_created_at (created_at)
);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    moderator_id VARCHAR(20),
    action_type ENUM('warn', 'mute', 'kick', 'ban', 'unban', 'unmute', 'clear', 'other') NOT NULL,
    reason TEXT,
    duration VARCHAR(50) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_action_type (action_type),
    INDEX idx_timestamp (timestamp)
);

-- Leveling data table
CREATE TABLE IF NOT EXISTS leveling (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    xp INT DEFAULT 0,
    level INT DEFAULT 0,
    last_message_time TIMESTAMP NULL,
    voice_time INT DEFAULT 0,
    messages_count INT DEFAULT 0,
    UNIQUE KEY unique_leveling (guild_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    INDEX idx_level (level)
);

-- Leveling rewards table
CREATE TABLE IF NOT EXISTS leveling_rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20),
    level INT NOT NULL,
    role_id VARCHAR(20),
    message TEXT,
    UNIQUE KEY unique_level_reward (guild_id, level),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Verification table
CREATE TABLE IF NOT EXISTS verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_timestamp (timestamp)
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20),
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    channel_id VARCHAR(20),
    subject VARCHAR(100),
    description TEXT,
    status ENUM('open', 'closed', 'archived') DEFAULT 'open',
    category VARCHAR(50) DEFAULT 'support',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    closed_by VARCHAR(20) NULL,
    claimed_by VARCHAR(20) NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20),
    message_id VARCHAR(20),
    user_id VARCHAR(20),
    content TEXT,
    has_attachments BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp)
);

-- Button interactions table
CREATE TABLE IF NOT EXISTS button_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20) NULL,
    button_id VARCHAR(50),
    channel_id VARCHAR(20) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_button_id (button_id),
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_timestamp (timestamp)
);

-- Select menu interactions table
CREATE TABLE IF NOT EXISTS select_menu_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20) NULL,
    menu_id VARCHAR(50),
    values_selected TEXT,
    channel_id VARCHAR(20) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_menu_id (menu_id),
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_timestamp (timestamp)
);

-- Modal submissions table
CREATE TABLE IF NOT EXISTS modal_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20) NULL,
    modal_id VARCHAR(50),
    fields TEXT,
    channel_id VARCHAR(20) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_modal_id (modal_id),
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_timestamp (timestamp)
);

-- AI chat interactions table
CREATE TABLE IF NOT EXISTS ai_chat_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    channel_id VARCHAR(20),
    message_id VARCHAR(20),
    user_message TEXT,
    ai_response TEXT,
    service VARCHAR(50),
    tokens_used INT DEFAULT 0,
    response_time INT DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_guild_id (guild_id),
    INDEX idx_channel_id (channel_id),
    INDEX idx_timestamp (timestamp)
);

-- Scheduled tasks table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(36),
    type VARCHAR(50) NOT NULL,
    data TEXT,
    guild_id VARCHAR(20) NULL,
    channel_id VARCHAR(20) NULL,
    user_id VARCHAR(20) NULL,
    scheduled_for TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP NULL,
    error TEXT NULL,
    INDEX idx_task_id (task_id),
    INDEX idx_type (type),
    INDEX idx_scheduled_for (scheduled_for),
    INDEX idx_executed (executed)
);

-- Bot statistics table
CREATE TABLE IF NOT EXISTS bot_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    commands_used INT DEFAULT 0,
    messages_processed INT DEFAULT 0,
    users_joined INT DEFAULT 0,
    users_left INT DEFAULT 0,
    errors_encountered INT DEFAULT 0,
    uptime_seconds BIGINT DEFAULT 0,
    memory_usage FLOAT DEFAULT 0,
    cpu_usage FLOAT DEFAULT 0,
    guilds_count INT DEFAULT 0,
    users_count INT DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NULL,
    module VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(20) NULL,
    UNIQUE KEY unique_setting (guild_id, module, setting_key),
    INDEX idx_module (module),
    INDEX idx_guild_id (guild_id)
);

-- Ticket actions table
CREATE TABLE IF NOT EXISTS ticket_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20),
    user_id VARCHAR(20) NULL,
    action_by VARCHAR(20),
    action_type ENUM('create', 'close', 'add_user', 'remove_user', 'claim', 'rename', 'other') NOT NULL,
    details TEXT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_action_type (action_type),
    INDEX idx_timestamp (timestamp)
);

-- Create triggers for updating last_seen
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_user_last_seen_messages
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE users SET last_seen = NEW.created_at WHERE user_id = NEW.user_id;
END //

CREATE TRIGGER IF NOT EXISTS update_user_last_seen_commands
AFTER INSERT ON commands
FOR EACH ROW
BEGIN
    UPDATE users SET last_seen = NEW.timestamp WHERE user_id = NEW.user_id;
END //
DELIMITER ;

-- JMF Hosting Discord Bot Database Schema
-- © 2025 JMFHosting. All Rights Reserved.
-- Developed by Nanaimo2013 (https://github.com/Nanaimo2013)

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Create account_links table for linking Discord accounts to Pterodactyl panel accounts
CREATE TABLE IF NOT EXISTS account_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    panel_id TEXT,
    panel_username TEXT,
    token TEXT,
    api_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    linked_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    UNIQUE(discord_id),
    UNIQUE(panel_id)
);

-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    game TEXT NOT NULL,
    owner_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'offline',
    node TEXT,
    ip TEXT,
    port INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create mining_stats table
CREATE TABLE IF NOT EXISTS mining_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    world_id INTEGER NOT NULL,
    resources_mined INTEGER DEFAULT 0,
    value_earned INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    last_mined TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create warnings table
CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    moderator_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create bans table
CREATE TABLE IF NOT EXISTS bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    moderator_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    moderator_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create statistics table
CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_account_links_discord_id ON account_links(discord_id);
CREATE INDEX IF NOT EXISTS idx_account_links_panel_id ON account_links(panel_id);
CREATE INDEX IF NOT EXISTS idx_servers_server_id ON servers(server_id);
CREATE INDEX IF NOT EXISTS idx_servers_owner_id ON servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_economy_transactions_user_id ON economy_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_mining_stats_user_id ON mining_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_warnings_user_id ON warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_bans_user_id ON bans(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_guild_id ON settings(guild_id);
CREATE INDEX IF NOT EXISTS idx_statistics_guild_id ON statistics(guild_id); 