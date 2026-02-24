import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { interviewId, responses, jobRole } = await req.json();
        // responses = [{ q_text: "...", r_text: "..." }, ...]

        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: "Sila log masuk untuk menilai temuduga." }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Sesi tidak sah atau tamat." }, { status: 401 });
        }

        const userId = user.id;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" },
        });

        const prompt = `
        TUGAS: Anda adalah Panel Penemuduga Kanan Suruhanjaya Perkhidmatan Awam (SPA) Malaysia.
        Nilai respons calon untuk jawatan: ${jobRole || 'Sektor Awam'}

        DATA RESPONS CALON:
        ${JSON.stringify(responses, null, 2)}

        ARAHAN PENILAIAN:
        1. Analisis ketepatan, profesionalisme, struktur (cth: teknik STAR), dan kematangan dalam jawapan.
        2. Cari elemen integriti, kerja berpasukan, dan penyelesaian masalah.
        3. Beri markah keseluruhan (0-100).
        4. Kenal pasti 2-3 KEKUATAN utama.
        5. Kenal pasti 2-3 KELEMAHAN / RUANG PENAMBAHBAIKAN utama.
        6. Berikan ulasan perenggan ringkas bernada membina & profesional (Bahasa Melayu rasmi).

        FORMAT JSON YANG TEPAT (Tanpa Markdown):
        {
          "score": 85,
          "strengths": ["Menunjukkan sifat kepimpinan", "Penggunaan laras bahasa yang formal"],
          "weaknesses": ["Jawapan kurang spesifik pada situasi sebenar", "Boleh huraikan lebih lanjut impak tindakan"],
          "summary": "Calon menunjukkan potensi yang baik..."
        }
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const feedbackJson = JSON.parse(text);

        // Update DB
        if (interviewId && userId) {
            // Check ownership
            const { data: existing } = await supabase
                .from('mock_interviews')
                .select('user_id')
                .eq('id', interviewId)
                .single();

            if (existing && existing.user_id === userId) {
                await supabase
                    .from('mock_interviews')
                    .update({
                        responses: responses,
                        ai_feedback: feedbackJson,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', interviewId);
            }
        }

        return NextResponse.json(feedbackJson);

    } catch (err: any) {
        console.error("AI Interview Evaluation Error:", err);
        return NextResponse.json({ error: "Gagal menilai jawapan." }, { status: 500 });
    }
}
