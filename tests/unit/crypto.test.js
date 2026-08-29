import { describe, it, expect } from 'vitest';
import { encryptCredential, decryptCredential } from '../../utils/crypto.js';

describe('Cryptographic Utility Unit Suite (AES-256-GCM)', () => {
    it('should encrypt plaintext into an authenticated ciphertext object with IV, authTag, and keyVersion', () => {
        const secret = 'MySuperSecretP@ssword2026!';
        const encrypted = encryptCredential(secret);

        expect(typeof encrypted.encryptedPassword).toBe('string');
        expect(encrypted.encryptedPassword.length).toBeGreaterThan(0);
        expect(typeof encrypted.iv).toBe('string');
        expect(encrypted.iv.length).toBeGreaterThan(0);
        expect(typeof encrypted.authTag).toBe('string');
        expect(encrypted.authTag.length).toBeGreaterThan(0);
        expect(encrypted.keyVersion).toBe(1);
    });

    it('should decrypt authenticated ciphertext exactly back to original plaintext', () => {
        const secret = 'AComplexP@ssw0rd!#%&*()';
        const encrypted = encryptCredential(secret);
        const decrypted = decryptCredential(encrypted);

        expect(decrypted).toBe(secret);
    });

    it('should throw an integrity error when ciphertext is tampered with', () => {
        const secret = 'SecretToProtect';
        const encrypted = encryptCredential(secret);
        const tampered = {
            ...encrypted,
            encryptedPassword: Buffer.from('corrupted_ciphertext_payload').toString('base64'),
        };

        expect(() => decryptCredential(tampered)).toThrow();
    });

    it('should throw an integrity error when authTag is tampered with', () => {
        const secret = 'SecretToProtect';
        const encrypted = encryptCredential(secret);
        const tamperedTag = {
            ...encrypted,
            authTag: Buffer.from('corrupted_tag_16b').toString('base64'),
        };

        expect(() => decryptCredential(tamperedTag)).toThrow();
    });

    it('should throw an error when encrypting invalid or empty inputs', () => {
        expect(() => encryptCredential('')).toThrow(/non-empty string/i);
        expect(() => encryptCredential(null)).toThrow(/non-empty string/i);
    });

    it('should throw an error when decrypting invalid or incomplete credential objects', () => {
        expect(() => decryptCredential(null)).toThrow();
        expect(() => decryptCredential({})).toThrow();
    });
});
