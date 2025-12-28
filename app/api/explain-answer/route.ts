import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Remove top-level init
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { questionId, questionText, userAnswer, correctAnswer, correctAnswerText, userAnswerText, teras } = await req.json();

        // 1. Check Cache
        const { data: cached } = await supabase
            .from('ai_explanation_cache')
            .select('explanation_text')
            .eq('question_id', questionId)
            .eq('wrong_answer_label', userAnswer)
            .single();

        if (cached) {
            return NextResponse.json({ explanation: cached.explanation_text, source: 'cache' });
        }

        // 2. Check API Key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // Mock Response for Dev/No-Key environment
            console.warn("Missing GEMINI_API_KEY, returning mock explanation.");
            const mockExplanation = `[Mock AI] Kerana ini adalah ujian psikometrik integriti, jawapan "${correctAnswer}" menunjukkan nilai ${teras || 'positif'} yang lebih tinggi berbanding "${userAnswer}". Dalam perkhidmatan awam, pematuhan kepada peraturan dan kejujuran diutamakan.`;
            return NextResponse.json({ explanation: mockExplanation, source: 'mock' });
        }

        // 3. Generate with AI (Try-Catch Wrapper)
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let explanation = "";

        try {
            const prompt = `
            You are a Mentor for the Malaysian Government Entry Exam (Psikometrik).
            
            Context:
            - Teras: ${teras}
            - Question: "${questionText}"
            - Candidate's Wrong Answer: "${userAnswer}" (${userAnswerText})
            - Correct Answer: "${correctAnswer}" (${correctAnswerText})
            
            Task:
            Explain briefly (max 3 sentences) why the Correct Answer is better suited for a Public Servant (Penjawat Awam) role compared to the Candidate's answer.
            Focus on values: Integrity, Teamwork, Hierarchy, Neutrality, Discipline.
            
            Tone: Professional, Encouraging, Educational.
            Language: Bahasa Melayu.
            `;

            const result = await model.generateContent(prompt);
            explanation = result.response.text();

        } catch (geminiError: any) {
            console.error("Gemini Critical Error:", geminiError);
            if (geminiError.response) {
                console.error("Gemini Response Error:", JSON.stringify(geminiError.response, null, 2));
            }

            // Soften the user message - Removed "Ralat API" to reduce panic
            explanation = `[AI Simulasi] Maaf, sambungan ke server AI terganggu sebentar. Jawapan contoh: Kerana ini adalah ujian psikometrik integriti, jawapan "${correctAnswer}" menunjukkan nilai ${teras || 'positif'} yang lebih tinggi berbanding "${userAnswer}". Dalam perkhidmatan awam, pematuhan kepada peraturan dan kejujuran diutamakan.`;
        }

        // 4. Save to Cache
        try {
            await supabase.from('ai_explanation_cache').insert({
                question_id: questionId,
                wrong_answer_label: userAnswer,
                explanation_text: explanation
            });
        } catch (e) {
            console.error("Cache insert failed (Table might be missing):", e);
        }

        return NextResponse.json({ explanation, source: 'ai' });

    } catch (error) {
        console.error("AI Explanation Error:", error);
        return NextResponse.json({ error: "Gagal menjana penjelasan. Sila cuba sebentar lagi." }, { status: 500 });
    }
}
