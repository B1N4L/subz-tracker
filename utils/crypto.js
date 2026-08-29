import crypto from "node:crypto";
import {
    ACCOUNT_ENCRYPTION_KEY,
    ACCOUNT_ENCRYPTION_KEY_VERSION,
} from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

// Default fallback development key (32 bytes / 256 bits) if env is not yet populated
const DEFAULT_KEY_HEX =
    "d9a5e4b83f12c76e0a9d8b7c6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f";

// Key Ring mapping version numbers to 32-byte Buffers
const KEY_RING = {
    1: Buffer.from(ACCOUNT_ENCRYPTION_KEY || DEFAULT_KEY_HEX, "hex"),
};

const DEFAULT_VERSION = parseInt(ACCOUNT_ENCRYPTION_KEY_VERSION, 10) || 1;

/**
 * Validates and retrieves the 32-byte key for a given key version
 */
const getKeyForVersion = (version = 1) => {
    const key = KEY_RING[version];
    if (!key || key.length !== 32) {
        throw new Error(
            `Invalid or missing encryption key for version ${version}. Key must be exactly 32 bytes (256 bits).`
        );
    }
    return key;
};

/**
 * Encrypts a plaintext password using AES-256-GCM
 * @param {string} plaintext - The plaintext password to encrypt
 * @param {number} [version] - Optional key version to use
 * @returns {{ encryptedPassword: string, iv: string, authTag: string, keyVersion: number }}
 */
export const encryptCredential = (plaintext, version = DEFAULT_VERSION) => {
    if (typeof plaintext !== "string" || plaintext.length === 0) {
        throw new Error("Plaintext credential must be a non-empty string");
    }

    const key = getKeyForVersion(version);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
        encryptedPassword: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        keyVersion: version,
    };
};

/**
 * Decrypts an encrypted credential payload using AES-256-GCM
 * @param {object} params
 * @param {string} params.encryptedPassword - Base64 encoded ciphertext
 * @param {string} params.iv - Base64 encoded initialization vector
 * @param {string} params.authTag - Base64 encoded GCM authentication tag
 * @param {number} [params.keyVersion] - Key version used during encryption
 * @returns {string} The decrypted plaintext password
 */
export const decryptCredential = ({
    encryptedPassword,
    iv,
    authTag,
    keyVersion = DEFAULT_VERSION,
}) => {
    if (!encryptedPassword || !iv || !authTag) {
        throw new Error("Missing required cryptographic parameters for decryption");
    }

    const key = getKeyForVersion(keyVersion);
    const ivBuffer = Buffer.from(iv, "base64");
    const authTagBuffer = Buffer.from(authTag, "base64");
    const encryptedBuffer = Buffer.from(encryptedPassword, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    const decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
};
