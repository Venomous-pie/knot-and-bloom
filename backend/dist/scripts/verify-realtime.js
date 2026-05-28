import io from 'socket.io-client';
// import fetch from 'node-fetch'; // Use global fetch in Node 18+
const BASE_URL = 'http://localhost:3030/api';
const SOCKET_URL = 'http://localhost:3030';
async function main() {
    console.log("🚀 Starting Real-time Feature Verification...");
    // 1. Create User / Login
    const uniqueSuffix = Math.floor(Math.random() * 100000);
    const email = `realtime${uniqueSuffix}@test.com`;
    const password = 'password123';
    let token = '';
    let userId = 0;
    console.log(`\n1. Registering user: ${email}`);
    try {
        const regRes = await fetch(`${BASE_URL}/customers/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: 'Realtime Tester' })
        });
        const regData = await regRes.json();
        console.log("DEBUG: Registration response:", JSON.stringify(regData));
        if (!regRes.ok)
            throw new Error(JSON.stringify(regData));
        token = regData.token;
        userId = regData.data.uid;
        console.log("✅ User registered. ID:", userId);
    }
    catch (e) {
        console.error("Failed to register:", e.message);
        process.exit(1);
    }
    // 2. Connect Socket
    console.log("\n2. Connecting to Socket.io...");
    const socket = io(SOCKET_URL);
    socket.on('connect', () => {
        console.log("✅ Socket connected:", socket.id);
        // 3. Join Room
        socket.emit('join', `user_${userId}`);
        console.log(`✅ Joined room: user_${userId}`);
    });
    // 4. Test Chat
    const chatPromise = new Promise((resolve, reject) => {
        socket.on('chat:message', (data) => {
            console.log("✅ [EVENT] chat:message received:", data);
            if (data.message === 'Hello Realtime!') {
                resolve();
            }
        });
        // Timeout
        setTimeout(() => reject(new Error("Chat event timeout")), 10000);
    });
    console.log("\n3. Sending Chat Message...");
    await new Promise(r => setTimeout(r, 1000)); // Wait for join
    const chatRes = await fetch(`${BASE_URL}/chat/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId: userId, message: 'Hello Realtime!' }) // Self-message
    });
    if (!chatRes.ok) {
        console.error("Failed to send chat:", await chatRes.text());
        process.exit(1);
    }
    try {
        await chatPromise;
        console.log("✅ Chat verification passed!");
    }
    catch (e) {
        console.error("❌ Chat verification failed:", e.message);
    }
    // 5. Test Cart Sync
    // Need a product first.
    console.log("\n4. Fetching a product for Cart test...");
    let productsData = {};
    const productsRes = await fetch(`${BASE_URL}/products/get-product?limit=1`);
    if (!productsRes.ok) {
        console.error("Failed to fetch products:", await productsRes.text());
        // Don't exit, just skip cart test
        productsData = {};
    }
    else {
        try {
            // Clone response to verify text if json fails? No, just try catch.
            productsData = await productsRes.json();
        }
        catch (e) {
            console.error("Failed to parse products JSON. Response text preview:");
            console.error((await productsRes.text()).substring(0, 200));
            productsData = {};
        }
    }
    const productId = productsData.products?.[0]?.uid;
    if (!productId) {
        console.warn("⚠️ No products found. Skipping Cart verification.");
    }
    else {
        const cartPromise = new Promise((resolve, reject) => {
            socket.on('cart:updated', (data) => {
                console.log("✅ [EVENT] cart:updated received:", data);
                if (Number(data.customerId) === Number(userId)) {
                    resolve();
                }
            });
            setTimeout(() => reject(new Error("Cart event timeout")), 10000);
        });
        console.log(`\n5. Adding Product ${productId} to Cart...`);
        const cartRes = await fetch(`${BASE_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Though addToCart reads from body, usually
            },
            body: JSON.stringify({
                customerId: userId,
                productId,
                quantity: 1
            })
        });
        if (!cartRes.ok) {
            console.error("Failed to add to cart:", await cartRes.text());
        }
        else {
            try {
                await cartPromise;
                console.log("✅ Cart verification passed!");
            }
            catch (e) {
                console.error("❌ Cart verification failed:", e.message);
            }
        }
    }
    console.log("\n🏁 All verifications completed.");
    socket.disconnect();
    process.exit(0);
}
main().catch(console.error);
//# sourceMappingURL=verify-realtime.js.map