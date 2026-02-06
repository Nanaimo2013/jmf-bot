/**
 * Mining system database schema migration
 * Version: 1.0.0
 * Created: 2025-09-17
 */

module.exports = {
    /**
     * Apply the migration
     * @param {Object} db - Database connection
     */
    async up(db) {
        // Create user_mining_data table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_mining_data (
                user_id VARCHAR(20) PRIMARY KEY,
                level INTEGER DEFAULT 1,
                experience INTEGER DEFAULT 0,
                total_mined INTEGER DEFAULT 0,
                last_mine_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create mining_sessions table
        const dbType = db.getConfig ? db.getConfig('type') : 'sqlite';
        await db.query(`
            CREATE TABLE IF NOT EXISTS mining_sessions (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                user_id VARCHAR(20) NOT NULL,
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP,
                duration INTEGER,
                experience_gained INTEGER DEFAULT 0,
                items_mined INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create mining_items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS mining_items (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                name VARCHAR(100) NOT NULL,
                rarity VARCHAR(20) NOT NULL,
                base_value INTEGER NOT NULL,
                experience_value INTEGER NOT NULL,
                drop_rate DECIMAL(5,4) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_mining_inventory (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                user_id VARCHAR(20) NOT NULL,
                item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES mining_items(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for better performance
        await db.query('CREATE INDEX IF NOT EXISTS idx_user_mining_data_user_id ON user_mining_data(user_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_mining_sessions_user_id ON mining_sessions(user_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_mining_sessions_start_time ON mining_sessions(start_time)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_mining_items_rarity ON mining_items(rarity)');
    },

    /**
     * Revert the migration
     * @param {Object} db - Database connection
     */
    async down(db) {
        await db.query('DROP TABLE IF EXISTS user_mining_inventory');
        await db.query('DROP TABLE IF EXISTS mining_items');
        await db.query('DROP TABLE IF EXISTS mining_sessions');
        await db.query('DROP TABLE IF EXISTS user_mining_data');
    }
};
