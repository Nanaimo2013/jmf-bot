/**
 * Fix Account Links Table
 * 
 * This script adds a 'discord_id' column to the account_links table
 * and maps it to the existing user_id column to fix the 
 * "no such column: discord_id" error.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the SQLite database
const dbPath = path.join(__dirname, 'data', 'database.sqlite');

console.log(`Attempting to fix account_links table in database at: ${dbPath}`);

// Check if the database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  process.exit(1);
}

// Create a backup of the database
const backupPath = `${dbPath}.backup.account_links.${new Date().toISOString().replace(/[:.]/g, '')}`; 
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
    
    // Check if the account_links table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='account_links'", (err, table) => {
      if (err) {
        console.error('Error checking if table exists:', err.message);
        db.run('ROLLBACK;');
        db.close();
        return;
      }
      
      if (!table) {
        console.error('account_links table does not exist');
        db.run('ROLLBACK;');
        db.close();
        return;
      }
      
      // Check if the discord_id column already exists
      db.all("PRAGMA table_info(account_links)", (err, columns) => {
        if (err) {
          console.error('Error checking table structure:', err.message);
          db.run('ROLLBACK;');
          db.close();
          return;
        }
        
        const hasDiscordId = columns.some(col => col.name === 'discord_id');
        
        if (hasDiscordId) {
          console.log('discord_id column already exists, updating values...');
          
          // Update discord_id to match user_id where it's null
          db.run(`UPDATE account_links SET discord_id = user_id WHERE discord_id IS NULL;`, (err) => {
            if (err) {
              console.error('Error updating discord_id values:', err.message);
              db.run('ROLLBACK;');
              db.close();
              return;
            }
            
            console.log('Successfully updated discord_id values');
            commitAndClose();
          });
        } else {
          console.log('Adding discord_id column to account_links table...');
          
          // Add the discord_id column
          db.run(`ALTER TABLE account_links ADD COLUMN discord_id TEXT;`, (err) => {
            if (err) {
              console.error('Error adding discord_id column:', err.message);
              db.run('ROLLBACK;');
              db.close();
              return;
            }
            
            // Set discord_id to match user_id
            db.run(`UPDATE account_links SET discord_id = user_id;`, (err) => {
              if (err) {
                console.error('Error setting discord_id values:', err.message);
                db.run('ROLLBACK;');
                db.close();
                return;
              }
              
              // Create an index on discord_id
              db.run(`CREATE INDEX IF NOT EXISTS idx_account_links_discord_id ON account_links(discord_id);`, (err) => {
                if (err) {
                  console.error('Error creating index on discord_id:', err.message);
                  db.run('ROLLBACK;');
                  db.close();
                  return;
                }
                
                console.log('Successfully added discord_id column and created index');
                commitAndClose();
              });
            });
          });
        }
      });
    });
    
    function commitAndClose() {
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
    }
  });
}); 