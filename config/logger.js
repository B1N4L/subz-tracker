import winston from 'winston';
import { NODE_ENV, LOG_LEVEL } from './env.js';

const isProduction = (NODE_ENV || 'development') === 'production';

// Sensitive keys to redact from logs
const SENSITIVE_KEYS = [
    'password',
    'pass',
    'token',
    'jwt',
    'secret',
    'authorization',
    'cookie',
    'cookies',
    'apikey',
    'api_key',
    'creditcard',
    'credit_card',
    'cvv',
    'cardnumber',
    'card_number',
    'encryptedpassword',
    'encrypted_password',
    'authtag',
    'auth_tag',
    'credential',
    'credentials',
];

/**
 * Recursively redacts sensitive keys from an object
 */
export const sanitizeData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) => lowerKey.includes(sensitiveKey));

        if (isSensitive) {
            sanitized[key] = '[REDACTED]';
        } else if (value && typeof value === 'object') {
            sanitized[key] = sanitizeData(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

// Winston format to sanitize metadata
const sanitizeFormat = winston.format((info) => {
    // Sanitize any metadata properties on info
    for (const key of Object.keys(info)) {
        if (!['level', 'message', 'timestamp', 'stack'].includes(key)) {
            info[key] = sanitizeData(info[key]);
        }
    }
    return info;
});

// Custom development console format
const devConsoleFormat = winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    const stackString = stack ? `\n${stack}` : '';
    return `[${timestamp}] [${level}]: ${message}${metaString}${stackString}`;
});

// Transports configuration
const transports = [];

if (isProduction) {
    // Production transports: Console (JSON) + File logs
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                sanitizeFormat(),
                winston.format.json()
            ),
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                sanitizeFormat(),
                winston.format.json()
            ),
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                sanitizeFormat(),
                winston.format.json()
            ),
        })
    );
} else {
    // Development transports: Colorized Human-Readable Console
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                sanitizeFormat(),
                winston.format.colorize({ all: false, level: true }),
                devConsoleFormat
            ),
        })
    );
}

// Create centralized logger instance
const logger = winston.createLogger({
    level: LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    levels: winston.config.npm.levels, // error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
    transports,
    exitOnError: false,
});

export { logger };
export default logger;
