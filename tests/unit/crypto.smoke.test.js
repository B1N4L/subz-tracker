import { describe, it, expect } from 'vitest';
import { encryptCredential, decryptCredential } from '../../utils/crypto.js';

describe('Unit Smoke Test (Crypto Utility)', () => {
    it('should encrypt and decrypt plaintext using AES-256-GCM', () => {
        const secret = 'SmokeTestSecret123!';
        const encrypted = encryptCredential(secret);

        expect(encrypted).toHaveProperty('encryptedPassword');
        expect(encrypted).toHaveProperty('iv');
        expect(encrypted).toHaveProperty('authTag');
        expect(encrypted.keyVersion).toBe(1);

        const decrypted = decryptCredential(encrypted);
        expect(decrypted).toBe(secret);
    });
});
