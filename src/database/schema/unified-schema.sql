-- JMF Hosting Discord Bot Unified Database Schema
-- This schema is designed to work with both SQLite and MySQL databases
-- Use appropriate database-specific commands when needed

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  username VARCHAR(100) NOT NULL,
  discriminator VARCHAR(10) NOT NULL,
  nickname VARCHAR(100),
  avatar_url TEXT,
  avatar TEXT,
  joined_at DATETIME NOT NULL,
  is_member TINYINT(1) DEFAULT 1,
  left_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, guild_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  message_id VARCHAR(20) NOT NULL PRIMARY KEY,
  channel_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  content TEXT,
  has_attachments TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member events table
CREATE TABLE IF NOT EXISTS member_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Command usage table
CREATE TABLE IF NOT EXISTS command_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  command_name VARCHAR(50) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Command errors table
CREATE TABLE IF NOT EXISTS command_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  command_name VARCHAR(50) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legacy command usage table
CREATE TABLE IF NOT EXISTS legacy_command_usage (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  command VARCHAR(50) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legacy command errors table
CREATE TABLE IF NOT EXISTS legacy_command_errors (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  command VARCHAR(50) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Button usage table
CREATE TABLE IF NOT EXISTS button_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  custom_id VARCHAR(100) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20),
  success TINYINT(1) DEFAULT 1,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Select menu usage table
CREATE TABLE IF NOT EXISTS select_menu_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  custom_id VARCHAR(100) NOT NULL,
  selected_values TEXT NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20),
  success TINYINT(1) DEFAULT 1,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modal submissions table
CREATE TABLE IF NOT EXISTS modal_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  custom_id VARCHAR(100) NOT NULL,
  field_values TEXT,
  channel_id VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  subject TEXT,
  status VARCHAR(20) DEFAULT 'open',
  category VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'medium',
  contact_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  closed_by VARCHAR(20)
);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  moderator_id VARCHAR(20) NOT NULL,
  action_type VARCHAR(20) NOT NULL,
  reason TEXT,
  duration INTEGER,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automod actions table
CREATE TABLE IF NOT EXISTS automod_actions (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20),
  action_type VARCHAR(20) NOT NULL,
  trigger_type VARCHAR(20) NOT NULL,
  trigger_content TEXT,
  message_content TEXT,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automod settings table
CREATE TABLE IF NOT EXISTS automod_settings (
  guild_id VARCHAR(20) NOT NULL PRIMARY KEY,
  enabled TINYINT(1) DEFAULT 1,
  max_mentions INTEGER DEFAULT 5,
  max_emojis INTEGER DEFAULT 10,
  max_caps_percentage INTEGER DEFAULT 70,
  invite_filter TINYINT(1) DEFAULT 1,
  link_filter TINYINT(1) DEFAULT 1,
  allowed_links TEXT,
  banned_words TEXT,
  log_channel_id VARCHAR(20),
  delete_excessive_emojis TINYINT(1) DEFAULT 1,
  delete_excessive_caps TINYINT(1) DEFAULT 1,
  timeout_for_excessive_mentions TINYINT(1) DEFAULT 1,
  timeout_for_invites TINYINT(1) DEFAULT 1,
  timeout_for_banned_words TINYINT(1) DEFAULT 1,
  timeout_duration INTEGER DEFAULT 300000,
  anti_spam TINYINT(1) DEFAULT 1,
  max_message_length INTEGER DEFAULT 2000,
  delete_long_messages TINYINT(1) DEFAULT 1,
  max_newlines INTEGER DEFAULT 15,
  delete_excessive_newlines TINYINT(1) DEFAULT 1,
  escalate_repeat_offenders TINYINT(1) DEFAULT 1,
  repeat_offender_threshold INTEGER DEFAULT 3,
  escalated_timeout_duration INTEGER DEFAULT 3600000,
  ping_mod_role TINYINT(1) DEFAULT 1,
  mod_role_id VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User balances table
CREATE TABLE IF NOT EXISTS user_balances (
  user_id VARCHAR(20) NOT NULL PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  last_daily TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  balance_after INTEGER NOT NULL
);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  from_user_id VARCHAR(20) NOT NULL,
  to_user_id VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  reason VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market listings table
CREATE TABLE IF NOT EXISTS market_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id VARCHAR(20) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active TINYINT(1) DEFAULT 1
);

-- Market transactions table
CREATE TABLE IF NOT EXISTS market_transactions (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  listing_id INTEGER NOT NULL,
  buyer_id VARCHAR(20) NOT NULL,
  seller_id VARCHAR(20) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User mining data table
CREATE TABLE IF NOT EXISTS user_mining_data (
  user_id VARCHAR(20) NOT NULL PRIMARY KEY,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  pickaxe VARCHAR(50) DEFAULT 'wooden',
  current_world VARCHAR(50) DEFAULT 'overworld',
  unlocked_worlds TEXT DEFAULT 'overworld',
  last_mine TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User mining inventory table
CREATE TABLE IF NOT EXISTS user_mining_inventory (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  resource_id VARCHAR(50) NOT NULL,
  quantity INTEGER DEFAULT 0,
  item_type VARCHAR(20) DEFAULT 'resource',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, guild_id, resource_id)
);

-- Mining actions table
CREATE TABLE IF NOT EXISTS mining_actions (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50),
  quantity INTEGER,
  xp_gained INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI chat messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  model VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  feedback_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keyword triggers table
CREATE TABLE IF NOT EXISTS keyword_triggers (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  response TEXT NOT NULL,
  is_regex TINYINT(1) DEFAULT 0,
  case_sensitive TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User levels table
CREATE TABLE IF NOT EXISTS user_levels (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  messages INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, guild_id)
);

-- Level rewards table
CREATE TABLE IF NOT EXISTS level_rewards (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  level INTEGER NOT NULL,
  role_id VARCHAR(20),
  coins INTEGER DEFAULT 0,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guild_id, level)
);

-- Account links table
CREATE TABLE IF NOT EXISTS account_links (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  pterodactyl_id VARCHAR(36),
  panel_id VARCHAR(36),
  email VARCHAR(255),
  verified TINYINT(1) DEFAULT 0,
  verification_token VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Verification table
CREATE TABLE IF NOT EXISTS verification (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  verification_code VARCHAR(10) NOT NULL,
  verified TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  UNIQUE(user_id, guild_id)
);

-- Guilds table
CREATE TABLE IF NOT EXISTS guilds (
  guild_id VARCHAR(20) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  owner_id VARCHAR(20) NOT NULL,
  icon_url TEXT,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild settings table
CREATE TABLE IF NOT EXISTS guild_settings (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  setting_key VARCHAR(50) NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guild_id, setting_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_member_events_user_id ON member_events(user_id);
CREATE INDEX IF NOT EXISTS idx_member_events_guild_id ON member_events(guild_id);
CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command_name);
CREATE INDEX IF NOT EXISTS idx_command_usage_user_id ON command_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_user_id ON moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_guild_id ON moderation_actions(guild_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_guild_id ON user_levels(guild_id);
CREATE INDEX IF NOT EXISTS idx_account_links_user_id ON account_links(user_id);
CREATE INDEX IF NOT EXISTS idx_account_links_pterodactyl_id ON account_links(pterodactyl_id);
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON verification(user_id);
CREATE INDEX IF NOT EXISTS idx_guilds_guild_id ON guilds(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_guild_id ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_user_mining_data_user_id ON user_mining_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mining_inventory_user_id ON user_mining_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON market_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_item_type ON market_listings(item_type);
CREATE INDEX IF NOT EXISTS idx_market_transactions_buyer_id ON market_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_market_transactions_seller_id ON market_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_automod_actions_user_id ON automod_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_automod_actions_guild_id ON automod_actions(guild_id);
CREATE INDEX IF NOT EXISTS idx_automod_settings_guild_id ON automod_settings(guild_id); 