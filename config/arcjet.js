import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/node";
import { ARCJET_KEY } from "./env.js";

const isTest = process.env.NODE_ENV === 'test';
const ruleMode = isTest ? "DRY_RUN" : "LIVE";

const aj = arcjet({
    key: ARCJET_KEY,
    rules: [
        // Shield protects your app from common attacks e.g. SQL injection
        shield({ mode: ruleMode }),
        // Bot detection rule
        detectBot({
            mode: ruleMode,
            allow: [
                "CATEGORY:SEARCH_ENGINE",
            ],
        }),
        // Token bucket rate limiting (DRY_RUN in automated tests to prevent rate limit starvation)
        tokenBucket({
            mode: ruleMode,
            refillRate: 5,
            interval: 10,
            capacity: 10,
        }),
    ],
});

export default aj;