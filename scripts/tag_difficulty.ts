import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
    console.error("Missing required environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Config
const BATCH_SIZE = 10;
const DELAY_MS = 2000;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function tagQuestions() {
    console.log("🚀 Starting Batch Tagging...");

    // 1. Fetch un-tagged questions (assuming default is 1, maybe we want to tag all that are exactly 1, or add a 'tagged' flag. For now, let's fetch all to re-tag to actual AI values)
    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, question, options, correct_answer')
        // We could filter where difficulty_level = 1 if that's the default and we haven't tagged it yet.
        // For safe rerun: maybe we should add a 'ai_tagged' boolean to questions table in the future.
        // For now, let's just fetch all.
        .order('id', { ascending: true });

    if (error) {
        console.error("❌ Failed to fetch questions:", error);
        return;
    }

    if (!questions || questions.length === 0) {
        console.log("✅ No questions found.");
        return;
    }

    console.log(`📦 Found ${questions.length} questions to process.`);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Process in batches
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questions.slice(i, i + BATCH_SIZE);
        console.log(`\n⏳ Processing batch ${i / BATCH_SIZE + 1} (${batch.length} questions)...`);

        const updates: { id: number, difficulty_level: number }[] = [];

        // We can process a single batch concurrently
        const promises = batch.map(async (q) => {
            const prompt = `
Analyze the following multiple-choice psychometric/logic question and determine its difficulty level on a scale of 1 to 5.
1 = Sangat Mudah (Very Easy): Obvious answer, direct logic.
2 = Mudah (Easy): Requires basic reading comprehension.
3 = Sederhana (Medium): Requires some analytical thinking or math calculation.
4 = Sukar (Hard): Complex logic, tricky wording, or advanced analytical reasoning.
5 = Sangat Sukar (Very Hard): "Killer question", highly confusing options, requires deep deduction.

Question: "${q.question}"
Options: ${JSON.stringify(q.options)}
Correct Answer: ${q.correct_answer}

Respond ONLY with a single integer between 1 and 5 representing the difficulty level. No other text.
`;
            try {
                const result = await model.generateContent(prompt);
                const responseText = result.response.text().trim();
                const difficulty = parseInt(responseText, 10);

                if (!isNaN(difficulty) && difficulty >= 1 && difficulty <= 5) {
                    updates.push({ id: q.id, difficulty_level: difficulty });
                    console.log(`   Task ${q.id} -> Level ${difficulty}`);
                } else {
                    console.warn(`   ⚠️ Invalid AI response for ${q.id}: "${responseText}"`);
                    updates.push({ id: q.id, difficulty_level: 1 }); // Fallback
                }
            } catch (err: any) {
                console.error(`   ❌ API Error for ${q.id}:`, err.message);
                updates.push({ id: q.id, difficulty_level: 1 }); // Fallback on error
            }
        });

        await Promise.all(promises);

        // Update database
        if (updates.length > 0) {
            // Supabase bulk update using UPSERT (requires all PK columns and update columns)
            // Or we can do individual updates if it's small enough. Let's do individual for safety with anon key
            for (const update of updates) {
                await supabase
                    .from('questions')
                    .update({ difficulty_level: update.difficulty_level })
                    .eq('id', update.id);
            }
            console.log(`✅ Batch ${i / BATCH_SIZE + 1} saved to database.`);
        }

        // Rate limiting delay
        await delay(DELAY_MS);
    }

    console.log("\n🎉 Batch Tagging Complete!");
}

tagQuestions().catch(console.error);
