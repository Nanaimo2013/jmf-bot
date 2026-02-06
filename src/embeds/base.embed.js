/**
 * JMF Hosting Discord Bot - Base Embed Class
 * Version: 1.0.0
 * Last Updated: 03/14/2025
 * 
 * This class serves as the foundation for all bot embeds.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const { EmbedBuilder } = require('discord.js');

class Embed extends EmbedBuilder {
    /**
     * Create a new embed
     * @param {Object} options - Embed options
     * @param {string} options.title - The title of the embed
     * @param {string} options.description - The description of the embed
     * @param {string} options.color - The color of the embed
     * @param {string} options.footer - The footer text of the embed
     * @param {string} options.footerIcon - The footer icon URL of the embed
     * @param {string} options.thumbnail - The thumbnail URL of the embed
     * @param {string} options.image - The image URL of the embed
     * @param {string} options.author - The author name of the embed
     * @param {string} options.authorIcon - The author icon URL of the embed
     * @param {string} options.authorUrl - The author URL of the embed
     * @param {string} options.url - The URL of the embed
     * @param {number} options.timestamp - The timestamp of the embed
     */
    constructor(options = {}) {
        super();
        
        // Get bot configuration
        this.config = global.managers?.config?.get('bot') || {};
        
        // Set default color from config
        const defaultColor = this.config.embedColor || '#00AAFF';
        
        // Set embed properties
        if (options.title) this.setTitle(options.title);
        if (options.description) this.setDescription(options.description);
        this.setColor(options.color || defaultColor);
        
        // Set footer
        if (options.footer) {
            this.setFooter({
                text: options.footer,
                iconURL: options.footerIcon || null
            });
        } else if (this.config.embedFooter) {
            this.setFooter({
                text: this.config.embedFooter,
                iconURL: this.config.embedFooterIcon || null
            });
        }
        
        // Set thumbnail
        if (options.thumbnail) this.setThumbnail(options.thumbnail);
        
        // Set image
        if (options.image) this.setImage(options.image);
        
        // Set author
        if (options.author) {
            this.setAuthor({
                name: options.author,
                iconURL: options.authorIcon || null,
                url: options.authorUrl || null
            });
        }
        
        // Set URL
        if (options.url) this.setURL(options.url);
        
        // Set timestamp
        if (options.timestamp) {
            this.setTimestamp(options.timestamp);
        } else if (options.timestamp !== false) {
            this.setTimestamp();
        }
    }
    
    /**
     * Add a field to the embed
     * @param {string} name - The name of the field
     * @param {string} value - The value of the field
     * @param {boolean} inline - Whether the field should be inline
     * @returns {Embed}
     */
    addField(name, value, inline = false) {
        this.addFields({ name, value, inline });
        return this;
    }
    
    /**
     * Add multiple fields to the embed
     * @param {Object[]} fields - The fields to add
     * @returns {Embed}
     */
    addFields(...fields) {
        super.addFields(...fields);
        return this;
    }
    
    /**
     * Set the color of the embed
     * @param {string|number} color - The color to set
     * @returns {Embed}
     */
    setColor(color) {
        super.setColor(color);
        return this;
    }
    
    /**
     * Set the description of the embed
     * @param {string} description - The description to set
     * @returns {Embed}
     */
    setDescription(description) {
        super.setDescription(description);
        return this;
    }
    
    /**
     * Set the title of the embed
     * @param {string} title - The title to set
     * @returns {Embed}
     */
    setTitle(title) {
        super.setTitle(title);
        return this;
    }
    
    /**
     * Set the footer of the embed
     * @param {Object} options - The footer options
     * @param {string} options.text - The footer text
     * @param {string} options.iconURL - The footer icon URL
     * @returns {Embed}
     */
    setFooter(options) {
        super.setFooter(options);
        return this;
    }
    
    /**
     * Set the thumbnail of the embed
     * @param {string} url - The thumbnail URL
     * @returns {Embed}
     */
    setThumbnail(url) {
        super.setThumbnail(url);
        return this;
    }
    
    /**
     * Set the image of the embed
     * @param {string} url - The image URL
     * @returns {Embed}
     */
    setImage(url) {
        super.setImage(url);
        return this;
    }
    
    /**
     * Set the author of the embed
     * @param {Object} options - The author options
     * @param {string} options.name - The author name
     * @param {string} options.iconURL - The author icon URL
     * @param {string} options.url - The author URL
     * @returns {Embed}
     */
    setAuthor(options) {
        super.setAuthor(options);
        return this;
    }
    
    /**
     * Set the URL of the embed
     * @param {string} url - The URL to set
     * @returns {Embed}
     */
    setURL(url) {
        super.setURL(url);
        return this;
    }
    
    /**
     * Set the timestamp of the embed
     * @param {number} timestamp - The timestamp to set
     * @returns {Embed}
     */
    setTimestamp(timestamp) {
        super.setTimestamp(timestamp);
        return this;
    }
    
    /**
     * Create a success embed
     * @param {string} title - The title of the embed
     * @param {string} description - The description of the embed
     * @returns {Embed}
     */
    static success(title, description) {
        return new this({
            title,
            description,
            color: '#00FF00',
            timestamp: true
        });
    }
    
    /**
     * Create an error embed
     * @param {string} title - The title of the embed
     * @param {string} description - The description of the embed
     * @returns {Embed}
     */
    static error(title, description) {
        return new this({
            title,
            description,
            color: '#FF0000',
            timestamp: true
        });
    }
    
    /**
     * Create a warning embed
     * @param {string} title - The title of the embed
     * @param {string} description - The description of the embed
     * @returns {Embed}
     */
    static warning(title, description) {
        return new this({
            title,
            description,
            color: '#FFFF00',
            timestamp: true
        });
    }
    
    /**
     * Create an info embed
     * @param {string} title - The title of the embed
     * @param {string} description - The description of the embed
     * @returns {Embed}
     */
    static info(title, description) {
        return new this({
            title,
            description,
            color: '#00AAFF',
            timestamp: true
        });
    }
}

module.exports = Embed; 