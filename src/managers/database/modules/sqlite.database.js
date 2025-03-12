const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../utils/logger');

class SQLiteDatabase {
    constructor(manager) {
        this.manager = manager;
        this.name = 'sqlite';
        this.config = null;
        this.migrationPath = path.join(__dirname, '../migrations/sqlite');
    }

    async initialize(config) {
        this.config = config;

        // Ensure database directory exists
        const dbDir = path.dirname(config.sqlite.path);
        await fs.mkdir(dbDir, { recursive: true });

        // Ensure migrations directory exists
        await fs.mkdir(this.migrationPath, { recursive: true });
    }

    async connect(options = {}) {
        const dbPath = options.path || this.config.sqlite.path;
        
        try {
            const db = await open({
                filename: dbPath,
                driver: sqlite3.Database
            });

            // Enable foreign keys
            await db.run('PRAGMA foreign_keys = ON');

            logger.info(`Connected to SQLite database at ${dbPath}`);
            return db;
        } catch (error) {
            logger.error('Failed to connect to SQLite database:', error);
            throw error;
        }
    }

    async disconnect(connection) {
        try {
            await connection.close();
            logger.info('Disconnected from SQLite database');
        } catch (error) {
            logger.error('Error disconnecting from SQLite database:', error);
            throw error;
        }
    }

    async query(connection, query, params = []) {
        try {
            if (query.trim().toLowerCase().startsWith('select')) {
                return await connection.all(query, params);
            } else {
                return await connection.run(query, params);
            }
        } catch (error) {
            logger.error('Error executing SQLite query:', error);
            throw error;
        }
    }

    async migrate(options = {}) {
        const connection = await this.connect(options);

        try {
            // Create migrations table if it doesn't exist
            await connection.run(`
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Get list of migration files
            const files = await fs.readdir(this.migrationPath);
            const migrations = files
                .filter(f => f.endsWith('.sql'))
                .sort();

            // Get applied migrations
            const applied = await connection.all('SELECT name FROM migrations');
            const appliedNames = new Set(applied.map(m => m.name));

            // Apply new migrations
            for (const migration of migrations) {
                if (!appliedNames.has(migration)) {
                    const sql = await fs.readFile(
                        path.join(this.migrationPath, migration),
                        'utf8'
                    );

                    await connection.exec('BEGIN TRANSACTION');
                    try {
                        await connection.exec(sql);
                        await connection.run(
                            'INSERT INTO migrations (name) VALUES (?)',
                            [migration]
                        );
                        await connection.exec('COMMIT');
                        logger.info(`Applied migration: ${migration}`);
                    } catch (error) {
                        await connection.exec('ROLLBACK');
                        throw error;
                    }
                }
            }
        } finally {
            await this.disconnect(connection);
        }
    }

    async backup(options = {}) {
        const connection = await this.connect(options);
        const backupDir = options.backupDir || path.join(process.cwd(), 'backups');
        
        try {
            await fs.mkdir(backupDir, { recursive: true });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `sqlite-backup-${timestamp}.db`);
            
            await connection.backup(backupPath);
            logger.info(`Created SQLite backup at ${backupPath}`);
            
            return backupPath;
        } finally {
            await this.disconnect(connection);
        }
    }

    async restore(backupPath, options = {}) {
        if (!await fs.access(backupPath).then(() => true).catch(() => false)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }

        const connection = await this.connect(options);
        
        try {
            await connection.exec('BEGIN TRANSACTION');
            
            // Drop all tables
            const tables = await connection.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `);
            
            for (const { name } of tables) {
                await connection.run(`DROP TABLE IF EXISTS ${name}`);
            }
            
            // Restore from backup
            const backupDb = await open({
                filename: backupPath,
                driver: sqlite3.Database
            });
            
            await backupDb.backup(connection.filename);
            await backupDb.close();
            
            await connection.exec('COMMIT');
            logger.info(`Restored SQLite database from ${backupPath}`);
        } catch (error) {
            await connection.exec('ROLLBACK');
            throw error;
        } finally {
            await this.disconnect(connection);
        }
    }
}

module.exports = SQLiteDatabase; 