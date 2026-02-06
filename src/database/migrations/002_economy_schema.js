/**
 * Economy system database schema migration
 * Version: 1.0.0
 * Created: 2025-09-17
 */

module.exports = {
    /**
     * Apply the migration
     * @param {Object} db - Database connection
     */
    async up(db) {
        // Create user_balances table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_balances (
                user_id VARCHAR(20) PRIMARY KEY,
                balance DECIMAL(15,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create market_listings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS market_listings (
                id VARCHAR(36) PRIMARY KEY,
                seller_id VARCHAR(20) NOT NULL,
                item_type VARCHAR(50) NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                price DECIMAL(15,2) NOT NULL,
                active BOOLEAN DEFAULT 1,
                listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create economy_transactions table for transaction history
        const dbType = db.getConfig ? db.getConfig('type') : 'sqlite';
        await db.query(`
            CREATE TABLE IF NOT EXISTS economy_transactions (
                id INTEGER PRIMARY KEY ${dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                user_id VARCHAR(20) NOT NULL,
                transaction_type VARCHAR(20) NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes for better performance
        await db.query('CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON market_listings(seller_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_market_listings_item_type ON market_listings(item_type)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_market_listings_active ON market_listings(active)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_economy_transactions_user_id ON economy_transactions(user_id)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_economy_transactions_type ON economy_transactions(transaction_type)');
    },

    /**
     * Revert the migration
     * @param {Object} db - Database connection
     */
    async down(db) {
        await db.query('DROP TABLE IF EXISTS economy_transactions');
        await db.query('DROP TABLE IF EXISTS market_listings');
        await db.query('DROP TABLE IF EXISTS user_balances');
    }
};
