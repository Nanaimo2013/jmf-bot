/**
 * Initial database schema migration
 * Version: 1.0.0
 * Created: 2025-03-15
 */

module.exports = {
    /**
     * Apply the migration
     * @param {Object} db - Database connection
     */
    async up(db) {
        // Create users table
        const dbType = db.getConfig ? db.getConfig('type') : 'sqlite';
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                discord_id VARCHAR(20) UNIQUE NOT NULL,
                username VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create settings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                key VARCHAR(255) UNIQUE NOT NULL,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create logs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                level VARCHAR(10) NOT NULL,
                category VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    },

    /**
     * Revert the migration
     * @param {Object} db - Database connection
     */
    async down(db) {
        await db.query('DROP TABLE IF EXISTS logs');
        await db.query('DROP TABLE IF EXISTS settings');
        await db.query('DROP TABLE IF EXISTS users');
    }
}; 