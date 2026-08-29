import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Subscription Domain Integration Suite', () => {
    let token;
    let userId;
    let subscriptionId;

    const timestamp = Date.now();
    const email = `sub_suite_${timestamp}@example.com`;
    const password = 'Password123!';

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/v1/auth/sign-up')
            .send({ name: 'Subscription User', email, password });
        token = res.body.data?.token;
        userId = res.body.data?.user?._id;
    });

    afterAll(async () => {
        if (userId && token) {
            await request(app)
                .delete(`/api/v1/user/${userId}`)
                .set('Authorization', `Bearer ${token}`);
        }
    });

    it('should create a new subscription (POST /api/v1/subscription)', async () => {
        const res = await request(app)
            .post('/api/v1/subscription')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Netflix Premium',
                price: 19.99,
                currency: 'USD',
                frequency: 'monthly',
                category: 'entertainment',
                paymentMethod: 'Credit Card',
                startDate: new Date().toISOString(),
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.subscription.name).toBe('Netflix Premium');
        expect(res.body.data.subscription.price).toBe(19.99);
        expect(res.body.data.subscription.status).toBe('active');

        subscriptionId = res.body.data.subscription._id;
    });

    it('should list all subscriptions for the authenticated user (GET /api/v1/subscription)', async () => {
        const res = await request(app)
            .get('/api/v1/subscription')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBe(1);
        expect(res.body.data[0].name).toBe('Netflix Premium');
    });

    it('should retrieve a subscription by ID (GET /api/v1/subscription/:id)', async () => {
        const res = await request(app)
            .get(`/api/v1/subscription/${subscriptionId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data._id).toBe(subscriptionId);
        expect(res.body.data.name).toBe('Netflix Premium');
    });

    it('should update subscription details (PUT /api/v1/subscription/:id)', async () => {
        const res = await request(app)
            .put(`/api/v1/subscription/${subscriptionId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ price: 22.99, name: 'Netflix Ultra HD' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.price).toBe(22.99);
        expect(res.body.data.name).toBe('Netflix Ultra HD');
    });

    it('should cancel a subscription (PUT /api/v1/subscription/:id/cancel)', async () => {
        const res = await request(app)
            .put(`/api/v1/subscription/${subscriptionId}/cancel`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('canceled');
    });

    it('should retrieve upcoming renewals (GET /api/v1/subscription/upcoming-renewals)', async () => {
        const res = await request(app)
            .get('/api/v1/subscription/upcoming-renewals?days=30')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should delete a subscription (DELETE /api/v1/subscription/:id)', async () => {
        const res = await request(app)
            .delete(`/api/v1/subscription/${subscriptionId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify it was deleted
        const getRes = await request(app)
            .get(`/api/v1/subscription/${subscriptionId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(getRes.status).toBe(404);
    });
});
