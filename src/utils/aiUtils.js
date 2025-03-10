/**
 * JMF Hosting Discord Bot
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const logger = require('./logger');
const config = require('../../config.json');
const fetch = require('node-fetch');
const companyHistory = require('../data/company-history');

// Cache for AI responses to reduce API calls
const responseCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Generate an AI response using the configured AI service
 * @param {string} message - The user's message
 * @param {string} userId - The user's ID
 * @param {string} username - The user's username
 * @param {Array} history - Previous conversation history (optional)
 * @returns {Promise<string>} - The AI response
 */
async function generateAIResponse(message, userId, username, history = []) {
  try {
    // Check if AI chat is enabled in config
    if (!config.aiChat || !config.aiChat.enabled) {
      return "AI chat is not configured or enabled.";
    }

    // Check if the message is in the cache
    const cacheKey = `${userId}:${message}`;
    if (responseCache.has(cacheKey)) {
      const cachedResponse = responseCache.get(cacheKey);
      if (Date.now() - cachedResponse.timestamp < CACHE_TTL) {
        logger.debug(`Using cached AI response for user ${userId}`);
        return cachedResponse.response;
      }
      // Cache expired, remove it
      responseCache.delete(cacheKey);
    }

    // Determine which AI service to use
    const aiService = config.aiChat.service || 'openai';
    
    let response;
    switch (aiService.toLowerCase()) {
      case 'openai':
        response = await generateOpenAIResponse(message, userId, username, history);
        break;
      case 'huggingface':
        response = await generateHuggingFaceResponse(message, userId, username);
        break;
      case 'customapi':
        response = await generateCustomAPIResponse(message, userId, username, history);
        break;
      default:
        response = "Unknown AI service configured. Please check your configuration.";
    }

    // Cache the response
    responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    // Log the interaction to database if connected
    if (global.db && global.db.isConnected) {
      try {
        await global.db.query(
          'INSERT INTO ai_chat_interactions (user_id, guild_id, channel_id, user_message, ai_response, service, tokens_used, response_time, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, message.guild?.id || null, message.channel?.id || null, message, response, aiService, 0, 0, new Date()]
        );
      } catch (error) {
        logger.error(`Failed to log AI chat interaction: ${error.message}`);
      }
    }

    return response;
  } catch (error) {
    logger.error(`Error generating AI response: ${error.message}`);
    return "I'm sorry, I encountered an error while processing your request. Please try again later.";
  }
}

/**
 * Generate a response using OpenAI's API
 * @param {string} message - The user's message
 * @param {string} userId - The user's ID
 * @param {string} username - The user's username
 * @param {Array} history - Previous conversation history
 * @returns {Promise<string>} - The AI response
 */
async function generateOpenAIResponse(message, userId, username, history = []) {
  try {
    const openaiConfig = config.aiChat.openai;
    if (!openaiConfig || !openaiConfig.apiKey) {
      return "OpenAI API key is not configured.";
    }

    // Create system message with company information
    const systemMessage = openaiConfig.systemPrompt || createDefaultSystemPrompt();

    // Prepare the conversation history
    const messages = [
      { role: "system", content: systemMessage }
    ];

    // Add conversation history if available
    if (history && history.length > 0) {
      // Only include the last 10 messages to avoid token limits
      const recentHistory = history.slice(-10);
      recentHistory.forEach(item => {
        messages.push({
          role: item.role,
          content: item.content
        });
      });
    }

    // Add the current message
    messages.push({
      role: "user",
      content: `${username}: ${message}`
    });

    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: openaiConfig.model || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: openaiConfig.maxTokens || 150,
        temperature: openaiConfig.temperature || 0.7,
        top_p: openaiConfig.topP || 1,
        frequency_penalty: openaiConfig.frequencyPenalty || 0,
        presence_penalty: openaiConfig.presencePenalty || 0
      })
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      logger.error(`OpenAI API error: ${JSON.stringify(errorData)}`);
      return "I'm sorry, I encountered an error with the OpenAI service. Please try again later.";
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    logger.info(`Generated OpenAI response for ${username} in ${responseTime}ms`);
    
    return aiResponse;
  } catch (error) {
    logger.error(`Error with OpenAI API: ${error.message}`);
    return "I'm sorry, I encountered an error with the OpenAI service. Please try again later.";
  }
}

/**
 * Generate a response using HuggingFace's API
 * @param {string} message - The user's message
 * @param {string} userId - The user's ID
 * @param {string} username - The user's username
 * @returns {Promise<string>} - The AI response
 */
async function generateHuggingFaceResponse(message, userId, username) {
  try {
    const hfConfig = config.aiChat.huggingface;
    if (!hfConfig || !hfConfig.apiKey) {
      return "HuggingFace API key is not configured.";
    }

    // Create a prompt with company information
    const prompt = `JMF Hosting AI Assistant: I'm a helpful assistant for JMF Hosting, a game server provider. I can answer questions about our services, pricing, and support.\n\n${username}: ${message}\nJMF Hosting AI Assistant:`;

    const startTime = Date.now();
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${hfConfig.model || 'gpt2'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hfConfig.apiKey}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: hfConfig.maxLength || 100,
          temperature: hfConfig.temperature || 0.7,
          top_p: hfConfig.topP || 0.9,
          top_k: hfConfig.topK || 50,
          repetition_penalty: hfConfig.repetitionPenalty || 1.2
        }
      })
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.text();
      logger.error(`HuggingFace API error: ${errorData}`);
      return "I'm sorry, I encountered an error with the HuggingFace service. Please try again later.";
    }

    const data = await response.json();
    
    // Extract the generated text and clean it up
    let generatedText = data[0].generated_text;
    
    // Remove the prompt from the response
    generatedText = generatedText.replace(prompt, '').trim();
    
    // Extract only the assistant's response (stop at the next user message)
    const nextUserMessageIndex = generatedText.indexOf(`${username}:`);
    if (nextUserMessageIndex > 0) {
      generatedText = generatedText.substring(0, nextUserMessageIndex).trim();
    }
    
    logger.info(`Generated HuggingFace response for ${username} in ${responseTime}ms`);
    
    return generatedText || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    logger.error(`Error with HuggingFace API: ${error.message}`);
    return "I'm sorry, I encountered an error with the HuggingFace service. Please try again later.";
  }
}

/**
 * Generate a response using a custom API
 * @param {string} message - The user's message
 * @param {string} userId - The user's ID
 * @param {string} username - The user's username
 * @param {Array} history - Previous conversation history
 * @returns {Promise<string>} - The AI response
 */
async function generateCustomAPIResponse(message, userId, username, history = []) {
  try {
    const customConfig = config.aiChat.customApi;
    if (!customConfig || !customConfig.url) {
      return "Custom API URL is not configured.";
    }

    // Create system message with company information
    const systemMessage = customConfig.systemPrompt || createDefaultSystemPrompt();

    const startTime = Date.now();
    
    const response = await fetch(customConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': customConfig.apiKey ? `Bearer ${customConfig.apiKey}` : undefined
      },
      body: JSON.stringify({
        message: message,
        user: {
          id: userId,
          username: username
        },
        system: systemMessage,
        history: history,
        config: customConfig.parameters || {}
      })
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.text();
      logger.error(`Custom API error: ${errorData}`);
      return "I'm sorry, I encountered an error with the AI service. Please try again later.";
    }

    const data = await response.json();
    const aiResponse = data.response || data.message || data.text || data.content || "No response received from API.";
    
    logger.info(`Generated Custom API response for ${username} in ${responseTime}ms`);
    
    return aiResponse;
  } catch (error) {
    logger.error(`Error with Custom API: ${error.message}`);
    return "I'm sorry, I encountered an error with the AI service. Please try again later.";
  }
}

/**
 * Create a default system prompt with company information
 * @returns {string} - The system prompt
 */
function createDefaultSystemPrompt() {
  const { companyInfo, services, panel, supportInfo } = companyHistory;
  
  return `You are a helpful assistant for ${companyInfo.name}, a game server hosting provider founded in ${companyInfo.foundedYear}. 
Our slogan is "${companyInfo.slogan}".

COMPANY INFORMATION:
- Website: ${companyInfo.website}
- Game Panel: ${companyInfo.panel}
- Discord: ${companyInfo.discord}
- Support Email: ${companyInfo.email}

SERVICES:
We offer game server hosting for popular games including ${services.gameServers.map(s => s.name).join(', ')}.
We also provide dedicated servers and web hosting solutions.

SUPPORT:
For support, users can contact us through Discord, email at ${supportInfo.channels[0].description}, or use our knowledge base.

PANEL:
Our game panel (${panel.name} v${panel.version}) provides features like ${panel.features.slice(0, 5).join(', ')}, and more.

YOUR ROLE:
- Be helpful, friendly, and professional
- Answer questions about our services, pricing, and support
- Provide accurate information based on the company details
- If you don't know something, suggest contacting support
- Never make up information about our services or pricing
- Keep responses concise and relevant
- Use a friendly, helpful tone

When users ask about specific games or services, provide details about features and pricing if available.`;
}

/**
 * Clear the AI response cache
 */
function clearResponseCache() {
  responseCache.clear();
  logger.info('AI response cache cleared');
}

/**
 * Toggle AI chat functionality
 * @param {boolean} enabled - Whether to enable or disable AI chat
 * @returns {string} - Status message
 */
function toggleAIChat(enabled) {
  if (config.aiChat) {
    config.aiChat.enabled = enabled;
    return `AI chat has been ${enabled ? 'enabled' : 'disabled'}.`;
  } else {
    config.aiChat = { enabled: enabled };
    return `AI chat has been ${enabled ? 'enabled' : 'disabled'}, but may need additional configuration.`;
  }
}

module.exports = {
  generateAIResponse,
  clearResponseCache,
  toggleAIChat
}; 