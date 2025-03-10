/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Using dynamic import for node-fetch v3 (ESM module)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const logger = require('./logger');

/**
 * AI Utilities for the JMF Hosting Discord Bot
 * This is a simplified version to avoid ESM compatibility issues
 */
const aiUtils = {
  /**
   * Check if AI functionality is enabled
   * @returns {boolean} Whether AI is enabled
   */
  isAIEnabled: function() {
    return false; // Disabled for now to avoid issues
  },

  /**
   * Generate an AI response to a prompt
   * @param {string} prompt - The prompt to send to the AI
   * @param {string} userId - The user's ID
   * @param {string} username - The user's username
   * @param {Array} history - Previous conversation history (optional)
   * @returns {Promise<string>} The AI's response
   */
  generateAIResponse: async function(prompt, userId, username, history = []) {
    logger.info(`AI response requested by ${username} (${userId}) but is currently disabled`);
    return "AI functionality is currently disabled. Please try again later.";
  },

  /**
   * Clear the response cache
   */
  clearResponseCache: function() {
    logger.info('AI response cache clear requested');
  },

  /**
   * Toggle AI chat functionality
   * @param {boolean} enabled - Whether to enable or disable AI chat
   * @returns {string} Status message
   */
  toggleAIChat: function(enabled) {
    const status = enabled ? "enabled" : "disabled";
    logger.info(`AI chat ${status}`);
    return `AI chat has been ${status}.`;
  }
};

module.exports = aiUtils; 