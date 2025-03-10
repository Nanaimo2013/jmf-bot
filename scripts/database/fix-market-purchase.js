/**
 * Fix Market Purchase Functionality
 * 
 * This script checks and fixes issues with the market purchase functionality
 * to resolve the "Failed to purchase item: undefined" error.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the SQLite database
const dbPath = path.join(__dirname, 'data', 'database.sqlite');

console.log(`Attempting to fix market purchase functionality in database at: ${dbPath}`);

// Check if the database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at: ${dbPath}`);
  process.exit(1);
}

// Create a backup of the database
const backupPath = `${dbPath}.backup.market_purchase.${new Date().toISOString().replace(/[:.]/g, '')}`; 
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
    
    // Check if the market_listings table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='market_listings'", (err, table) => {
      if (err) {
        console.error('Error checking if table exists:', err.message);
        db.run('ROLLBACK;');
        db.close();
        return;
      }
      
      if (!table) {
        console.log('market_listings table does not exist, creating it...');
        
        // Create the market_listings table
        const createMarketListingsTable = `
        CREATE TABLE IF NOT EXISTS market_listings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          seller_id TEXT,
          item_name TEXT,
          item_description TEXT,
          price INTEGER,
          quantity INTEGER DEFAULT 1,
          status TEXT DEFAULT 'active',
          active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON market_listings(seller_id);
        CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status);
        CREATE INDEX IF NOT EXISTS idx_market_listings_active ON market_listings(active);
        `;
        
        db.exec(createMarketListingsTable, (err) => {
          if (err) {
            console.error('Error creating market_listings table:', err.message);
            db.run('ROLLBACK;');
            db.close();
            return;
          }
          
          console.log('Successfully created market_listings table');
          checkMarketTransactions();
        });
      } else {
        // Check if the active column exists
        db.all("PRAGMA table_info(market_listings)", (err, columns) => {
          if (err) {
            console.error('Error checking table structure:', err.message);
            db.run('ROLLBACK;');
            db.close();
            return;
          }
          
          const hasActive = columns.some(col => col.name === 'active');
          
          if (!hasActive) {
            console.log('Adding active column to market_listings table...');
            
            // Add the active column
            db.run(`ALTER TABLE market_listings ADD COLUMN active INTEGER DEFAULT 1;`, (err) => {
              if (err) {
                console.error('Error adding active column:', err.message);
                db.run('ROLLBACK;');
                db.close();
                return;
              }
              
              // Set active based on status
              db.run(`UPDATE market_listings SET active = CASE WHEN status = 'active' THEN 1 ELSE 0 END;`, (err) => {
                if (err) {
                  console.error('Error setting active values:', err.message);
                  db.run('ROLLBACK;');
                  db.close();
                  return;
                }
                
                // Create an index on active
                db.run(`CREATE INDEX IF NOT EXISTS idx_market_listings_active ON market_listings(active);`, (err) => {
                  if (err) {
                    console.error('Error creating index on active:', err.message);
                    db.run('ROLLBACK;');
                    db.close();
                    return;
                  }
                  
                  console.log('Successfully added active column and created index');
                  checkMarketTransactions();
                });
              });
            });
          } else {
            console.log('active column already exists in market_listings table');
            checkMarketTransactions();
          }
        });
      }
    });
    
    function checkMarketTransactions() {
      // Check if the market_transactions table exists
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='market_transactions'", (err, table) => {
        if (err) {
          console.error('Error checking if table exists:', err.message);
          db.run('ROLLBACK;');
          db.close();
          return;
        }
        
        if (!table) {
          console.log('market_transactions table does not exist, creating it...');
          
          // Create the market_transactions table
          const createMarketTransactionsTable = `
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
          
          CREATE INDEX IF NOT EXISTS idx_market_transactions_buyer_id ON market_transactions(buyer_id);
          CREATE INDEX IF NOT EXISTS idx_market_transactions_seller_id ON market_transactions(seller_id);
          CREATE INDEX IF NOT EXISTS idx_market_transactions_listing_id ON market_transactions(listing_id);
          `;
          
          db.exec(createMarketTransactionsTable, (err) => {
            if (err) {
              console.error('Error creating market_transactions table:', err.message);
              db.run('ROLLBACK;');
              db.close();
              return;
            }
            
            console.log('Successfully created market_transactions table');
            checkUserBalances();
          });
        } else {
          console.log('market_transactions table already exists');
          checkUserBalances();
        }
      });
    }
    
    function checkUserBalances() {
      // Check if the user_balances table exists
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='user_balances'", (err, table) => {
        if (err) {
          console.error('Error checking if table exists:', err.message);
          db.run('ROLLBACK;');
          db.close();
          return;
        }
        
        if (!table) {
          console.log('user_balances table does not exist, creating it...');
          
          // Create the user_balances table
          const createUserBalancesTable = `
          CREATE TABLE IF NOT EXISTS user_balances (
            user_id TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);
          `;
          
          db.exec(createUserBalancesTable, (err) => {
            if (err) {
              console.error('Error creating user_balances table:', err.message);
              db.run('ROLLBACK;');
              db.close();
              return;
            }
            
            console.log('Successfully created user_balances table');
            commitAndClose();
          });
        } else {
          console.log('user_balances table already exists');
          commitAndClose();
        }
      });
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