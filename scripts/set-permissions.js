const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Text colors and formatting
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const NC = '\x1b[0m'; // No Color

// Emojis
const CHECK_MARK = '✅';
const CROSS_MARK = '❌';
const WARNING = '⚠️';
const INFO = 'ℹ️';
const GEAR = '⚙️';

// Print functions
const printStatus = (message) => console.log(`${BLUE}${BOLD}${GEAR} [STATUS]${NC} ${message}`);
const printSuccess = (message) => console.log(`${GREEN}${BOLD}${CHECK_MARK} [SUCCESS]${NC} ${message}`);
const printError = (message) => console.log(`${RED}${BOLD}${CROSS_MARK} [ERROR]${NC} ${message}`);
const printWarning = (message) => console.log(`${YELLOW}${BOLD}${WARNING} [WARNING]${NC} ${message}`);
const printInfo = (message) => console.log(`${CYAN}${BOLD}${INFO} [INFO]${NC} ${message}`);

// Get the current directory
const SCRIPT_DIR = __dirname;
const BOT_DIR = path.resolve(SCRIPT_DIR, '..');

printInfo(`Setting permissions for JMF Bot in directory: ${BOT_DIR}`);

// Set permissions for directories
printStatus('Setting directory permissions...');
execSync(`find "${BOT_DIR}" -type d -exec chmod 755 {} \\;`);
printSuccess('Directory permissions set');

// Set permissions for script files
printStatus('Setting script file permissions...');
execSync(`find "${BOT_DIR}" -name "*.sh" -exec chmod 755 {} \\;`);
printSuccess('Script file permissions set');

// Set permissions for regular files
printStatus('Setting regular file permissions...');
execSync(`find "${BOT_DIR}" -type f -not -name "*.sh" -exec chmod 644 {} \\;`);
printSuccess('Regular file permissions set');

// Set permissions for data directory
if (fs.existsSync(path.join(BOT_DIR, 'data'))) {
  printStatus('Setting data directory permissions...');
  execSync(`chmod -R 755 "${path.join(BOT_DIR, 'data')}"`);
  printSuccess('Data directory permissions set');
}

// Set permissions for logs directory
if (fs.existsSync(path.join(BOT_DIR, 'logs'))) {
  printStatus('Setting logs directory permissions...');
  execSync(`chmod -R 755 "${path.join(BOT_DIR, 'logs')}"`);
  printSuccess('Logs directory permissions set');
}

// Set permissions for .env file if it exists
if (fs.existsSync(path.join(BOT_DIR, '.env'))) {
  printStatus('Setting .env file permissions...');
  execSync(`chmod 600 "${path.join(BOT_DIR, '.env')}"`);
  printSuccess('.env file permissions set');
}

printSuccess('All permissions have been set successfully!');
console.log(`\n${GREEN}${BOLD}${CHECK_MARK} JMF Hosting Discord Bot permissions setup complete!${NC}`);