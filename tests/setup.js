import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import connectToDB from '../database/mongodb.js';

beforeAll(async () => {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    if (mongoose.connection.readyState === 0) {
        await connectToDB();
    }
}, 25000);

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
}, 10000);
