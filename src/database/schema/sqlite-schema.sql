-- Unified Schema for JMF Hosting Discord Bot (SQLite Version)
-- © 2025 JMFHosting. All Rights Reserved.
-- Developed by Nanaimo2013 (https://github.com/Nanaimo2013)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  username VARCHAR(32) NOT NULL,
  discriminator VARCHAR(4) NOT NULL,
  avatar VARCHAR(255),
  created_at TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_bot BOOLEAN DEFAULT 0,
  is_banned BOOLEAN DEFAULT 0,
  ban_reason TEXT,
  UNIQUE(user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  content TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id)
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
  command_name VARCHAR(50) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time INTEGER,
  success BOOLEAN DEFAULT 1
);

-- Command errors table
CREATE TABLE IF NOT EXISTS command_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name VARCHAR(50) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20),
  error_message TEXT,
  stack_trace TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legacy command usage table
CREATE TABLE IF NOT EXISTS legacy_command_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name VARCHAR(50) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time INTEGER,
  success BOOLEAN DEFAULT 1
);

-- Legacy command errors table
CREATE TABLE IF NOT EXISTS legacy_command_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name VARCHAR(50) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20),
  error_message TEXT,
  stack_trace TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Button usage table
CREATE TABLE IF NOT EXISTS button_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  button_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20),
  message_id VARCHAR(20),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  custom_id VARCHAR(100),
  success BOOLEAN DEFAULT 1
);

-- Select menu usage table
CREATE TABLE IF NOT EXISTS select_menu_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20),
  message_id VARCHAR(20),
  selected_values TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  custom_id VARCHAR(100),
  success BOOLEAN DEFAULT 1
);

-- Modal submissions table
CREATE TABLE IF NOT EXISTS modal_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  modal_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20),
  submitted_data TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  custom_id VARCHAR(100),
  success BOOLEAN DEFAULT 1
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'normal',
  assigned_to VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  closed_by VARCHAR(20),
  close_reason TEXT,
  contact_info TEXT,
  UNIQUE(ticket_id)
);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id)
);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  moderator_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  reason TEXT,
  duration INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  revoked BOOLEAN DEFAULT 0,
  revoked_by VARCHAR(20),
  revoked_at TIMESTAMP
);

-- Automod actions table
CREATE TABLE IF NOT EXISTS automod_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20),
  action_type VARCHAR(20) NOT NULL,
  trigger_type VARCHAR(20) NOT NULL,
  content TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  automated BOOLEAN DEFAULT 1
);

-- Automod settings table
CREATE TABLE IF NOT EXISTS automod_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  feature VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT 0,
  settings TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(20),
  UNIQUE(guild_id, feature)
);

-- User balances table
CREATE TABLE IF NOT EXISTS user_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  balance INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, guild_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id VARCHAR(20) NOT NULL,
  receiver_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  fee INTEGER DEFAULT 0,
  description TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market listings table
DROP TABLE IF EXISTS market_listings_temp;
CREATE TABLE IF NOT EXISTS market_listings_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  is_active BOOLEAN DEFAULT 1,
  active INTEGER DEFAULT 1
);

-- Copy data from existing table if it exists
INSERT OR IGNORE INTO market_listings_temp 
SELECT id, seller_id, guild_id, item_id, item_type, quantity, price, description, created_at, expires_at, status, 1, 1
FROM market_listings;

-- Drop the old table and rename the new one
DROP TABLE IF EXISTS market_listings;
ALTER TABLE market_listings_temp RENAME TO market_listings;

-- Market transactions table
CREATE TABLE IF NOT EXISTS market_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  buyer_id VARCHAR(20) NOT NULL,
  seller_id VARCHAR(20) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User mining data table
CREATE TABLE IF NOT EXISTS user_mining_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  pickaxe VARCHAR(50) DEFAULT 'wooden',
  world VARCHAR(50) DEFAULT 'overworld',
  last_mined TIMESTAMP,
  UNIQUE(user_id, guild_id)
);

-- User mining inventory table
CREATE TABLE IF NOT EXISTS user_mining_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mining actions table
CREATE TABLE IF NOT EXISTS mining_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  action_type VARCHAR(20) NOT NULL,
  details TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI chat messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  content TEXT,
  response TEXT,
  tokens_used INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  type VARCHAR(20) NOT NULL,
  content TEXT,
  rating INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keyword triggers table
CREATE TABLE IF NOT EXISTS keyword_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  response TEXT,
  created_by VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uses INTEGER DEFAULT 0,
  is_regex BOOLEAN DEFAULT 0,
  is_case_sensitive BOOLEAN DEFAULT 0,
  UNIQUE(guild_id, keyword)
);

-- User levels table
CREATE TABLE IF NOT EXISTS user_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  messages INTEGER DEFAULT 0,
  voice_time INTEGER DEFAULT 0,
  last_xp_earned TIMESTAMP,
  UNIQUE(user_id, guild_id)
);

-- Level rewards table
CREATE TABLE IF NOT EXISTS level_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  level INTEGER NOT NULL,
  role_id VARCHAR(20),
  message TEXT,
  UNIQUE(guild_id, level)
);

-- Account links table
CREATE TABLE IF NOT EXISTS account_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  discord_id VARCHAR(20) NOT NULL,
  pterodactyl_id INTEGER,
  panel_id VARCHAR(100),
  pterodactyl_username VARCHAR(100),
  token VARCHAR(100),
  expires_at TIMESTAMP,
  whmcs_id INTEGER,
  verified BOOLEAN DEFAULT 0,
  verification_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  UNIQUE(user_id)
);

-- Verification table
CREATE TABLE IF NOT EXISTS verification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  verified BOOLEAN DEFAULT 0,
  verification_code VARCHAR(10),
  verification_method VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  UNIQUE(user_id, guild_id)
);

-- Guilds table
CREATE TABLE IF NOT EXISTS guilds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(255),
  owner_id VARCHAR(20) NOT NULL,
  member_count INTEGER DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  premium_tier INTEGER DEFAULT 0,
  premium_until TIMESTAMP,
  UNIQUE(guild_id)
);

-- Guild settings table
CREATE TABLE IF NOT EXISTS guild_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  setting_key VARCHAR(50) NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(20),
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
CREATE INDEX IF NOT EXISTS idx_account_links_discord_id ON account_links(discord_id);
CREATE INDEX IF NOT EXISTS idx_account_links_pterodactyl_id ON account_links(pterodactyl_id);
CREATE INDEX IF NOT EXISTS idx_account_links_panel_id ON account_links(panel_id);
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON verification(user_id);
CREATE INDEX IF NOT EXISTS idx_guilds_guild_id ON guilds(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_guild_id ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_user_mining_data_user_id ON user_mining_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mining_inventory_user_id ON user_mining_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mining_inventory_item_type ON user_mining_inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON market_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_item_type ON market_listings(item_type);
CREATE INDEX IF NOT EXISTS idx_market_listings_is_active ON market_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_market_listings_active ON market_listings(active);
CREATE INDEX IF NOT EXISTS idx_market_transactions_buyer_id ON market_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_market_transactions_seller_id ON market_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_automod_actions_user_id ON automod_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_automod_actions_guild_id ON automod_actions(guild_id);
CREATE INDEX IF NOT EXISTS idx_automod_settings_guild_id ON automod_settings(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_settings_guild_id ON guild_settings(guild_id);

-- Remove duplicate indexes
CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON market_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_item_type ON market_listings(item_type);
CREATE INDEX IF NOT EXISTS idx_market_listings_is_active ON market_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_market_listings_active ON market_listings(active); 