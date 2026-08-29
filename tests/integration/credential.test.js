import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Credential Storage & Password Reveal Integration Suite', () => {
    let tokenA;
    let userAId;
    let tokenB;
    let userBId;
    let accountId;

    const timestamp = Date.now();
    const userAEmail = `cred_suite_a_${timestamp}@example.com`;
    const userBEmail = `cred_suite_b_${timestamp}@example.com`;
    const password = 'Password123!';

    beforeAll(async () => {
        const resA = await request(app)
            .post('/api/v1/auth/sign-up')
            .send({ name: 'Cred User A', email: userAEmail, password });
        tokenA = resA.body.data?.token;
        userAId = resA.body.data?.user?._id;

        const resB = await request(app)
            .post('/api/v1/auth/sign-up')
            .send({ name: 'Cred User B', email: userBEmail, password });
        tokenB = resB.body.data?.token;
        userBId = resB.body.data?.user?._id;
    });

    afterAll(async () => {
        if (accountId && tokenA) {
            await request(app)
                .delete(`/api/v1/account/${accountId}`)
                .set('Authorization', `Bearer ${tokenA}`);
        }
        if (userAId && tokenA) {
            await request(app)
                .delete(`/api/v1/user/${userAId}`)
                .set('Authorization', `Bearer ${tokenA}`);
        }
        if (userBId && tokenB) {
            await request(app)
                .delete(`/api/v1/user/${userBId}`)
                .set('Authorization', `Bearer ${tokenB}`);
        }
    });

    it('should create an account with an encrypted password and omit plaintext and credentials from response', async () => {
        const res = await request(app)
            .post('/api/v1/account')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                serviceName: 'Netflix Secure',
                username: 'netflix_user@example.com',
                password: 'NetflixSecretPassword2026!',
                website: 'https://netflix.com',
                category: 'streaming',
                tags: ['entertainment', 'vault'],
                notes: 'Encrypted account',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.hasPassword).toBe(true);
        expect(res.body.data.passwordLastChanged).toBeDefined();
        expect(res.body.data.password).toBeUndefined();
        expect(res.body.data.credential).toBeUndefined();

        accountId = res.body.data._id;
    });

    it('should strictly omit plaintext password and credential subdocument from GET /account and GET /account/:id', async () => {
        const listRes = await request(app)
            .get('/api/v1/account')
            .set('Authorization', `Bearer ${tokenA}`);

        expect(listRes.status).toBe(200);
        const found = listRes.body.data.find((a) => a._id === accountId);
        expect(found.hasPassword).toBe(true);
        expect(found.password).toBeUndefined();
        expect(found.credential).toBeUndefined();

        const detailRes = await request(app)
            .get(`/api/v1/account/${accountId}`)
            .set('Authorization', `Bearer ${tokenA}`);

        expect(detailRes.status).toBe(200);
        expect(detailRes.body.data.hasPassword).toBe(true);
        expect(detailRes.body.data.password).toBeUndefined();
        expect(detailRes.body.data.credential).toBeUndefined();
    });

    it('should securely decrypt and reveal password for authenticated owner (POST /:id/reveal-password and GET /:id/password)', async () => {
        const revealRes = await request(app)
            .post(`/api/v1/account/${accountId}/reveal-password`)
            .set('Authorization', `Bearer ${tokenA}`);

        expect(revealRes.status).toBe(200);
        expect(revealRes.body.success).toBe(true);
        expect(revealRes.body.data.password).toBe('NetflixSecretPassword2026!');
        expect(revealRes.body.data.serviceName).toBe('Netflix Secure');
        expect(revealRes.body.data.username).toBe('netflix_user@example.com');

        // Test GET alias
        const getPwdRes = await request(app)
            .get(`/api/v1/account/${accountId}/password`)
            .set('Authorization', `Bearer ${tokenA}`);

        expect(getPwdRes.status).toBe(200);
        expect(getPwdRes.body.data.password).toBe('NetflixSecretPassword2026!');
    });

    it('should forbid non-owner User B from revealing User A password with 403 Forbidden', async () => {
        const res = await request(app)
            .post(`/api/v1/account/${accountId}/reveal-password`)
            .set('Authorization', `Bearer ${tokenB}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.data).toBeUndefined();
    });

    it('should update account password, refresh timestamp, and allow revealing new password', async () => {
        const updateRes = await request(app)
            .put(`/api/v1/account/${accountId}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                password: 'UpdatedNetflixPass999!',
            });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.hasPassword).toBe(true);
        expect(updateRes.body.data.password).toBeUndefined();

        const revealRes = await request(app)
            .post(`/api/v1/account/${accountId}/reveal-password`)
            .set('Authorization', `Bearer ${tokenA}`);

        expect(revealRes.status).toBe(200);
        expect(revealRes.body.data.password).toBe('UpdatedNetflixPass999!');
    });

    it('should remove password from account when password is set to null', async () => {
        const clearRes = await request(app)
            .put(`/api/v1/account/${accountId}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                password: null,
            });

        expect(clearRes.status).toBe(200);
        expect(clearRes.body.data.hasPassword).toBe(false);

        // Revealing cleared password returns 404
        const revealRes = await request(app)
            .post(`/api/v1/account/${accountId}/reveal-password`)
            .set('Authorization', `Bearer ${tokenA}`);

        expect(revealRes.status).toBe(404);
    });
});
