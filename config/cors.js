import { CLIENT_ORIGIN } from "./env.js";

const parseAllowedOrigins = () => {
    if (!CLIENT_ORIGIN) return [];
    return CLIENT_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

export const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests with no Origin header (curl, Postman, mobile apps, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        // Allow origin if explicitly present in configured CLIENT_ORIGIN whitelist
        if (allowedOrigins.length > 0 && (allowedOrigins.includes(origin) || allowedOrigins.includes("*"))) {
            return callback(null, true);
        }

        // Reject unrecognized cross-origin browser requests
        return callback(new Error(`CORS policy blocked access for origin: ${origin}`));
    },
    credentials: false, // Stateless Bearer token authentication (no cross-origin credentials needed)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
    ],
    optionsSuccessStatus: 204,
};

export default corsOptions;
