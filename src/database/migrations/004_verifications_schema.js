/**
 * JMF Hosting Discord Bot - Verifications Schema Migration
 * Version: 1.0.0
 * Last Updated: 03/17/2025
 * 
 * This migration creates the verifications table for user verification system.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

module.exports = {
    /**
     * Apply the migration
     * @param {Object} db - Database connection
     */
    async up(db) {
        const dbType = db.getConfig ? db.getConfig('type') : 'sqlite';
        
        // Create verifications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS verifications (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                user_id VARCHAR(20) NOT NULL,
                guild_id VARCHAR(20) NOT NULL,
                verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified_by VARCHAR(20),
                method VARCHAR(50) DEFAULT 'manual',
                status VARCHAR(20) DEFAULT 'verified',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create verification_roles table
        await db.query(`
            CREATE TABLE IF NOT EXISTS verification_roles (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                guild_id VARCHAR(20) NOT NULL,
                role_id VARCHAR(20) NOT NULL,
                role_name VARCHAR(100) NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create verification_settings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS verification_settings (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                guild_id VARCHAR(20) NOT NULL UNIQUE,
                enabled BOOLEAN DEFAULT TRUE,
                channel_id VARCHAR(20),
                message_id VARCHAR(20),
                button_text VARCHAR(100) DEFAULT 'Verify',
                button_emoji VARCHAR(50),
                success_message TEXT,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create indexes for better performance
        await db.query('CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_verifications_guild_id ON verifications(guild_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_verification_roles_guild_id ON verification_roles(guild_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_verification_settings_guild_id ON verification_settings(guild_id)');
    },

    /**
     * Revert the migration
     * @param {Object} db - Database connection
     */
    async down(db) {
        await db.query('DROP TABLE IF EXISTS verification_settings');
        await db.query('DROP TABLE IF EXISTS verification_roles');
        await db.query('DROP TABLE IF EXISTS verifications');
    }
};
