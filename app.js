import express from "express";
import {PORT} from "./config/env.js";
import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";

const app = express();

//show which routes which we want to use.
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);

app.get('/', (req, res) => {
    res.send({body:"welcome to api"});
});

app.listen(PORT, () => {
    console.log(`SubzTracker listening on port http://localhost:${PORT}`);
});

export default app;
//console.log("server started");