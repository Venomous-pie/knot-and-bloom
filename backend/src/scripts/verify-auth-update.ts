
const API_URL = 'http://localhost:3030/api/customers';

const generateRandomString = () => Math.random().toString(36).substring(7);

async function verifyAuthUpdate() {
    console.log("Starting Auth Verification...");

    const uniqueEmail = `test_${generateRandomString()}@example.com`;
    const uniquePhone = `+1${Math.floor(Math.random() * 10000000000)}`;
    const password = 'password123';

    const post = async (url: string, body: any) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await response.json().catch(() => ({}));
        return { status: response.status, data };
    };

    // 1. Register with Email (No Name)
    try {
        console.log(`\n[Test 1] Register with Email (No Name): ${uniqueEmail}`);
        const res = await post(`${API_URL}/register`, {
            email: uniqueEmail,
            password: password
        });
        if (res.status === 201 && res.data.data.name) {
            console.log("✅ Passed - Name generated:", res.data.data.name);
        } else {
            console.error("❌ Failed", res.data);
        }
    } catch (error: any) {
        console.error("❌ Failed with error:", error.message);
    }

    // 2. Login with Email
    try {
        console.log(`\n[Test 2] Login with Email: ${uniqueEmail}`);
        const res = await post(`${API_URL}/login`, {
            email: uniqueEmail,
            password: password
        });
        if (res.status === 200) {
            console.log("✅ Passed");
        } else {
            console.error("❌ Failed", res.data);
        }
    } catch (error: any) {
        console.error("❌ Failed with error:", error.message);
    }

    // 3. Register with Phone (No Name)
    try {
        console.log(`\n[Test 3] Register with Phone: ${uniquePhone}`);
        const res = await post(`${API_URL}/register`, {
            phone: uniquePhone,
            password: password
        });
        if (res.status === 201 && res.data.data.name) {
            console.log("✅ Passed - Name generated:", res.data.data.name);
        } else {
            console.error("❌ Failed", res.data);
        }
    } catch (error: any) {
        console.error("❌ Failed with error:", error.message);
    }

    // 4. Login with Phone
    try {
        console.log(`\n[Test 4] Login with Phone: ${uniquePhone}`);
        const res = await post(`${API_URL}/login`, {
            phone: uniquePhone,
            password: password
        });
        if (res.status === 200) {
            console.log("✅ Passed");
        } else {
            console.error("❌ Failed", res.data);
        }
    } catch (error: any) {
        console.error("❌ Failed with error:", error.message);
    }

    // 5. Test Rate Limiting
    // We've made 4 requests so far (2 login, 2 register).
    // The limit is 5.
    // Let's make 2 more login failures to trigger it.
    console.log("\n[Test 5] Rate Limiting (Limit: 5)");
    try {
        // Request 5 (Remaining: 0)
        await post(`${API_URL}/login`, { email: 'fail@test.com', password: 'bad' });
        console.log("Request 5 sent.");

        // Request 6 (Should fail)
        console.log("Sending Request 6 (Should be rate limited)...");
        const res = await post(`${API_URL}/login`, { email: 'fail@test.com', password: 'bad' });

        if (res.status === 429) {
            console.log("✅ Passed - Rate limit triggered (429 Too Many Requests)");
        } else {
            console.error("❌ Failed - Rate limit did not trigger. Status:", res.status);
        }
    } catch (error: any) {
        console.error("❌ Failed - Unexpected error:", error.message);
    }
}

verifyAuthUpdate();
