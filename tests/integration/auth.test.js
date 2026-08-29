import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Authentication Integration Suite', () => {
    let testUserId;
    const testEmail = `auth_test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    afterAll(async () => {
        if (testUserId) {
            // Log in and delete user
            const signInRes = await request(app)
                .post('/api/v1/auth/sign-in')
                .set('User-Agent', 'Vitest-Supertest')
                .send({ email: testEmail, password: testPassword });
            const token = signInRes.body.data?.token;

            if (token) {
                await request(app)
                    .delete(`/api/v1/user/${testUserId}`)
                    .set('Authorization', `Bearer ${token}`)
                    .set('User-Agent', 'Vitest-Supertest');
            }
        }
    });

    describe('Sign-Up (POST /api/v1/auth/sign-up)', () => {
        it('should reject sign-up requests failing Zod validation with 400 Bad Request', async () => {
            const res = await request(app)
                .post('/api/v1/auth/sign-up')
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    name: 'A', // min 2 chars
                    email: 'invalid-email-format',
                    password: '123', // min 6 chars
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors).toHaveProperty('name');
            expect(res.body.errors).toHaveProperty('email');
            expect(res.body.errors).toHaveProperty('password');
        });

        it('should successfully register a new user and return a JWT token', async () => {
            const res = await request(app)
                .post('/api/v1/auth/sign-up')
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    name: 'Auth Test User',
                    email: testEmail,
                    password: testPassword,
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data.user).toHaveProperty('_id');
            expect(res.body.data.user.email).toBe(testEmail);
            expect(res.body.data.user.password).toBeUndefined();

            testUserId = res.body.data.user._id;
        });

        it('should reject sign-up when email is already registered with 409 Conflict', async () => {
            const res = await request(app)
                .post('/api/v1/auth/sign-up')
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    name: 'Duplicate User',
                    email: testEmail,
                    password: testPassword,
                });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Sign-In (POST /api/v1/auth/sign-in)', () => {
        it('should successfully authenticate an existing user with valid credentials', async () => {
            const res = await request(app)
                .post('/api/v1/auth/sign-in')
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    email: testEmail,
                    password: testPassword,
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data.user.email).toBe(testEmail);
            expect(res.body.data.user.password).toBeUndefined();
        });

        it('should reject authentication for wrong password with 401 Unauthorized', async () => {
            const res = await request(app)
                .post('/api/v1/auth/sign-in')
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    email: testEmail,
                    password: 'WrongPassword999!',
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return 404 for non-existent user email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/sign-in')
                .set('User-Agent', 'Vitest-Supertest')
                .send({
                    email: 'nonexistent_user_12345@example.com',
                    password: 'Password123!',
                });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Sign-Out (POST /api/v1/auth/sign-out)', () => {
        it('should return 200 OK and clear authentication cookies', async () => {
            const res = await request(app)
                .post('/api/v1/auth/sign-out')
                .set('User-Agent', 'Vitest-Supertest');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toMatch(/logged out|signed out/i);
        });
    });
});
