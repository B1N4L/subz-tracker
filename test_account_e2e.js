const BASE_URL = 'http://localhost:5500';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, maxRetries = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        await sleep(500);
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

async function runAccountTestSuite() {
    console.log('================== STARTING ACCOUNT DOMAIN TEST SUITE ==================\n');

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

    // Setup: Create two distinct users for ownership/IDOR testing
    const timestamp = Date.now();
    const userAEmail = `user_a_${timestamp}@example.com`;
    const userBEmail = `user_b_${timestamp}@example.com`;
    const password = 'Password123!';

    // Register User A
    const resA = await fetchWithRetry(`${BASE_URL}/api/v1/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'User A', email: userAEmail, password })
    });
    const dataA = await resA.json();
    const tokenA = dataA.data?.token;
    const userAId = dataA.data?.user?._id;

    // Register User B
    const resB = await fetchWithRetry(`${BASE_URL}/api/v1/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'User B', email: userBEmail, password })
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

    // TEST 1: Authenticated user can create an account
    console.log('--- Test 1: Authenticated User Can Create an Account ---');
    const createRes = await fetchWithRetry(`${BASE_URL}/api/v1/account`, {
        method: 'POST',
        headers: headersA,
        body: JSON.stringify({
            serviceName: 'Netflix',
            username: 'user_a_netflix',
            website: 'https://netflix.com',
            category: 'streaming',
            tags: ['entertainment', 'video'],
            notes: 'Family plan'
        })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'Status code is 201 Created', `Got ${createRes.status}`);
    assert(createData.data?.serviceName === 'Netflix', 'Service name matches');
    assert(createData.data?.user === userAId, 'Account is bound to User A');
    assert(Array.isArray(createData.data?.tags) && createData.data.tags.includes('entertainment'), 'Tags are saved');
    const accountAId = createData.data?._id;

    // Also create secondary accounts for User A for filtering tests
    await fetchWithRetry(`${BASE_URL}/api/v1/account`, {
        method: 'POST',
        headers: headersA,
        body: JSON.stringify({
            serviceName: 'GitHub',
            username: 'user_a_dev',
            website: 'https://github.com',
            category: 'software',
            tags: ['work', 'dev', 'code'],
            notes: 'Personal work'
        })
    });

    await fetchWithRetry(`${BASE_URL}/api/v1/account`, {
        method: 'POST',
        headers: headersA,
        body: JSON.stringify({
            serviceName: 'Spotify',
            username: 'user_a_spotify',
            website: 'https://spotify.com',
            category: 'streaming',
            tags: ['entertainment', 'music']
        })
    });

    // TEST 2: Unauthenticated user cannot create an account
    console.log('\n--- Test 2: Unauthenticated User Cannot Create an Account ---');
    const unauthRes = await fetchWithRetry(`${BASE_URL}/api/v1/account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            serviceName: 'HackerNews'
        })
    });
    assert(unauthRes.status === 401, 'Status code is 401 Unauthorized without token', `Got ${unauthRes.status}`);

    // TEST 3: Authenticated user can retrieve their accounts
    console.log('\n--- Test 3: Authenticated User Can Retrieve Their Accounts ---');
    const listRes = await fetchWithRetry(`${BASE_URL}/api/v1/account`, { headers: headersA });
    const listData = await listRes.json();
    assert(listRes.status === 200, 'Status code is 200 OK', `Got ${listRes.status}`);
    assert(listData.count === 3, 'Returns 3 accounts for User A', `Got ${listData.count}`);
    assert(listData.data.every(acc => acc.user === userAId), 'All returned accounts belong to User A');

    // TEST 4: IDOR Prevention - User B cannot retrieve User A's account
    console.log("\n--- Test 4: IDOR Prevention (User B cannot retrieve User A's account) ---");
    const idorGetRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, { headers: headersB });
    const idorGetData = await idorGetRes.json();
    assert(idorGetRes.status === 403, 'Status code is 403 Forbidden for unauthorized user', `Got ${idorGetRes.status}`);
    assert(idorGetData.success === false, 'Response indicates failure');

    // TEST 5: IDOR Prevention - User B cannot update User A's account
    console.log("\n--- Test 5: IDOR Prevention (User B cannot update User A's account) ---");
    const idorUpdateRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, {
        method: 'PUT',
        headers: headersB,
        body: JSON.stringify({ serviceName: 'Hacked Service' })
    });
    assert(idorUpdateRes.status === 403, 'Status code is 403 Forbidden when updating other user account', `Got ${idorUpdateRes.status}`);

    // Verify account was NOT modified
    const verifyGetRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, { headers: headersA });
    const verifyGetData = await verifyGetRes.json();
    assert(verifyGetData.data?.serviceName === 'Netflix', 'Account was not modified by unauthorized user');

    // TEST 6: IDOR Prevention - User B cannot delete User A's account
    console.log("\n--- Test 6: IDOR Prevention (User B cannot delete User A's account) ---");
    const idorDelRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, {
        method: 'DELETE',
        headers: headersB
    });
    assert(idorDelRes.status === 403, 'Status code is 403 Forbidden when deleting other user account', `Got ${idorDelRes.status}`);

    // TEST 7: Validation rejects invalid data & extra unexpected fields
    console.log('\n--- Test 7: Validation Rejects Invalid Data & Unexpected Fields ---');
    const badDataRes = await fetchWithRetry(`${BASE_URL}/api/v1/account`, {
        method: 'POST',
        headers: headersA,
        body: JSON.stringify({
            serviceName: '', // empty serviceName
            category: 'invalid_category_enum',
            unexpectedField: 'malicious payload' // strict schema test
        })
    });
    const badData = await badDataRes.json();
    assert(badDataRes.status === 400, 'Status code is 400 Bad Request on invalid schema', `Got ${badDataRes.status}`);
    assert(badData.success === false, 'Validation failed response returned');

    // TEST 8: Category filtering
    console.log('\n--- Test 8: Category Filtering ---');
    const catRes = await fetchWithRetry(`${BASE_URL}/api/v1/account?category=software`, { headers: headersA });
    const catData = await catRes.json();
    assert(catRes.status === 200, 'Status code is 200 OK', `Got ${catRes.status}`);
    assert(catData.count === 1, 'Returns 1 software account', `Got ${catData.count}`);
    assert(catData.data[0]?.serviceName === 'GitHub', 'Filtered account is GitHub');

    // TEST 9: Tag filtering
    console.log('\n--- Test 9: Tag Filtering ---');
    const tagRes = await fetchWithRetry(`${BASE_URL}/api/v1/account?tag=music`, { headers: headersA });
    const tagData = await tagRes.json();
    assert(tagRes.status === 200, 'Status code is 200 OK', `Got ${tagRes.status}`);
    assert(tagData.count === 1, 'Returns 1 account with tag music', `Got ${tagData.count}`);
    assert(tagData.data[0]?.serviceName === 'Spotify', 'Filtered account is Spotify');

    // TEST 10: Searching by serviceName
    console.log('\n--- Test 10: Searching by serviceName ---');
    const searchRes = await fetchWithRetry(`${BASE_URL}/api/v1/account?search=net`, { headers: headersA });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'Status code is 200 OK', `Got ${searchRes.status}`);
    assert(searchData.count === 1, 'Returns 1 account matching "net"', `Got ${searchData.count}`);
    assert(searchData.data[0]?.serviceName === 'Netflix', 'Search returned Netflix');

    // TEST 11: Update account (PUT & PATCH)
    console.log('\n--- Test 11: Update Account (PUT & PATCH) ---');
    const updateRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, {
        method: 'PUT',
        headers: headersA,
        body: JSON.stringify({
            serviceName: 'Netflix Ultra',
            notes: 'Updated family note'
        })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Status code is 200 OK', `Got ${updateRes.status}`);
    assert(updateData.data?.serviceName === 'Netflix Ultra', 'Service name updated');
    assert(updateData.data?.notes === 'Updated family note', 'Notes updated');

    // TEST 12: Subscription with optional Account linkage & unlinking on Account deletion
    console.log('\n--- Test 12: Subscription with Optional Account Reference ---');
    const createSubRes = await fetchWithRetry(`${BASE_URL}/api/v1/subscription`, {
        method: 'POST',
        headers: headersA,
        body: JSON.stringify({
            name: 'Netflix 4K Subscription',
            price: 19.99,
            currency: 'USD',
            frequency: 'monthly',
            category: 'entertainment',
            paymentMethod: 'Credit Card',
            startDate: new Date().toISOString(),
            account: accountAId // Linking to Account
        })
    });
    const createSubData = await createSubRes.json();
    assert(createSubRes.status === 201, 'Created subscription linked to account', `Got ${createSubRes.status}`);
    const subId = createSubData.data?.subscription?._id;
    assert(createSubData.data?.subscription?.account === accountAId, 'Subscription references Account');

    // TEST 13: Delete Account (and ensure subscription is unlinked safely)
    console.log('\n--- Test 13: Delete Account & Safe Subscription Unlinking ---');
    const delRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, {
        method: 'DELETE',
        headers: headersA
    });
    assert(delRes.status === 200, 'Status code is 200 OK on delete', `Got ${delRes.status}`);

    // Verify account is gone
    const checkDeletedRes = await fetchWithRetry(`${BASE_URL}/api/v1/account/${accountAId}`, { headers: headersA });
    assert(checkDeletedRes.status === 404, 'Deleted account returns 404 Not Found', `Got ${checkDeletedRes.status}`);

    // Verify subscription still exists and account is unlinked (null)
    const checkSubRes = await fetchWithRetry(`${BASE_URL}/api/v1/subscription/${subId}`, { headers: headersA });
    const checkSubData = await checkSubRes.json();
    assert(checkSubRes.status === 200, 'Subscription still exists as independent domain', `Got ${checkSubRes.status}`);
    assert(checkSubData.data?.account === null, 'Subscription account reference was safely reset to null');

    // Clean up subscription
    await fetchWithRetry(`${BASE_URL}/api/v1/subscription/${subId}`, { method: 'DELETE', headers: headersA });

    // Clean up user accounts
    await fetchWithRetry(`${BASE_URL}/api/v1/user/${userAId}`, { method: 'DELETE', headers: headersA });
    await fetchWithRetry(`${BASE_URL}/api/v1/user/${userBId}`, { method: 'DELETE', headers: headersB });

    console.log(`\n================== TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED ==================`);
    if (failedCount > 0) {
        process.exit(1);
    }
}

runAccountTestSuite();
