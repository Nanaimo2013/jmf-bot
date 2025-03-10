/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const mysql = require('mysql2/promise');
const logger = require('./logger');
const config = require('../../config.json');
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize the database connection
   * @returns {Promise<boolean>} - Whether the connection was successful
   */
  async initialize() {
    try {
      if (!config.database || !config.database.enabled) {
        logger.info('Database integration is disabled');
        return false;
      }

      logger.info('Initializing database connection...');

      // Create database configuration
      const dbConfig = {
        host: config.database.host || 'localhost',
        port: config.database.port || 3306,
        user: config.database.user || 'jmfbot',
        password: config.database.password || '',
        database: config.database.name || 'jmfbot',
        waitForConnections: true,
        connectionLimit: config.database.connectionLimit || 10,
        queueLimit: 0,
        // Ensure we don't interfere with the panel by using a separate connection
        connectTimeout: 10000,
        // Use a unique connection name to avoid conflicts
        connectionName: 'jmf_bot_connection'
      };

      // Create connection pool
      this.pool = mysql.createPool(dbConfig);

      // Test connection
      const connection = await this.pool.getConnection();
      logger.info('Database connection successful');
      connection.release();

      this.isConnected = true;

      // Initialize database tables
      await this.initializeTables();

      return true;
    } catch (error) {
      logger.error(`Database initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize database tables
   * @returns {Promise<void>}
   */
  async initializeTables() {
    try {
      logger.info('Checking and creating database tables if needed...');

      // Load and execute SQL schema files
      const schemaDir = path.join(__dirname, '../database/schema');
      
      // Create schema directory if it doesn't exist
      if (!fs.existsSync(schemaDir)) {
        fs.mkdirSync(schemaDir, { recursive: true });
        logger.info('Created schema directory');
      }

      // Check if we have schema files
      const schemaFiles = fs.readdirSync(schemaDir).filter(file => file.endsWith('.sql'));
      
      if (schemaFiles.length > 0) {
        // Execute each schema file
        for (const file of schemaFiles) {
          const filePath = path.join(schemaDir, file);
          const schema = fs.readFileSync(filePath, 'utf8');
          
          // Split the schema into individual statements
          const statements = schema.split(';').filter(stmt => stmt.trim() !== '');
          
          for (const statement of statements) {
            await this.query(statement);
          }
          
          logger.info(`Executed schema file: ${file}`);
        }
      } else {
        // If no schema files, create tables directly
        await this.createDefaultTables();
      }

      logger.info('Database tables initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize database tables: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create default tables if no schema files exist
   * @returns {Promise<void>}
   */
  async createDefaultTables() {
    try {
      // Users table
      await this.query(`
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
        )
      `);
      
      // Messages table
      await this.query(`
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
        )
      `);
      
      // Member events table
      await this.query(`
        CREATE TABLE IF NOT EXISTS member_events (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20) NOT NULL,
          event_type ENUM('join', 'leave') NOT NULL,
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Command usage table
      await this.query(`
        CREATE TABLE IF NOT EXISTS command_usage (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          command VARCHAR(50) NOT NULL,
          channel_id VARCHAR(20),
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Command errors table
      await this.query(`
        CREATE TABLE IF NOT EXISTS command_errors (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          command VARCHAR(50) NOT NULL,
          error_message TEXT NOT NULL,
          stack_trace TEXT,
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Legacy command usage table
      await this.query(`
        CREATE TABLE IF NOT EXISTS legacy_command_usage (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          command VARCHAR(50) NOT NULL,
          channel_id VARCHAR(20),
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Legacy command errors table
      await this.query(`
        CREATE TABLE IF NOT EXISTS legacy_command_errors (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          command VARCHAR(50) NOT NULL,
          error_message TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Button usage table
      await this.query(`
        CREATE TABLE IF NOT EXISTS button_usage (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          button_id VARCHAR(100) NOT NULL,
          channel_id VARCHAR(20),
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Select menu usage table
      await this.query(`
        CREATE TABLE IF NOT EXISTS select_menu_usage (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          menu_id VARCHAR(100) NOT NULL,
          selected_values TEXT NOT NULL,
          channel_id VARCHAR(20),
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Modal submissions table
      await this.query(`
        CREATE TABLE IF NOT EXISTS modal_submissions (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          modal_id VARCHAR(100) NOT NULL,
          field_values TEXT NOT NULL,
          channel_id VARCHAR(20),
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Tickets table
      await this.query(`
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
        )
      `);
      
      // Moderation actions table
      await this.query(`
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
        )
      `);
      
      // AutoMod actions table
      await this.query(`
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
        )
      `);
      
      // User balances table
      await this.query(`
        CREATE TABLE IF NOT EXISTS user_balances (
          user_id VARCHAR(20) NOT NULL,
          balance BIGINT NOT NULL DEFAULT 0,
          last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id)
        )
      `);
      
      // Transactions table
      await this.query(`
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
        )
      `);
      
      // Transfers table
      await this.query(`
        CREATE TABLE IF NOT EXISTS transfers (
          id INT AUTO_INCREMENT,
          from_user_id VARCHAR(20) NOT NULL,
          to_user_id VARCHAR(20) NOT NULL,
          amount BIGINT NOT NULL,
          fee BIGINT NOT NULL,
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Market listings table
      await this.query(`
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
        )
      `);
      
      // Market transactions table
      await this.query(`
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
        )
      `);
      
      // User mining data table
      await this.query(`
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
        )
      `);
      
      // User mining inventory table
      await this.query(`
        CREATE TABLE IF NOT EXISTS user_mining_inventory (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          item_type ENUM('resource', 'pickaxe', 'pet', 'armor', 'booster') NOT NULL,
          item_name VARCHAR(100) NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY user_item (user_id, item_type, item_name)
        )
      `);
      
      // Mining actions table
      await this.query(`
        CREATE TABLE IF NOT EXISTS mining_actions (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          action_type ENUM('mine', 'purchase', 'world_change') NOT NULL,
          details TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // AI chat messages table
      await this.query(`
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
        )
      `);
      
      // Feedback table
      await this.query(`
        CREATE TABLE IF NOT EXISTS feedback (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          feedback_type VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      
      // Keyword triggers table
      await this.query(`
        CREATE TABLE IF NOT EXISTS keyword_triggers (
          id INT AUTO_INCREMENT,
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20),
          channel_id VARCHAR(20) NOT NULL,
          message_id VARCHAR(20) NOT NULL,
          keyword VARCHAR(100) NOT NULL,
          timestamp DATETIME NOT NULL,
          PRIMARY KEY (id)
        )
      `);
    } catch (error) {
      logger.error(`Failed to create default tables: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a database query
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} - Query results
   */
  async query(sql, params = []) {
    try {
      if (!this.isConnected || !this.pool) {
        throw new Error('Database is not connected');
      }

      const [results] = await this.pool.query(sql, params);
      return results;
    } catch (error) {
      logger.error(`Database query error: ${error.message}`);
      logger.error(`Query: ${sql}`);
      logger.error(`Params: ${JSON.stringify(params)}`);
      throw error;
    }
  }

  /**
   * Create a database backup
   * @returns {Promise<string>} - Path to the backup file
   */
  async createBackup() {
    try {
      if (!this.isConnected || !this.pool) {
        throw new Error('Database is not connected');
      }

      logger.info('Creating database backup...');

      // Create backups directory if it doesn't exist
      const backupDir = path.join(__dirname, '../../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

      // Get all table names
      const tables = await this.query('SHOW TABLES');
      const tableNames = tables.map(table => Object.values(table)[0]);

      // Create backup file
      const writeStream = fs.createWriteStream(backupFile);

      // Add header
      writeStream.write(`-- JMF Bot Database Backup\n`);
      writeStream.write(`-- Date: ${new Date().toISOString()}\n\n`);

      // Process each table
      for (const tableName of tableNames) {
        // Get table creation SQL
        const [createTable] = await this.query(`SHOW CREATE TABLE ${tableName}`);
        const createTableSql = createTable['Create Table'];

        writeStream.write(`-- Table structure for table \`${tableName}\`\n`);
        writeStream.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);
        writeStream.write(`${createTableSql};\n\n`);

        // Get table data
        const rows = await this.query(`SELECT * FROM ${tableName}`);

        if (rows.length > 0) {
          writeStream.write(`-- Data for table \`${tableName}\`\n`);
          writeStream.write(`INSERT INTO \`${tableName}\` VALUES\n`);

          // Format each row
          const values = rows.map(row => {
            const rowValues = Object.values(row).map(value => {
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return value;
            });
            return `(${rowValues.join(', ')})`;
          });

          writeStream.write(`${values.join(',\n')};\n\n`);
        }
      }

      writeStream.end();

      logger.info(`Database backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      logger.error(`Failed to create database backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        this.isConnected = false;
        logger.info('Database connection closed');
      }
    } catch (error) {
      logger.error(`Error closing database connection: ${error.message}`);
    }
  }
}

module.exports = new Database(); 