-- User data table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(100),
    discriminator VARCHAR(10),
    avatar VARCHAR(100),
    bot BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    balance INTEGER DEFAULT 0,
    bank INTEGER DEFAULT 0,
    reputation INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    is_blacklisted BOOLEAN DEFAULT 0,
    blacklist_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_username ON users(username);

-- Guild data table
CREATE TABLE IF NOT EXISTS guilds (
    guild_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100),
    owner_id VARCHAR(20),
    icon VARCHAR(100),
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    prefix VARCHAR(10) DEFAULT '!'
);
CREATE INDEX IF NOT EXISTS idx_guild_name ON guilds(name);

-- Guild members table
CREATE TABLE IF NOT EXISTS guild_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    nickname VARCHAR(100),
    joined_at TIMESTAMP,
    roles TEXT,
    UNIQUE(guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);

-- Economy transactions table
CREATE TABLE IF NOT EXISTS economy_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20),
    amount INTEGER,
    type VARCHAR(20),
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_economy_user ON economy_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_economy_type ON economy_transactions(type);

-- Mining data table
CREATE TABLE IF NOT EXISTS mining_data (
    user_id VARCHAR(20) PRIMARY KEY,
    last_mined TIMESTAMP,
    mining_streak INTEGER DEFAULT 0,
    total_mined INTEGER DEFAULT 0
);

-- Mining transactions table
CREATE TABLE IF NOT EXISTS mining_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20),
    amount INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mining_user ON mining_transactions(user_id);

-- Commands usage table
CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    command VARCHAR(50),
    args TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_commands_guild ON commands(guild_id);
CREATE INDEX IF NOT EXISTS idx_commands_user ON commands(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_command ON commands(command);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id VARCHAR(20),
    guild_id VARCHAR(20),
    channel_id VARCHAR(20),
    user_id VARCHAR(20),
    content TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_edited BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_guild ON messages(guild_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    moderator_id VARCHAR(20),
    action VARCHAR(20),
    reason TEXT,
    duration INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_moderation_guild ON moderation_actions(guild_id);
CREATE INDEX IF NOT EXISTS idx_moderation_user ON moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_action ON moderation_actions(action);

-- Leveling table
CREATE TABLE IF NOT EXISTS leveling (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    last_xp_earned TIMESTAMP,
    UNIQUE(guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_leveling_guild ON leveling(guild_id);
CREATE INDEX IF NOT EXISTS idx_leveling_user ON leveling(user_id);

-- Leveling rewards table
CREATE TABLE IF NOT EXISTS leveling_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    level INTEGER,
    role_id VARCHAR(20),
    UNIQUE(guild_id, level)
);
CREATE INDEX IF NOT EXISTS idx_rewards_guild ON leveling_rewards(guild_id);

-- Verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    verified BOOLEAN DEFAULT 0,
    verification_date TIMESTAMP,
    UNIQUE(guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_verifications_guild ON verifications(guild_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id VARCHAR(20),
    guild_id VARCHAR(20),
    channel_id VARCHAR(20),
    user_id VARCHAR(20),
    subject TEXT,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    closed_by VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id VARCHAR(20),
    message_id VARCHAR(20),
    user_id VARCHAR(20),
    content TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_user ON ticket_messages(user_id);

-- Button interactions table
CREATE TABLE IF NOT EXISTS button_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    custom_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_button_guild ON button_interactions(guild_id);
CREATE INDEX IF NOT EXISTS idx_button_user ON button_interactions(user_id);

-- Select menu interactions table
CREATE TABLE IF NOT EXISTS select_menu_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    custom_id VARCHAR(100),
    values TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_select_guild ON select_menu_interactions(guild_id);
CREATE INDEX IF NOT EXISTS idx_select_user ON select_menu_interactions(user_id);

-- Modal submissions table
CREATE TABLE IF NOT EXISTS modal_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    custom_id VARCHAR(100),
    values TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_modal_guild ON modal_submissions(guild_id);
CREATE INDEX IF NOT EXISTS idx_modal_user ON modal_submissions(user_id);

-- AI chat interactions table
CREATE TABLE IF NOT EXISTS ai_chat_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    channel_id VARCHAR(20),
    prompt TEXT,
    response TEXT,
    tokens_used INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_guild ON ai_chat_interactions(guild_id);
CREATE INDEX IF NOT EXISTS idx_ai_user ON ai_chat_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_channel ON ai_chat_interactions(channel_id);

-- Scheduled tasks table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id VARCHAR(36),
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    task_type VARCHAR(50),
    data TEXT,
    scheduled_for TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed BOOLEAN DEFAULT 0,
    executed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_guild ON scheduled_tasks(guild_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON scheduled_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON scheduled_tasks(scheduled_for);

-- Bot statistics table
CREATE TABLE IF NOT EXISTS bot_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE,
    commands_used INTEGER DEFAULT 0,
    messages_seen INTEGER DEFAULT 0,
    users_joined INTEGER DEFAULT 0,
    users_left INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    uptime_seconds INTEGER DEFAULT 0,
    UNIQUE(date)
);
CREATE INDEX IF NOT EXISTS idx_stats_date ON bot_statistics(date);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id VARCHAR(20),
    category VARCHAR(50),
    key VARCHAR(50),
    value TEXT,
    UNIQUE(guild_id, category, key)
);
CREATE INDEX IF NOT EXISTS idx_settings_guild ON settings(guild_id);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Ticket actions table
CREATE TABLE IF NOT EXISTS ticket_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id VARCHAR(20),
    user_id VARCHAR(20),
    action VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_actions_ticket ON ticket_actions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_actions_user ON ticket_actions(user_id);

-- Account links table
CREATE TABLE IF NOT EXISTS account_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id VARCHAR(20) UNIQUE,
    pterodactyl_id INTEGER,
    verified BOOLEAN DEFAULT 0,
    verification_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_account_links_discord ON account_links(discord_id);
CREATE INDEX IF NOT EXISTS idx_account_links_pterodactyl ON account_links(pterodactyl_id); 