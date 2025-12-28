
const fs = require('fs');
const path = require('path');

// Load env locally
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

async function listModels() {
    if (!apiKey) {
        console.error("NO KEY FOUND.");
        return;
    }

    console.log("Listing Available Models...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        console.log(`Status: ${response.status} ${response.statusText}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Gemini Models:");
            data.models
                .filter(m => m.name.includes('gemini'))
                .forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("Error Body:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Fetch Failed:", error);
    }
}

listModels();
