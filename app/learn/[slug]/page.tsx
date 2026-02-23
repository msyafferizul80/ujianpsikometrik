"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ArrowLeft, Clock, Calendar, BookOpen, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ms } from "date-fns/locale";

// Minimal markdown renderer (no external lib needed)
function renderMarkdown(md: string): string {
    return md
        // Headings
        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 mt-6 mb-2">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-3 pb-2 border-b border-gray-100">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>')
        // Blockquote
        .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-indigo-400 bg-indigo-50 pl-4 py-2 pr-3 rounded-r-lg my-4 text-indigo-800 text-sm italic">$1</blockquote>')
        // Bold & Italic
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em class="italic text-gray-700">$1</em>')
        // Unordered list items
        .replace(/^- (.+)$/gm, '<li class="flex gap-2 text-gray-700 text-sm"><span class="text-indigo-500 mt-1 flex-shrink-0">•</span><span>$1</span></li>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li[\s\S]+?<\/li>)\n?(?=<li)/g, '$1')
        .replace(/(<li class[^>]+>[\s\S]+?<\/li>)/g, (match) => {
            return match.includes('<ul') ? match : `<ul class="space-y-2 my-4 ml-2">${match}</ul>`;
        })
        // Numbered list
        .replace(/^\d+\. (.+)$/gm, '<li class="text-gray-700 text-sm ml-4 list-decimal">$1</li>')
        // Paragraphs — double newlines
        .replace(/\n\n/g, '</p><p class="text-gray-700 leading-relaxed my-3">')
        // Wrap in opening p
        .replace(/^(?!<[hbul])/, '<p class="text-gray-700 leading-relaxed my-3">')
        + '</p>';
}

const CATEGORY_COLORS: Record<string, string> = {
    Emosi: "bg-rose-100 text-rose-700",
    Sosial: "bg-sky-100 text-sky-700",
    Komunikasi: "bg-emerald-100 text-emerald-700",
    Kepimpinan: "bg-amber-100 text-amber-700",
    Integriti: "bg-violet-100 text-violet-700",
    Tips: "bg-yellow-100 text-yellow-700",
    "Contoh Soalan": "bg-blue-100 text-blue-700",
};

export default function ArticlePage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const [article, setArticle] = useState<any>(null);
    const [related, setRelated] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;

        // Fetch by slug via API (GET with slug filter)
        fetch(`/api/admin/articles?slug=${encodeURIComponent(slug)}`)
            .then(r => r.json())
            .then(async d => {
                const found = (d.articles || []).find((a: any) => a.slug === slug);
                if (!found) { router.push('/learn'); return; }

                // Fetch full content if excerpt-only returned
                const full = await fetch(`/api/admin/articles?id=${found.id}`)
                    .then(r => r.json())
                    .then(d => d.articles?.[0] || found);
                setArticle(full);

                // Fetch related (same category, different article)
                fetch(`/api/admin/articles?category=${encodeURIComponent(full.category)}`)
                    .then(r => r.json())
                    .then(d => setRelated((d.articles || []).filter((a: any) => a.slug !== slug).slice(0, 3)));
            })
            .catch(() => router.push('/learn'))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return (
        <DashboardLayout>
            <div className="p-6 max-w-3xl mx-auto space-y-4">
                <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-lg" />
                <div className="h-12 bg-gray-100 animate-pulse rounded-xl" />
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-4 bg-gray-100 animate-pulse rounded" style={{ width: `${85 - i * 5}%` }} />
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );

    if (!article) return null;

    const catColor = CATEGORY_COLORS[article.category] || "bg-gray-100 text-gray-600";

    return (
        <DashboardLayout>
            <div className="p-6 max-w-3xl mx-auto space-y-8">
                {/* Back link */}
                <Link href="/learn" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium group">
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Kembali ke Pusat Ilmu
                </Link>

                {/* Article Header */}
                <div className="space-y-4">
                    <div className="text-7xl text-center py-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl">
                        {article.cover_emoji || "📚"}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${catColor}`}>
                            {article.category}
                        </span>
                        {(article.tags || []).map((tag: string) => (
                            <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                #{tag}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
                        {article.title}
                    </h1>

                    {article.excerpt && (
                        <p className="text-gray-500 text-base leading-relaxed border-l-4 border-indigo-200 pl-4 italic">
                            {article.excerpt}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 border-t border-b border-gray-100 py-3">
                        <span className="flex items-center gap-1.5 font-medium text-gray-600">
                            <BookOpen className="h-4 w-4 text-indigo-400" />
                            {article.author || "Empire Kerjaya"}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {article.reading_time} minit bacaan
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(article.created_at), "d MMMM yyyy", { locale: ms })}
                        </span>
                    </div>
                </div>

                {/* Article Content */}
                <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content || "") }}
                />

                {/* Related Articles */}
                {related.length > 0 && (
                    <div className="border-t border-gray-100 pt-8 space-y-4">
                        <h3 className="font-bold text-gray-800 text-lg">Artikel Berkaitan</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {related.map(rel => (
                                <Link
                                    key={rel.id}
                                    href={`/learn/${rel.slug}`}
                                    className="group flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                                >
                                    <span className="text-3xl">{rel.cover_emoji || "📚"}</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 line-clamp-2 leading-snug">
                                            {rel.title}
                                        </p>
                                        <p className="flex items-center gap-1 text-xs text-indigo-500 mt-1 font-medium">
                                            Baca <ChevronRight className="h-3 w-3" />
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
