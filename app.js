import express from "express";
import cookieParser from "cookie-parser";

import {PORT} from "./config/env.js";
import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";

import subscriptionRouter from "./routes/subscription.routes.js";
import connectToDB from "./database/mongodb.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import arcjetMiddleware from "./middlewares/arcjet.middleware.js";

const app = express();

app.use(express.json()); //able to handle data sent as json format
app.use(express.urlencoded({ extended: false })); //helps to handle form data sent as html in a simple format
app.use(cookieParser()) // stores cookies from incoming requests so you can store cookie data
app.use(arcjetMiddleware);

//show which routes which we want to use.
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);

// custom middleware for error handling
app.use(errorMiddleware);

app.get('/', (req, res) => {
    res.send({body:"welcome to api"});
});

app.listen(PORT, async () => {
    console.log(`SubzTracker listening on port http://localhost:${PORT}`);
    //connect to the database
    await connectToDB();
});

export default app;
//console.log("server started");
//
//
// import express from "express";
// import {PORT} from "./config/env.js";
// import connectToDB from "./database/mongodb.js";
//
// const app = express();
//
// app.get('/user/:id', (req, res, next) => {
//     if (req.params.id === '0') {
//         return next('route')
//     }
//     res.send(`User ${req.params.id}`)
// })
//
// app.get('/user/:id', (req, res) => {
//     res.send('Special handler for user ID 0')
// })
//
// app.listen(PORT, async () => {
//     console.log(`SubzTracker listening on port http://localhost:${PORT}`);
//     //connect to the database
//     await connectToDB();
// });
//
// export default app;
// //console.log("server started");