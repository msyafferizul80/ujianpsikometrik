"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BookOpen, Search, Clock, ChevronRight, Sparkles } from "lucide-react";

type Category = { id: string; name: string; emoji: string; color_class: string };

export default function LearnPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/categories').then(r => r.json()),
            fetch('/api/admin/articles').then(r => r.json()),
        ]).then(([catData, artData]) => {
            setCategories(catData.categories || []);
            setArticles(artData.articles || []);
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    // Color map from DB
    const catColorMap: Record<string, string> = Object.fromEntries(
        categories.map(c => [c.name, c.color_class])
    );

    const filtered = articles.filter(a => {
        const matchCat = activeCategory === "all" || a.category === activeCategory;
        const q = search.toLowerCase();
        const matchSearch = !q || a.title?.toLowerCase().includes(q) || a.excerpt?.toLowerCase().includes(q);
        return matchCat && matchSearch;
    });

    return (
        <DashboardLayout>
            <div className="p-6 max-w-6xl mx-auto space-y-8">
                {/* Hero */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 p-8 text-white shadow-xl">
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
                    />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-5 w-5 text-yellow-300" />
                            <span className="text-sm font-semibold text-indigo-200 uppercase tracking-widest">Empire Kerjaya</span>
                        </div>
                        <h1 className="text-4xl font-extrabold mb-2">Pusat Ilmu 📚</h1>
                        <p className="text-indigo-100 max-w-lg">
                            Nota, tip, dan contoh soalan psikometrik SPA yang dikurasi khas untuk anda berjaya dalam temuduga.
                        </p>
                        <div className="mt-5 flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-3 max-w-md">
                            <Search className="h-4 w-4 text-white/60" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Cari artikel, tip, contoh soalan..."
                                className="flex-1 bg-transparent text-white placeholder-white/50 text-sm outline-none" />
                        </div>
                    </div>
                </div>

                {/* Category Tabs — dynamic from DB */}
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setActiveCategory("all")}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 bg-gray-100 text-gray-700 transition-all ${activeCategory === "all" ? "ring-2 ring-offset-1 ring-indigo-400 shadow-md scale-105" : "opacity-75 hover:opacity-100"}`}>
                        📚 Semua
                    </button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.name)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold border border-transparent transition-all ${cat.color_class} ${activeCategory === cat.name ? "ring-2 ring-offset-1 ring-indigo-400 shadow-md scale-105" : "opacity-75 hover:opacity-100"}`}>
                            {cat.emoji} {cat.name}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{loading ? "Memuatkan..." : `${filtered.length} artikel dijumpai`}</span>
                    {search && <button onClick={() => setSearch("")} className="text-indigo-500 hover:underline text-xs">Padam carian</button>}
                </div>

                {/* Article Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Tiada artikel dalam kategori ini.</p>
                        <p className="text-sm mt-1">Cuba kategori lain atau minta admin tambah konten.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map(article => {
                            const catColor = catColorMap[article.category] || "bg-gray-100 text-gray-600";
                            return (
                                <Link key={article.id} href={`/learn/${article.slug}`}
                                    className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden">
                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 text-center text-5xl">
                                        {article.cover_emoji || "📚"}
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${catColor}`}>{article.category}</span>
                                            <span className="flex items-center text-[10px] text-gray-400 gap-1">
                                                <Clock className="h-2.5 w-2.5" /> {article.reading_time} min
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-indigo-600 transition-colors mb-2">{article.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 flex-1">{article.excerpt}</p>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                            <span className="text-xs text-gray-400">{article.author}</span>
                                            <span className="flex items-center text-xs font-semibold text-indigo-600">Baca <ChevronRight className="h-3 w-3" /></span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
