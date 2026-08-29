import app from "./app.js";
import { PORT } from "./config/env.js";
import connectToDB from "./database/mongodb.js";
import logger from "./config/logger.js";

app.listen(PORT, async () => {
    logger.info(`SubzTracker listening on port http://localhost:${PORT}`);
    // Connect to the database
    await connectToDB();
});
