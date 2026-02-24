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
        const { jobRole, scenarioType } = await req.json();

        // 1. Auth check
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        let weakAreasContext = "Fokus pada soalan temuduga SPA yang umum.";
        let userId = null;

        if (token) {
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
                userId = user.id;
                // Fetch recent weak areas (similar to study plan)
                const { data: attempts } = await supabase
                    .from('attempts')
                    .select('teras_scores')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (attempts && attempts.length > 0) {
                    const terasTotal: Record<string, { sum: number; count: number }> = {};
                    attempts.forEach(a => {
                        const teras = a.teras_scores as Record<string, number> | null;
                        if (teras && typeof teras === 'object') {
                            for (const [key, val] of Object.entries(teras)) {
                                if (!terasTotal[key]) terasTotal[key] = { sum: 0, count: 0 };
                                terasTotal[key].sum += Number(val);
                                terasTotal[key].count += 1;
                            }
                        }
                    });

                    const weakAreas = Object.entries(terasTotal)
                        .map(([teras, { sum, count }]) => ({ teras, avg: Math.round(sum / count) }))
                        .filter(t => t.avg < 70) // Stricter threshold for interviews
                        .sort((a, b) => a.avg - b.avg)
                        .slice(0, 2)
                        .map(t => t.teras);

                    if (weakAreas.length > 0) {
                        weakAreasContext = `Calon mempunyai kelemahan dalam aspek Psikometrik berikut: ${weakAreas.join(', ')}. Sila tekankan soalan temuduga yang menguji kawasan ini secara tidak langsung.`;
                    }
                }
            }
        }

        // 2. Generate Questions via AI
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Use fast model
            generationConfig: { responseMimeType: "application/json" },
        });

        const prompt = `
        TUGAS: Jana SET SOALAN TEMUDUGA untuk jawatan kerajaan di Malaysia (SPA).
        
        JAWATAN DISASARKAN: ${jobRole || "Pegawai Tadbir dan Diplomatik (PTD)"}
        JENIS TEMUDUGA: ${scenarioType || "Tingkah Laku & Situasi (Behavioral)"}
        
        DATA PSIKOMETRIK BERBAYANG:
        ${weakAreasContext}
        
        ARAHAN: 
        1. Jana TEPAT 3 soalan temuduga yang mencabar, spesifik kepada konteks penjawat awam Malaysia.
        2. Soalan mestilah dalam Bahasa Melayu rasmi dan terarah kepada 'competency-based interview' atau pengalaman.
        3. Selitkan elemen integriti, tekanan kerja, atau perkhidmatan awam.
        
        FORMAT JSON YANG DIKEHENDAKI MESTI TEPAT BEGINI (tiada markdown):
        [
          {
            "id": "q1",
            "text": "Jika anda mendapati ketua jabatan anda mengarahkan proses perolehan dipintas untuk mempercepatkan kelulusan, apakah tindakan anda?",
            "focus": "Integriti & Kepimpinan"
          },
          ...
        ]
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const questionsJson = JSON.parse(text);

        // 3. Optional: Create db entry beforehand (if storing history)
        let interviewId = null;
        if (userId) {
            const { data: dbEntry } = await supabase.from('mock_interviews').insert({
                user_id: userId,
                job_role: jobRole || "General",
                scenario_type: scenarioType || "General",
                questions: questionsJson
            }).select('id').single();

            if (dbEntry) interviewId = dbEntry.id;
        }

        return NextResponse.json({
            interviewId,
            questions: questionsJson
        });

    } catch (err: any) {
        console.error("AI Mock Interview Generation Error:", err);
        return NextResponse.json({ error: "Gagal menjana soalan temuduga." }, { status: 500 });
    }
}
