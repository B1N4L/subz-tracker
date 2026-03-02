import express from "express";
import {PORT} from "./config/env.js";
const app = express();

app.get("/", async (req, res) => {
    res.send("Welcome to the Github App");
})

app.listen(PORT, () => {
    console.log(`SubzTracker listening on port http://localhost:${PORT}`);
});

export default app;
//console.log("server started");