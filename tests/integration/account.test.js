import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Account Domain Integration Suite', () => {
    let tokenA;
    let userAId;
    let tokenB;
    let userBId;
    let accountAId;
    let subscriptionId;

    const timestamp = Date.now();
    const userAEmail = `test_user_a_${timestamp}@example.com`;
    const userBEmail = `test_user_b_${timestamp}@example.com`;
    const password = 'Password123!';

    beforeAll(async () => {
        // Register User A
        const resA = await request(app)
            .post('/api/v1/auth/sign-up')
            .set('User-Agent', 'Vitest-Supertest')
            .send({ name: 'User A', email: userAEmail, password });

        tokenA = resA.body.data?.token;
        userAId = resA.body.data?.user?._id;

        // Register User B
        const resB = await request(app)
            .post('/api/v1/auth/sign-up')
            .set('User-Agent', 'Vitest-Supertest')
            .send({ name: 'User B', email: userBEmail, password });

        tokenB = resB.body.data?.token;
        userBId = resB.body.data?.user?._id;
    });

    afterAll(async () => {
        // Clean up test users and subscriptions
        if (subscriptionId && tokenA) {
            await request(app)
                .delete(`/api/v1/subscription/${subscriptionId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');
        }
        if (userAId && tokenA) {
            await request(app)
                .delete(`/api/v1/user/${userAId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');
        }
        if (userBId && tokenB) {
            await request(app)
                .delete(`/api/v1/user/${userBId}`)
                .set('Authorization', `Bearer ${tokenB}`)
                .set('User-Agent', 'Vitest-Supertest');
        }
    });

    describe('Account Creation & Retrieval', () => {
        it('should create an account for authenticated user (POST /api/v1/account)', async () => {
            const res = await request(app)
                .post('/api/v1/account')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    serviceName: 'Netflix',
                    username: 'user_a_netflix',
                    website: 'https://netflix.com',
                    category: 'streaming',
                    tags: ['entertainment', 'video'],
                    notes: 'Family plan',
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.serviceName).toBe('Netflix');
            expect(res.body.data.user).toBe(userAId);
            expect(res.body.data.tags).toContain('entertainment');

            accountAId = res.body.data._id;

            // Create secondary accounts for User A for filtering/search tests
            await request(app)
                .post('/api/v1/account')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    serviceName: 'GitHub',
                    username: 'user_a_dev',
                    website: 'https://github.com',
                    category: 'software',
                    tags: ['work', 'dev', 'code'],
                    notes: 'Personal work',
                });

            await request(app)
                .post('/api/v1/account')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    serviceName: 'Spotify',
                    username: 'user_a_spotify',
                    website: 'https://spotify.com',
                    category: 'streaming',
                    tags: ['entertainment', 'music'],
                });
        });

        it('should reject unauthenticated account creation with 401 Unauthorized', async () => {
            const res = await request(app)
                .post('/api/v1/account')
                .set('User-Agent', 'Vitest-Supertest')
                .send({ serviceName: 'HackerNews' });

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/unauthorized/i);
        });

        it('should retrieve all accounts belonging to the authenticated user (GET /api/v1/account)', async () => {
            const res = await request(app)
                .get('/api/v1/account')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(3);
            expect(res.body.data.every((acc) => acc.user === userAId)).toBe(true);
        });
    });

    describe('IDOR Authorization Security', () => {
        it('should forbid User B from retrieving User A account (GET /:id)', async () => {
            const res = await request(app)
                .get(`/api/v1/account/${accountAId}`)
                .set('Authorization', `Bearer ${tokenB}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should forbid User B from updating User A account (PUT /:id)', async () => {
            const res = await request(app)
                .put(`/api/v1/account/${accountAId}`)
                .set('Authorization', `Bearer ${tokenB}`)
                .set('User-Agent', 'Vitest-Supertest')
                .send({ serviceName: 'Hacked Service' });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);

            // Verify account was NOT modified
            const verifyRes = await request(app)
                .get(`/api/v1/account/${accountAId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(verifyRes.body.data.serviceName).toBe('Netflix');
        });

        it('should forbid User B from deleting User A account (DELETE /:id)', async () => {
            const res = await request(app)
                .delete(`/api/v1/account/${accountAId}`)
                .set('Authorization', `Bearer ${tokenB}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Validation & Payload Enforcement', () => {
        it('should reject invalid payload with 400 Bad Request', async () => {
            const res = await request(app)
                .post('/api/v1/account')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    serviceName: '', // empty serviceName
                    category: 'invalid_category_enum',
                    unexpectedField: 'malicious payload',
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Validation failed');
        });
    });

    describe('Filtering & Searching', () => {
        it('should filter accounts by category (GET /api/v1/account?category=software)', async () => {
            const res = await request(app)
                .get('/api/v1/account?category=software')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(1);
            expect(res.body.data[0].serviceName).toBe('GitHub');
        });

        it('should filter accounts by tag (GET /api/v1/account?tag=music)', async () => {
            const res = await request(app)
                .get('/api/v1/account?tag=music')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(1);
            expect(res.body.data[0].serviceName).toBe('Spotify');
        });

        it('should search accounts by serviceName substring (GET /api/v1/account?search=net)', async () => {
            const res = await request(app)
                .get('/api/v1/account?search=net')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(1);
            expect(res.body.data[0].serviceName).toBe('Netflix');
        });
    });

    describe('Update & Deletion Lifecycle', () => {
        it('should update account details (PUT /api/v1/account/:id)', async () => {
            const res = await request(app)
                .put(`/api/v1/account/${accountAId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    serviceName: 'Netflix Ultra',
                    notes: 'Updated family note',
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.serviceName).toBe('Netflix Ultra');
            expect(res.body.data.notes).toBe('Updated family note');
        });

        it('should allow a subscription to optionally reference an account', async () => {
            const res = await request(app)
                .post('/api/v1/subscription')
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    name: 'Netflix 4K Subscription',
                    price: 19.99,
                    currency: 'USD',
                    frequency: 'monthly',
                    category: 'entertainment',
                    paymentMethod: 'Credit Card',
                    startDate: new Date().toISOString(),
                    account: accountAId,
                });

            expect(res.status).toBe(201);
            expect(res.body.data.subscription.account).toBe(accountAId);
            subscriptionId = res.body.data.subscription._id;
        });

        it('should delete account and safely unlink from subscription', async () => {
            const delRes = await request(app)
                .delete(`/api/v1/account/${accountAId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(delRes.status).toBe(200);
            expect(delRes.body.success).toBe(true);

            // Verify account is removed
            const checkRes = await request(app)
                .get(`/api/v1/account/${accountAId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(checkRes.status).toBe(404);

            // Verify subscription still exists and account is reset to null
            const subRes = await request(app)
                .get(`/api/v1/subscription/${subscriptionId}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .set('User-Agent', 'Vitest-Supertest');

            expect(subRes.status).toBe(200);
            expect(subRes.body.data.account).toBeNull();
        });
    });
});
