/**
 * Fix Account Links Table - Add panel_id column
 * 
 * This script adds a 'panel_id' column to the account_links table
 * to fix the "no such column: panel_id" error.
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
const backupPath = `${dbPath}.backup.panel_id.${new Date().toISOString().replace(/[:.]/g, '')}`; 
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
        console.error('account_links table does not exist, creating it...');
        
        // Create the account_links table with all required columns
        const createAccountLinksTable = `
        CREATE TABLE IF NOT EXISTS account_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE,
          discord_id TEXT,
          pterodactyl_id INTEGER,
          panel_id TEXT,
          pterodactyl_username TEXT,
          token TEXT,
          expires_at TIMESTAMP,
          linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_account_links_user_id ON account_links(user_id);
        CREATE INDEX IF NOT EXISTS idx_account_links_discord_id ON account_links(discord_id);
        CREATE INDEX IF NOT EXISTS idx_account_links_pterodactyl_id ON account_links(pterodactyl_id);
        CREATE INDEX IF NOT EXISTS idx_account_links_panel_id ON account_links(panel_id);
        `;
        
        db.exec(createAccountLinksTable, (err) => {
          if (err) {
            console.error('Error creating account_links table:', err.message);
            db.run('ROLLBACK;');
            db.close();
            return;
          }
          
          console.log('Successfully created account_links table with all required columns');
          commitAndClose();
        });
      } else {
        // Check the structure of the account_links table
        db.all("PRAGMA table_info(account_links)", (err, columns) => {
          if (err) {
            console.error('Error checking table structure:', err.message);
            db.run('ROLLBACK;');
            db.close();
            return;
          }
          
          const columnNames = columns.map(col => col.name);
          console.log('Current columns in account_links table:', columnNames.join(', '));
          
          // Check for missing columns and add them
          const missingColumns = [];
          
          if (!columnNames.includes('panel_id')) {
            missingColumns.push({
              name: 'panel_id',
              type: 'TEXT'
            });
          }
          
          if (!columnNames.includes('discord_id')) {
            missingColumns.push({
              name: 'discord_id',
              type: 'TEXT'
            });
          }
          
          if (!columnNames.includes('pterodactyl_id')) {
            missingColumns.push({
              name: 'pterodactyl_id',
              type: 'INTEGER'
            });
          }
          
          if (!columnNames.includes('pterodactyl_username')) {
            missingColumns.push({
              name: 'pterodactyl_username',
              type: 'TEXT'
            });
          }
          
          if (!columnNames.includes('token')) {
            missingColumns.push({
              name: 'token',
              type: 'TEXT'
            });
          }
          
          if (!columnNames.includes('expires_at')) {
            missingColumns.push({
              name: 'expires_at',
              type: 'TIMESTAMP'
            });
          }
          
          if (missingColumns.length === 0) {
            console.log('All required columns already exist in the account_links table');
            commitAndClose();
            return;
          }
          
          console.log(`Adding ${missingColumns.length} missing columns to account_links table...`);
          
          // Add each missing column
          let columnsAdded = 0;
          
          missingColumns.forEach((column, index) => {
            console.log(`Adding ${column.name} column...`);
            
            db.run(`ALTER TABLE account_links ADD COLUMN ${column.name} ${column.type};`, (err) => {
              if (err) {
                console.error(`Error adding ${column.name} column:`, err.message);
              } else {
                console.log(`Successfully added ${column.name} column`);
                columnsAdded++;
                
                // If this is the last column, update values and create indexes
                if (index === missingColumns.length - 1) {
                  updateValuesAndCreateIndexes(missingColumns);
                }
              }
            });
          });
        });
      }
    });
    
    function updateValuesAndCreateIndexes(missingColumns) {
      // Update values for discord_id if it was added
      if (missingColumns.some(col => col.name === 'discord_id')) {
        db.run(`UPDATE account_links SET discord_id = user_id WHERE discord_id IS NULL;`, (err) => {
          if (err) {
            console.error('Error updating discord_id values:', err.message);
          } else {
            console.log('Successfully updated discord_id values');
          }
          
          // Create index for discord_id
          db.run(`CREATE INDEX IF NOT EXISTS idx_account_links_discord_id ON account_links(discord_id);`, (err) => {
            if (err) {
              console.error('Error creating index on discord_id:', err.message);
            } else {
              console.log('Successfully created index on discord_id');
            }
          });
        });
      }
      
      // Update values for panel_id if it was added
      if (missingColumns.some(col => col.name === 'panel_id')) {
        db.run(`UPDATE account_links SET panel_id = pterodactyl_id WHERE panel_id IS NULL;`, (err) => {
          if (err) {
            console.error('Error updating panel_id values:', err.message);
          } else {
            console.log('Successfully updated panel_id values');
          }
          
          // Create index for panel_id
          db.run(`CREATE INDEX IF NOT EXISTS idx_account_links_panel_id ON account_links(panel_id);`, (err) => {
            if (err) {
              console.error('Error creating index on panel_id:', err.message);
            } else {
              console.log('Successfully created index on panel_id');
            }
            
            // Commit changes after all operations are complete
            commitAndClose();
          });
        });
      } else {
        // If panel_id wasn't added, commit changes now
        commitAndClose();
      }
    }
    
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