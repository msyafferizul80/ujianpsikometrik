"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { quizRepository } from "@/utils/supabaseRepository";
import { Loader2, BookOpen, Lock, Unlock, Trash2, Plus, Edit2, X, Tag, Check } from "lucide-react";

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

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const data = await quizRepository.getAllQuizzes(false);
            setQuizzes(data || []);
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

    // Quick-tag: toggle a tag for a quiz inline (without opening edit modal)
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <BookOpen className="h-8 w-8 text-blue-600" />
                            Pengurusan Kuiz
                        </h1>
                        <p className="text-gray-600">Total Set Soalan: {quizzes.length}</p>
                    </div>
                    <Button onClick={() => router.push('/admin/upload')} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> Upload Soalan Baru
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Senarai Bank Soalan</CardTitle>
                        <CardDescription>Uruskan status akses (Free/Premium) dan tag jawatan bagi setiap set soalan.</CardDescription>
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
                                            <TableHead className="w-[300px]">Tajuk & Deskripsi</TableHead>
                                            <TableHead>Soalan</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="min-w-[340px]">
                                                <div className="flex items-center gap-1.5">
                                                    <Tag className="h-4 w-4 text-blue-500" />
                                                    Tag Jawatan
                                                </div>
                                            </TableHead>
                                            <TableHead>Tarikh</TableHead>
                                            <TableHead className="text-right">Tindakan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {quizzes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                    Tiada soalan dijumpai.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            quizzes.map((quiz) => {
                                                const currentTags: string[] = Array.isArray(quiz.job_tags) ? quiz.job_tags : [];
                                                return (
                                                    <TableRow key={quiz.id} className="hover:bg-gray-50/50 align-top">
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
                                                                onClick={() => togglePremium(quiz.id, quiz.is_premium)}
                                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${quiz.is_premium
                                                                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                                                    : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                                                    }`}
                                                            >
                                                                {quiz.is_premium ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                                                {quiz.is_premium ? "Premium" : "Free"}
                                                            </button>
                                                        </TableCell>
                                                        {/* Job Tag Quick-Toggles */}
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
                                                        <TableCell>
                                                            <span className="text-sm text-gray-500">
                                                                {new Date(quiz.created_at).toLocaleDateString('ms-MY')}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
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
