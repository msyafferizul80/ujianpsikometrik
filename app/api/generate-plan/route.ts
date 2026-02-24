import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { examDate, availableDays, dailyHours, focusArea, userId, jobRole } = await req.json();

        // ── 1. Fetch user's weak areas from quiz history ──────────────────────
        let weakAreasContext = "Tiada data kelemahan khusus — gunakan jadual seimbang.";
        let weakAreas: string[] = [];

        if (userId) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Get last 5 attempts with teras breakdown
            const { data: attempts } = await supabase
                .from('attempts')
                .select('teras_scores, score, quizzes(total_questions)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(5);

            if (attempts && attempts.length > 0) {
                // Aggregate teras scores across recent attempts
                const terasTotal: Record<string, { sum: number; count: number }> = {};

                for (const attempt of attempts) {
                    const teras = attempt.teras_scores as Record<string, number> | null;
                    if (teras && typeof teras === 'object') {
                        for (const [key, val] of Object.entries(teras)) {
                            if (!terasTotal[key]) terasTotal[key] = { sum: 0, count: 0 };
                            terasTotal[key].sum += Number(val);
                            terasTotal[key].count += 1;
                        }
                    }
                }

                // Find weak areas (average < 60%)
                weakAreas = Object.entries(terasTotal)
                    .map(([teras, { sum, count }]) => ({ teras, avg: Math.round(sum / count) }))
                    .filter(t => t.avg < 60)
                    .sort((a, b) => a.avg - b.avg)
                    .map(t => `${t.teras} (purata ${t.avg}%)`);

                if (weakAreas.length > 0) {
                    weakAreasContext = `Kelemahan calon yang perlu diberi perhatian lebih:\n${weakAreas.map(w => `  - ${w}`).join('\n')}`;
                } else {
                    weakAreasContext = "Calon menunjukkan prestasi baik dalam semua teras — gunakan jadual seimbang untuk penguatan.";
                }
            }
        }

        // ── 2. Build prompt ───────────────────────────────────────────────────
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" },
        });

        const daysUntilExam = Math.ceil(
            (new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const prompt = `
        ANDA ADALAH PAKAR STRATEGI PEPERIKSAAN PSIKOPRO SPA MALAYSIA.
        
        Jana jadual ulangkaji yang PERSONAL dan PRAKTIKAL berdasarkan maklumat berikut:
        
        MAKLUMAT CALON:
        - Tarikh Hari Ini: ${new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' })}
        - Tarikh Peperiksaan: ${new Date(examDate).toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' })}
        - Baki Hari: ${daysUntilExam} hari
        - Hari Kelapangan: ${availableDays.join(', ')}
        - Masa Belajar Sehari: ${dailyHours} jam
        - Jawatan Disasarkan: ${jobRole || 'Tidak dinyatakan'}
        - Fokus Utama: ${focusArea === 'all' ? 'Seimbang (Semua Teras)' : focusArea}
        
        ANALISIS KELEMAHAN DARI SEJARAH KUIZ:
        ${weakAreasContext}
        
        TOPIK PSIKOPRO SPA:
        1. Emosi — Kestabilan emosi, kawalan diri, kejujuran
        2. Sosial — Interaksi, empati, kerja berpasukan
        3. Komunikasi — Penyampaian, mendengar, asertif
        4. Kepimpinan — Inisiatif, penyelesaian masalah, disiplin
        5. Integriti — Amanah, profesionalisme, keakuran peraturan
        
        ARAHAN TEGAS:
        1. JANGAN ulang tarikh — setiap sesi pada tarikh BERBEZA dan BERTURUTAN.
        2. HANYA gunakan hari dalam senarai kelapangan: ${availableDays.join(', ')}.
        3. UTAMAKAN topik yang lemah di awal jadual, baru topik lain.
        4. Setiap sesi mesti ada "activity" yang SPESIFIK dan boleh dilakukan (contoh latihan soal, baca nota, simulasi).
        5. Masukkan "intensity" untuk setiap sesi: "Low" | "Medium" | "High".
        6. Sesi terakhir sebelum exam mesti "Revision Keseluruhan / Simulasi Penuh".
        7. Cadangkan maksimum ${Math.min(daysUntilExam, 20)} sesi sahaja.
        
        FORMAT JSON TEPAT (tiada markdown):
        {
            "summary": "Gambaran keseluruhan jadual dalam 1-2 ayat",
            "totalSessions": 10,
            "weakAreasFocus": ["Emosi", "Komunikasi"],
            "plan": [
                {
                    "date": "2026-02-25",
                    "topic": "Kestabilan Emosi",
                    "teras": "Emosi",
                    "type": "Revision",
                    "intensity": "Medium",
                    "activity": "Buat 20 soalan latihan teras Emosi. Fokus soalan tentang reaksi terhadap tekanan kerja.",
                    "duration": "${dailyHours} jam",
                    "tips": "Bayangkan situasi sebenar sebagai penjawat awam semasa menjawab."
                }
            ]
        }
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const parsedData = JSON.parse(text);

        // ── 3. Deduplicate dates (failsafe) ───────────────────────────────────
        if (parsedData.plan && Array.isArray(parsedData.plan)) {
            const seenDates = new Set<string>();
            parsedData.plan = parsedData.plan
                .filter((item: any) => {
                    const dateStr = new Date(item.date).toISOString().split('T')[0];
                    if (seenDates.has(dateStr)) return false;
                    seenDates.add(dateStr);
                    return true;
                })
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        return NextResponse.json(parsedData);

    } catch (error) {
        console.error("Plan Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
    }
}
