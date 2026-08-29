import mongoose from 'mongoose';
import { DB_URI, NODE_ENV } from '../config/env.js';
import logger from '../config/logger.js';

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectToDB = async () => {
    if (!DB_URI) {
        const error = new Error('MongoDB URI is missing, please define the DB_URI environment variable');
        logger.error(error.message);
        throw error;
    }

    // Reuse existing active connection
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    // Initialize connection promise if not already in-flight
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
        };

        cached.promise = mongoose.connect(DB_URI, opts).then((mongooseInstance) => {
            logger.info(`Connected to DB in ${NODE_ENV || 'development'} environment`);
            return mongooseInstance;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (err) {
        cached.promise = null;
        logger.error('Error connecting to DB:', { error: err.message, stack: err.stack });
        throw err;
    }

    return cached.conn;
};

export default connectToDB;