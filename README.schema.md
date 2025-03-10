# Database Schema Files

This directory contains database schema files for the JMF Hosting Discord Bot.

## Files

- `schema.sql` - The original schema file (MySQL format)
- `schema.sqlite.sql` - SQLite-compatible schema file
- `schema.mysql.sql` - MySQL-optimized schema file

## Usage

The updater script will automatically select the appropriate schema file based on your database type:

- For SQLite databases, it will use `schema.sqlite.sql` if available
- For MySQL databases, it will use `schema.mysql.sql` if available
- If the specific schema file is not found, it will fall back to `schema.sql`

## Database Configuration

In your `.env` file, make sure to set the appropriate database configuration:

### For SQLite

```
DB_TYPE=sqlite
DB_PATH=./data/database.sqlite
```

### For MySQL

```
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=jmf_bot
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

## Troubleshooting

If you encounter errors during schema updates:

1. Check that you're using the correct schema file for your database type
2. For SQLite, ensure the `sqlite3` command is installed
3. For MySQL, ensure the `mysql` client is installed and your credentials are correct
4. Check the update log for detailed error messages

## Manual Schema Update

If you need to manually update the schema:

### For SQLite

```bash
cd /opt/jmf-bot
sqlite3 ./data/database.sqlite < schema.sqlite.sql
```

### For MySQL

```bash
cd /opt/jmf-bot
mysql -h localhost -u username -p database_name < schema.mysql.sql
``` 