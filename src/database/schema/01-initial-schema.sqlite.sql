-- SQLite schema for JMF Hosting Discord Bot
-- This file contains the database schema for SQLite

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  discriminator TEXT,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  message_id TEXT PRIMARY KEY,
  channel_id TEXT,
  guild_id TEXT,
  user_id TEXT,
  content TEXT,
  has_attachments INTEGER DEFAULT 0,
  has_embeds INTEGER DEFAULT 0,
  timestamp TIMESTAMP NOT NULL
);

-- Member events table
CREATE TABLE IF NOT EXISTS member_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('join', 'leave')),
  timestamp TIMESTAMP NOT NULL
);

-- Command usage table
CREATE TABLE IF NOT EXISTS command_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name TEXT NOT NULL,
  user_id TEXT,
  guild_id TEXT,
  channel_id TEXT,
  success INTEGER DEFAULT 1,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Command errors table
CREATE TABLE IF NOT EXISTS command_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name TEXT NOT NULL,
  user_id TEXT,
  guild_id TEXT,
  channel_id TEXT,
  error_message TEXT,
  error_stack TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legacy command usage table
CREATE TABLE IF NOT EXISTS legacy_command_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name TEXT NOT NULL,
  user_id TEXT,
  guild_id TEXT,
  channel_id TEXT,
  success INTEGER DEFAULT 1,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legacy command errors table
CREATE TABLE IF NOT EXISTS legacy_command_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name TEXT NOT NULL,
  user_id TEXT,
  guild_id TEXT,
  channel_id TEXT,
  error_message TEXT,
  error_stack TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Button usage table
CREATE TABLE IF NOT EXISTS button_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  custom_id TEXT NOT NULL,
  user_id TEXT,
  guild_id TEXT,
  channel_id TEXT,
  message_id TEXT,
  success INTEGER DEFAULT 1,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Select menu usage table
CREATE TABLE IF NOT EXISTS select_menu_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  custom_id TEXT NOT NULL,
  user_id TEXT,
  guild_id TEXT,
  channel_id TEXT,
  message_id TEXT,
  selected_values TEXT,
  success INTEGER DEFAULT 1,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modal submissions table
CREATE TABLE IF NOT EXISTS modal_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  custom_id TEXT NOT NULL,
  user_id TEXT,
  guild_id TEXT,
  submitted_values TEXT,
  success INTEGER DEFAULT 1,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT UNIQUE,
  guild_id TEXT,
  channel_id TEXT,
  user_id TEXT,
  status TEXT DEFAULT 'open',
  subject TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  closed_by TEXT
);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  moderator_id TEXT,
  action_type TEXT,
  reason TEXT,
  duration INTEGER,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automod actions table
CREATE TABLE IF NOT EXISTS automod_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  channel_id TEXT,
  message_id TEXT,
  action_type TEXT,
  trigger_type TEXT,
  trigger_content TEXT,
  action_taken TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User balances table
CREATE TABLE IF NOT EXISTS user_balances (
  user_id TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  amount INTEGER,
  type TEXT,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_balances(user_id)
);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id TEXT,
  receiver_id TEXT,
  amount INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES user_balances(user_id),
  FOREIGN KEY (receiver_id) REFERENCES user_balances(user_id)
);

-- Market listings table
CREATE TABLE IF NOT EXISTS market_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id TEXT,
  item_name TEXT,
  item_description TEXT,
  price INTEGER,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES user_balances(user_id)
);

-- Market transactions table
CREATE TABLE IF NOT EXISTS market_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER,
  buyer_id TEXT,
  seller_id TEXT,
  item_name TEXT,
  quantity INTEGER DEFAULT 1,
  price INTEGER,
  total_price INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES market_listings(id),
  FOREIGN KEY (buyer_id) REFERENCES user_balances(user_id),
  FOREIGN KEY (seller_id) REFERENCES user_balances(user_id)
);

-- User mining data table
CREATE TABLE IF NOT EXISTS user_mining_data (
  user_id TEXT PRIMARY KEY,
  pickaxe_level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  total_mined INTEGER DEFAULT 0,
  last_mined TIMESTAMP,
  streak INTEGER DEFAULT 0,
  last_streak_update DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User mining inventory table
CREATE TABLE IF NOT EXISTS user_mining_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  item_name TEXT,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_name)
);

-- Mining actions table
CREATE TABLE IF NOT EXISTS mining_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action_type TEXT,
  result TEXT,
  experience_gained INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI chat messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  guild_id TEXT,
  channel_id TEXT,
  message_content TEXT,
  response_content TEXT,
  tokens_used INTEGER DEFAULT 0,
  processing_time REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  guild_id TEXT,
  feedback_type TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keyword triggers table
CREATE TABLE IF NOT EXISTS keyword_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  keyword TEXT,
  response TEXT,
  is_regex INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User levels table
CREATE TABLE IF NOT EXISTS user_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  guild_id TEXT,
  experience INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  messages INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, guild_id)
);

-- Level rewards table
CREATE TABLE IF NOT EXISTS level_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  level INTEGER,
  role_id TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guild_id, level)
);

-- Account links table
CREATE TABLE IF NOT EXISTS account_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE,
  pterodactyl_id INTEGER,
  pterodactyl_username TEXT,
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Verification table
CREATE TABLE IF NOT EXISTS verification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE,
  guild_id TEXT,
  verified INTEGER DEFAULT 0,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Guilds table
CREATE TABLE IF NOT EXISTS guilds (
  guild_id TEXT PRIMARY KEY,
  name TEXT,
  icon TEXT,
  owner_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild settings table
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  prefix TEXT DEFAULT '!',
  welcome_channel_id TEXT,
  goodbye_channel_id TEXT,
  log_channel_id TEXT,
  mod_log_channel_id TEXT,
  auto_role_id TEXT,
  mute_role_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_member_events_user_id ON member_events(user_id);
CREATE INDEX IF NOT EXISTS idx_member_events_guild_id ON member_events(guild_id);
CREATE INDEX IF NOT EXISTS idx_command_usage_command_name ON command_usage(command_name);
CREATE INDEX IF NOT EXISTS idx_command_usage_user_id ON command_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_user_id ON moderation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_guild_id ON moderation_actions(guild_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_guild_id ON user_levels(guild_id);
CREATE INDEX IF NOT EXISTS idx_account_links_user_id ON account_links(user_id);
CREATE INDEX IF NOT EXISTS idx_account_links_pterodactyl_id ON account_links(pterodactyl_id);
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON verification(user_id);
CREATE INDEX IF NOT EXISTS idx_guilds_guild_id ON guilds(guild_id); 