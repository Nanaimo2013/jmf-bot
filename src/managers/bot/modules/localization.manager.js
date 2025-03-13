/**
 * JMF Hosting Discord Bot - Localization Manager Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides multi-language support for the bot,
 * including loading language files, formatting messages with variables,
 * and handling fallback languages.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const { Collection } = require('discord.js');

class LocalizationManager extends BaseModule {
    /**
     * Create a new localization manager
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Localization options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'localization-manager',
            version: options.version || '1.0.0',
            description: 'Localization manager for the bot',
            defaultConfig: {
                defaultLanguage: 'en-US',
                fallbackLanguage: 'en-US',
                languagesPath: path.join(process.cwd(), 'locales'),
                autoReload: false,
                cacheTimeout: 3600000, // 1 hour
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Languages storage
        this.languages = new Collection();
        
        // User language preferences
        this.userLanguages = new Map();
        
        // Guild language preferences
        this.guildLanguages = new Map();
        
        // Cache for formatted strings
        this.stringCache = new Map();
        
        // Last cache clear timestamp
        this.lastCacheClear = Date.now();
    }

    /**
     * Initialize the localization manager
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Load languages
        await this.loadLanguages();
        
        // Load user and guild preferences
        await this.loadPreferences();
        
        this.logger.info(this.name, 'Localization manager initialized');
        
        // Set up cache clearing interval
        const cacheTimeout = this.getConfig('cacheTimeout');
        if (cacheTimeout > 0) {
            setInterval(() => this._clearStringCache(), cacheTimeout);
        }
    }

    /**
     * Load languages from files
     * @returns {Promise<void>}
     */
    async loadLanguages() {
        const languagesPath = this.getConfig('languagesPath');
        
        try {
            // Check if languages directory exists
            try {
                await fs.access(languagesPath);
            } catch (error) {
                this.logger.warn(this.name, `Languages directory not found: ${languagesPath}`);
                return;
            }
            
            // Get language files
            const files = await fs.readdir(languagesPath);
            const languageFiles = files.filter(file => file.endsWith('.json'));
            
            if (languageFiles.length === 0) {
                this.logger.warn(this.name, 'No language files found');
                return;
            }
            
            // Clear existing languages
            this.languages.clear();
            
            // Load each language file
            for (const file of languageFiles) {
                try {
                    const filePath = path.join(languagesPath, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const language = JSON.parse(data);
                    
                    // Get language code from filename (e.g., en-US.json -> en-US)
                    const languageCode = path.basename(file, '.json');
                    
                    // Add language to collection
                    this.languages.set(languageCode, language);
                    
                    this.logger.debug(this.name, `Loaded language: ${languageCode}`);
                } catch (error) {
                    this.logger.error(this.name, `Failed to load language file ${file}: ${error.message}`);
                }
            }
            
            this.logger.info(this.name, `Loaded ${this.languages.size} languages`);
            
            // Ensure default language exists
            const defaultLanguage = this.getConfig('defaultLanguage');
            if (!this.languages.has(defaultLanguage)) {
                this.logger.warn(this.name, `Default language '${defaultLanguage}' not found`);
            }
            
            // Ensure fallback language exists
            const fallbackLanguage = this.getConfig('fallbackLanguage');
            if (!this.languages.has(fallbackLanguage)) {
                this.logger.warn(this.name, `Fallback language '${fallbackLanguage}' not found`);
            }
        } catch (error) {
            this.logger.error(this.name, `Failed to load languages: ${error.message}`);
        }
    }

    /**
     * Load user and guild language preferences
     * @returns {Promise<void>}
     */
    async loadPreferences() {
        try {
            const preferencesPath = path.join(this.getConfig('languagesPath'), 'preferences.json');
            
            // Check if preferences file exists
            try {
                await fs.access(preferencesPath);
            } catch (error) {
                this.logger.debug(this.name, 'Language preferences file not found, using defaults');
                return;
            }
            
            // Read preferences file
            const data = await fs.readFile(preferencesPath, 'utf8');
            const preferences = JSON.parse(data);
            
            // Load user preferences
            if (preferences.users) {
                for (const [userId, language] of Object.entries(preferences.users)) {
                    this.userLanguages.set(userId, language);
                }
            }
            
            // Load guild preferences
            if (preferences.guilds) {
                for (const [guildId, language] of Object.entries(preferences.guilds)) {
                    this.guildLanguages.set(guildId, language);
                }
            }
            
            this.logger.info(this.name, 'Loaded language preferences');
        } catch (error) {
            this.logger.error(this.name, `Failed to load language preferences: ${error.message}`);
        }
    }

    /**
     * Save user and guild language preferences
     * @returns {Promise<void>}
     */
    async savePreferences() {
        try {
            const preferencesPath = path.join(this.getConfig('languagesPath'), 'preferences.json');
            
            // Create languages directory if it doesn't exist
            const languagesPath = this.getConfig('languagesPath');
            try {
                await fs.access(languagesPath);
            } catch (error) {
                await fs.mkdir(languagesPath, { recursive: true });
            }
            
            // Create preferences object
            const preferences = {
                users: Object.fromEntries(this.userLanguages),
                guilds: Object.fromEntries(this.guildLanguages)
            };
            
            // Write preferences file
            const data = JSON.stringify(preferences, null, 2);
            await fs.writeFile(preferencesPath, data, 'utf8');
            
            this.logger.info(this.name, 'Saved language preferences');
        } catch (error) {
            this.logger.error(this.name, `Failed to save language preferences: ${error.message}`);
        }
    }

    /**
     * Get a localized string
     * @param {string} key - The string key
     * @param {Object} [variables] - Variables to replace in the string
     * @param {Object} [options] - Options for getting the string
     * @param {string} [options.language] - The language to use
     * @param {string} [options.userId] - The user ID to get language preference from
     * @param {string} [options.guildId] - The guild ID to get language preference from
     * @returns {string} - The localized string
     */
    getString(key, variables = {}, options = {}) {
        // Determine language to use
        const language = this._determineLanguage(options);
        
        // Check cache
        const cacheKey = `${language}:${key}:${JSON.stringify(variables)}`;
        if (this.stringCache.has(cacheKey)) {
            return this.stringCache.get(cacheKey);
        }
        
        // Get string from language
        let string = this._getStringFromLanguage(language, key);
        
        // If string not found in specified language, try fallback
        if (!string && language !== this.getConfig('fallbackLanguage')) {
            string = this._getStringFromLanguage(this.getConfig('fallbackLanguage'), key);
        }
        
        // If still not found, return the key
        if (!string) {
            return key;
        }
        
        // Replace variables
        const formattedString = this._formatString(string, variables);
        
        // Cache the result
        this.stringCache.set(cacheKey, formattedString);
        
        return formattedString;
    }

    /**
     * Get a localized string from a specific language
     * @param {string} language - The language code
     * @param {string} key - The string key
     * @returns {string|null} - The string or null if not found
     * @private
     */
    _getStringFromLanguage(language, key) {
        // Get language data
        const languageData = this.languages.get(language);
        if (!languageData) {
            return null;
        }
        
        // Split key by dots to navigate nested objects
        const keyParts = key.split('.');
        let current = languageData;
        
        // Navigate through the object
        for (const part of keyParts) {
            if (current[part] === undefined) {
                return null;
            }
            current = current[part];
        }
        
        // Return the string if it's a string, otherwise null
        return typeof current === 'string' ? current : null;
    }

    /**
     * Format a string with variables
     * @param {string} string - The string to format
     * @param {Object} variables - The variables to replace
     * @returns {string} - The formatted string
     * @private
     */
    _formatString(string, variables) {
        return string.replace(/\{([^}]+)\}/g, (match, key) => {
            // Check if the variable exists
            if (variables[key] !== undefined) {
                return variables[key];
            }
            
            // Return the original placeholder if variable not found
            return match;
        });
    }

    /**
     * Determine which language to use based on options
     * @param {Object} options - Options for determining language
     * @param {string} [options.language] - The language to use
     * @param {string} [options.userId] - The user ID to get language preference from
     * @param {string} [options.guildId] - The guild ID to get language preference from
     * @returns {string} - The language code to use
     * @private
     */
    _determineLanguage(options) {
        // If language is explicitly specified, use it
        if (options.language && this.languages.has(options.language)) {
            return options.language;
        }
        
        // If user ID is specified, check user preference
        if (options.userId && this.userLanguages.has(options.userId)) {
            const userLanguage = this.userLanguages.get(options.userId);
            if (this.languages.has(userLanguage)) {
                return userLanguage;
            }
        }
        
        // If guild ID is specified, check guild preference
        if (options.guildId && this.guildLanguages.has(options.guildId)) {
            const guildLanguage = this.guildLanguages.get(options.guildId);
            if (this.languages.has(guildLanguage)) {
                return guildLanguage;
            }
        }
        
        // Fall back to default language
        return this.getConfig('defaultLanguage');
    }

    /**
     * Set a user's language preference
     * @param {string} userId - The user ID
     * @param {string} language - The language code
     * @returns {boolean} - Whether the language was set successfully
     */
    setUserLanguage(userId, language) {
        // Check if language exists
        if (!this.languages.has(language)) {
            return false;
        }
        
        // Set user language
        this.userLanguages.set(userId, language);
        
        // Save preferences
        this.savePreferences().catch(() => {});
        
        return true;
    }

    /**
     * Set a guild's language preference
     * @param {string} guildId - The guild ID
     * @param {string} language - The language code
     * @returns {boolean} - Whether the language was set successfully
     */
    setGuildLanguage(guildId, language) {
        // Check if language exists
        if (!this.languages.has(language)) {
            return false;
        }
        
        // Set guild language
        this.guildLanguages.set(guildId, language);
        
        // Save preferences
        this.savePreferences().catch(() => {});
        
        return true;
    }

    /**
     * Get available languages
     * @returns {Array<Object>} - Array of language objects with code and name
     */
    getAvailableLanguages() {
        return Array.from(this.languages.keys()).map(code => {
            const languageData = this.languages.get(code);
            const name = languageData.meta?.name || code;
            return { code, name };
        });
    }

    /**
     * Reload languages
     * @returns {Promise<void>}
     */
    async reloadLanguages() {
        this.logger.info(this.name, 'Reloading languages');
        await this.loadLanguages();
    }

    /**
     * Clear string cache
     * @private
     */
    _clearStringCache() {
        this.stringCache.clear();
        this.lastCacheClear = Date.now();
        this.logger.debug(this.name, 'Cleared string cache');
    }

    /**
     * Create a default language file
     * @param {string} language - The language code
     * @param {Object} [baseData] - Base data to include in the language file
     * @returns {Promise<boolean>} - Whether the file was created successfully
     */
    async createLanguageFile(language, baseData = {}) {
        try {
            const languagesPath = this.getConfig('languagesPath');
            const filePath = path.join(languagesPath, `${language}.json`);
            
            // Check if file already exists
            try {
                await fs.access(filePath);
                this.logger.warn(this.name, `Language file already exists: ${language}`);
                return false;
            } catch (error) {
                // File doesn't exist, continue
            }
            
            // Create languages directory if it doesn't exist
            try {
                await fs.access(languagesPath);
            } catch (error) {
                await fs.mkdir(languagesPath, { recursive: true });
            }
            
            // Create default language data
            const languageData = {
                meta: {
                    name: language,
                    nativeName: language,
                    author: 'System',
                    version: '1.0.0'
                },
                ...baseData
            };
            
            // Write language file
            const data = JSON.stringify(languageData, null, 2);
            await fs.writeFile(filePath, data, 'utf8');
            
            this.logger.info(this.name, `Created language file: ${language}`);
            
            // Reload languages
            if (this.getConfig('autoReload')) {
                await this.reloadLanguages();
            }
            
            return true;
        } catch (error) {
            this.logger.error(this.name, `Failed to create language file: ${error.message}`);
            return false;
        }
    }
}

module.exports = LocalizationManager; 