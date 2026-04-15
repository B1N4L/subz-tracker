import mongoose from 'mongoose'
import {DB_URI, NODE_ENV} from '../config/env.js';

if(!DB_URI) {
    throw new Error('MongoDB URI is missing, please define the variable at .env<development/production>.local');
}

const connectToDB = async () => {
    try {
        await mongoose.connect(DB_URI);
        console.log(`Connected to DB in ${NODE_ENV} environment`);
    } catch(err) {
        console.error('Error connecting to DB.', err);
        process.exit(1);
    }
}

export default connectToDB;