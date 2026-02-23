"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag, Plus, Trash2, Loader2, Check, AlertCircle } from "lucide-react";

interface JobTag {
    id: string;
    name: string;
    created_at: string;
}

export default function TagManagerPage() {
    const [tags, setTags] = useState<JobTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTag, setNewTag] = useState("");
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchTags = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/job-tags');
            const data = await res.json();
            setTags(data.tags || []);
        } catch {
            setError("Gagal memuatkan senarai tag.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTags(); }, []);

    const showSuccess = (msg: string) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        setAdding(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/job-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTag.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Gagal menambah tag.");
            } else {
                setNewTag("");
                await fetchTags();
                showSuccess(`Tag "${data.tag.name}" berjaya ditambah.`);
            }
        } catch {
            setError("Gagal menambah tag. Cuba lagi.");
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteTag = async (tag: JobTag) => {
        if (!confirm(`Padam tag "${tag.name}"? Tag ini akan hilang dari semua quiz yang menggunakannya.`)) return;
        setDeletingId(tag.id);
        try {
            const res = await fetch('/api/admin/job-tags', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tag.id }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Gagal memadam tag.");
            } else {
                await fetchTags();
                showSuccess(`Tag "${tag.name}" berjaya dipadam.`);
            }
        } catch {
            setError("Gagal memadam tag. Cuba lagi.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Tag className="h-8 w-8 text-blue-600" />
                        Pengurusan Tag Jawatan
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Tambah atau padam pilihan tag jawatan yang tersedia untuk set soalan.
                    </p>
                </div>

                {/* Success / Error Toast */}
                {success && (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium animate-in slide-in-from-top">
                        <Check className="h-4 w-4 flex-shrink-0" />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm font-medium">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 text-xs">Tutup</button>
                    </div>
                )}

                {/* Add New Tag */}
                <Card className="border-blue-100 bg-blue-50/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Plus className="h-4 w-4 text-blue-600" />
                            Tambah Tag Baru
                        </CardTitle>
                        <CardDescription>Masukkan nama jawatan atau kategori baru.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newTag}
                                onChange={e => setNewTag(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                placeholder="Contoh: Pegawai Pembangunan Masyarakat"
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                disabled={adding}
                            />
                            <Button
                                onClick={handleAddTag}
                                disabled={!newTag.trim() || adding}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 shrink-0"
                            >
                                {adding ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <><Plus className="h-4 w-4 mr-1.5" /> Tambah</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Tag List */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-gray-500" />
                                Senarai Tag Semasa
                            </span>
                            <span className="text-sm font-normal text-gray-400">{tags.length} tag</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                            </div>
                        ) : tags.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Tiada tag lagi. Tambah tag pertama anda!</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {tags.map(tag => (
                                    <li key={tag.id} className="flex items-center justify-between py-3 group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Tag className="h-3.5 w-3.5 text-blue-600" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-800">{tag.name}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteTag(tag)}
                                            disabled={deletingId === tag.id}
                                            className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Padam tag"
                                        >
                                            {deletingId === tag.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <p className="text-xs text-gray-400 text-center">
                    Tag yang dipadam akan hilang dari semua set soalan yang telah menggunakannya.
                </p>
            </div>
        </DashboardLayout>
    );
}
