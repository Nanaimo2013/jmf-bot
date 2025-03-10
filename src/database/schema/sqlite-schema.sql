-- Unified Schema for JMF Hosting Discord Bot (SQLite Version)
-- © 2025 JMFHosting. All Rights Reserved.
-- Developed by Nanaimo2013 (https://github.com/Nanaimo2013)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Command usage table
CREATE TABLE IF NOT EXISTS command_usage (
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
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
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  balance INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, guild_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY,
  sender_id VARCHAR(20) NOT NULL,
  receiver_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  fee INTEGER DEFAULT 0,
  description TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market listings table
CREATE TABLE IF NOT EXISTS market_listings (
  id INTEGER PRIMARY KEY,
  seller_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active'
);

-- Market transactions table
CREATE TABLE IF NOT EXISTS market_transactions (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL,
  buyer_id VARCHAR(20) NOT NULL,
  seller_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  fee INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User mining data table
CREATE TABLE IF NOT EXISTS user_mining_data (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  current_world VARCHAR(50) DEFAULT 'Coal Mine',
  pickaxe VARCHAR(50) DEFAULT 'Wooden Pickaxe',
  pet VARCHAR(50),
  armor VARCHAR(50),
  active_booster VARCHAR(50),
  booster_expiry TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, guild_id)
);

-- User mining inventory table
CREATE TABLE IF NOT EXISTS user_mining_inventory (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  resource_id VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  item_type VARCHAR(20) DEFAULT 'resource',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, guild_id, resource_id)
);

-- Mining actions table
CREATE TABLE IF NOT EXISTS mining_actions (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50),
  quantity INTEGER,
  xp_gained INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI chat messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  response TEXT,
  tokens_used INTEGER,
  response_time INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  feedback_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by VARCHAR(20),
  reviewed_at TIMESTAMP
);

-- Keyword triggers table
CREATE TABLE IF NOT EXISTS keyword_triggers (
  id INTEGER PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  response TEXT NOT NULL,
  created_by VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_regex BOOLEAN DEFAULT 0,
  case_sensitive BOOLEAN DEFAULT 0,
  enabled BOOLEAN DEFAULT 1
);

-- User levels table
CREATE TABLE IF NOT EXISTS user_levels (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  last_message_timestamp TIMESTAMP,
  last_voice_timestamp TIMESTAMP,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_voice_minutes INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, guild_id)
);

-- Level rewards table
CREATE TABLE IF NOT EXISTS level_rewards (
  id INTEGER PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  level INTEGER NOT NULL,
  role_id VARCHAR(20) NOT NULL,
  created_by VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guild_id, level)
);

-- Account links table
CREATE TABLE IF NOT EXISTS account_links (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  platform_id VARCHAR(100) NOT NULL,
  platform_username VARCHAR(100),
  pterodactyl_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT 0,
  verified_at TIMESTAMP,
  UNIQUE(user_id, platform)
);

-- Verification table
CREATE TABLE IF NOT EXISTS verification (
  id INTEGER PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  verified BOOLEAN DEFAULT 0,
  verification_date TIMESTAMP,
  verification_method VARCHAR(50),
  verification_data TEXT,
  UNIQUE(user_id, guild_id)
);

-- Guilds table
CREATE TABLE IF NOT EXISTS guilds (
  id INTEGER PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  owner_id VARCHAR(20) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  member_count INTEGER,
  icon VARCHAR(255),
  UNIQUE(guild_id)
);

-- Guild settings table
CREATE TABLE IF NOT EXISTS guild_settings (
  id INTEGER PRIMARY KEY,
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