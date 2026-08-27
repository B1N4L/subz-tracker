import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Express Application Smoke Test (In-Memory HTTP)', () => {
    it('should load the Express app and respond to GET / without requiring a listening server', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.body).toEqual({ body: 'welcome to api' });
    });

    it('should serve Swagger documentation endpoint (/api-docs/)', async () => {
        const response = await request(app).get('/api-docs/');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
    });
});
