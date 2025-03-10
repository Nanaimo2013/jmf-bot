/**
 * Fix SQLite Database Schema Issues
 * 
 * This script fixes the database schema issues by:
 * 1. Dropping problematic tables if they exist
 * 2. Creating them with SQLite-compatible syntax
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the SQLite database
const dbPath = path.join(__dirname, 'data', 'database.sqlite');

console.log(`Attempting to fix database at: ${dbPath}`);

// Check if the database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  process.exit(1);
}

// Create a backup of the database
const backupPath = `${dbPath}.backup.${new Date().toISOString().replace(/[:.]/g, '')}`; 
fs.copyFileSync(dbPath, backupPath);
console.log(`Created backup at: ${backupPath}`);

// Connect to the database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log(`Successfully connected to the database`);
  
  // Begin a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION;');
    
    // Fix member_events table
    console.log('Fixing member_events table...');
    db.run('DROP TABLE IF EXISTS member_events;', (err) => {
      if (err) {
        console.error('Error dropping member_events table:', err.message);
        db.run('ROLLBACK;');
        return;
      }
      
      const createMemberEventsTable = `
      CREATE TABLE IF NOT EXISTS member_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK(event_type IN ('join', 'leave')),
        timestamp TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_member_events_user_id ON member_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_member_events_guild_id ON member_events(guild_id);
      `;
      
      db.exec(createMemberEventsTable, (err) => {
        if (err) {
          console.error('Error creating member_events table:', err.message);
          db.run('ROLLBACK;');
          return;
        }
        
        console.log('Successfully fixed member_events table');
        
        // Fix select_menu_interactions table
        console.log('Fixing select_menu_interactions table...');
        db.run('DROP TABLE IF EXISTS select_menu_interactions;', (err) => {
          if (err) {
            console.error('Error dropping select_menu_interactions table:', err.message);
            db.run('ROLLBACK;');
            return;
          }
          
          const createSelectMenuTable = `
          CREATE TABLE IF NOT EXISTS select_menu_interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            custom_id TEXT,
            user_id TEXT,
            guild_id TEXT,
            channel_id TEXT,
            message_id TEXT,
            selected_values TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
            FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
          );
          `;
          
          db.exec(createSelectMenuTable, (err) => {
            if (err) {
              console.error('Error creating select_menu_interactions table:', err.message);
              db.run('ROLLBACK;');
              return;
            }
            
            console.log('Successfully fixed select_menu_interactions table');
            
            // Fix modal_submissions table
            console.log('Fixing modal_submissions table...');
            db.run('DROP TABLE IF EXISTS modal_submissions;', (err) => {
              if (err) {
                console.error('Error dropping modal_submissions table:', err.message);
                db.run('ROLLBACK;');
                return;
              }
              
              const createModalSubmissionsTable = `
              CREATE TABLE IF NOT EXISTS modal_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                custom_id TEXT,
                user_id TEXT,
                guild_id TEXT,
                submitted_values TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
              );
              `;
              
              db.exec(createModalSubmissionsTable, (err) => {
                if (err) {
                  console.error('Error creating modal_submissions table:', err.message);
                  db.run('ROLLBACK;');
                  return;
                }
                
                console.log('Successfully fixed modal_submissions table');
                
                // Fix account_links table
                console.log('Fixing account_links table...');
                db.run('DROP TABLE IF EXISTS account_links;', (err) => {
                  if (err) {
                    console.error('Error dropping account_links table:', err.message);
                    db.run('ROLLBACK;');
                    return;
                  }
                  
                  const createAccountLinksTable = `
                  CREATE TABLE IF NOT EXISTS account_links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE,
                    pterodactyl_id INTEGER,
                    pterodactyl_username TEXT,
                    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                  );
                  
                  CREATE INDEX IF NOT EXISTS idx_account_links_user_id ON account_links(user_id);
                  CREATE INDEX IF NOT EXISTS idx_account_links_pterodactyl_id ON account_links(pterodactyl_id);
                  `;
                  
                  db.exec(createAccountLinksTable, (err) => {
                    if (err) {
                      console.error('Error creating account_links table:', err.message);
                      db.run('ROLLBACK;');
                      return;
                    }
                    
                    console.log('Successfully fixed account_links table');
                    
                    // Commit the transaction
                    db.run('COMMIT;', (err) => {
                      if (err) {
                        console.error('Error committing transaction:', err.message);
                        db.run('ROLLBACK;');
                      } else {
                        console.log('All fixes applied successfully');
                      }
                      
                      // Close the database connection
                      db.close((err) => {
                        if (err) {
                          console.error('Error closing database:', err.message);
                        } else {
                          console.log('Database connection closed successfully');
                          console.log('Please restart the bot to apply the changes');
                        }
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}); 