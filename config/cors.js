import { CLIENT_ORIGIN, NODE_ENV } from "./env.js";

const parseAllowedOrigins = () => {
    if (!CLIENT_ORIGIN) return [];
    return CLIENT_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

export const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        // Check if origin is explicitly in configured whitelist
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
            return callback(null, true);
        }

        // In non-production environments, permit local development origins
        if (NODE_ENV !== "production") {
            const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin);
            if (isLocalhost) {
                return callback(null, true);
            }
        }

        return callback(new Error(`CORS policy blocked access for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 204,
};

export default corsOptions;
