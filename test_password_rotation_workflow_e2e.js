import { generatePasswordRotationEmailTemplate } from './utils/email-template.js';

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
    console.log('================== STARTING PASSWORD ROTATION REMINDERS TEST SUITE ==================\n');

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
    // SECTION 1: UNIT TEST FOR ROTATION EMAIL TEMPLATE GENERATOR
    // -------------------------------------------------------------
    console.log('--- Unit Tests: Password Rotation Email Template Generator ---');
    const templateHtml = generatePasswordRotationEmailTemplate({
        userName: 'Alice Smith',
        serviceName: 'GitHub Enterprise',
        username: 'alice.dev',
        dueDate: 'Sep 30, 2026',
        daysSinceChanged: 85,
        statusText: 'Your password rotation is due in 5 days.',
        badgeColor: '#e67e22',
    });

    assert(templateHtml.includes('Alice Smith'), 'Includes user name');
    assert(templateHtml.includes('GitHub Enterprise'), 'Includes service name');
    assert(templateHtml.includes('alice.dev'), 'Includes username');
    assert(templateHtml.includes('85 days ago'), 'Includes days since changed');
    assert(templateHtml.includes('Sep 30, 2026'), 'Includes due date');

    // -------------------------------------------------------------
    // SECTION 2: INTEGRATION TESTS AGAINST ACTIVE SERVER
    // -------------------------------------------------------------
    console.log('\n--- Setup: Registering User ---');
    const timestamp = Date.now();
    const userEmail = `rot_user_${timestamp}@example.com`;
    const password = 'Password123!';

    const regRes = await fetchWithRetry(`${BASE_URL}/api/v1/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rotation User', email: userEmail, password }),
    });
    const regData = await regRes.json();
    const token = regData.data?.token;
    const userId = regData.data?.user?._id;

    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };

    console.log(`Created test user (${userId})\n`);

    // TEST 1: Create Account with Custom Rotation Interval
    console.log('--- Test 1: Create Account with Custom Rotation Configuration ---');
    const createRes = await fetchWithRetry(`${BASE_URL}/api/v1/account`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            serviceName: 'AWS Root Account',
            username: 'aws_admin@company.com',
            password: 'AWSSuperSecretKey2026!',
            category: 'cloud',
            passwordRotationIntervalDays: 45,
            rotationReminderEnabled: true,
            notes: 'High security cloud account',
        }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'Status code is 201 Created', `Got ${createRes.status}`);
    assert(createData.data?.hasPassword === true, 'hasPassword flag is true');
    assert(createData.data?.passwordRotationIntervalDays === 45, 'Custom rotation interval saved as 45 days');
    assert(createData.data?.rotationReminderEnabled === true, 'rotationReminderEnabled is true');
    assert(createData.data?.passwordLastChanged !== null, 'passwordLastChanged timestamp is set');
    const accountId = createData.data?._id;

    // Create a secondary account without password
    const createNoPassRes = await fetchWithRetry(`${BASE_URL}/api/v1/account`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            serviceName: 'Reddit',
            username: 'reddit_user',
            category: 'social',
        }),
    });
    const createNoPassData = await createNoPassRes.json();
    const noPassAccountId = createNoPassData.data?._id;

    // TEST 2: Query Stale Passwords Endpoint (GET /api/v1/account/stale-passwords)
    console.log('\n--- Test 2: Query Stale Passwords Endpoint ---');
    const staleRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/stale-passwords`, { headers });
    const staleData = await staleRes.json();

    assert(staleRes.status === 200, 'Status code is 200 OK', `Got ${staleRes.status}`);
    assert(staleData.totalAccountsWithPasswords === 1, 'Only accounts with passwords are included');
    assert(staleData.data[0]?.serviceName === 'AWS Root Account', 'Analyzed account matches');
    assert(staleData.data[0]?.passwordRotationIntervalDays === 45, 'Returns rotation interval');
    assert(typeof staleData.data[0]?.daysUntilDue === 'number', 'Calculates daysUntilDue');
    assert(staleData.data[0]?.status === 'healthy', 'Newly created password has status healthy');

    // TEST 3: Update Account Rotation Settings
    console.log('\n--- Test 3: Update Account Rotation Interval & Toggle ---');
    const updateRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            passwordRotationIntervalDays: 60,
            rotationReminderEnabled: false,
        }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Status code is 200 OK on update');
    assert(updateData.data?.passwordRotationIntervalDays === 60, 'Updated interval to 60 days');
    assert(updateData.data?.rotationReminderEnabled === false, 'Disabled rotation reminders');

    // TEST 4: Rotating Password Updates Timestamp
    console.log('\n--- Test 4: Rotating Password Updates Timestamp ---');
    const initialChangedTime = createData.data?.passwordLastChanged;
    await sleep(100);

    const rotateRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            password: 'NewlyRotatedAWSPassword999!',
        }),
    });
    const rotateData = await rotateRes.json();
    assert(rotateRes.status === 200, 'Status code is 200 OK on password rotation');
    assert(rotateData.data?.hasPassword === true, 'hasPassword remains true');
    assert(
        new Date(rotateData.data?.passwordLastChanged).getTime() >= new Date(initialChangedTime).getTime(),
        'passwordLastChanged was refreshed upon rotation'
    );

    // Verify new password via reveal endpoint
    const revealRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountId}/reveal-password`, {
        method: 'POST',
        headers,
    });
    const revealData = await revealRes.json();
    assert(revealRes.status === 200, 'Reveal endpoint returns 200 OK');
    assert(revealData.data?.password === 'NewlyRotatedAWSPassword999!', 'Decrypted password is the rotated password');

    // Clean up
    await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountId}`, { method: 'DELETE', headers });
    await fetchWithRetry(`${BASE_URL}/api/v1/account/${noPassAccountId}`, { method: 'DELETE', headers });
    await fetchWithRetry(`${BASE_URL}/api/v1/user/${userId}`, { method: 'DELETE', headers });

    console.log(`\n================== TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED ==================`);
    if (failedCount > 0) {
        process.exit(1);
    }
}

runTestSuite();
