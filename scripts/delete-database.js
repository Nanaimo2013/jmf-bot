/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Get database path from environment variables or use default
const dbPath = process.env.DB_PATH || './data/database.sqlite';
const backupPattern = `${dbPath}.backup.*`;

console.log(`Attempting to delete database at: ${dbPath}`);

// Check if database file exists
if (fs.existsSync(dbPath)) {
  try {
    // Force delete the file
    fs.unlinkSync(dbPath);
    console.log(`✅ Successfully deleted database file: ${dbPath}`);
  } catch (error) {
    console.error(`❌ Error deleting database file: ${error.message}`);
    console.error('The file might be in use by another process or you may not have sufficient permissions.');
    process.exit(1);
  }
} else {
  console.log(`⚠️ Database file does not exist at: ${dbPath}`);
}

// Also clean up any backup files if requested
if (process.argv.includes('--clean-backups')) {
  console.log('Cleaning up backup files...');
  
  // Get the directory of the database file
  const dbDir = path.dirname(dbPath);
  
  // Read all files in the directory
  const files = fs.readdirSync(dbDir);
  
  // Filter backup files
  const backupFiles = files.filter(file => 
    file.startsWith(path.basename(dbPath) + '.backup.')
  );
  
  if (backupFiles.length > 0) {
    backupFiles.forEach(file => {
      const fullPath = path.join(dbDir, file);
      try {
        fs.unlinkSync(fullPath);
        console.log(`✅ Deleted backup file: ${file}`);
      } catch (error) {
        console.error(`❌ Error deleting backup file ${file}: ${error.message}`);
      }
    });
    console.log(`Cleaned up ${backupFiles.length} backup files.`);
  } else {
    console.log('No backup files found.');
  }
}

console.log('Database cleanup complete. You can now run "npm run dev" to start with a fresh database.'); 