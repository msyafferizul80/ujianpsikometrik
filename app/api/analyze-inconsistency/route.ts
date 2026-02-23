import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface Question {
    id: number;
    question: string;
    teras: string;
    options: { label: string; text: string }[];
}

/** Round a score to the nearest 5 to reduce LLM jitter (e.g. 67 → 65) */
function calibrateScore(raw: number): number {
    return Math.round(raw / 5) * 5;
}

export async function POST(req: Request) {
    try {
        const { answers, questions, attempt_id } = await req.json();

        // ─── 0. Check cache first ──────────────────────────────────────────
        if (attempt_id) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: cached } = await supabase
                .from('attempts')
                .select('consistency_score, inconsistency_report')
                .eq('id', attempt_id)
                .single();

            if (cached?.consistency_score !== null && cached?.consistency_score !== undefined) {
                return NextResponse.json({
                    score: cached.consistency_score,
                    inconsistencies: cached.inconsistency_report ?? [],
                    cached: true,
                });
            }
        }

        // ─── 1. Prepare Data for AI ────────────────────────────────────────
        const answeredQuestions = questions.filter((q: Question) => answers[q.id]);

        const idToIndexMap = new Map<number, number>();
        questions.forEach((q: Question, idx: number) => {
            idToIndexMap.set(q.id, idx + 1);
        });

        const analysisText = answeredQuestions.map((q: Question) => {
            const index = idToIndexMap.get(q.id);
            const userAnsLabel = answers[q.id];
            const userAnsText = q.options.find((o: { label: string; text: string }) => o.label === userAnsLabel)?.text || "";
            return `Q${index} (ID:${q.id}) (${q.teras}): "${q.question}" -> Answer: "${userAnsText}"`;
        }).join("\n");

        if (!analysisText) {
            return NextResponse.json({ inconsistencies: [], score: 100 });
        }

        // ─── 2. AI Analysis (temperature=0 for determinism) ───────────────
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0,      // ← key: makes output deterministic
                responseMimeType: "application/json",
            },
        });

        const prompt = `
        ANDA ADALAH PAKAR PSIKOLOGI & PENILAI SPA (Suruhanjaya Perkhidmatan Awam) YANG BERPENGALAMAN.
        
        TUGAS: Analisis jawapan calon berikut dan kesan semua "Red Flag" — tanda yang menunjukkan calon mungkin BERLAKON, TIDAK JUJUR, atau TIDAK STABIL secara psikologi.
        
        JENIS PELANGGARAN (type) yang perlu dikesan:
        - "CONTRADICTORY"        → Dua jawapan yang bertentangan secara langsung (cth: kata suka orang ramai tapi kata introvert)
        - "SOCIALLY_DESIRABLE"   → Jawab apa yang "betul secara sosial" tapi tidak realistik (cth: "Saya tidak pernah marah langsung")
        - "BIASED"               → Semua jawapan condong ke arah "terlalu positif/sempurna" (tiada kelemahan langsung)
        - "INCONSISTENT_TRAIT"   → Trait personaliti tidak stabil — berubah-ubah merentas soalan yang berbeza

        ARAHAN KETAT:
        1. SANGAT TELITI — jangan abaikan percanggahan walaupun kecil.
        2. Sasaran: kesan 4-8 isu.
        3. Setiap isu MESTI ada "simulasi_pemikiran" — jawapan MODEL yang menunjukkan cara pemikiran penjawat awam SEBENAR yang matang dan jujur.
        4. "reason" dalam Bahasa Melayu, padat dan jelas.
        5. "simulasi_pemikiran" dalam Bahasa Melayu — tunjukkan cara berfikir yang betul, bukan sekadar kritikan.
        6. Rujuk soalan dengan nombor urutan (Soalan 1, Soalan 5) bukan ID.
        
        Senarai Q&A Calon:
        ${analysisText}
        
        Pulangkan JSON SAHAJA. Tiada markdown. Tiada teks lain.
        
        Format tepat:
        {
            "score": 75,
            "inconsistencies": [
                {
                    "question1_id": 12,
                    "question2_id": 45,
                    "severity": "HIGH",
                    "type": "SOCIALLY_DESIRABLE",
                    "bias_pattern": "Imej Sempurna — Tiada Kelemahan",
                    "reason": "Dalam Soalan 3, anda menyatakan tidak pernah rasa tertekan bekerja. Ini tidak realistik dan menunjukkan calon cuba memaparkan imej terlalu sempurna.",
                    "simulasi_pemikiran": "Penjawat awam yang matang akan mengakui tekanan kerja wujud: 'Saya kadangkala rasa tertekan, tetapi saya mengurusnya dengan membuat senarai kerja dan bertenang sebelum bertindak. Ini membantu saya kekal fokus.'"
                }
            ]
        }
        
        Logik Pemarkahan (score):
        - Mula 100.
        - Tolak 12-15% setiap isu HIGH.
        - Tolak 5-8% setiap isu MEDIUM.
        - Minimum 10 walaupun ada banyak isu.
        - Kalau tiada isu, skor 100.
        `;


        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsedData = JSON.parse(text);

        let inconsistencies = Array.isArray(parsedData) ? parsedData : (parsedData.inconsistencies || []);
        const rawScore = typeof parsedData.score === 'number' ? parsedData.score : (inconsistencies.length > 0 ? 50 : 100);

        // ─── 3. Calibration: round to nearest 5 ───────────────────────────
        const score = calibrateScore(rawScore);

        // ─── 4. Hydrate inconsistencies with question text ────────────────
        inconsistencies = inconsistencies.map((inc: { question1_id: number; question2_id: number; reason: string; severity: string }) => {
            let q1 = questions.find((q: Question) => q.id === inc.question1_id);
            let q2 = questions.find((q: Question) => q.id === inc.question2_id);

            if (!q1 && typeof inc.question1_id === 'number') q1 = questions[inc.question1_id - 1];
            if (!q2 && typeof inc.question2_id === 'number') q2 = questions[inc.question2_id - 1];

            const q1Id = q1 ? q1.id : inc.question1_id;
            const q2Id = q2 ? q2.id : inc.question2_id;
            const a1Label = answers[q1Id];
            const a2Label = answers[q2Id];
            const a1Text = q1?.options.find((o: { label: string; text: string }) => o.label === a1Label)?.text;
            const a2Text = q2?.options.find((o: { label: string; text: string }) => o.label === a2Label)?.text;

            return {
                ...inc,
                question1_id: q1Id,
                question2_id: q2Id,
                question1_text: q1?.question || `Soalan ${inc.question1_id}`,
                question2_text: q2?.question || `Soalan ${inc.question2_id}`,
                answer1_text: a1Text || a1Label || "N/A",
                answer2_text: a2Text || a2Label || "N/A"
            };
        });

        // ─── 5. Persist to DB (fire-and-forget) ───────────────────────────
        if (attempt_id) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            supabase
                .from('attempts')
                .update({
                    consistency_score: score,
                    inconsistency_report: inconsistencies,
                })
                .eq('id', attempt_id)
                .then(({ error }) => {
                    if (error) console.error('Failed to cache consistency score:', error.message);
                });
        }

        return NextResponse.json({ score, inconsistencies });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return NextResponse.json({ error: "Failed to analyze consistency" }, { status: 500 });
    }
}


