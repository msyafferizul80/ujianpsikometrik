"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { quizRepository } from "@/utils/supabaseRepository";
import {
    Loader2, BookOpen, Lock, Unlock, Trash2, Plus, Edit2, X, Tag, Check,
    FileText, GripVertical, ArrowUpDown, Save, AlertCircle
} from "lucide-react";

export default function QuizManagementPage() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [jobRoleOptions, setJobRoleOptions] = useState<string[]>([]);
    const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editTags, setEditTags] = useState<string[]>([]);
    const [savingTags, setSavingTags] = useState<string | null>(null);

    // Drag-and-drop state
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [orderSaved, setOrderSaved] = useState(false);
    const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
    const originalOrderRef = useRef<any[]>([]);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const data = await quizRepository.getAllQuizzes(false);
            setQuizzes(data || []);
            originalOrderRef.current = data || [];
        } catch (error) {
            console.error("Error fetching quizzes:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchJobTags = async () => {
        try {
            const res = await fetch('/api/admin/job-tags');
            const data = await res.json();
            setJobRoleOptions((data.tags || []).map((t: any) => t.name));
        } catch {
            setJobRoleOptions([]);
        }
    };

    useEffect(() => {
        fetchQuizzes();
        fetchJobTags();
    }, []);

    // ─── Drag and Drop ───────────────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
        // ghost image styling: make element semi-transparent
        const target = e.currentTarget as HTMLElement;
        setTimeout(() => { target.style.opacity = '0.4'; }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
        setDraggedId(null);
        setDragOverId(null);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (id !== draggedId) setDragOverId(id);
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) return;

        setQuizzes(prev => {
            const updated = [...prev];
            const fromIdx = updated.findIndex(q => q.id === draggedId);
            const toIdx = updated.findIndex(q => q.id === targetId);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const [removed] = updated.splice(fromIdx, 1);
            updated.splice(toIdx, 0, removed);
            return updated;
        });
        setHasUnsavedOrder(true);
        setDragOverId(null);
    };

    const saveOrder = async () => {
        setIsSavingOrder(true);
        try {
            await quizRepository.updateQuizOrder(quizzes.map(q => q.id));
            originalOrderRef.current = quizzes;
            setHasUnsavedOrder(false);
            setOrderSaved(true);
            setTimeout(() => setOrderSaved(false), 3000);
        } catch (err) {
            console.error("Failed to save order:", err);
            alert("Gagal menyimpan susunan. Sila cuba lagi.");
        } finally {
            setIsSavingOrder(false);
        }
    };

    const cancelReorder = () => {
        setQuizzes([...originalOrderRef.current]);
        setHasUnsavedOrder(false);
        setIsReorderMode(false);
    };

    // ─── Other Actions ────────────────────────────────────────────────────────
    const togglePremium = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            setQuizzes(prev => prev.map(q => q.id === id ? { ...q, is_premium: newStatus } : q));
            await quizRepository.toggleQuizPremium(id, newStatus);
        } catch (error) {
            console.error("Error toggling premium:", error);
            alert("Gagal menukar status premium.");
            fetchQuizzes();
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (confirm(`Adakah anda pasti mahu memadam set soalan "${title}"? Tindakan ini tidak boleh dikembalikan.`)) {
            try {
                await quizRepository.deleteQuiz(id);
                fetchQuizzes();
            } catch (error) {
                console.error("Error deleting quiz:", error);
                alert("Gagal memadam kuiz.");
            }
        }
    };

    const handleEdit = (quiz: any) => {
        setEditingQuiz(quiz);
        setEditTitle(quiz.title);
        setEditDescription(quiz.description);
        setEditTags(Array.isArray(quiz.job_tags) ? quiz.job_tags : []);
    };

    const saveEdit = async () => {
        if (!editingQuiz || !editTitle.trim()) return;
        try {
            await quizRepository.updateQuiz(editingQuiz.id, editTitle, editDescription);
            await quizRepository.updateQuizTags(editingQuiz.id, editTags);
            setEditingQuiz(null);
            fetchQuizzes();
        } catch (error) {
            console.error("Error updating quiz:", error);
            alert("Gagal mengemaskini kuiz.");
        }
    };

    const quickToggleTag = async (quizId: string, tag: string, currentTags: string[]) => {
        setSavingTags(quizId);
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        try {
            await quizRepository.updateQuizTags(quizId, newTags);
            setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, job_tags: newTags } : q));
        } catch {
            alert("Gagal mengemaskini tag.");
        } finally {
            setSavingTags(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <BookOpen className="h-8 w-8 text-blue-600" />
                            Pengurusan Kuiz
                        </h1>
                        <p className="text-gray-600">Total Set Soalan: {quizzes.length}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {/* Reorder Mode Toggle */}
                        {!isReorderMode ? (
                            <Button
                                variant="outline"
                                onClick={() => setIsReorderMode(true)}
                                className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                            >
                                <ArrowUpDown className="h-4 w-4" />
                                Susun Keutamaan
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-orange-600 font-medium flex items-center gap-1">
                                    <GripVertical className="h-4 w-4" />
                                    Mod Susun Aktif
                                </span>
                                {hasUnsavedOrder && (
                                    <Button
                                        size="sm"
                                        onClick={saveOrder}
                                        disabled={isSavingOrder}
                                        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isSavingOrder
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Save className="h-3.5 w-3.5" />
                                        }
                                        Simpan Susunan
                                    </Button>
                                )}
                                {orderSaved && !hasUnsavedOrder && (
                                    <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                        <Check className="h-4 w-4" /> Disimpan!
                                    </span>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelReorder}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <Button onClick={() => router.push('/admin/upload')} className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4" /> Upload Soalan Baru
                        </Button>
                    </div>
                </div>

                {/* Reorder hint banner */}
                {isReorderMode && (
                    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Mod Susun Keutamaan</p>
                            <p className="text-orange-600 mt-0.5">Seret dan lepas baris menggunakan ikon <strong>⠿</strong> di sebelah kiri untuk mengubah susunan paparan dalam Bank Soalan. Klik <strong>Simpan Susunan</strong> selepas selesai.</p>
                        </div>
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Senarai Bank Soalan</CardTitle>
                        <CardDescription>
                            {isReorderMode
                                ? 'Seret baris untuk menyusun semula keutamaan paparan set soalan.'
                                : 'Urus status akses (Free/Premium) dan tag jawatan bagi setiap set soalan.'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            {isReorderMode && (
                                                <TableHead className="w-10 text-center text-gray-400">⠿</TableHead>
                                            )}
                                            <TableHead className="w-10 text-center">No.</TableHead>
                                            <TableHead className="w-[300px]">Tajuk & Deskripsi</TableHead>
                                            <TableHead>Soalan</TableHead>
                                            <TableHead>Status</TableHead>
                                            {!isReorderMode && (
                                                <TableHead className="min-w-[340px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <Tag className="h-4 w-4 text-blue-500" />
                                                        Tag Jawatan
                                                    </div>
                                                </TableHead>
                                            )}
                                            <TableHead>Tarikh</TableHead>
                                            {!isReorderMode && (
                                                <TableHead className="text-right">Tindakan</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {quizzes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={isReorderMode ? 5 : 7} className="text-center py-8 text-gray-500">
                                                    Tiada soalan dijumpai.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            quizzes.map((quiz, index) => {
                                                const currentTags: string[] = Array.isArray(quiz.job_tags) ? quiz.job_tags : [];
                                                const isDraggingOver = dragOverId === quiz.id;
                                                const isDragging = draggedId === quiz.id;

                                                return (
                                                    <TableRow
                                                        key={quiz.id}
                                                        className={`align-top transition-all duration-150 ${isReorderMode
                                                            ? isDraggingOver
                                                                ? 'bg-blue-50 border-t-2 border-t-blue-400'
                                                                : isDragging
                                                                    ? 'opacity-40 bg-gray-50'
                                                                    : 'hover:bg-orange-50/40 cursor-grab'
                                                            : 'hover:bg-gray-50/50'
                                                            }`}
                                                        draggable={isReorderMode}
                                                        onDragStart={isReorderMode ? (e) => handleDragStart(e, quiz.id) : undefined}
                                                        onDragEnd={isReorderMode ? handleDragEnd : undefined}
                                                        onDragOver={isReorderMode ? (e) => handleDragOver(e, quiz.id) : undefined}
                                                        onDrop={isReorderMode ? (e) => handleDrop(e, quiz.id) : undefined}
                                                    >
                                                        {/* Drag handle */}
                                                        {isReorderMode && (
                                                            <TableCell className="text-center text-gray-400 cursor-grab select-none">
                                                                <GripVertical className="h-5 w-5 mx-auto" />
                                                            </TableCell>
                                                        )}

                                                        {/* Priority number */}
                                                        <TableCell className="text-center">
                                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${isReorderMode
                                                                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                                                : 'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                {index + 1}
                                                            </span>
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-gray-900">{quiz.title}</span>
                                                                <span className="text-sm text-gray-500 line-clamp-1">{quiz.description}</span>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <Badge variant="secondary" className="font-mono">
                                                                {quiz.total_questions}
                                                            </Badge>
                                                        </TableCell>

                                                        <TableCell>
                                                            <button
                                                                onClick={() => !isReorderMode && togglePremium(quiz.id, quiz.is_premium)}
                                                                disabled={isReorderMode}
                                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${quiz.is_premium
                                                                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                                                    : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                                                    } ${isReorderMode ? 'pointer-events-none opacity-60' : ''}`}
                                                            >
                                                                {quiz.is_premium ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                                                {quiz.is_premium ? "Premium" : "Free"}
                                                            </button>
                                                        </TableCell>

                                                        {/* Job Tag Quick-Toggles — hidden in reorder mode */}
                                                        {!isReorderMode && (
                                                            <TableCell>
                                                                <div className="flex flex-wrap gap-1.5 py-1">
                                                                    {jobRoleOptions.map(role => {
                                                                        const isTagged = currentTags.includes(role);
                                                                        return (
                                                                            <button
                                                                                key={role}
                                                                                onClick={() => quickToggleTag(quiz.id, role, currentTags)}
                                                                                disabled={savingTags === quiz.id}
                                                                                className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${isTagged
                                                                                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                                                                    }`}
                                                                            >
                                                                                {isTagged ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                                                                                {role}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                    {savingTags === quiz.id && (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 self-center" />
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        )}

                                                        <TableCell>
                                                            <span className="text-sm text-gray-500">
                                                                {new Date(quiz.created_at).toLocaleDateString('ms-MY')}
                                                            </span>
                                                        </TableCell>

                                                        {!isReorderMode && (
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            sessionStorage.setItem(`quiz_${quiz.id}`, JSON.stringify({ id: quiz.id, title: quiz.title, total_questions: quiz.total_questions }));
                                                                            router.push(`/admin/quizzes/${quiz.id}/questions`);
                                                                        }}
                                                                        className="text-gray-400 hover:text-purple-600 hover:bg-purple-50 gap-1.5 text-xs"
                                                                        title="Lihat & Edit Soalan"
                                                                    >
                                                                        <FileText className="h-3.5 w-3.5" />
                                                                        Soalan
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleEdit(quiz)}
                                                                        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                                        title="Kemaskini Set Soalan"
                                                                    >
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleDelete(quiz.id, quiz.title)}
                                                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                                        title="Padam Set Soalan"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Floating save bar when unsaved changes exist in reorder mode */}
                {isReorderMode && hasUnsavedOrder && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-orange-200 shadow-xl rounded-2xl px-6 py-3">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        <span className="text-sm font-medium text-gray-700">Terdapat perubahan susunan yang belum disimpan</span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelReorder}
                            className="text-gray-500"
                        >
                            Batal
                        </Button>
                        <Button
                            size="sm"
                            onClick={saveOrder}
                            disabled={isSavingOrder}
                            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isSavingOrder
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Save className="h-4 w-4" />
                            }
                            Simpan Susunan
                        </Button>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-lg bg-white shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Kemaskini Kuiz</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setEditingQuiz(null)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Tajuk Kuiz</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full p-2 border rounded-md"
                                    placeholder="Masukkan tajuk kuiz"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Deskripsi</label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="w-full p-2 border rounded-md min-h-[80px]"
                                    placeholder="Masukkan deskripsi kuiz"
                                />
                            </div>
                            {/* Tag Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Tag className="h-4 w-4 text-blue-500" />
                                    Tag Jawatan (pilih semua yang berkaitan)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {jobRoleOptions.map(role => {
                                        const isSelected = editTags.includes(role);
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setEditTags(prev =>
                                                    isSelected ? prev.filter(t => t !== role) : [...prev, role]
                                                )}
                                                className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${isSelected
                                                    ? 'bg-blue-600 text-white border-blue-700'
                                                    : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                                                    }`}
                                            >
                                                {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                                {role}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setEditingQuiz(null)}>Batal</Button>
                                <Button onClick={saveEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    Simpan
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </DashboardLayout>
    );
}
