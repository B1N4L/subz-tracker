import express from "express";
import cookieParser from "cookie-parser";

import {PORT} from "./config/env.js";
import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";
import workflowRouter from "./routes/workflow.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

import connectToDB from "./database/mongodb.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import arcjetMiddleware from "./middlewares/arcjet.middleware.js";
import httpLoggerMiddleware from "./middlewares/httpLogger.middleware.js";
import logger from "./config/logger.js";

const app = express();

app.use(express.json()); //able to handle data sent as json format
app.use(express.urlencoded({ extended: false })); //helps to handle form data sent as html in a simple format
app.use(cookieParser()) // stores cookies from incoming requests so you can store cookie data
app.use(httpLoggerMiddleware); // HTTP access logging via Winston
app.use(arcjetMiddleware);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//show which routes which we want to use.
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/workflow', workflowRouter);

// custom middleware for error handling
app.use(errorMiddleware);

app.get('/', (req, res) => {
    res.send({body:"welcome to api"});
});

app.listen(PORT, async () => {
    logger.info(`SubzTracker listening on port http://localhost:${PORT}`);
    //connect to the database
    await connectToDB();
});

export default app;