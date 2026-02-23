"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Loader2, Plus, Trash2, Edit2, Eye, EyeOff, Sparkles, X,
    BookOpen, Check, RefreshCw, Zap, CheckCircle2, XCircle, Settings, Tag
} from "lucide-react";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────
type Category = { id: string; name: string; emoji: string; color_class: string };
type Article = { id: string; title: string; slug: string; excerpt: string; category: string; cover_emoji: string; reading_time: number; published: boolean; created_at: string };
type Mode = "ai" | "manual" | "batch" | "categories";

function toSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);
}

// ── Color options for new categories ─────────────────────────
const COLOR_OPTIONS = [
    { label: "Merah", value: "bg-rose-100 text-rose-700" },
    { label: "Biru", value: "bg-sky-100 text-sky-700" },
    { label: "Hijau", value: "bg-emerald-100 text-emerald-700" },
    { label: "Oren", value: "bg-amber-100 text-amber-700" },
    { label: "Ungu", value: "bg-violet-100 text-violet-700" },
    { label: "Kuning", value: "bg-yellow-100 text-yellow-700" },
    { label: "Indigo", value: "bg-indigo-100 text-indigo-700" },
    { label: "Pink", value: "bg-pink-100 text-pink-700" },
    { label: "Abu-abu", value: "bg-gray-100 text-gray-700" },
];

// ── Premium emoji picker options ──────────────────────────────
const EMOJI_OPTIONS = [
    // Psikometrik & Kerjaya
    "🎯", "🏆", "💼", "📋", "🎓", "🧠", "💡", "🔑", "⭐", "🌟",
    // Emosi & Komunikasi
    "❤️", "🤝", "💬", "🗣️", "😊", "💪", "🙌", "👏", "🫶", "✨",
    // Kepimpinan & Integriti
    "🛡️", "👑", "🚀", "🌈", "⚡", "🔥", "💎", "🌙", "☀️", "🎖️",
    // Ilmu & Latihan
    "📚", "📖", "📝", "✏️", "🔍", "📊", "📈", "🗂️", "📌", "🏅",
    // Umum
    "🌿", "🎪", "🎨", "🧩", "🔮", "🌊", "🦁", "🦅", "🌺", "💫",
];


export default function AdminArticlesPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingArticles, setLoadingArticles] = useState(true);
    const [loadingCats, setLoadingCats] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState<Mode>("ai");
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Batch state
    const [batchCategories, setBatchCategories] = useState<string[]>([]);
    const [batchRunning, setBatchRunning] = useState(false);
    const [batchDone, setBatchDone] = useState(false);
    const [batchResults, setBatchResults] = useState<{ category: string; title: string; success: boolean; error?: string }[]>([]);

    // AI form
    const [aiTopic, setAiTopic] = useState("");
    const [aiCategory, setAiCategory] = useState("");
    const [aiType, setAiType] = useState("article");
    const [aiPreview, setAiPreview] = useState<any>(null);

    // Manual / edit form
    const [editingArticle, setEditingArticle] = useState<any>(null);
    const [formTitle, setFormTitle] = useState("");
    const [formSlug, setFormSlug] = useState("");
    const [formExcerpt, setFormExcerpt] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formCategory, setFormCategory] = useState("");
    const [formEmoji, setFormEmoji] = useState("📚");
    const [formReadingTime, setFormReadingTime] = useState("5");

    // Category management
    const [newCatName, setNewCatName] = useState("");
    const [newCatEmoji, setNewCatEmoji] = useState("📚");
    const [newCatColor, setNewCatColor] = useState("bg-gray-100 text-gray-700");
    const [savingCat, setSavingCat] = useState(false);
    const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

    // ── Fetchers ────────────────────────────────────────────
    const fetchCategories = useCallback(async () => {
        setLoadingCats(true);
        try {
            const d = await fetch('/api/admin/categories').then(r => r.json());
            const cats: Category[] = d.categories || [];
            setCategories(cats);
            if (cats.length > 0) {
                setAiCategory(cats[0].name);
                setFormCategory(cats[0].name);
                setBatchCategories(cats.map(c => c.name));
            }
        } finally {
            setLoadingCats(false);
        }
    }, []);

    const fetchArticles = useCallback(async () => {
        setLoadingArticles(true);
        try {
            const d = await fetch('/api/admin/articles').then(r => r.json());
            setArticles(d.articles || []);
        } finally {
            setLoadingArticles(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
        fetchArticles();
    }, [fetchCategories, fetchArticles]);

    const catNames = categories.map(c => c.name);
    const catColorMap: Record<string, string> = Object.fromEntries(categories.map(c => [c.name, c.color_class]));

    // ── Category CRUD ────────────────────────────────────────
    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        setSavingCat(true);
        const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newCatName.trim(), emoji: newCatEmoji, color_class: newCatColor }),
        });
        const d = await res.json();
        if (res.ok) {
            setNewCatName(""); setNewCatEmoji("📚");
            fetchCategories();
        } else {
            alert(d.error || "Gagal tambah kategori.");
        }
        setSavingCat(false);
    };

    const handleDeleteCategory = async (cat: Category) => {
        if (!confirm(`Padam kategori "${cat.name}"? Artikel dalam kategori ini tidak akan dipadam.`)) return;
        setDeletingCatId(cat.id);
        await fetch('/api/admin/categories', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: cat.id }),
        });
        setDeletingCatId(null);
        fetchCategories();
    };

    // ── Article actions ──────────────────────────────────────
    const openEdit = async (article: Article) => {
        const d = await fetch(`/api/admin/articles?id=${article.id}`).then(r => r.json());
        const full = d.articles?.[0] || article;
        setEditingArticle(full);
        setFormTitle(full.title || ""); setFormSlug(full.slug || "");
        setFormExcerpt(full.excerpt || ""); setFormContent(full.content || "");
        setFormCategory(full.category || catNames[0] || "");
        setFormEmoji(full.cover_emoji || "📚"); setFormReadingTime(String(full.reading_time || 5));
        setMode("manual"); setAiPreview(null); setShowModal(true);
    };

    const handleGenerateAI = async () => {
        if (!aiTopic.trim()) { alert("Masukkan topik artikel."); return; }
        setGenerating(true); setAiPreview(null);
        const res = await fetch('/api/admin/articles/generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: aiTopic, category: aiCategory, type: aiType }),
        });
        const data = await res.json();
        if (res.ok) setAiPreview({ ...data, category: aiCategory });
        else alert(data.error || "Gagal jana artikel.");
        setGenerating(false);
    };

    const handleSaveAI = async () => {
        if (!aiPreview) return;
        setSaving(true);
        const res = await fetch('/api/admin/articles', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...aiPreview, author: 'Empire Kerjaya', published: true }),
        });
        const d = await res.json();
        if (res.ok) { setShowModal(false); setAiPreview(null); setAiTopic(""); fetchArticles(); }
        else alert(d.error || "Gagal simpan.");
        setSaving(false);
    };

    const handleSaveManual = async () => {
        if (!formTitle.trim() || !formContent.trim()) { alert("Tajuk dan kandungan diperlukan."); return; }
        setSaving(true);
        const payload = { title: formTitle, slug: formSlug || toSlug(formTitle), excerpt: formExcerpt, content: formContent, category: formCategory, cover_emoji: formEmoji, reading_time: parseInt(formReadingTime), author: 'Empire Kerjaya', published: true };
        const method = editingArticle ? 'PUT' : 'POST';
        const body = editingArticle ? { id: editingArticle.id, ...payload } : payload;
        const res = await fetch('/api/admin/articles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await res.json();
        if (res.ok) { setShowModal(false); fetchArticles(); }
        else alert(d.error || "Gagal simpan.");
        setSaving(false);
    };

    const togglePublished = async (article: Article) => {
        setTogglingId(article.id);
        await fetch('/api/admin/articles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: article.id, published: !article.published }) });
        setArticles(prev => prev.map(a => a.id === article.id ? { ...a, published: !a.published } : a));
        setTogglingId(null);
    };

    const handleDelete = async (article: Article) => {
        if (!confirm(`Padam artikel "${article.title}"?`)) return;
        await fetch('/api/admin/articles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: article.id }) });
        fetchArticles();
    };

    const handleBatchGenerate = async () => {
        if (batchCategories.length === 0) { alert("Pilih sekurang-kurangnya satu kategori."); return; }
        setBatchRunning(true); setBatchDone(false); setBatchResults([]);
        try {
            const d = await fetch('/api/admin/articles/batch-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categories: batchCategories }) }).then(r => r.json());
            setBatchResults(d.results || []); setBatchDone(true); fetchArticles();
        } catch { alert("Ralat semasa batch generate."); }
        setBatchRunning(false);
    };

    const toggleBatchCat = (cat: string) => setBatchCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

    // ── Render ───────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <BookOpen className="h-8 w-8 text-indigo-600" /> Pengurusan Artikel
                        </h1>
                        <p className="text-gray-500 mt-1">Pusat Ilmu — Empire Kerjaya · {articles.length} artikel · {categories.length} kategori</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => { setMode("categories"); setShowModal(true); }} variant="outline" className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50">
                            <Tag className="h-4 w-4" /> Urus Kategori
                        </Button>
                        <Button onClick={() => { setMode("batch"); setBatchDone(false); setBatchResults([]); setShowModal(true); }} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-2">
                            <Zap className="h-4 w-4" /> Jana Batch
                        </Button>
                        <Button onClick={() => { setMode("ai"); setAiPreview(null); setShowModal(true); }} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white gap-2">
                            <Sparkles className="h-4 w-4" /> Jana AI
                        </Button>
                        <Button variant="outline" onClick={() => { setEditingArticle(null); setFormTitle(""); setFormSlug(""); setFormExcerpt(""); setFormContent(""); setFormCategory(catNames[0] || ""); setFormEmoji("📚"); setFormReadingTime("5"); setMode("manual"); setAiPreview(null); setShowModal(true); }} className="gap-2">
                            <Plus className="h-4 w-4" /> Tulis Manual
                        </Button>
                    </div>
                </div>

                {/* Articles Table */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Senarai Artikel</CardTitle></CardHeader>
                    <CardContent>
                        {loadingArticles ? (
                            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead>Artikel</TableHead>
                                            <TableHead>Kategori</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Tarikh</TableHead>
                                            <TableHead className="text-right">Tindakan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {articles.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">Tiada artikel. Klik "Jana AI" atau "Jana Batch" untuk mula!</TableCell></TableRow>
                                        ) : articles.map(article => (
                                            <TableRow key={article.id} className="hover:bg-gray-50/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{article.cover_emoji || "📚"}</span>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{article.title}</p>
                                                            <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{article.excerpt}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catColorMap[article.category] || "bg-gray-100 text-gray-600"}`}>
                                                        {article.category}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <button onClick={() => togglePublished(article)} disabled={togglingId === article.id}
                                                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-all ${article.published ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}>
                                                        {togglingId === article.id ? <Loader2 className="h-3 w-3 animate-spin" /> : article.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                                        {article.published ? "Terbit" : "Draf"}
                                                    </button>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">{format(new Date(article.created_at), "d/M/yyyy")}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => openEdit(article)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(article)} className="text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ────────── Modal ────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8">
                        {/* Modal Tabs */}
                        <div className="flex items-center justify-between p-5 border-b">
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { id: "categories", label: "Urus Kategori", icon: Tag, color: "bg-teal-600" },
                                    { id: "batch", label: "Jana Batch", icon: Zap, color: "bg-violet-600" },
                                    { id: "ai", label: "Jana AI", icon: Sparkles, color: "bg-indigo-600" },
                                    { id: "manual", label: editingArticle ? "Edit" : "Manual", icon: Edit2, color: "bg-gray-700" },
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => setMode(tab.id as Mode)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mode === tab.id ? `${tab.color} text-white` : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                        <tab.icon className="h-3 w-3" /> {tab.label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => { setShowModal(false); setAiPreview(null); setEditingArticle(null); }} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">

                            {/* ── Urus Kategori ── */}
                            {mode === "categories" && (
                                <div className="space-y-5">
                                    {/* Add form */}
                                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                                        <p className="text-sm font-semibold text-teal-900">➕ Tambah Kategori Baru</p>
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-500 font-medium">Pilih Emoji</label>
                                            {/* Selected preview */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-white border-2 border-teal-400 flex items-center justify-center text-2xl shadow-sm select-none">
                                                    {newCatEmoji}
                                                </div>
                                                <span className="text-xs text-gray-400">Emoji yang dipilih</span>
                                            </div>
                                            {/* Emoji picker grid */}
                                            <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto p-1 bg-white border rounded-xl">
                                                {EMOJI_OPTIONS.map(emoji => (
                                                    <button key={emoji} type="button" onClick={() => setNewCatEmoji(emoji)}
                                                        className={`text-xl p-1 rounded-lg transition-all hover:bg-teal-50 hover:scale-110 ${newCatEmoji === emoji ? 'bg-teal-100 ring-2 ring-teal-400 scale-110' : ''}`}>
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="Nama kategori..." />
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500">Warna badge</label>
                                            <div className="flex flex-wrap gap-2">
                                                {COLOR_OPTIONS.map(c => (
                                                    <button key={c.value} onClick={() => setNewCatColor(c.value)}
                                                        className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${c.value} ${newCatColor === c.value ? 'border-gray-800 scale-105' : 'border-transparent'}`}>
                                                        {c.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <Button onClick={handleAddCategory} disabled={savingCat || !newCatName.trim()} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                                            {savingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1.5" />Tambah Kategori</>}
                                        </Button>
                                    </div>

                                    {/* Existing categories */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">Kategori Semasa ({categories.length})</p>
                                        {loadingCats ? (
                                            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-teal-500" /></div>
                                        ) : categories.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-4">Tiada kategori.</p>
                                        ) : (
                                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                                {categories.map(cat => (
                                                    <div key={cat.id} className="flex items-center justify-between bg-gray-50 px-4 py-2.5 rounded-xl border">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl">{cat.emoji}</span>
                                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.color_class}`}>{cat.name}</span>
                                                        </div>
                                                        <button onClick={() => handleDeleteCategory(cat)} disabled={deletingCatId === cat.id}
                                                            className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50">
                                                            {deletingCatId === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Batch Mode ── */}
                            {mode === "batch" && (
                                <div className="space-y-4">
                                    {!batchRunning && !batchDone && (
                                        <>
                                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                                                <p className="text-sm font-semibold text-violet-900 mb-1">🚀 Jana Artikel Serentak</p>
                                                <p className="text-xs text-violet-700">AI akan jana <strong>2 artikel per kategori</strong> yang dipilih secara automatik.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">Pilih Kategori</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {catNames.map(cat => (
                                                        <button key={cat} onClick={() => toggleBatchCat(cat)}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${batchCategories.includes(cat) ? 'bg-violet-600 text-white border-violet-700' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'}`}>
                                                            {batchCategories.includes(cat) ? <Check className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-sm border border-current opacity-40" />}
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <button onClick={() => setBatchCategories([...catNames])} className="text-xs text-indigo-500 hover:underline">Pilih Semua</button>
                                                    <span className="text-gray-300">·</span>
                                                    <button onClick={() => setBatchCategories([])} className="text-xs text-gray-400 hover:underline">Nyahpilih Semua</button>
                                                </div>
                                            </div>
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                                ⏱️ Anggaran masa: <strong>{batchCategories.length * 2 * 5}–{batchCategories.length * 2 * 10} saat</strong> ({batchCategories.length * 2} artikel)
                                            </div>
                                            <Button onClick={handleBatchGenerate} disabled={batchRunning || batchCategories.length === 0} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold">
                                                <Zap className="mr-2 h-4 w-4" /> Mula Jana {batchCategories.length * 2} Artikel
                                            </Button>
                                        </>
                                    )}
                                    {batchRunning && (
                                        <div className="text-center py-8 space-y-4">
                                            <Loader2 className="h-10 w-10 animate-spin text-violet-500 mx-auto" />
                                            <p className="font-semibold text-gray-800">AI sedang menulis artikel...</p>
                                            <p className="text-sm text-gray-500">Proses ini mengambil masa 1-3 minit. Sila tunggu.</p>
                                        </div>
                                    )}
                                    {batchDone && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span className="font-semibold">{batchResults.filter(r => r.success).length} artikel berjaya dijana!</span>
                                            </div>
                                            <div className="max-h-52 overflow-y-auto space-y-2">
                                                {batchResults.map((r, i) => (
                                                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${r.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                                                        {r.success ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
                                                        <div><span className="font-semibold">[{r.category}]</span> {r.title}{r.error && <p className="text-red-500 text-[10px] mt-0.5">{r.error}</p>}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => { setBatchDone(false); setBatchResults([]); }} variant="outline" className="flex-1">Jana Lagi</Button>
                                                <Button onClick={() => setShowModal(false)} className="flex-1 bg-indigo-600 text-white">Tutup</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── AI Mode ── */}
                            {mode === "ai" && !aiPreview && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Topik / Tajuk Artikel</label>
                                        <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerateAI()}
                                            placeholder="Contoh: Cara mengawal emosi semasa tekanan kerja"
                                            className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Kategori</label>
                                            <select value={aiCategory} onChange={e => setAiCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                                {catNames.map(c => <option key={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Jenis Kandungan</label>
                                            <select value={aiType} onChange={e => setAiType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                                <option value="article">Artikel Informatif</option>
                                                <option value="tips">Tip & Teknik</option>
                                                <option value="example">Contoh Soalan</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Button onClick={handleGenerateAI} disabled={generating || !aiTopic.trim()} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                        {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI sedang menulis...</> : <><Sparkles className="mr-2 h-4 w-4" />Jana Artikel</>}
                                    </Button>
                                </>
                            )}

                            {/* ── AI Preview ── */}
                            {mode === "ai" && aiPreview && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span className="font-semibold text-gray-800">Artikel Berjaya Dijana!</span></div>
                                        <button onClick={() => setAiPreview(null)} className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Jana Semula</button>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border">
                                        <div className="flex items-center gap-2 text-2xl">{aiPreview.cover_emoji} <span className="font-bold text-base text-gray-900">{aiPreview.title}</span></div>
                                        <p className="text-sm text-gray-500 italic">{aiPreview.excerpt}</p>
                                        <div className="max-h-40 overflow-y-auto text-xs text-gray-600 whitespace-pre-wrap border-t pt-2">{aiPreview.content?.slice(0, 500)}...</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={handleSaveAI} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1.5" />Simpan & Terbit</>}
                                        </Button>
                                        <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
                                    </div>
                                </div>
                            )}

                            {/* ── Manual Mode ── */}
                            {mode === "manual" && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Tajuk</label>
                                            <input value={formTitle} onChange={e => { setFormTitle(e.target.value); if (!editingArticle) setFormSlug(toSlug(e.target.value)); }}
                                                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Tajuk artikel" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Emoji</label>
                                            <input value={formEmoji} onChange={e => setFormEmoji(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-center text-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Kategori</label>
                                            <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                                                {catNames.map(c => <option key={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Masa Bacaan (min)</label>
                                            <input value={formReadingTime} onChange={e => setFormReadingTime(e.target.value)} type="number" min="1" max="60" className="w-full px-3 py-2 border rounded-lg text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Ringkasan</label>
                                        <input value={formExcerpt} onChange={e => setFormExcerpt(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ringkasan 1-2 ayat" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 flex justify-between">
                                            <span>Kandungan (Markdown)</span>
                                            <span className="text-xs text-gray-400 font-normal">## Tajuk  **bold**  - senarai  {">"} petikan</span>
                                        </label>
                                        <textarea value={formContent} onChange={e => setFormContent(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono min-h-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            placeholder={"## Pengenalan\n\nTulis kandungan di sini..."} />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button onClick={handleSaveManual} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1.5" />{editingArticle ? "Kemaskini" : "Simpan"}</>}
                                        </Button>
                                        <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
