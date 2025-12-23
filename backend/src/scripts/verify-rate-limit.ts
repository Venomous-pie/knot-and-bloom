
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3030/api/customers';

async function main() {
    console.log("Starting Rate Limit Verification...");

    // 1. Register a user
    const email = `ratelimit_${Date.now()}@test.com`;
    const password = 'Password123!';
    const wrongPassword = 'WrongPassword!';

    console.log(`\n1. Registering user: ${email}`);
    const regRes = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rate Limit Test', email, password })
    });

    if (!regRes.ok) {
        console.error("Registration failed:", await regRes.text());
        process.exit(1);
    }
    console.log("Registration successful.");

    // 2. Fail 5 times
    console.log("\n2. Intentional Failures (5 attempts)...");
    for (let i = 1; i <= 5; i++) {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: wrongPassword })
        });
        console.log(`Attempt ${i}: Status ${res.status}`);
        if (res.status === 429) {
            console.error("Prematurely blocked at attempt", i);
        }
    }

    // 3. 6th Attempt - Should actally be BLOCKED now?
    // The middleware checks BEFORE the controller. 
    // Attempts 1-5 called increment. After attempt 5, increment set blockExpiresAt.
    // So Attempt 6 should be blocked by middleware.
    console.log("\n3. Testing Block (Attempt 6)...");
    const blockRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: wrongPassword })
    });

    if (blockRes.status === 429) {
        const data = await blockRes.json();
        console.log("SUCCESS: Blocked as expected.");
        console.log("Retry-After:", data.retryAfter);

        if (data.retryAfter > 0) {
            console.log(`Waiting for ${data.retryAfter} seconds...`);
            await new Promise(r => setTimeout(r, (data.retryAfter + 1) * 1000));
        }
    } else {
        console.error("FAILED: Should have been blocked. Status:", blockRes.status);
    }

    // 4. Fail again - Should increase duration
    // Attempt 6 (the blocked one) did NOT increment attempts because middleware caught it.
    // So we need to fail at the controller level again to trigger the multiplier.
    console.log("\n4. Triggering next block level...");
    const failRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: wrongPassword })
    });
    console.log("Fail attempt status:", failRes.status); // Should be 401

    // Now attempts = 6. blockExpiresAt set with multiplier.

    console.log("Checking if blocked with longer duration...");
    const blockRes2 = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: wrongPassword })
    });

    if (blockRes2.status === 429) {
        const data = await blockRes2.json();
        console.log("SUCCESS: Blocked again.");
        console.log("New Retry-After:", data.retryAfter);
        if (data.retryAfter > 5) {
            console.log("SUCCESS: Duration increased (Exponential Backoff working).");
        } else {
            console.error("FAILED: Duration did not increase significantly.");
        }

        console.log(`Waiting for ${data.retryAfter} seconds...`);
        await new Promise(r => setTimeout(r, (data.retryAfter + 1) * 1000));
    } else {
        console.error("FAILED: Should have been blocked again.");
    }

    // 5. Success Reset
    console.log("\n5. Testing Success Reset...");
    const successRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (successRes.ok) {
        console.log("Login Successful.");
    } else {
        console.error("Login Failed:", await successRes.text());
    }

    // 6. Verify Reset (Should allow failure without block)
    console.log("\n6. Verifying Reset...");
    const postResetRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: wrongPassword })
    });

    if (postResetRes.status === 401) {
        console.log("SUCCESS: Not blocked immediately. Reset worked.");
    } else if (postResetRes.status === 429) {
        console.error("FAILED: Still blocked despite successful login.");
    } else {
        console.log("Status:", postResetRes.status);
    }
}

main().catch(console.error);
