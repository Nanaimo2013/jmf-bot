-- JMF Bot Database Schema
-- Initial schema creation

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  username VARCHAR(100) NOT NULL,
  discriminator VARCHAR(10) NOT NULL,
  nickname VARCHAR(100),
  avatar_url TEXT,
  joined_at DATETIME NOT NULL,
  is_member TINYINT(1) DEFAULT 1,
  left_at DATETIME,
  PRIMARY KEY (user_id, guild_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  message_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20) NOT NULL,
  content_length INT NOT NULL,
  has_attachments TINYINT(1) DEFAULT 0,
  has_embeds TINYINT(1) DEFAULT 0,
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (message_id)
);

-- Member events table
CREATE TABLE IF NOT EXISTS member_events (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  event_type ENUM('join', 'leave') NOT NULL,
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Command usage table
CREATE TABLE IF NOT EXISTS command_usage (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  command VARCHAR(50) NOT NULL,
  channel_id VARCHAR(20),
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Command errors table
CREATE TABLE IF NOT EXISTS command_errors (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  command VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Legacy command usage table
CREATE TABLE IF NOT EXISTS legacy_command_usage (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  command VARCHAR(50) NOT NULL,
  channel_id VARCHAR(20),
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Legacy command errors table
CREATE TABLE IF NOT EXISTS legacy_command_errors (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  command VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Button usage table
CREATE TABLE IF NOT EXISTS button_usage (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  button_id VARCHAR(100) NOT NULL,
  channel_id VARCHAR(20),
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Select menu usage table
CREATE TABLE IF NOT EXISTS select_menu_usage (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  menu_id VARCHAR(100) NOT NULL,
  selected_values TEXT NOT NULL,
  channel_id VARCHAR(20),
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Modal submissions table
CREATE TABLE IF NOT EXISTS modal_submissions (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  modal_id VARCHAR(100) NOT NULL,
  field_values TEXT NOT NULL,
  channel_id VARCHAR(20),
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT,
  ticket_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  created_at DATETIME NOT NULL,
  closed_at DATETIME,
  closed_by VARCHAR(20),
  PRIMARY KEY (id)
);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  action_type ENUM('warn', 'mute', 'kick', 'ban', 'unmute', 'unban') NOT NULL,
  moderator_id VARCHAR(20) NOT NULL,
  reason TEXT,
  timestamp DATETIME NOT NULL,
  duration INT,
  PRIMARY KEY (id)
);

-- AutoMod actions table
CREATE TABLE IF NOT EXISTS automod_actions (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20),
  violations TEXT NOT NULL,
  action ENUM('warn', 'delete', 'mute') NOT NULL,
  message_content TEXT,
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- User balances table
CREATE TABLE IF NOT EXISTS user_balances (
  user_id VARCHAR(20) NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  type ENUM('add', 'remove') NOT NULL,
  amount BIGINT NOT NULL,
  old_balance BIGINT NOT NULL,
  new_balance BIGINT NOT NULL,
  reason VARCHAR(255),
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id INT AUTO_INCREMENT,
  from_user_id VARCHAR(20) NOT NULL,
  to_user_id VARCHAR(20) NOT NULL,
  amount BIGINT NOT NULL,
  fee BIGINT NOT NULL,
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Market listings table
CREATE TABLE IF NOT EXISTS market_listings (
  id VARCHAR(50) NOT NULL,
  seller_id VARCHAR(20) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  price BIGINT NOT NULL,
  listed_at DATETIME NOT NULL,
  active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id)
);

-- Market transactions table
CREATE TABLE IF NOT EXISTS market_transactions (
  id INT AUTO_INCREMENT,
  listing_id VARCHAR(50) NOT NULL,
  buyer_id VARCHAR(20) NOT NULL,
  seller_id VARCHAR(20) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  price_per_unit BIGINT NOT NULL,
  total_price BIGINT NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- User mining data table
CREATE TABLE IF NOT EXISTS user_mining_data (
  user_id VARCHAR(20) NOT NULL,
  level INT NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  current_world VARCHAR(100) NOT NULL,
  pickaxe VARCHAR(100) NOT NULL,
  pet VARCHAR(100),
  armor VARCHAR(100),
  active_booster VARCHAR(100),
  booster_expiry DATETIME,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
);

-- User mining inventory table
CREATE TABLE IF NOT EXISTS user_mining_inventory (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  item_type ENUM('resource', 'pickaxe', 'pet', 'armor', 'booster') NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_item (user_id, item_type, item_name)
);

-- Mining actions table
CREATE TABLE IF NOT EXISTS mining_actions (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  action_type ENUM('mine', 'purchase', 'world_change') NOT NULL,
  details TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- AI chat messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT,
  response_message_id VARCHAR(20),
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  feedback_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Keyword triggers table
CREATE TABLE IF NOT EXISTS keyword_triggers (
  id INT AUTO_INCREMENT,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20),
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  timestamp DATETIME NOT NULL,
  PRIMARY KEY (id)
);

-- Level system table
CREATE TABLE IF NOT EXISTS user_levels (
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  last_message_timestamp DATETIME,
  last_voice_timestamp DATETIME,
  total_messages INT NOT NULL DEFAULT 0,
  total_voice_minutes INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, guild_id)
);

-- Level rewards table
CREATE TABLE IF NOT EXISTS level_rewards (
  id INT AUTO_INCREMENT,
  guild_id VARCHAR(20) NOT NULL,
  level INT NOT NULL,
  role_id VARCHAR(20),
  reward_type ENUM('role', 'coins', 'item') NOT NULL,
  reward_value VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY guild_level (guild_id, level)
); 