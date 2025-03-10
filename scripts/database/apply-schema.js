const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const schemaPath = path.join(__dirname, 'schema.sqlite.fixed.sql');

console.log(`Applying schema from ${schemaPath} to database at ${dbPath}`);

// Read the schema file
let schema;
try {
  schema = fs.readFileSync(schemaPath, 'utf8');
  console.log(`Schema file read successfully (${schema.length} bytes)`);
} catch (err) {
  console.error(`Error reading schema file: ${err.message}`);
  process.exit(1);
}

// Split the schema into individual statements
const statements = schema
  .split(';')
  .map(statement => statement.trim())
  .filter(statement => statement.length > 0);

console.log(`Found ${statements.length} SQL statements to execute`);

// Open the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error opening database: ${err.message}`);
    process.exit(1);
  }
  console.log('Connected to the SQLite database');
});

// Execute each statement in a transaction
db.serialize(() => {
  db.run('BEGIN TRANSACTION');
  
  let successCount = 0;
  let errorCount = 0;
  
  statements.forEach((statement, index) => {
    db.run(`${statement};`, (err) => {
      if (err) {
        console.error(`Error executing statement #${index + 1}: ${err.message}`);
        console.error(`Statement: ${statement}`);
        errorCount++;
      } else {
        successCount++;
      }
      
      // Check if this is the last statement
      if (index === statements.length - 1) {
        if (errorCount === 0) {
          db.run('COMMIT', (err) => {
            if (err) {
              console.error(`Error committing transaction: ${err.message}`);
              db.run('ROLLBACK');
            } else {
              console.log(`Schema applied successfully! ${successCount} statements executed.`);
            }
            db.close();
          });
        } else {
          console.error(`Schema application failed with ${errorCount} errors. Rolling back changes.`);
          db.run('ROLLBACK', () => {
            db.close();
          });
        }
      }
    });
  });
});

console.log('Schema application in progress...'); 