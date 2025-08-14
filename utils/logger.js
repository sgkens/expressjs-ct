const { existsSync, mkdirSync, appendFileSync, readdirSync, statSync, unlinkSync } = require('fs');
const { join } = require('path');

class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };

        this.currentLogLevel = this.logLevels[process.env.LOG_LEVEL?.toUpperCase()] || this.logLevels.INFO;
        this.enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true';
        this.logDirectory = process.env.LOG_DIRECTORY || './logs';

        // Colors for console output
        this.colors = {
            ERROR: '\x1b[31m', // Red
            WARN: '\x1b[33m',  // Yellow
            INFO: '\x1b[36m',  // Cyan
            DEBUG: '\x1b[90m', // Gray
            RESET: '\x1b[0m'   // Reset
        };

        this.init();
    }

    init() {
        if (this.enableFileLogging) {
            this.ensureLogDirectory();
        }

        this.info('Logger initialized', {
            logLevel: Object.keys(this.logLevels)[Object.values(this.logLevels).indexOf(this.currentLogLevel)],
            fileLogging: this.enableFileLogging,
            logDirectory: this.enableFileLogging ? this.logDirectory : 'disabled'
        });
    }

    ensureLogDirectory() {
        if (!existsSync(this.logDirectory)) {
            try {
                mkdirSync(this.logDirectory, { recursive: true });
            } catch (error) {
                console.error('Failed to create log directory:', error);
                this.enableFileLogging = false;
            }
        }
    }

    formatTimestamp() {
        return new Date().toISOString();
    }

    formatMessage(level, message, meta = null) {
        const timestamp = this.formatTimestamp();
        const metaString = meta ? ` | META: ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaString}`;
    }

    shouldLog(level) {
        return this.logLevels[level] <= this.currentLogLevel;
    }

    writeToFile(level, formattedMessage) {
        if (!this.enableFileLogging) return;

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const logFileName = `${today}.log`;
        const logFilePath = join(this.logDirectory, logFileName);

        try {
            appendFileSync(logFilePath, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    writeToConsole(level, message, meta) {
        const color = this.colors[level] || '';
        const reset = this.colors.RESET;
        const timestamp = this.formatTimestamp();

        // Format the console output nicely
        const consoleMessage = `${color}[${timestamp}] [${level}]${reset} ${message}`;

        if (meta) {
            console.log(consoleMessage);
            console.log(`${color}└─ META:${reset}`, meta);
        } else {
            console.log(consoleMessage);
        }
    }

    log(level, message, meta = null) {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message, meta);

        // Write to console
        this.writeToConsole(level, message, meta);

        // Write to file
        this.writeToFile(level, formattedMessage);

        // Additional handling for errors
        if (level === 'ERROR') {
            this.handleError(message, meta);
        }
    }

    error(message, meta = null) {
        this.log('ERROR', message, meta);
    }

    warn(message, meta = null) {
        this.log('WARN', message, meta);
    }

    info(message, meta = null) {
        this.log('INFO', message, meta);
    }

    debug(message, meta = null) {
        this.log('DEBUG', message, meta);
    }

    // Special methods for different types of logging

    security(message, meta = null) {
        const securityMeta = {
            type: 'SECURITY',
            timestamp: this.formatTimestamp(),
            ...meta
        };
        this.warn(`🔒 SECURITY: ${message}`, securityMeta);
    }

    performance(action, duration, meta = null) {
        const perfMeta = {
            type: 'PERFORMANCE',
            action: action,
            duration: `${duration}ms`,
            ...meta
        };
        this.info(`⚡ PERFORMANCE: ${action} completed in ${duration}ms`, perfMeta);
    }

    database(operation, table = null, meta = null) {
        const dbMeta = {
            type: 'DATABASE',
            operation: operation,
            table: table,
            ...meta
        };
        this.debug(`💾 DATABASE: ${operation}${table ? ` on ${table}` : ''}`, dbMeta);
    }

    auth(action, username = null, meta = null) {
        const authMeta = {
            type: 'AUTHENTICATION',
            action: action,
            username: username,
            ...meta
        };
        this.info(`🔐 AUTH: ${action}${username ? ` for ${username}` : ''}`, authMeta);
    }

    request(method, url, ip, userAgent = null, meta = null) {
        const requestMeta = {
            type: 'HTTP_REQUEST',
            method: method,
            url: url,
            ip: ip,
            userAgent: userAgent,
            ...meta
        };
        this.debug(`🌐 REQUEST: ${method} ${url} from ${ip}`, requestMeta);
    }

    handleError(message, meta) {
        // Additional error handling logic
        const errorMeta = {
            timestamp: this.formatTimestamp(),
            stack: meta?.stack || (new Error()).stack,
            ...meta
        };

        // In production, you might want to send critical errors to an external service
        if (process.env.NODE_ENV === 'production' && process.env.ERROR_WEBHOOK_URL) {
            this.sendErrorToWebhook(message, errorMeta);
        }
    }

    async sendErrorToWebhook(message, meta) {
        try {
            // Implementation for sending errors to external services like Slack, Discord, etc.
            // This is a placeholder - implement based on your needs
            console.log('Would send error to webhook:', { message, meta });
        } catch (webhookError) {
            console.error('Failed to send error to webhook:', webhookError);
        }
    }

    // Method to change log level at runtime
    setLogLevel(level) {
        const upperLevel = level.toUpperCase();
        if (this.logLevels[upperLevel] !== undefined) {
            this.currentLogLevel = this.logLevels[upperLevel];
            this.info(`Log level changed to: ${upperLevel}`);
            return true;
        }
        this.warn(`Invalid log level: ${level}. Valid levels: ${Object.keys(this.logLevels).join(', ')}`);
        return false;
    }

    // Method to get current configuration
    getConfig() {
        return {
            currentLogLevel: Object.keys(this.logLevels)[Object.values(this.logLevels).indexOf(this.currentLogLevel)],
            fileLogging: this.enableFileLogging,
            logDirectory: this.logDirectory,
            availableLevels: Object.keys(this.logLevels)
        };
    }

    // Method to clean old log files
    cleanOldLogs(daysToKeep = 30) {
        if (!this.enableFileLogging) {
            this.warn('File logging is disabled, cannot clean logs');
            return;
        }

        try {
            const files = readdirSync(this.logDirectory);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            let deletedCount = 0;
            files.forEach(file => {
                if (file.endsWith('.log')) {
                    const filePath = join(this.logDirectory, file);
                    const stats = statSync(filePath);

                    if (stats.mtime < cutoffDate) {
                        unlinkSync(filePath);
                        deletedCount++;
                    }
                }
            });

            this.info(`Log cleanup completed. Deleted ${deletedCount} old log files`);
        } catch (error) {
            this.error('Failed to clean old logs:', error);
        }
    }

    // Method for structured logging with context
    withContext(context) {
        return {
            error: (message, meta = null) => this.error(message, { ...context, ...meta }),
            warn: (message, meta = null) => this.warn(message, { ...context, ...meta }),
            info: (message, meta = null) => this.info(message, { ...context, ...meta }),
            debug: (message, meta = null) => this.debug(message, { ...context, ...meta })
        };
    }

    // Method to create a timer for performance logging
    timer(label) {
        const start = Date.now();
        return {
            end: (meta = null) => {
                const duration = Date.now() - start;
                this.performance(label, duration, meta);
                return duration;
            }
        };
    }
}

module.exports = Logger;