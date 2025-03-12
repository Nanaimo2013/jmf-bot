/**
 * JMF Hosting Discord Bot - Interaction Handler Utility
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This utility provides safe methods for handling Discord interactions.
 */

const logger = require('./logger');

/**
 * Safely reply to an interaction
 * @param {Interaction} interaction - The Discord interaction
 * @param {Object} options - Reply options
 * @param {boolean} ephemeral - Whether the reply should be ephemeral
 * @returns {Promise<Message|void>} The reply message or void if failed
 */
async function safeReply(interaction, options, ephemeral = false) {
  try {
    if (!interaction) {
      logger.error('Interaction is null or undefined');
      return;
    }

    // If options is a string, convert it to an object
    if (typeof options === 'string') {
      options = { content: options };
    }

    // Set ephemeral flag if specified
    if (ephemeral) {
      options.ephemeral = true;
    }

    // Check if interaction can be replied to
    if (interaction.replied) {
      // Already replied, use followUp
      return await interaction.followUp(options).catch(error => {
        logger.error(`Error following up to interaction: ${error.message}`);
      });
    } else if (interaction.deferred) {
      // Deferred, use editReply
      return await interaction.editReply(options).catch(error => {
        logger.error(`Error editing reply to interaction: ${error.message}`);
      });
    } else {
      // Not replied or deferred, use reply
      return await interaction.reply(options).catch(error => {
        logger.error(`Error replying to interaction: ${error.message}`);
      });
    }
  } catch (error) {
    logger.error(`Error in safeReply: ${error.message}`);
  }
}

/**
 * Safely defer an interaction reply
 * @param {Interaction} interaction - The Discord interaction
 * @param {boolean} ephemeral - Whether the deferred reply should be ephemeral
 * @returns {Promise<void>}
 */
async function safeDeferReply(interaction, ephemeral = false) {
  try {
    if (!interaction) {
      logger.error('Interaction is null or undefined');
      return;
    }

    // Check if interaction can be deferred
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply({ ephemeral }).catch(error => {
        logger.error(`Error deferring interaction: ${error.message}`);
      });
    }
  } catch (error) {
    logger.error(`Error in safeDeferReply: ${error.message}`);
  }
}

/**
 * Check if an interaction is still valid (not replied or deferred)
 * @param {Interaction} interaction - The Discord interaction
 * @returns {boolean} Whether the interaction is valid
 */
function isValidInteraction(interaction) {
  return interaction && !interaction.replied && !interaction.deferred;
}

module.exports = {
  safeReply,
  safeDeferReply,
  isValidInteraction
}; 