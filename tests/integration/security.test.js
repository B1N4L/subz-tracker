import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Production Hardening & Security Middleware Suite', () => {
    describe('Helmet Security HTTP Headers', () => {
        it('should attach standard security headers to HTTP responses', async () => {
            const res = await request(app).get('/');

            expect(res.status).toBe(200);

            // X-Content-Type-Options
            expect(res.headers['x-content-type-options']).toBe('nosniff');

            // X-Frame-Options
            expect(res.headers['x-frame-options']).toMatch(/SAMEORIGIN|DENY/i);

            // X-DNS-Prefetch-Control
            expect(res.headers['x-dns-prefetch-control']).toBe('off');

            // X-Download-Options
            expect(res.headers['x-download-options']).toBe('noopen');

            // X-Permitted-Cross-Domain-Policies
            expect(res.headers['x-permitted-cross-domain-policies']).toBe('none');

            // Referrer-Policy
            expect(res.headers['referrer-policy']).toBeDefined();

            // Content-Security-Policy
            expect(res.headers['content-security-policy']).toBeDefined();

            // X-Powered-By header should be stripped by Helmet
            expect(res.headers['x-powered-by']).toBeUndefined();
        });

        it('should allow Swagger UI documentation endpoint (/api-docs/) to load with compatible CSP', async () => {
            const res = await request(app).get('/api-docs/');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/html/);
            expect(res.text).toContain('Swagger UI');
        });
    });

    describe('CORS Cross-Origin Resource Sharing', () => {
        it('should allow requests with no Origin header (e.g. mobile apps, curl, server-to-server)', async () => {
            const res = await request(app).get('/');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ body: 'welcome to api' });
        });

        it('should include CORS allow headers for whitelisted origins', async () => {
            const res = await request(app)
                .get('/')
                .set('Origin', 'http://localhost:3000');

            expect(res.status).toBe(200);
            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
            expect(res.headers['access-control-allow-credentials']).toBe('true');
        });

        it('should handle preflight OPTIONS requests successfully', async () => {
            const res = await request(app)
                .options('/api/v1/auth/sign-in')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'POST')
                .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

            expect([200, 204]).toContain(res.status);
            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
            expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
            expect(res.headers['access-control-allow-credentials']).toBe('true');
        });
    });
});
