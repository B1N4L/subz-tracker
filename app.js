import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import corsOptions from "./config/cors.js";

import connectToDB from "./database/mongodb.js";

import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";
import workflowRouter from "./routes/workflow.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import accountRouter from "./routes/account.routes.js";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

import errorMiddleware from "./middlewares/error.middleware.js";
import arcjetMiddleware from "./middlewares/arcjet.middleware.js";
import httpLoggerMiddleware from "./middlewares/httpLogger.middleware.js";

const app = express();

// Security HTTP headers (Helmet)
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https:"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", "https:", "data:"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        crossOriginEmbedderPolicy: false,
    })
);

// Cross-Origin Resource Sharing (CORS)
app.use(cors(corsOptions));

app.use(express.json()); // able to handle data sent as json format
app.use(express.urlencoded({ extended: false })); // helps to handle form data sent as html in a simple format
app.use(cookieParser()); // stores cookies from incoming requests so you can store cookie data
app.use(httpLoggerMiddleware); // HTTP access logging via Winston
app.use(arcjetMiddleware);

// Ensure MongoDB connection is active for serverless invocations & standard server
app.use(async (req, res, next) => {
    try {
        await connectToDB();
        next();
    } catch (err) {
        next(err);
    }
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Show which routes we want to use
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/account', accountRouter);
app.use('/api/v1/accounts', accountRouter);
app.use('/api/v1/workflow', workflowRouter);

// Root greeting endpoint
app.get('/', (req, res) => {
    res.send({ body: "welcome to api" });
});

// Custom middleware for error handling
app.use(errorMiddleware);

export default app;