import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
    // Ensure test environment is defined
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
});

afterAll(() => {
    // Global teardown hooks if required
});
