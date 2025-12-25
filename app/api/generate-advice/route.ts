import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface RequestBody {
    scores: Record<string, { percentage: number }>;
}

export async function POST(request: Request) {
    let body: Partial<RequestBody> = {};
    const apiKey = process.env.GEMINI_API_KEY;

    try {
        const text = await request.text();
        try { body = JSON.parse(text); } catch (e) { console.error("JSON Parse Error:", e); }
        const scores = body.scores;

        if (!scores) throw new Error("Missing scores");

        const genAI = new GoogleGenerativeAI(apiKey || "");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
Anda adalah seorang pakar penilaian psikometrik untuk jawatan kerajaan (Penolong Pegawai Belia Dan Sukan Gred S5). 
Sila analisa keputusan ujian psikometrik calon berikut:

Markah Mengikut Teras:
- Kerjasama: ${scores.Kerjasama.percentage}%
- Emosi: ${scores.Emosi.percentage}%
- Komunikasi: ${scores.Komunikasi.percentage}%

Sila berikan "Laporan Penambahbaikan" yang profesional dan membina dalam Bahasa Melayu.
Format jawapan anda:
1. Ringkasan Keseluruhan (1 ayat)
2. Analisis Kekuatan (berdasarkan skor tinggi)
3. Cadangan Penambahbaikan (fokus kepada skor yang rendah jika ada)
4. Kata-kata semangat.

Pastikan nada profesional, tegas, tetapi membantu. Jangan gunakan markdown (bold/italic) yang berlebihan, cukup sekadar perenggan atau point.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const advice = response.text();

        return NextResponse.json({ advice });

    } catch (e: unknown) { // Use unknown instead of any
        console.error("Gemini API Error:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        return NextResponse.json({
            advice: generateMockAdviceContent(body as RequestBody), // Type assertion since we fallback
            debug: { error: errorMessage, apiKeyStatus: apiKey ? "Present" : "Missing" }
        });
    }
}

function generateMockAdviceContent(body: RequestBody) {
    const scores = body.scores;
    if (!scores || !scores.Kerjasama) {
        return "Data tidak lengkap untuk menjana laporan.";
    }

    const weakAreas: string[] = [];
    if (scores.Kerjasama.percentage < 70) weakAreas.push('Kerjasama');
    if (scores.Emosi.percentage < 70) weakAreas.push('Emosi');
    if (scores.Komunikasi.percentage < 70) weakAreas.push('Komunikasi');

    let advice = "";

    if (weakAreas.length === 0) {
        advice = "Tahniah! Anda menunjukkan tahap kompetensi yang tinggi dalam semua aspek psikometrik. Teruskan mengekalkan momentum positif ini.";
    } else {
        advice = `Berdasarkan keputusan anda, terdapat ruang penambahbaikan dalam aspek: ${weakAreas.join(', ')}. \n\n`;
        if (weakAreas.includes('Kerjasama')) {
            advice += "Untuk aspek Kerjasama: Cuba lebih terbuka dalam menerima pendapat rakan sekerja dan menyumbang tanpa mengharapkan balasan segera.\n";
        }
        if (weakAreas.includes('Emosi')) {
            advice += "Untuk aspek Emosi: Latih diri untuk kekal tenang dalam situasi tertekan. Jangan biarkan emosi mengawal tindakan profesional.\n";
        }
        if (weakAreas.includes('Komunikasi')) {
            advice += "Untuk aspek Komunikasi: Pastikan mesej disampaikan dengan jelas dan sopan. Dengar dahulu sebelum memberi respon.\n";
        }
        advice += "\n[Nota: Ini adalah laporan auto-generasi simulasi. Sila masukkan API Key untuk laporan AI sebenar.]";
    }

    return advice;
}
