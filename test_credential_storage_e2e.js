import { encryptCredential, decryptCredential } from './utils/crypto.js';
import { sanitizeData } from './config/logger.js';

const BASE_URL = 'http://localhost:5500';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, maxRetries = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        await sleep(400);
        const res = await fetch(url, options);
        if (res.status === 429) {
            console.log(`⏳ Arcjet rate-limited (429) on attempt ${attempt + 1}. Waiting 3s for token bucket refill...`);
            await sleep(3000);
            continue;
        }
        return res;
    }
    return fetch(url, options);
}

async function runTestSuite() {
    console.log('================== STARTING CREDENTIAL STORAGE E2E TEST SUITE ==================\n');

    let passedCount = 0;
    let failedCount = 0;

    function assert(condition, message, details = '') {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passedCount++;
        } else {
            console.error(`❌ FAIL: ${message} ${details ? `(${details})` : ''}`);
            failedCount++;
        }
    }

    // -------------------------------------------------------------
    // SECTION 1: UNIT TESTS FOR CRYPTOGRAPHIC UTILITY
    // -------------------------------------------------------------
    console.log('--- Unit Tests: Cryptographic Utility (AES-256-GCM) ---');
    try {
        const secret = 'MySuperSecretP@ssword2026!';
        const encrypted = encryptCredential(secret);

        assert(typeof encrypted.encryptedPassword === 'string' && encrypted.encryptedPassword.length > 0, 'Encrypted password is Base64 string');
        assert(typeof encrypted.iv === 'string' && encrypted.iv.length > 0, 'IV is generated');
        assert(typeof encrypted.authTag === 'string' && encrypted.authTag.length > 0, 'Auth Tag is generated');
        assert(encrypted.keyVersion === 1, 'Key version is 1');

        const decrypted = decryptCredential(encrypted);
        assert(decrypted === secret, 'Decrypted password exactly matches original plaintext');

        // Test Tampering Detection
        let tamperedError = false;
        try {
            const tampered = { ...encrypted, encryptedPassword: Buffer.from('corrupted_ciphertext').toString('base64') };
            decryptCredential(tampered);
        } catch (err) {
            tamperedError = true;
        }
        assert(tamperedError, 'Decryption fails on tampered ciphertext (integrity protected by authTag)');

        let tamperedTagError = false;
        try {
            const tamperedTag = { ...encrypted, authTag: Buffer.from('corrupted_tag_16b').toString('base64') };
            decryptCredential(tamperedTag);
        } catch (err) {
            tamperedTagError = true;
        }
        assert(tamperedTagError, 'Decryption fails on tampered auth tag');
    } catch (err) {
        assert(false, `Crypto unit test threw unexpected error: ${err.message}`);
    }

    // -------------------------------------------------------------
    // SECTION 2: UNIT TEST - LOGGER SENSITIVE DATA REDACTION
    // -------------------------------------------------------------
    console.log('\n--- Unit Tests: Logger Sensitive Data Redaction ---');
    const sensitivePayload = {
        serviceName: 'Netflix',
        password: 'RawPassword123',
        credential: {
            encryptedPassword: 'ciphertextBase64',
            iv: 'ivBase64',
            authTag: 'tagBase64',
        },
        otherInfo: 'public',
    };
    const sanitized = sanitizeData(sensitivePayload);
    assert(sanitized.password === '[REDACTED]', 'Plaintext password redacted in logs');
    assert(sanitized.credential === '[REDACTED]', 'Credential subdocument redacted in logs');
    assert(sanitized.otherInfo === 'public', 'Non-sensitive fields preserved');

    // -------------------------------------------------------------
    // SECTION 3: INTEGRATION & SECURITY TESTS AGAINST SERVER
    // -------------------------------------------------------------
    console.log('\n--- Setup: Registering Test Users ---');
    const timestamp = Date.now();
    const userAEmail = `cred_user_a_${timestamp}@example.com`;
    const userBEmail = `cred_user_b_${timestamp}@example.com`;
    const password = 'Password123!';

    // Register User A
    const resA = await fetchWithRetry(`${BASE_URL}/api/v1/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Credential User A', email: userAEmail, password })
    });
    const dataA = await resA.json();
    const tokenA = dataA.data?.token;
    const userAId = dataA.data?.user?._id;

    // Register User B
    const resB = await fetchWithRetry(`${BASE_URL}/api/v1/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Credential User B', email: userBEmail, password })
    });
    const dataB = await resB.json();
    const tokenB = dataB.data?.token;
    const userBId = dataB.data?.user?._id;

    const headersA = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
    };

    const headersB = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
    };

    console.log(`Created User A (${userAId}) and User B (${userBId})\n`);

    // TEST 1: Create Account with Password
    console.log('--- Test 1: Create Account with Password ---');
    const createRes = await fetchWithRetry(`${BASE_URL}/api/v1/account`, {
        method: 'POST',
        headers: headersA,
        body: JSON.stringify({
            serviceName: 'Netflix Secure',
            username: 'netflix_user@example.com',
            password: 'NetflixSecretPassword2026!',
            website: 'https://netflix.com',
            category: 'streaming',
            tags: ['entertainment', 'vault'],
            notes: 'Encrypted account'
        })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'Status code is 201 Created', `Got ${createRes.status}`);
    assert(createData.data?.hasPassword === true, 'hasPassword flag is true');
    assert(createData.data?.passwordLastChanged !== null, 'passwordLastChanged is set');
    assert(createData.data?.password === undefined, 'Plaintext password is NEVER returned in create response');
    assert(createData.data?.credential === undefined, 'Encrypted credential subdocument is NEVER returned in create response');
    const accountAId = createData.data?._id;

    // TEST 2: Standard List & Detail Queries NEVER Expose Password or Credential
    console.log('\n--- Test 2: Standard List & Detail Endpoints Omit Password Data ---');
    const listRes = await fetchWithRetry(`${BASE_URL}/api/v1/account`, { headers: headersA });
    const listData = await listRes.json();
    const foundAcc = listData.data.find(a => a._id === accountAId);
    assert(listRes.status === 200, 'GET /account returns 200 OK');
    assert(foundAcc?.hasPassword === true, 'List item has hasPassword: true');
    assert(foundAcc?.password === undefined, 'List item omits plaintext password');
    assert(foundAcc?.credential === undefined, 'List item omits credential subdocument');

    const detailRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, { headers: headersA });
    const detailData = await detailRes.json();
    assert(detailRes.status === 200, 'GET /account/:id returns 200 OK');
    assert(detailData.data?.hasPassword === true, 'Detail item has hasPassword: true');
    assert(detailData.data?.password === undefined, 'Detail item omits plaintext password');
    assert(detailData.data?.credential === undefined, 'Detail item omits credential subdocument');

    // TEST 3: Reveal Password (Owner)
    console.log('\n--- Test 3: Reveal Password as Authenticated Owner ---');
    const revealRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}/reveal-password`, {
        method: 'POST',
        headers: headersA
    });
    const revealData = await revealRes.json();
    assert(revealRes.status === 200, 'POST /reveal-password returns 200 OK', `Got ${revealRes.status}`);
    assert(revealData.data?.password === 'NetflixSecretPassword2026!', 'Decrypted password matches original plaintext');
    assert(revealData.data?.serviceName === 'Netflix Secure', 'Service name is returned');
    assert(revealData.data?.username === 'netflix_user@example.com', 'Username is returned');

    // Also test GET /:id/password alias
    const getPwdRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}/password`, {
        method: 'GET',
        headers: headersA
    });
    const getPwdData = await getPwdRes.json();
    assert(getPwdRes.status === 200, 'GET /password alias returns 200 OK');
    assert(getPwdData.data?.password === 'NetflixSecretPassword2026!', 'GET /password returns decrypted password');

    // TEST 4: IDOR Protection - User B cannot reveal User A's password
    console.log("\n--- Test 4: IDOR Protection (User B cannot reveal User A's password) ---");
    const idorRevealRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}/reveal-password`, {
        method: 'POST',
        headers: headersB
    });
    const idorRevealData = await idorRevealRes.json();
    assert(idorRevealRes.status === 403, 'Status code is 403 Forbidden for unauthorized user', `Got ${idorRevealRes.status}`);
    assert(idorRevealData.data === undefined, 'No credential data returned to unauthorized user');

    // TEST 5: Update Password
    console.log('\n--- Test 5: Update Account Password ---');
    const updateRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, {
        method: 'PUT',
        headers: headersA,
        body: JSON.stringify({
            password: 'UpdatedNetflixPass999!'
        })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Status code is 200 OK on update');
    assert(updateData.data?.hasPassword === true, 'hasPassword remains true');
    assert(updateData.data?.password === undefined, 'Password not returned in update response');

    // Verify new password via reveal endpoint
    const revealUpdatedRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}/reveal-password`, {
        method: 'POST',
        headers: headersA
    });
    const revealUpdatedData = await revealUpdatedRes.json();
    assert(revealUpdatedData.data?.password === 'UpdatedNetflixPass999!', 'Updated password successfully decrypted');

    // TEST 6: Clear Password (Setting to null)
    console.log('\n--- Test 6: Remove Password from Account ---');
    const clearRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, {
        method: 'PUT',
        headers: headersA,
        body: JSON.stringify({
            password: null
        })
    });
    const clearData = await clearRes.json();
    assert(clearRes.status === 200, 'Status code is 200 OK on password clear');
    assert(clearData.data?.hasPassword === false, 'hasPassword is now false');

    // Attempting to reveal cleared password returns 404
    const revealClearedRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}/reveal-password`, {
        method: 'POST',
        headers: headersA
    });
    assert(revealClearedRes.status === 404, 'Reveal returns 404 Not Found when account has no password');

    // Clean up
    await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, { method: 'DELETE', headers: headersA });
    await fetchWithRetry(`${BASE_URL}/api/v1/user/${userAId}`, { method: 'DELETE', headers: headersA });
    await fetchWithRetry(`${BASE_URL}/api/v1/user/${userBId}`, { method: 'DELETE', headers: headersB });

    console.log(`\n================== TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED ==================`);
    if (failedCount > 0) {
        process.exit(1);
    }
}

runTestSuite();
