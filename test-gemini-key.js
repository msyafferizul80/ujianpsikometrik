
const fs = require('fs');
const path = require('path');

// Load env locally manually since we are running via node directly
const envPath = path.join(__dirname, '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.error("Could not read .env.local", e);
    process.exit(1);
}

console.log("Testing Key:", apiKey ? apiKey.substring(0, 10) + "..." : "MISSING");

async function test() {
    if (!apiKey) {
        console.error("NO KEY FOUND.");
        return;
    }

    console.log("Testing Raw REST API...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const data = await response.json();
        console.log("Body:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Fetch Failed:", error);
    }
}

test();
