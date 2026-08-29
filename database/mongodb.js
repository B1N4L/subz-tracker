import mongoose from 'mongoose';
import {DB_URI, NODE_ENV} from '../config/env.js';
import logger from '../config/logger.js';

if(!DB_URI) {
    throw new Error('MongoDB URI is missing, please define the variable at .env<development/production>.local');
}

const connectToDB = async () => {
    try {
        await mongoose.connect(DB_URI);
        logger.info(`Connected to DB in ${NODE_ENV} environment`);
    } catch(err) {
        logger.error('Error connecting to DB:', { error: err.message, stack: err.stack });
        process.exit(1);
    }
}

export default connectToDB;