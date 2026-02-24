import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function toSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
}

export async function POST(req: Request) {
    try {
        const { topic, category, type } = await req.json();
        // type: 'article' | 'tips' | 'example'

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" },
        });

        const contentTypeGuide =
            type === 'tips' ? 'Senarai tip & teknik (5-8 poin) dengan penjelasan setiap satu.' :
                type === 'example' ? 'Contoh soalan PsikoPro (3-5 soalan) dengan penjelasan jawapan terbaik.' :
                    'Artikel informatif yang komprehensif dengan penjelasan mendalam.';

        const prompt = `
        ANDA ADALAH PENULIS KANDUNGAN PAKAR PSIKOPRO SPA dari EMPIRE KERJAYA.

        Jana artikel yang BERKUALITI TINGGI untuk platform pembelajaran PsikoPro.

        TOPIK: ${topic}
        KATEGORI: ${category}
        JENIS KANDUNGAN: ${contentTypeGuide}

        KEPERLUAN:
        1. Gunakan Bahasa Melayu yang PROFESIONAL dan MUDAH difahami.
        2. Format dalam Markdown yang kemas (gunakan ##, ###, **bold**, -, > blockquote).
        3. Panjang kandungan: 400-700 patah perkataan.
        4. Gunakan contoh situasi SEBENAR dalam konteks perkhidmatan awam Malaysia.
        5. Akhiri dengan bahagian "💡 Petua Akhir" berupa blockquote (>).
        6. Jangan tulis nama penulis dalam kandungan — ia akan dipapar secara automatik sebagai "Empire Kerjaya".

        FORMAT JSON TEPAT:
        {
            "title": "Tajuk artikel yang menarik dan spesifik",
            "excerpt": "Ringkasan 1-2 ayat yang memikat pembaca",
            "content": "Kandungan penuh dalam format Markdown",
            "cover_emoji": "Emoji yang relevan (1 sahaja)",
            "reading_time": 5,
            "tags": ["tag1", "tag2", "tag3"]
        }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(text);

        return NextResponse.json({
            title: data.title,
            excerpt: data.excerpt,
            content: data.content,
            cover_emoji: data.cover_emoji || "📚",
            reading_time: data.reading_time || 5,
            tags: data.tags || [],
            slug: toSlug(data.title),
        });

    } catch (error) {
        console.error("Article generation error:", error);
        return NextResponse.json({ error: "Gagal jana artikel" }, { status: 500 });
    }
}
