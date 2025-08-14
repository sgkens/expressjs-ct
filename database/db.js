const Logger = require ('../utils/logger');

class Database {
    constructor() {
        this.connection = null;
        this.dbType = process.env.DB_TYPE || 'sqlite'; // sqlite, mysql, mariadb, postgres
        this.logger = new Logger();
    }

    async init() {
        try {
            switch (this.dbType.toLowerCase()) {
                case 'mysql':
                case 'mariadb':
                    await this.initMySQL();
                    break;
                case 'postgres':
                case 'postgresql':
                    await this.initPostgreSQL();
                    break;
                default:
                    await this.initSQLite();
            }

            await this.createTables();
            this.logger.info(`Database initialized successfully with ${this.dbType}`);
        } catch (error) {
            this.logger.error('Database initialization failed:', error);
            throw error;
        }
    }

    async initSQLite() {
        const sqlite3 = require('sqlite3').verbose();
        return new Promise((resolve, reject) => {
            this.connection = new sqlite3.Database(
                process.env.DB_PATH || './database/app.db',
                (err) => {
                    if (err) {
                        this.logger.error('SQLite connection failed:', err);
                        reject(err);
                    } else {
                        this.logger.info('Connected to SQLite database');
                        resolve();
                    }
                }
            );
        });
    }

    async initMySQL() {
        const mysql = require('mysql2/promise');
        try {
            this.connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'webapp',
                charset: 'utf8mb4'
            });
            this.logger.info('Connected to MySQL/MariaDB database');
        } catch (error) {
            this.logger.error('MySQL/MariaDB connection failed:', error);
            throw error;
        }
    }

    async initPostgreSQL() {
        const { Client } = require('pg');
        this.connection = new Client({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'webapp',
            port: process.env.DB_PORT || 5432,
        });

        try {
            await this.connection.connect();
            this.logger.info('Connected to PostgreSQL database');
        } catch (error) {
            this.logger.error('PostgreSQL connection failed:', error);
            throw error;
        }
    }

    async createTables() {
        const createUsersTable = this.getCreateUsersTableSQL();

        try {
            await this.executeQuery(createUsersTable);
            this.logger.info('Users table created/verified successfully');

            // Create default admin user if none exists
            const adminExists = await this.getUserByUsername('admin');
            if (!adminExists) {
                const bcrypt = require('bcryptjs');
                const hashedPassword = await bcrypt.hash('admin123', 12);
                await this.createUser('admin', hashedPassword, 'Administrator', 'admin');
                this.logger.info('Default admin user created (username: admin, password: admin123)');
            }
        } catch (error) {
            this.logger.error('Table creation failed:', error);
            throw error;
        }
    }

    getCreateUsersTableSQL() {
        switch (this.dbType.toLowerCase()) {
            case 'postgres':
            case 'postgresql':
                return `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            account_type VARCHAR(20) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
            case 'mysql':
            case 'mariadb':
                return `
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            account_type VARCHAR(20) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
            default: // SQLite
                return `
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            display_name TEXT NOT NULL,
            account_type TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `;
        }
    }

    // Sanitized query execution
    async executeQuery(query, params = []) {
        this.logger.debug(`Executing query: ${query.substring(0, 100)}...`);
        this.logger.debug(`With parameters: ${JSON.stringify(params)}`);

        try {
            switch (this.dbType.toLowerCase()) {
                case 'mysql':
                case 'mariadb':
                    const [rows] = await this.connection.execute(query, params);
                    return rows;

                case 'postgres':
                case 'postgresql':
                    const result = await this.connection.query(query, params);
                    return result.rows;

                default: // SQLite
                    return new Promise((resolve, reject) => {
                        if (query.trim().toUpperCase().startsWith('SELECT')) {
                            this.connection.all(query, params, (err, rows) => {
                                if (err) {
                                    this.logger.error('SQLite query error:', err);
                                    reject(err);
                                } else {
                                    resolve(rows);
                                }
                            });
                        } else {
                            this.connection.run(query, params, function (err) {
                                if (err) {
                                    this.logger.error('SQLite query error:', err);
                                    reject(err);
                                } else {
                                    resolve({
                                        lastID: this.lastID,
                                        changes: this.changes
                                    });
                                }
                            });
                        }
                    });
            }
        } catch (error) {
            this.logger.error('Query execution failed:', error);
            this.logger.error('Query was:', query);
            this.logger.error('Parameters were:', params);
            throw error;
        }
    }

    // User management methods with parameterized queries
    async createUser(username, hashedPassword, displayName, accountType = 'user') {
        const query = `
      INSERT INTO users (username, password, display_name, account_type) 
      VALUES (?, ?, ?, ?)
    `;

        try {
            const result = await this.executeQuery(query, [
                username,
                hashedPassword,
                displayName,
                accountType
            ]);

            this.logger.info(`User created successfully: ${username}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to create user ${username}:`, error);
            throw error;
        }
    }

    async getUserByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = ?';

        try {
            const result = await this.executeQuery(query, [username]);
            return this.dbType.toLowerCase() === 'sqlite' ? result[0] : result[0] || null;
        } catch (error) {
            this.logger.error(`Failed to get user by username ${username}:`, error);
            throw error;
        }
    }

    async getUserById(id) {
        const query = 'SELECT * FROM users WHERE id = ?';

        try {
            const result = await this.executeQuery(query, [id]);
            return this.dbType.toLowerCase() === 'sqlite' ? result[0] : result[0] || null;
        } catch (error) {
            this.logger.error(`Failed to get user by ID ${id}:`, error);
            throw error;
        }
    }

    async getAllUsers() {
        const query = `
      SELECT id, username, display_name, account_type, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;

        try {
            const result = await this.executeQuery(query);
            this.logger.debug(`Retrieved ${result.length} users`);
            return result;
        } catch (error) {
            this.logger.error('Failed to get all users:', error);
            throw error;
        }
    }

    async updateUserProfile(id, displayName) {
        const updateQuery = this.getUpdateTimestampQuery();
        const query = `UPDATE users SET display_name = ?${updateQuery} WHERE id = ?`;

        try {
            const result = await this.executeQuery(query, [displayName, id]);
            this.logger.info(`User profile updated for ID: ${id}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to update user profile for ID ${id}:`, error);
            throw error;
        }
    }

    async updateUserPassword(id, hashedPassword) {
        const updateQuery = this.getUpdateTimestampQuery();
        const query = `UPDATE users SET password = ?${updateQuery} WHERE id = ?`;

        try {
            const result = await this.executeQuery(query, [hashedPassword, id]);
            this.logger.info(`Password updated for user ID: ${id}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to update password for user ID ${id}:`, error);
            throw error;
        }
    }

    async updateUserAccountType(id, accountType) {
        const updateQuery = this.getUpdateTimestampQuery();
        const query = `UPDATE users SET account_type = ?${updateQuery} WHERE id = ?`;

        try {
            const result = await this.executeQuery(query, [accountType, id]);
            this.logger.info(`Account type updated for user ID: ${id} to ${accountType}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to update account type for user ID ${id}:`, error);
            throw error;
        }
    }

    async deleteUser(id) {
        const query = 'DELETE FROM users WHERE id = ?';

        try {
            const result = await this.executeQuery(query, [id]);
            this.logger.info(`User deleted with ID: ${id}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to delete user ID ${id}:`, error);
            throw error;
        }
    }

    getUpdateTimestampQuery() {
        switch (this.dbType.toLowerCase()) {
            case 'postgres':
            case 'postgresql':
                return ', updated_at = CURRENT_TIMESTAMP';
            case 'mysql':
            case 'mariadb':
                return ''; // MySQL handles this automatically with ON UPDATE CURRENT_TIMESTAMP
            default: // SQLite
                return ", updated_at = DATETIME('now')";
        }
    }

    // Security helper methods
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        // Remove potentially dangerous characters
        return input
            .replace(/[<>'"]/g, '') // Remove HTML/script tags
            .replace('/[;--]/g', '') // Remove SQL comment indicators
            .trim();
    }

    validateId(id) {
        const numId = parseInt(id);
        if (isNaN(numId) || numId <= 0) {
            throw new Error('Invalid ID provided');
        }
        return numId;
    }

    // Health check method
    async healthCheck() {
        try {
            const query = 'SELECT 1 as health';
            await this.executeQuery(query);
            return { status: 'healthy', database: this.dbType };
        } catch (error) {
            this.logger.error('Database health check failed:', error);
            return { status: 'unhealthy', error: error.message };
        }
    }

    // Graceful shutdown
    async close() {
        try {
            if (this.connection) {
                switch (this.dbType.toLowerCase()) {
                    case 'mysql':
                    case 'mariadb':
                        await this.connection.end();
                        break;
                    case 'postgres':
                    case 'postgresql':
                        await this.connection.end();
                        break;
                    default: // SQLite
                        this.connection.close();
                }
                this.logger.info('Database connection closed');
            }
        } catch (error) {
            this.logger.error('Error closing database connection:', error);
        }
    }
}

module.exports = Database;
