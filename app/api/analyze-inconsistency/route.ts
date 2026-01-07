import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface Question {
    id: number;
    question: string;
    teras: string;
    options: { label: string; text: string }[];
}

export async function POST(req: Request) {
    try {
        const { answers, questions } = await req.json();

        // 1. Prepare Data for AI
        // We need to map Question Text + User Answer Text.
        // Input `questions` should be the list of Question Objects.
        // Input `answers` is Record<id, answerLabel>.

        // Filter only answered questions
        const answeredQuestions = questions.filter((q: Question) => answers[q.id]);

        // Create a map for ID -> Index (1-based)
        const idToIndexMap = new Map<number, number>();
        questions.forEach((q: Question, idx: number) => {
            idToIndexMap.set(q.id, idx + 1);
        });

        // Construct a simplified text representation to save tokens
        const analysisText = answeredQuestions.map((q: Question) => {
            const index = idToIndexMap.get(q.id);
            const userAnsLabel = answers[q.id];
            const userAnsText = q.options.find((o: { label: string; text: string }) => o.label === userAnsLabel)?.text || "";
            // Use Q{Index} instead of ID for the AI to see
            return `Q${index} (ID:${q.id}) (${q.teras}): "${q.question}" -> Answer: "${userAnsText}"`;
        }).join("\n");

        if (!analysisText) {
            return NextResponse.json({ inconsistencies: [] });
        }

        // 2. Prompt Engineering
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        BERTINDAK SEBAGAI PSIKOLOGIS SPA (Suruhanjaya Perkhidmatan Awam) YANG SKEMA & TELITI.
        
        Analisis pasangan Soalan-Jawapan berikut. 
        Cari sebarang percanggahan atau ketidakkonsistenan yang menunjukkan calon mungkin "menipu", "berlakon", atau "tidak tetap pendirian".
        
        Sila fokus kepada ciri personaliti:
        - Sosial vs Pendiam
        - Kepimpinan vs Pengikut
        - Emosi Stabil vs Cemas/Gelisah
        - Patuh Peraturan vs Memberontak
        
        ARAHAN KHAS:
        1. Jadilah SANGAT TELITI (Strict).
        2. Jangan abaikan percanggahan kecil (tanda sebagai MEDIUM).
        3. Senaraikan SEMUA isu yang ditemui (Sasaran: 5-7 isu jika ada).
        4. Tujuannya adalah untuk memberi laporan komprehensif kepada calon supaya mereka boleh memperbaiki diri.
        
        Senarai Q&A Calon:
        ${analysisText}
        
        Pulangkan output dalam format JSON SAHAJA. Tiadamarkdown. Tiada teks perbualan.
        "reason" mestilah dalam BAHASA MELAYU yang mudah difahami oleh calon.
        PENTING: Rujuk soalan menggunakan nombor urutan (Contoh: "Soalan 1", bukan "Soalan 1002").
        
        Format:
        {
            "score": 85,
            "inconsistencies": [
                {
                    "question1_id": 12, // Kekalkan ID asal dari input
                    "question2_id": 45,
                    "reason": "Dalam Soalan 1 anda kata suka parti, tapi dalam Soalan 5 anda kata benci orang ramai.",
                    "severity": "HIGH" | "MEDIUM"
                }
            ]
        }
        
        Logik Pemarkahan (Score):
        - Mula dengan 100%.
        - Tolak 10-15% untuk percanggahan HIGH (Ketara).
        - Tolak 5-8% untuk percanggahan MEDIUM (Sederhana).
        - Jika tiada isu, skor 100.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Clean up markdown block if present
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsedData = JSON.parse(text);

        // Handle potential different formats (robustness)
        let inconsistencies = Array.isArray(parsedData) ? parsedData : (parsedData.inconsistencies || []);
        const score = typeof parsedData.score === 'number' ? parsedData.score : (inconsistencies.length > 0 ? 50 : 100);

        // HYDRATION STEP: Enrich IDs with Text
        inconsistencies = inconsistencies.map((inc: any) => {
            let q1 = questions.find((q: Question) => q.id === inc.question1_id);
            let q2 = questions.find((q: Question) => q.id === inc.question2_id);

            // Fallback: If AI returned Index instead of ID (because we taught it to use Q1, Q2...)
            if (!q1 && typeof inc.question1_id === 'number') {
                // Assuming 1-based index from our prompt
                q1 = questions[inc.question1_id - 1];
            }
            if (!q2 && typeof inc.question2_id === 'number') {
                q2 = questions[inc.question2_id - 1];
            }

            // Get user's answer label safely
            // Use the REAL ID from the found question object, or fallback to the AI returned one if still not found
            const q1Id = q1 ? q1.id : inc.question1_id;
            const q2Id = q2 ? q2.id : inc.question2_id;

            const a1Label = answers[q1Id];
            const a2Label = answers[q2Id];

            // Get full answer text safely
            const a1Text = q1?.options.find((o: { label: string; text: string }) => o.label === a1Label)?.text;
            const a2Text = q2?.options.find((o: { label: string; text: string }) => o.label === a2Label)?.text;

            return {
                ...inc,
                question1_id: q1Id, // Standardize to Real ID
                question2_id: q2Id,
                question1_text: q1?.question || `Soalan ${inc.question1_id}`,
                question2_text: q2?.question || `Soalan ${inc.question2_id}`,
                answer1_text: a1Text || a1Label || "N/A",
                answer2_text: a2Text || a2Label || "N/A"
            };
        });

        return NextResponse.json({ score, inconsistencies });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return NextResponse.json({ error: "Failed to analyze consistency" }, { status: 500 });
    }
}
