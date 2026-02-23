import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function toSlug(title: string | undefined, suffix = ""): string {
    const raw = (title || `artikel-${Date.now()}`)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 70);
    return suffix ? `${raw}-${suffix}` : raw;
}

const BATCH_TOPICS: Record<string, { topic: string; type: string }[]> = {
    "Emosi": [
        { topic: "Cara mengawal emosi semasa tekanan kerja tinggi", type: "article" },
        { topic: "Teknik mengurus kemarahan di tempat kerja", type: "tips" },
    ],
    "Sosial": [
        { topic: "Membina hubungan positif dengan rakan sekerja", type: "article" },
        { topic: "Cara bekerja dalam pasukan yang berbeza pendapat", type: "tips" },
    ],
    "Komunikasi": [
        { topic: "Seni komunikasi berkesan dalam mesyuarat", type: "article" },
        { topic: "Cara menyampaikan idea dengan yakin kepada penyelia", type: "tips" },
    ],
    "Kepimpinan": [
        { topic: "Ciri-ciri pemimpin yang efektif dalam perkhidmatan awam", type: "article" },
        { topic: "Cara menunjukkan inisiatif tanpa diminta", type: "tips" },
    ],
    "Integriti": [
        { topic: "Erti amanah dan integriti dalam perkhidmatan awam Malaysia", type: "article" },
        { topic: "Cara menghadapi situasi konflik kepentingan", type: "tips" },
    ],
    "Tips": [
        { topic: "Strategi menjawab soalan psikometrik SPA dengan bijak", type: "tips" },
        { topic: "Kesilapan lazim calon semasa ujian psikometrik", type: "article" },
    ],
    "Contoh Soalan": [
        { topic: "Contoh soalan teras Emosi dan cara menjawab dengan betul", type: "example" },
        { topic: "Contoh soalan kepimpinan dan jawapan model penjawat awam", type: "example" },
    ],
};

async function generateSingleArticle(topic: string, category: string, type: string, attempt = 1): Promise<any> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" },
    });

    const contentTypeGuide =
        type === 'tips' ? 'Senarai tip dan teknik (5-8 poin) dengan penjelasan setiap satu.' :
            type === 'example' ? 'Contoh soalan psikometrik (3-5 soalan) dengan penjelasan jawapan terbaik.' :
                'Artikel informatif yang komprehensif.';

    const prompt = `
    ANDA ADALAH PENULIS KANDUNGAN PAKAR PSIKOMETRIK SPA dari EMPIRE KERJAYA.
    
    Topik: ${topic}
    Kategori: ${category}
    Jenis: ${contentTypeGuide}
    
    KEPERLUAN:
    1. Bahasa Melayu profesional dan mudah difahami.
    2. Format Markdown (##, ###, **bold**, -, blockquote dengan >).
    3. Panjang 350-600 patah perkataan.
    4. Gunakan contoh situasi sebenar perkhidmatan awam Malaysia.
    5. Akhiri dengan petua akhir sebagai blockquote.
    6. JANGAN gunakan tanda petik berganda (") dalam kandungan artikel. Guna petik tunggal (') sahaja.
    
    FORMAT JSON yang sah:
    {
        "title": "Tajuk menarik dalam Bahasa Melayu",
        "excerpt": "Ringkasan satu atau dua ayat",
        "content": "Kandungan penuh Markdown di sini",
        "cover_emoji": "📚",
        "reading_time": 4,
        "tags": ["tag1", "tag2"]
    }`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();

    // Extract first JSON object if AI adds surrounding text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    let parsed: any;
    try {
        parsed = JSON.parse(text);
    } catch {
        // Sanitise: strip control characters and fix lone backslashes
        const sanitized = text
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
            .replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
        try {
            parsed = JSON.parse(sanitized);
        } catch {
            if (attempt < 2) {
                console.warn(`JSON parse failed for "${topic}", retrying...`);
                return generateSingleArticle(topic, category, type, 2);
            }
            throw new Error(`JSON parse gagal selepas 2 percubaan`);
        }
    }

    return {
        title: (typeof parsed.title === 'string' && parsed.title) ? parsed.title : topic,
        excerpt: parsed.excerpt || "",
        content: parsed.content || "",
        cover_emoji: parsed.cover_emoji || "📚",
        reading_time: Number(parsed.reading_time) || 4,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
}

export async function POST(req: Request) {
    try {
        const { categories } = await req.json();

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const results: { category: string; title: string; success: boolean; error?: string }[] = [];
        const selectedCategories: string[] = categories?.length ? categories : Object.keys(BATCH_TOPICS);

        for (const category of selectedCategories) {
            // Fallback for dynamically created categories not in BATCH_TOPICS
            const topics = BATCH_TOPICS[category] || [
                { topic: `Pengenalan dan kepentingan ${category} dalam perkhidmatan awam`, type: "article" },
                { topic: `Cara mempraktikkan ${category} dengan cemerlang di tempat kerja`, type: "tips" }
            ];

            for (const { topic, type } of topics) {
                try {
                    const article = await generateSingleArticle(topic, category, type);
                    const slug = toSlug(article.title, Date.now().toString().slice(-4));

                    const { error } = await supabase.from('articles').insert({
                        title: article.title,
                        slug,
                        excerpt: article.excerpt,
                        content: article.content,
                        category,
                        tags: article.tags || [],
                        cover_emoji: article.cover_emoji || "📚",
                        reading_time: article.reading_time || 4,
                        author: 'Empire Kerjaya',
                        published: true,
                    });

                    results.push({ category, title: article.title, success: !error, error: error?.message });
                } catch (err: any) {
                    results.push({ category, title: topic, success: false, error: err.message });
                }
            }
        }

        const succeeded = results.filter(r => r.success).length;
        return NextResponse.json({ results, succeeded, total: results.length });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
