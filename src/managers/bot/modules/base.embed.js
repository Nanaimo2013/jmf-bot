/**
 * JMF Hosting Discord Bot - Base Embed Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides a base class for creating and managing Discord embeds.
 * It includes methods for creating, styling, and sending embeds with consistent branding.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, SelectMenuBuilder, ButtonStyle, Colors } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;

class BaseEmbed extends BaseModule {
    /**
     * Create a new embed module
     * @param {BotManager} manager - The bot manager instance
     * @param {Object} [options] - Embed options
     */
    constructor(manager, options = {}) {
        super(manager, {
            name: options.name || 'base-embed',
            version: options.version || '1.0.0',
            description: options.description || 'Base embed module',
            defaultConfig: {
                colors: {
                    primary: Colors.Blue,
                    success: Colors.Green,
                    warning: Colors.Yellow,
                    error: Colors.Red,
                    info: Colors.Blurple
                },
                branding: {
                    showFooter: true,
                    footerText: 'JMF Hosting Bot',
                    footerIcon: null,
                    showTimestamp: true
                },
                templates: {
                    directory: path.join(process.cwd(), 'src', 'embeds', 'templates')
                },
                ...options.defaultConfig
            },
            requiredPermissions: options.requiredPermissions || []
        });

        // Embed properties
        this.type = 'embed';
        this.embedCache = new Map();
        
        // Default embed options
        this.defaultOptions = {
            color: this.getConfig('colors.primary'),
            ...options.defaultOptions
        };

        // Embed templates
        this.templates = new Map();
        
        // Discord.js client
        this.client = manager.client;
    }

    /**
     * Initialize the embed module
     * @returns {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        
        // Load embed templates
        await this._loadTemplates();
        
        this.logger.debug(this.name, `Embed module initialized: ${this.name}`);
    }

    /**
     * Load embed templates from the templates directory
     * @returns {Promise<void>}
     * @private
     */
    async _loadTemplates() {
        const templatesDir = this.getConfig('templates.directory');
        
        try {
            // Check if directory exists
            try {
                await fs.access(templatesDir);
            } catch (error) {
                // Create directory if it doesn't exist
                await fs.mkdir(templatesDir, { recursive: true });
                this.logger.debug(this.name, `Created templates directory: ${templatesDir}`);
                return;
            }
            
            // Read template files
            const files = await fs.readdir(templatesDir);
            const templateFiles = files.filter(file => file.endsWith('.js') || file.endsWith('.json'));
            
            for (const file of templateFiles) {
                const filePath = path.join(templatesDir, file);
                
                try {
                    // Clear require cache to ensure fresh load
                    delete require.cache[require.resolve(filePath)];
                    
                    // Load template
                    const template = require(filePath);
                    const templateName = path.basename(file, path.extname(file));
                    
                    this.templates.set(templateName, template);
                    this.logger.debug(this.name, `Loaded embed template: ${templateName}`);
                } catch (error) {
                    this.logger.error(this.name, `Failed to load embed template at ${filePath}: ${error.message}`);
                }
            }
            
            this.logger.info(this.name, `Loaded ${this.templates.size} embed templates`);
        } catch (error) {
            this.logger.error(this.name, `Failed to load embed templates: ${error.message}`);
        }
    }

    /**
     * Create a new embed
     * @param {Object} [options] - Embed options
     * @returns {EmbedBuilder} - The created embed
     */
    create(options = {}) {
        const embed = new EmbedBuilder()
            .setColor(options.color || this.defaultOptions.color);
            
        // Set title if provided
        if (options.title) {
            embed.setTitle(options.title);
        }
        
        // Set description if provided
        if (options.description) {
            embed.setDescription(options.description);
        }
        
        // Set URL if provided
        if (options.url) {
            embed.setURL(options.url);
        }
        
        // Set author if provided
        if (options.author) {
            embed.setAuthor({
                name: options.author.name,
                iconURL: options.author.icon,
                url: options.author.url
            });
        }
        
        // Set thumbnail if provided
        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }
        
        // Set image if provided
        if (options.image) {
            embed.setImage(options.image);
        }
        
        // Add fields if provided
        if (options.fields && Array.isArray(options.fields)) {
            for (const field of options.fields) {
                if (field.name && field.value) {
                    embed.addFields({
                        name: field.name,
                        value: field.value,
                        inline: field.inline !== undefined ? field.inline : false
                    });
                }
            }
        }
        
        // Add branding
        if (this.getConfig('branding.showFooter')) {
            embed.setFooter({
                text: options.footer?.text || this.getConfig('branding.footerText'),
                iconURL: options.footer?.icon || this.getConfig('branding.footerIcon')
            });
        }
        
        // Add timestamp
        if (options.timestamp || (options.timestamp !== false && this.getConfig('branding.showTimestamp'))) {
            embed.setTimestamp(options.timestamp instanceof Date ? options.timestamp : null);
        }
        
        // Cache embed if ID provided
        if (options.id) {
            this.embedCache.set(options.id, embed);
        }
        
        return embed;
    }

    /**
     * Create a success embed
     * @param {string} title - The embed title
     * @param {string} description - The embed description
     * @param {Object} [options] - Additional embed options
     * @returns {EmbedBuilder} - The created embed
     */
    success(title, description, options = {}) {
        return this.create({
            title,
            description,
            color: this.getConfig('colors.success'),
            ...options
        });
    }

    /**
     * Create an error embed
     * @param {string} title - The embed title
     * @param {string} description - The embed description
     * @param {Object} [options] - Additional embed options
     * @returns {EmbedBuilder} - The created embed
     */
    error(title, description, options = {}) {
        return this.create({
            title,
            description,
            color: this.getConfig('colors.error'),
            ...options
        });
    }

    /**
     * Create a warning embed
     * @param {string} title - The embed title
     * @param {string} description - The embed description
     * @param {Object} [options] - Additional embed options
     * @returns {EmbedBuilder} - The created embed
     */
    warning(title, description, options = {}) {
        return this.create({
            title,
            description,
            color: this.getConfig('colors.warning'),
            ...options
        });
    }

    /**
     * Create an info embed
     * @param {string} title - The embed title
     * @param {string} description - The embed description
     * @param {Object} [options] - Additional embed options
     * @returns {EmbedBuilder} - The created embed
     */
    info(title, description, options = {}) {
        return this.create({
            title,
            description,
            color: this.getConfig('colors.info'),
            ...options
        });
    }

    /**
     * Create a paginated embed
     * @param {Object} options - Pagination options
     * @param {string} options.title - The embed title
     * @param {Array} options.items - The items to paginate
     * @param {Function} options.formatter - Function to format each item
     * @param {number} [options.itemsPerPage=10] - Number of items per page
     * @param {Object} [options.embedOptions={}] - Additional embed options
     * @returns {Object} - The paginated embed with navigation methods
     */
    paginate(options) {
        const { title, items, formatter, itemsPerPage = 10, embedOptions = {} } = options;
        
        // Calculate total pages
        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        // Create pagination state
        const pagination = {
            currentPage: 1,
            totalPages,
            itemsPerPage,
            items,
            embeds: [],
            currentEmbed: null,
            
            // Generate embed for current page
            generateEmbed: () => {
                const startIndex = (pagination.currentPage - 1) * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
                const pageItems = items.slice(startIndex, endIndex);
                
                // Format items
                const formattedItems = pageItems.map((item, index) => 
                    formatter(item, startIndex + index + 1)
                );
                
                // Create embed
                const description = formattedItems.join('\n\n');
                const pageIndicator = `Page ${pagination.currentPage}/${totalPages}`;
                
                const embed = this.create({
                    title: `${title} - ${pageIndicator}`,
                    description,
                    ...embedOptions
                });
                
                pagination.currentEmbed = embed;
                return embed;
            },
            
            // Navigation methods
            nextPage: () => {
                if (pagination.currentPage < totalPages) {
                    pagination.currentPage++;
                    return pagination.generateEmbed();
                }
                return pagination.currentEmbed;
            },
            
            previousPage: () => {
                if (pagination.currentPage > 1) {
                    pagination.currentPage--;
                    return pagination.generateEmbed();
                }
                return pagination.currentEmbed;
            },
            
            firstPage: () => {
                pagination.currentPage = 1;
                return pagination.generateEmbed();
            },
            
            lastPage: () => {
                pagination.currentPage = totalPages;
                return pagination.generateEmbed();
            },
            
            goToPage: (page) => {
                if (page >= 1 && page <= totalPages) {
                    pagination.currentPage = page;
                    return pagination.generateEmbed();
                }
                return pagination.currentEmbed;
            }
        };
        
        // Generate first page
        pagination.generateEmbed();
        
        return pagination;
    }

    /**
     * Create navigation buttons for paginated embeds
     * @param {string} [customId='pagination'] - Base custom ID for buttons
     * @returns {ActionRowBuilder} - Action row with navigation buttons
     */
    createPaginationButtons(customId = 'pagination') {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`${customId}_first`)
                    .setLabel('<<')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`${customId}_prev`)
                    .setLabel('<')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`${customId}_next`)
                    .setLabel('>')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`${customId}_last`)
                    .setLabel('>>')
                    .setStyle(ButtonStyle.Secondary)
            );
    }

    /**
     * Create a confirmation embed with buttons
     * @param {string} title - The embed title
     * @param {string} description - The embed description
     * @param {Object} [options] - Additional options
     * @returns {Object} - The confirmation embed and components
     */
    confirmation(title, description, options = {}) {
        const embed = this.create({
            title,
            description,
            color: options.color || this.getConfig('colors.warning'),
            ...options.embedOptions
        });
        
        const confirmId = options.confirmId || 'confirm_yes';
        const cancelId = options.cancelId || 'confirm_no';
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(confirmId)
                    .setLabel(options.confirmText || 'Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(cancelId)
                    .setLabel(options.cancelText || 'Cancel')
                    .setStyle(ButtonStyle.Danger)
            );
            
        return {
            embed,
            components: [row],
            confirmId,
            cancelId
        };
    }

    /**
     * Create a select menu
     * @param {Object} options - Select menu options
     * @returns {ActionRowBuilder} - Action row with select menu
     */
    createSelectMenu(options) {
        const { customId, placeholder, minValues, maxValues, options: choices } = options;
        
        const selectMenu = new SelectMenuBuilder()
            .setCustomId(customId || 'select_menu')
            .setPlaceholder(placeholder || 'Make a selection');
            
        if (minValues !== undefined) {
            selectMenu.setMinValues(minValues);
        }
        
        if (maxValues !== undefined) {
            selectMenu.setMaxValues(maxValues);
        }
        
        if (choices && Array.isArray(choices)) {
            selectMenu.addOptions(choices);
        }
        
        return new ActionRowBuilder().addComponents(selectMenu);
    }

    /**
     * Get an embed from cache
     * @param {string} id - The embed ID
     * @returns {EmbedBuilder|null} - The cached embed or null if not found
     */
    getCached(id) {
        return this.embedCache.get(id) || null;
    }

    /**
     * Clear the embed cache
     * @param {string} [id] - Specific embed ID to clear, or all if not provided
     */
    clearCache(id) {
        if (id) {
            this.embedCache.delete(id);
        } else {
            this.embedCache.clear();
        }
    }

    /**
     * Create an embed from a template
     * @param {string} templateName - The template name
     * @param {Object} [data] - Data to populate the template with
     * @returns {EmbedBuilder} - The created embed
     */
    fromTemplate(templateName, data = {}) {
        const template = this.templates.get(templateName);
        
        if (!template) {
            throw new Error(`Template "${templateName}" not found`);
        }
        
        // If template is a function, call it with data
        if (typeof template === 'function') {
            const templateOptions = template(data);
            return this.create(templateOptions);
        }
        
        // If template is an object, use it directly
        return this.create({
            ...template,
            ...this._processTemplateData(template, data)
        });
    }

    /**
     * Process template data by replacing placeholders
     * @param {Object} template - The template object
     * @param {Object} data - The data to replace placeholders with
     * @returns {Object} - The processed template
     * @private
     */
    _processTemplateData(template, data) {
        const processed = {};
        
        // Process title
        if (template.title) {
            processed.title = this._replacePlaceholders(template.title, data);
        }
        
        // Process description
        if (template.description) {
            processed.description = this._replacePlaceholders(template.description, data);
        }
        
        // Process fields
        if (template.fields && Array.isArray(template.fields)) {
            processed.fields = template.fields.map(field => ({
                name: this._replacePlaceholders(field.name, data),
                value: this._replacePlaceholders(field.value, data),
                inline: field.inline
            }));
        }
        
        return processed;
    }

    /**
     * Replace placeholders in a string with data values
     * @param {string} text - The text to replace placeholders in
     * @param {Object} data - The data to replace placeholders with
     * @returns {string} - The text with placeholders replaced
     * @private
     */
    _replacePlaceholders(text, data) {
        return text.replace(/\{([^}]+)\}/g, (match, key) => {
            const value = key.split('.').reduce((obj, prop) => obj && obj[prop], data);
            return value !== undefined ? value : match;
        });
    }
}

module.exports = BaseEmbed; 