import { describe, it, expect } from 'vitest';
import { sanitizeData } from '../../config/logger.js';

describe('Logger Sensitive Data Redaction Unit Suite', () => {
    it('should redact sensitive keys at top level and nested levels', () => {
        const sensitivePayload = {
            name: 'John Doe',
            password: 'SuperSecretPassword123!',
            token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token',
            credential: {
                encryptedPassword: 'ciphertextBase64',
                iv: 'ivBase64',
                authTag: 'tagBase64',
            },
            user: {
                email: 'john@example.com',
                apiKey: 'ak_123456789',
                creditCard: '4111-2222-3333-4444',
            },
            otherInfo: 'public',
        };

        const sanitized = sanitizeData(sensitivePayload);

        expect(sanitized.password).toBe('[REDACTED]');
        expect(sanitized.token).toBe('[REDACTED]');
        expect(sanitized.credential).toBe('[REDACTED]');
        expect(sanitized.user.apiKey).toBe('[REDACTED]');
        expect(sanitized.user.creditCard).toBe('[REDACTED]');
        expect(sanitized.name).toBe('John Doe');
        expect(sanitized.user.email).toBe('john@example.com');
        expect(sanitized.otherInfo).toBe('public');
    });

    it('should sanitize arrays of objects containing sensitive fields', () => {
        const payload = [
            { id: 1, password: 'pass1', username: 'user1' },
            { id: 2, token: 'token2', username: 'user2' },
        ];

        const sanitized = sanitizeData(payload);

        expect(sanitized[0].password).toBe('[REDACTED]');
        expect(sanitized[0].username).toBe('user1');
        expect(sanitized[1].token).toBe('[REDACTED]');
        expect(sanitized[1].username).toBe('user2');
    });

    it('should safely return primitives without modification', () => {
        expect(sanitizeData('simple string')).toBe('simple string');
        expect(sanitizeData(12345)).toBe(12345);
        expect(sanitizeData(null)).toBeNull();
        expect(sanitizeData(undefined)).toBeUndefined();
    });
});
