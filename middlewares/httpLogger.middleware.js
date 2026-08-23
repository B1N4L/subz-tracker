import logger, { sanitizeData } from '../config/logger.js';

export const httpLoggerMiddleware = (req, res, next) => {
    const startTime = process.hrtime();

    // Listen to response finish event so log is emitted once after response is sent
    res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);
        const statusCode = res.statusCode;

        // Determine log level based on HTTP response status code
        let logLevel = 'http';
        if (statusCode >= 500) {
            logLevel = 'error';
        } else if (statusCode >= 400) {
            logLevel = 'warn';
        }

        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-';
        const userAgent = req.headers['user-agent'] || '-';
        const message = `${req.method} ${req.originalUrl || req.url} ${statusCode} - ${durationMs}ms`;

        // Contextual metadata with sanitized headers
        const meta = {
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode,
            durationMs: `${durationMs}ms`,
            ip,
            userAgent,
        };

        logger[logLevel](message, meta);
    });

    next();
};

export default httpLoggerMiddleware;
