
const line = "Cadangan Jawapan Terbaik: B – Setuju";

console.log("Testing Line:", line);

// Regex 1: Detection
const detectRegex = /^(Cadangan Jawapan Terbaik|Jawapan|Answer)\s*[\:\-]/i;
const detected = detectRegex.test(line); // "Cadangan Jawapan Terbaik:" matches
console.log("Detected?", detected);

// Regex 2: Extraction
const extractRegex = /[\:\-]\s*([A-E])/i;
const match = line.match(extractRegex);
console.log("Match Result:", match);

if (match) {
    console.log("Extracted Answer:", match[1].toUpperCase());
} else {
    console.log("Failed to extract");
}
