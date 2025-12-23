
async function verifyRateLimit() {
    const url = 'http://localhost:3030/api/customers/login';
    // Invalid payload to trigger 400 Bad Request
    const payload = {
        email: "invalid-email",
        password: "123"
    };

    console.log("Starting rate limit verification...");

    for (let i = 1; i <= 8; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log(`Request ${i}: Status ${response.status}`);

            if (response.status === 429) {
                console.log("✅ Rate limit triggered successfully!");
                const data = await response.json();
                console.log("Response:", data);
                return;
            }
        } catch (error) {
            console.error(`Request ${i} failed:`, error);
        }
    }

    console.log("❌ Rate limit NOT triggered after 8 attempts.");
}

verifyRateLimit();
