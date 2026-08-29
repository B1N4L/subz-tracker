import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('User Domain Integration Suite', () => {
    let tokenA;
    let userAId;
    let tokenB;
    let userBId;

    const timestamp = Date.now();
    const userAEmail = `user_suite_a_${timestamp}@example.com`;
    const userBEmail = `user_suite_b_${timestamp}@example.com`;
    const password = 'Password123!';

    beforeAll(async () => {
        const resA = await request(app)
            .post('/api/v1/auth/sign-up')
            .send({ name: 'User Profile A', email: userAEmail, password });
        tokenA = resA.body.data?.token;
        userAId = resA.body.data?.user?._id;

        const resB = await request(app)
            .post('/api/v1/auth/sign-up')
            .send({ name: 'User Profile B', email: userBEmail, password });
        tokenB = resB.body.data?.token;
        userBId = resB.body.data?.user?._id;
    });

    afterAll(async () => {
        if (userBId && tokenB) {
            await request(app)
                .delete(`/api/v1/user/${userBId}`)
                .set('Authorization', `Bearer ${tokenB}`);
        }
    });

    it('should retrieve list of all users without sensitive passwords (GET /api/v1/user)', async () => {
        const res = await request(app)
            .get('/api/v1/user')
            .set('Authorization', `Bearer ${tokenA}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.every((u) => u.password === undefined)).toBe(true);
    });

    it('should retrieve single user details by ID (GET /api/v1/user/:id)', async () => {
        const res = await request(app)
            .get(`/api/v1/user/${userAId}`)
            .set('Authorization', `Bearer ${tokenA}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data._id).toBe(userAId);
        expect(res.body.data.name).toBe('User Profile A');
        expect(res.body.data.email).toBe(userAEmail);
        expect(res.body.data.password).toBeUndefined();
    });

    it('should update user profile (PUT /api/v1/user/:id)', async () => {
        const res = await request(app)
            .put(`/api/v1/user/${userAId}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ name: 'Updated Profile Name' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Updated Profile Name');
    });

    it('should delete user account (DELETE /api/v1/user/:id)', async () => {
        const res = await request(app)
            .delete(`/api/v1/user/${userAId}`)
            .set('Authorization', `Bearer ${tokenA}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify user is gone
        const getRes = await request(app)
            .get(`/api/v1/user/${userAId}`)
            .set('Authorization', `Bearer ${tokenB}`);

        expect(getRes.status).toBe(404);
    });
});
