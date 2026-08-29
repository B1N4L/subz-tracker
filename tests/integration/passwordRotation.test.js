import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Password Rotation Reminders Integration Suite', () => {
    let token;
    let userId;
    let accountWithPassId;
    let accountNoPassId;

    const timestamp = Date.now();
    const userEmail = `rot_suite_${timestamp}@example.com`;
    const password = 'Password123!';

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/v1/auth/sign-up')
            .send({ name: 'Rotation Suite User', email: userEmail, password });
        token = res.body.data?.token;
        userId = res.body.data?.user?._id;
    });

    afterAll(async () => {
        if (accountWithPassId && token) {
            await request(app)
                .delete(`/api/v1/account/${accountWithPassId}`)
                .set('Authorization', `Bearer ${token}`);
        }
        if (accountNoPassId && token) {
            await request(app)
                .delete(`/api/v1/account/${accountNoPassId}`)
                .set('Authorization', `Bearer ${token}`);
        }
        if (userId && token) {
            await request(app)
                .delete(`/api/v1/user/${userId}`)
                .set('Authorization', `Bearer ${token}`);
        }
    });

    it('should create account with custom password rotation configuration', async () => {
        const res = await request(app)
            .post('/api/v1/account')
            .set('Authorization', `Bearer ${token}`)
            .send({
                serviceName: 'AWS Root Account',
                username: 'aws_admin@company.com',
                password: 'AWSSuperSecretKey2026!',
                category: 'cloud',
                passwordRotationIntervalDays: 45,
                rotationReminderEnabled: true,
                notes: 'High security cloud account',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.hasPassword).toBe(true);
        expect(res.body.data.passwordRotationIntervalDays).toBe(45);
        expect(res.body.data.rotationReminderEnabled).toBe(true);
        expect(res.body.data.passwordLastChanged).toBeDefined();

        accountWithPassId = res.body.data._id;

        // Create secondary account without password
        const noPassRes = await request(app)
            .post('/api/v1/account')
            .set('Authorization', `Bearer ${token}`)
            .send({
                serviceName: 'Reddit',
                username: 'reddit_user',
                category: 'social',
            });

        accountNoPassId = noPassRes.body.data._id;
    });

    it('should analyze and return stale passwords from GET /api/v1/account/stale-passwords', async () => {
        const res = await request(app)
            .get('/api/v1/account/stale-passwords')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.totalAccountsWithPasswords).toBe(1);
        expect(res.body.data[0].serviceName).toBe('AWS Root Account');
        expect(res.body.data[0].passwordRotationIntervalDays).toBe(45);
        expect(typeof res.body.data[0].daysUntilDue).toBe('number');
        expect(res.body.data[0].status).toBe('healthy');
    });

    it('should update account rotation interval and toggle reminder status (PUT /api/v1/account/:id)', async () => {
        const res = await request(app)
            .put(`/api/v1/account/${accountWithPassId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                passwordRotationIntervalDays: 60,
                rotationReminderEnabled: false,
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.passwordRotationIntervalDays).toBe(60);
        expect(res.body.data.rotationReminderEnabled).toBe(false);
    });

    it('should refresh passwordLastChanged and decrypt new password upon rotation', async () => {
        const rotateRes = await request(app)
            .put(`/api/v1/account/${accountWithPassId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                password: 'NewlyRotatedAWSPassword999!',
            });

        expect(rotateRes.status).toBe(200);
        expect(rotateRes.body.data.hasPassword).toBe(true);

        const revealRes = await request(app)
            .post(`/api/v1/account/${accountWithPassId}/reveal-password`)
            .set('Authorization', `Bearer ${token}`);

        expect(revealRes.status).toBe(200);
        expect(revealRes.body.data.password).toBe('NewlyRotatedAWSPassword999!');
    });
});
