import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { examDate, availableDays, dailyHours, focusArea } = await req.json();

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        BERTINDAK SEBAGAI PERANCANG STRATEGI PEPERIKSAAN PROFESIONAL.
        
        Tugas anda adalah untuk membina jadual ulangkaji yang EFEKTIF untuk calon Ujian Psikometrik SPA.
        
        Maklumat Calon:
        - Tarikh Hari Ini: ${new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' })}
        - Tarikh Peperiksaan: ${examDate}
        - Hari Kelapangan: ${availableDays.join(', ')}
        - Masa Sehari: ${dailyHours} jam
        - Fokus Utama: ${focusArea === 'all' ? 'Seimbang (Semua Topik)' : focusArea}

        Topik Ujian Psikometrik merangkumi:
        1. Emosi (Kestabilan, Kejujuran)
        2. Komunikasi (Hubungan Sosial, Interaksi)
        3. Daya Tahan (Kepimpinan, Disiplin)
        4. Profesionalisme (Integriti, Kerjasama)

        ARAHAN TEGAS:
        1. JANGAN ULANG TARIKH YANG SAMA. Setiap sesi mesti pada tarikh yang BERBEZA.
        2. Susun tarikh secara BERTURUTAN (Kronologi) dari HARI INI sehingga TARIKH PEPERIKSAAN.
        3. HANYA masukkan hari yang calon 'available' (${availableDays.join(', ')}).
        4. Jika tarikh sudah dipilih, LOMPAT ke tarikh 'available' yang seterusnya.
        5. Contoh urutan salah: 9 Jan, 9 Jan, 12 Jan.
        6. Contoh urutan BETUL: 9 Jan (Jumaat), 12 Jan (Isnin), 14 Jan (Rabu).
        
        Pulangkan output dalam format JSON SAHAJA yang sah:
        {
            "plan": [
                {
                    "date": "2026-01-09",
                    "topic": "Emosi & Kestabilan",
                    "type": "Revision" | "Quiz" | "Simulation",
                    "activity": "Baca nota tentang pengurusan tekanan...",
                    "duration": "1 Jam",
                    "tips": "Fokus pada jawapan positif..."
                }
            ]
        }
        
        Jangan tambah markdown (\`\`\`json). Hanya JSON raw.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Clean up markdown block if present
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsedData = JSON.parse(text);

        // FAILSAFE: Deduplicate dates in case AI hallucinates again
        const uniquePlan = [];
        const seenDates = new Set();

        if (parsedData.plan && Array.isArray(parsedData.plan)) {
            for (const item of parsedData.plan) {
                // Normalize date string to avoid subtle differences
                const dateStr = new Date(item.date).toISOString().split('T')[0];
                if (!seenDates.has(dateStr)) {
                    seenDates.add(dateStr);
                    uniquePlan.push(item);
                }
            }
            parsedData.plan = uniquePlan.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        return NextResponse.json(parsedData);

    } catch (error) {
        console.error("Plan Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
    }
}
