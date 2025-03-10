/**
 * Fix Market Listings Table
 * 
 * This script adds an 'active' column to the market_listings table
 * to fix the "no such column: active" error.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the SQLite database
const dbPath = path.join(__dirname, 'data', 'database.sqlite');

console.log(`Attempting to fix market_listings table in database at: ${dbPath}`);

// Check if the database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  process.exit(1);
}

// Create a backup of the database
const backupPath = `${dbPath}.backup.market.${new Date().toISOString().replace(/[:.]/g, '')}`; 
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
    
    // Check if the active column already exists
    db.get("PRAGMA table_info(market_listings)", (err, rows) => {
      if (err) {
        console.error('Error checking table structure:', err.message);
        db.run('ROLLBACK;');
        db.close();
        return;
      }
      
      // Add the active column if it doesn't exist
      console.log('Adding active column to market_listings table...');
      
      // First, add the active column
      db.run(`ALTER TABLE market_listings ADD COLUMN active INTEGER DEFAULT 1;`, (err) => {
        if (err) {
          console.error('Error adding active column:', err.message);
          db.run('ROLLBACK;');
          db.close();
          return;
        }
        
        // Then, update the active column based on the status column
        db.run(`UPDATE market_listings SET active = CASE WHEN status = 'active' THEN 1 ELSE 0 END;`, (err) => {
          if (err) {
            console.error('Error updating active column:', err.message);
            db.run('ROLLBACK;');
            db.close();
            return;
          }
          
          console.log('Successfully added and updated active column');
          
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