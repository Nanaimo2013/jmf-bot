/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Format a duration in milliseconds to a human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration string
 */
function formatDuration(ms) {
  if (ms < 1000) return 'less than a second';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  }
  
  const remainingMinutes = minutes % 60;
  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`);
  }
  
  const remainingSeconds = seconds % 60;
  if (remainingSeconds > 0 && hours === 0) { // Only show seconds if less than an hour
    parts.push(`${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`);
  }

  return parts.join(' and ');
}

module.exports = {
  formatDuration
}; 