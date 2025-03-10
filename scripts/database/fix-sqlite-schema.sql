-- Fix for SQLite database schema issues

-- Create command_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS command_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    command VARCHAR(50),
    channel_id VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_command_usage_user ON command_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_command_usage_guild ON command_usage(guild_id);
CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command);

-- Create button_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS button_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    button_id VARCHAR(100),
    channel_id VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_button_usage_user ON button_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_button_usage_guild ON button_usage(guild_id);
CREATE INDEX IF NOT EXISTS idx_button_usage_button ON button_usage(button_id);

-- Create command_errors table if it doesn't exist
CREATE TABLE IF NOT EXISTS command_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20),
    guild_id VARCHAR(20),
    command VARCHAR(50),
    error_message TEXT,
    stack_trace TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_command_errors_user ON command_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_command_errors_guild ON command_errors(guild_id);
CREATE INDEX IF NOT EXISTS idx_command_errors_command ON command_errors(command);

-- Check if the tables exist but are missing columns
-- For SQLite, we need to create new tables and migrate data if columns are missing

-- Check if command column exists in command_usage
SELECT COUNT(*) AS column_exists FROM pragma_table_info('command_usage') WHERE name = 'command';

-- Check if button_id column exists in button_usage
SELECT COUNT(*) AS column_exists FROM pragma_table_info('button_usage') WHERE name = 'button_id';

-- Check if command column exists in command_errors
SELECT COUNT(*) AS column_exists FROM pragma_table_info('command_errors') WHERE name = 'command';

-- Note: If the above queries return 0, you'll need to recreate the tables with the correct schema
-- SQLite doesn't support ADD COLUMN for multiple columns in a single statement
-- and doesn't support DROP COLUMN at all, so we need to recreate the tables if they're missing columns

-- Instructions for manual table recreation if needed:
-- 1. Rename the existing table: ALTER TABLE command_usage RENAME TO command_usage_old;
-- 2. Create the new table with the correct schema (as defined above)
-- 3. Copy data from old to new: INSERT INTO command_usage SELECT id, user_id, guild_id, NULL as command, channel_id, timestamp FROM command_usage_old;
-- 4. Drop the old table: DROP TABLE command_usage_old;
-- Repeat for other tables as needed 