"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Loader2, ArrowLeft, Edit2, Save, X, CheckCircle,
    AlertTriangle, BookOpen, ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Option {
    label: string;
    text: string;
}

interface Question {
    id: number;
    quiz_id: number;
    question_text: string;
    options: Option[];
    correct_answer: string;
    teras: string;
    explanation: string;
}

interface Quiz {
    id: number;
    title: string;
    total_questions: number;
}

export default function QuizQuestionsPage() {
    const params = useParams();
    const router = useRouter();
    const quizId = params.id as string;

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Edit state
    const [editQuestionText, setEditQuestionText] = useState("");
    const [editOptions, setEditOptions] = useState<Option[]>([]);
    const [editCorrectAnswer, setEditCorrectAnswer] = useState("");
    const [editTeras, setEditTeras] = useState("");
    const [editExplanation, setEditExplanation] = useState("");

    const fetchData = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            // Convert quizId to number since quiz_id in questions table is integer
            const numericId = parseInt(quizId, 10);

            // Fetch directly from Supabase (no API route needed)
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', numericId)
                .order('id', { ascending: true });

            if (error) {
                console.error("Supabase error:", error);
                setFetchError(`${error.message}${error.hint ? ` — ${error.hint}` : ''}`);
                setQuestions([]);
                return;
            }

            setQuestions(data || []);

            // Get quiz title from sessionStorage
            const stored = sessionStorage.getItem(`quiz_${quizId}`);
            if (stored) {
                setQuiz(JSON.parse(stored));
            }
        } catch (err: any) {
            console.error("Unexpected error:", err);
            setFetchError(err.message || "Ralat tidak diketahui.");
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [quizId]);

    const startEdit = (q: Question) => {
        setEditingId(q.id);
        setEditQuestionText(q.question_text);
        const opts = Array.isArray(q.options) ? q.options : [];
        setEditOptions(opts.length > 0 ? opts : [
            { label: "A", text: "" },
            { label: "B", text: "" },
            { label: "C", text: "" },
            { label: "D", text: "" },
            { label: "E", text: "" },
        ]);
        setEditCorrectAnswer(q.correct_answer || "");
        setEditTeras(q.teras || "");
        setEditExplanation(q.explanation || "");
        setExpandedId(q.id);
    };

    const cancelEdit = () => setEditingId(null);

    const updateOptionText = (index: number, text: string) => {
        setEditOptions(prev => prev.map((opt, i) => i === index ? { ...opt, text } : opt));
    };

    const saveEdit = async (questionId: number) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('questions')
                .update({
                    question_text: editQuestionText,
                    options: editOptions,
                    correct_answer: editCorrectAnswer,
                    teras: editTeras,
                    explanation: editExplanation,
                })
                .eq('id', questionId);

            if (error) throw new Error(error.message);

            setQuestions(prev =>
                prev.map(q =>
                    q.id === questionId
                        ? { ...q, question_text: editQuestionText, options: editOptions, correct_answer: editCorrectAnswer, teras: editTeras, explanation: editExplanation }
                        : q
                )
            );

            setEditingId(null);
            setSaveSuccess(questionId);
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (err: any) {
            alert(`Ralat menyimpan: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const isProblematic = (q: Question) => {
        const hasEmptyOptions = !Array.isArray(q.options) || q.options.length === 0 ||
            q.options.every(o => !o.text || o.text.trim() === "");
        const hasAnswerInQuestion =
            q.question_text?.toLowerCase().includes("pilihan jawapan") ||
            q.question_text?.toLowerCase().includes("a / b / c") ||
            q.question_text?.toLowerCase().includes("a/b/c");
        return hasEmptyOptions || hasAnswerInQuestion;
    };

    const safeQuestions = Array.isArray(questions) ? questions : [];
    const problematicCount = safeQuestions.filter(isProblematic).length;

    return (
        <DashboardLayout>
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <BookOpen className="h-6 w-6 text-blue-600" />
                            Edit Soalan
                        </h1>
                        <p className="text-sm text-gray-500">
                            {quiz?.title || `Quiz ID: ${quizId}`} · {safeQuestions.length} soalan
                        </p>
                    </div>
                    {problematicCount > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-700">
                                {problematicCount} soalan bermasalah
                            </span>
                        </div>
                    )}
                </div>

                {/* Error State */}
                {fetchError && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold text-red-700">Ralat memuatkan soalan</p>
                            <p className="text-sm text-red-600 mt-1 font-mono bg-red-100 rounded p-2">{fetchError}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchData}
                                className="mt-3 text-red-600 border-red-300 hover:bg-red-50"
                            >
                                Cuba Semula
                            </Button>
                        </div>
                    </div>
                )}

                {/* Questions List */}
                {loading ? (
                    <div className="flex items-center justify-center p-16 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="text-gray-500">Memuatkan soalan...</span>
                    </div>
                ) : !fetchError && (
                    <div className="space-y-3">
                        {safeQuestions.map((q, index) => {
                            const problematic = isProblematic(q);
                            const isEditing = editingId === q.id;
                            const isExpanded = expandedId === q.id;
                            const justSaved = saveSuccess === q.id;

                            return (
                                <Card
                                    key={q.id}
                                    className={`border transition-all ${
                                        problematic ? "border-amber-300 bg-amber-50/30"
                                        : justSaved ? "border-green-300 bg-green-50/30"
                                        : "border-gray-200"
                                    }`}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                                problematic ? "bg-amber-200 text-amber-800"
                                                : justSaved ? "bg-green-200 text-green-800"
                                                : "bg-blue-100 text-blue-700"
                                            }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    {problematic && (
                                                        <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">⚠ Bermasalah</Badge>
                                                    )}
                                                    {justSaved && (
                                                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">✓ Disimpan</Badge>
                                                    )}
                                                    {q.teras && (
                                                        <Badge variant="outline" className="text-xs text-gray-500">{q.teras}</Badge>
                                                    )}
                                                </div>
                                                <p className={`text-sm text-gray-800 ${!isExpanded && !isEditing ? "line-clamp-2" : ""}`}>
                                                    {q.question_text}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {!isEditing && (
                                                    <>
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                                                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            onClick={() => startEdit(q)}
                                                            className={`h-8 w-8 ${problematic
                                                                ? "text-amber-500 hover:text-amber-700 hover:bg-amber-100"
                                                                : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                            }`}
                                                            title="Edit soalan"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>

                                    {/* Expanded View */}
                                    {isExpanded && !isEditing && (
                                        <CardContent className="pt-0 space-y-3 border-t border-gray-100">
                                            <div className="space-y-1.5 mt-3">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pilihan Jawapan</p>
                                                {Array.isArray(q.options) && q.options.length > 0 ? (
                                                    q.options.map((opt) => (
                                                        <div key={opt.label} className={`flex gap-2 text-sm p-2 rounded-md ${opt.label === q.correct_answer ? "bg-green-50 text-green-800 font-medium" : "text-gray-700"}`}>
                                                            <span className={`font-bold shrink-0 w-5 ${opt.label === q.correct_answer ? "text-green-600" : "text-gray-500"}`}>{opt.label}.</span>
                                                            <span>{opt.text || <em className="text-red-400">Kosong</em>}</span>
                                                            {opt.label === q.correct_answer && <CheckCircle className="h-4 w-4 text-green-500 ml-auto shrink-0" />}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-red-500 italic">⚠ Tiada pilihan jawapan tersimpan</p>
                                                )}
                                            </div>
                                            {q.explanation && (
                                                <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Penerangan</p>
                                                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">{q.explanation}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    )}

                                    {/* Edit Form */}
                                    {isEditing && (
                                        <CardContent className="pt-0 border-t border-blue-100 bg-blue-50/20">
                                            <div className="space-y-4 mt-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Teks Soalan</label>
                                                    <textarea
                                                        value={editQuestionText}
                                                        onChange={(e) => setEditQuestionText(e.target.value)}
                                                        className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Masukkan teks soalan..."
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pilihan Jawapan</label>
                                                    {editOptions.map((opt, i) => (
                                                        <div key={opt.label} className="flex items-center gap-2">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${editCorrectAnswer === opt.label ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-600 border-gray-300"}`}>
                                                                {opt.label}
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={opt.text}
                                                                onChange={(e) => updateOptionText(i, e.target.value)}
                                                                className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder={`Pilihan ${opt.label}...`}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditCorrectAnswer(opt.label)}
                                                                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${editCorrectAnswer === opt.label ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-500 border-gray-300 hover:border-green-400 hover:text-green-600"}`}
                                                            >
                                                                ✓ Betul
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {editCorrectAnswer && (
                                                        <p className="text-xs text-green-600">✓ Jawapan betul: <strong>{editCorrectAnswer}</strong></p>
                                                    )}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Teras</label>
                                                    <input
                                                        type="text"
                                                        value={editTeras}
                                                        onChange={(e) => setEditTeras(e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="cth: Emosi, Integriti..."
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Penerangan / Justifikasi</label>
                                                    <textarea
                                                        value={editExplanation}
                                                        onChange={(e) => setEditExplanation(e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                        placeholder="Penerangan jawapan betul..."
                                                    />
                                                </div>

                                                <div className="flex justify-end gap-2 pt-2">
                                                    <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                                                        <X className="h-4 w-4 mr-1" />Batal
                                                    </Button>
                                                    <Button
                                                        onClick={() => saveEdit(q.id)}
                                                        disabled={saving || !editQuestionText.trim()}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                                                        Simpan Perubahan
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })}

                        {safeQuestions.length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <BookOpen className="h-12 w-12 mb-3 opacity-30" />
                                    <p>Tiada soalan dijumpai untuk quiz ini.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
