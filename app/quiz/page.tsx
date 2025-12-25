"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ArrowLeft, Send, Save } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AnswerOption } from "@/components/AnswerOption";
import { DashboardLayout } from "@/components/DashboardLayout";
import { QuizSkeleton } from "@/components/QuizSkeleton";

import { quizRepository } from "@/utils/supabaseRepository";

interface Question {
    id: number;
    teras: string;
    question: string;
    options: { label: string; text: string }[];
    correctAnswer?: string;
}

export default function QuizPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [autoSaving, setAutoSaving] = useState(false);
    const router = useRouter();

    // Load questions and saved progress
    // ... imports ...
    // ... imports ...

    // ... inside component ...
    useEffect(() => {
        const loadQuizData = async () => {
            const activeQuizId = localStorage.getItem('activeQuizId');

            // 1. Check for Smart Review Mode
            if (activeQuizId === 'smart-review') {
                const teras = localStorage.getItem('activeTeras');
                if (teras) {
                    try {
                        const data = await quizRepository.getQuestionsByTeras(teras, 10);
                        if (data && data.length > 0) {
                            setQuestions(data);
                            setLoading(false);
                            return;
                        }
                    } catch (err) {
                        console.error("Failed to load smart review questions", err);
                    }
                }
            }

            // 2. Try to load from Supabase if we have a normal ID
            if (activeQuizId && !activeQuizId.startsWith('demo-') && activeQuizId !== 'smart-review') {
                try {
                    const data = await quizRepository.getQuestionsByQuizId(activeQuizId);
                    if (data && data.length > 0) {
                        setQuestions(data);

                        // Validate Data Integrity
                        const missingAnswers = data.filter((q: any) => !q.correctAnswer).length;
                        if (missingAnswers > 0) {
                            console.warn(`${missingAnswers} questions missing correct answers`);
                            if (missingAnswers === data.length) {
                                alert("AMARAN KRITIKAL: Set soalan ini TIDAK MEMPUNYAI SKEMA JAWAPAN. Anda akan mendapat markah 0% walaupun menjawab dengan betul. Sila hubungi Admin untuk upload semula soalan dengan format yang betul (Jawapan: A).");
                            }
                        }

                        setLoading(false);
                        return;
                    } else {
                        throw new Error("No questions found for this quiz");
                    }
                } catch (err) {
                    console.error("Failed to load from Supabase", err);
                    // CRITICAL: Do NOT fall back to Demo if we expected a specific quiz.
                    // This prevents answer mismatch (e.g. user has answers for ID 200, but we load ID 1).
                    alert("Gagal memuat turun soalan. Sila pastikan sambungan internet anda baik dan refresh semula.");
                    setLoading(false);
                    return;
                }
            }

            // 3. Fallback / Default Demo Logic
            // Only run this if NO activeQuizId is set (or it's explicitly demo)
            if (!activeQuizId || activeQuizId.startsWith('demo-')) {
                fetch('/api/questions')
                    .then(res => res.json())
                    .then(data => {
                        setQuestions(data);
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error("Failed to load demo questions", err);
                        setLoading(false);
                    });
            } else {
                // Should not reach here if logic above is correct, but safe termination
                setLoading(false);
            }

            // Load saved state (User progress)
            // Load saved state (User progress)
            const savedAnswers = localStorage.getItem('quizAnswers');
            let loadedAnswers = {};
            if (savedAnswers) {
                loadedAnswers = JSON.parse(savedAnswers);
                setAnswers(loadedAnswers);
            };

            // Enhanced Auto-Resume Logic:
            // 1. Try to find the first UNANSWERED question from the loaded list
            let resumeIndex = 0;
            // We need to wait for questions to be set, but we are inside the async function where we just fetched them.
            // However, 'questions' state variable won't be updated until next render.
            // So we must use the 'data' variable we just fetched above.

            // It's tricky because we have 3 potential data sources above (smart review, supabase, demo).
            // Let's refactor slightly to ensure we have 'finalQuestions' logic available before this block.
            // Since the code above returns early, we can't easily access 'data' here if we don't restructure.
            // BUT: The existing code has early returns. This block (lines 87-93) is only reached if demo fetch finishes OR if it falls through?
            // Wait, the early returns in 1 & 2 skip this block! 
            // This is a BUG in existing code: if it returns early in step 1 or 2, it NEVER loads saved answers!

            // I will fix this by moving the answer loading logic to a helper or copying it before returns.
            // Or better, remove early returns and use a variable.

            // To be safe with minimal diff, I will rely on the fact that I am REPLACING this block,
            // but I need to make sure this block runs for ALL cases.
            // Actually, I need to modify the structure.

            // Let's rewrite the whole function body to be safe? No, replace_file_content is for chunks.
            // I will inject the resume logic into the specific data loading blocks in a subsequent step if needed,
            // but first I must realize the current code is flawed.

            // Let's fix the logic by removing early returns in the previous blocks? 
            // That would require a massive replace.

            // Alternative: Add a separate useEffect for "Resume" that runs when 'questions' changes?
            // Yes! efficient and cleaner.
            // If questions are loaded and we have saved answers, compute the index.

            localStorage.setItem('quizInProgress', 'true');
        };

        loadQuizData();
    }, []);

    // NEW: Smart Resume Effect
    useEffect(() => {
        if (questions.length > 0) {
            const savedAnswers = localStorage.getItem('quizAnswers');
            if (savedAnswers) {
                const parsed = JSON.parse(savedAnswers);
                setAnswers(parsed);

                // Find first missing answer
                const firstUnansweredIdx = questions.findIndex(q => !parsed[q.id]);
                if (firstUnansweredIdx !== -1) {
                    setCurrentIdx(firstUnansweredIdx);
                } else {
                    // If all answered, maybe go to last? or stay at 0?
                    // Let's check if savedQuestion exists as fallback
                    const savedQuestion = localStorage.getItem('currentQuestion');
                    if (savedQuestion) setCurrentIdx(parseInt(savedQuestion));
                }
            }
        }
    }, [questions]); // Run once when questions are loaded

    // Auto-save functionality
    useEffect(() => {
        if (questions.length === 0) return;

        const autoSaveInterval = setInterval(() => {
            setAutoSaving(true);
            localStorage.setItem('quizAnswers', JSON.stringify(answers));
            localStorage.setItem('currentQuestion', currentIdx.toString());

            setTimeout(() => setAutoSaving(false), 1000);
        }, 30000); // Auto-save every 30 seconds

        return () => clearInterval(autoSaveInterval);
    }, [answers, currentIdx, questions.length]);

    // Save on answer change
    useEffect(() => {
        if (Object.keys(answers).length > 0) {
            localStorage.setItem('quizAnswers', JSON.stringify(answers));
            localStorage.setItem('currentQuestion', currentIdx.toString());
            // Reinforce persistent flag
            localStorage.setItem('quizInProgress', 'true');
        }
    }, [answers, currentIdx]);

    const handleAnswer = (val: string) => {
        setAnswers(prev => ({
            ...prev,
            [questions[currentIdx].id]: val
        }));
    };

    const handleNext = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIdx > 0) {
            setCurrentIdx(prev => prev - 1);
        }
    };

    const handleSubmit = useCallback(async () => {
        // Check if all questions are answered
        const unansweredCount = questions.filter(q => !answers[q.id]).length;

        if (unansweredCount > 0) {
            const confirm = window.confirm(
                `Anda masih mempunyai ${unansweredCount} soalan yang belum dijawab. Adakah anda pasti mahu menghantar?`
            );
            if (!confirm) return;
        }

        setSubmitting(true);
        try {
            // 1. Calculate Score & Stats (Frontend Calculation)
            // This ensures we use the *currently loaded* questions, not the default server ones

            const terasScores: Record<string, { score: number; max: number; percentage: number }> = {};
            let totalScore = 0;
            let maxTotal = 0;

            questions.forEach(q => {
                // Normalize Teras key
                let teras = q.teras.trim();
                // Basic normalization (can be improved)
                if (teras.match(/Kerjasama|Sikap|Pasukan/i)) teras = 'Kerjasama';
                else if (teras.match(/Emosi|Stabil|Tenang/i)) teras = 'Emosi';
                else if (teras.match(/Komunikasi|Bahasa|Jelas/i)) teras = 'Komunikasi';
                else teras = 'Umum'; // Fallback

                if (!terasScores[teras]) terasScores[teras] = { score: 0, max: 0, percentage: 0 };

                // Scoring Logic
                const userAnswer = answers[q.id];
                const bestAnswer = q.correctAnswer; // Using the field from our question object

                terasScores[teras].max += 10;
                maxTotal += 10;

                if (userAnswer) {
                    if (userAnswer === bestAnswer) {
                        terasScores[teras].score += 10;
                        totalScore += 10;
                    }
                    // Partial points logic (Simplified: Neighboring option = 7 points?)
                    // For now, let's keep it strict or simple partial
                    // Implementation of "Close Match":
                    else if (
                        (bestAnswer === 'A' && userAnswer === 'B') ||
                        (bestAnswer === 'B' && userAnswer === 'A') ||
                        (bestAnswer === 'D' && userAnswer === 'E') ||
                        (bestAnswer === 'E' && userAnswer === 'D')
                    ) {
                        terasScores[teras].score += 7; // Partial credit
                        totalScore += 7;
                    }
                }
            });

            // Calculate Percentages per Teras
            Object.keys(terasScores).forEach(key => {
                const t = terasScores[key];
                if (t.max > 0) t.percentage = Math.round((t.score / t.max) * 100);
            });

            // Construct Result Object
            const resultWithAnswers = {
                totalScore,
                maxScore: maxTotal,
                terasScores,
                answers // Save answers for review
            };

            // 2. Save to Supabase
            const activeQuizId = localStorage.getItem('activeQuizId');
            if (activeQuizId && !activeQuizId.startsWith('demo-')) {
                const userName = localStorage.getItem('userName') || 'Anonymous Candidate';
                // Using dynamic import to avoid any potential server-component issues
                const { quizRepository } = await import("@/utils/supabaseRepository");
                await quizRepository.saveAttempt(userName, parseInt(activeQuizId), totalScore, answers);
            }

            // We skip fetch('/api/submit') because it only handles static JSON matching.
            // We use our local calculation.

            // Save result (User context)
            localStorage.setItem('quizResult', JSON.stringify(resultWithAnswers));

            // Clean up
            localStorage.removeItem('quizAnswers');
            localStorage.removeItem('currentQuestion');
            localStorage.removeItem('quizTimeLeft');
            localStorage.removeItem('quizInProgress');

            router.push('/result');
        } catch (e) {
            console.error("Submission failed", e);
            setSubmitting(false);
            alert("Gagal menghantar jawapan. Sila cuba lagi.");
        }
    }, [answers, questions, router]);

    const handleTimeUp = useCallback(() => {
        alert("Masa tamat! Jawapan anda akan dihantar secara automatik.");
        handleSubmit();
    }, [handleSubmit]);

    if (loading) {
        return (
            <DashboardLayout>
                <QuizSkeleton />
            </DashboardLayout>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-gray-600">Tiada soalan ditemui.</p>
                    <Button onClick={() => router.push('/dashboard')} className="mt-4">
                        Kembali ke Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;
    const allAnswered = answeredCount === questions.length;

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 flex flex-col">
                {/* Enhanced Header */}
                <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
                            {/* Title */}
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">
                                    {localStorage.getItem('activeQuizTitle') || "Ujian Psikometrik 2025"}
                                </h1>
                                <p className="text-sm text-gray-600">
                                    Soalan {currentIdx + 1} daripada {questions.length}
                                </p>
                            </div>

                            {/* Timer and Stats */}
                            <div className="flex items-center gap-3">
                                {/* Auto-save indicator */}
                                {autoSaving && (
                                    <div className="flex items-center gap-2 text-xs text-green-600">
                                        <Save className="h-4 w-4" />
                                        <span>Disimpan</span>
                                    </div>
                                )}

                                {/* Answered count */}
                                <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                                    {answeredCount}/{questions.length} dijawab
                                </div>

                                {/* Timer */}
                                <CountdownTimer onTimeUp={handleTimeUp} initialMinutes={60} />
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-medium text-gray-600">
                                <span>{Math.round(progress)}% Selesai</span>
                                <span className="text-blue-600">{answeredCount} soalan dijawab</span>
                            </div>
                            <Progress value={progress} className="h-3" />
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 container max-w-6xl mx-auto p-4 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Question Card - Takes 2 columns on large screens */}
                        <div className="lg:col-span-2">
                            <Card className="shadow-xl border-0 ring-1 ring-gray-100">
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                                    <div className="flex items-center justify-between">
                                        <div className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                                            Soalan {currentIdx + 1}
                                        </div>
                                        <div className="text-xs font-medium text-gray-600 bg-white px-3 py-1 rounded-full">
                                            Teras: {currentQ.teras}
                                        </div>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-relaxed mt-4">
                                        {currentQ.question}
                                    </h2>
                                </CardHeader>

                                <CardContent className="p-6">
                                    <div className="space-y-3">
                                        {currentQ.options.map((opt) => (
                                            <AnswerOption
                                                key={opt.label}
                                                label={opt.label}
                                                text={opt.text}
                                                isSelected={answers[currentQ.id] === opt.label}
                                                onSelect={() => handleAnswer(opt.label)}
                                            />
                                        ))}
                                    </div>
                                </CardContent>

                                <CardFooter className="flex justify-between items-center pt-6 bg-gray-50 border-t">
                                    {/* Previous Button */}
                                    <Button
                                        onClick={handlePrevious}
                                        disabled={currentIdx === 0}
                                        variant="outline"
                                        size="lg"
                                        className="font-semibold"
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Sebelum
                                    </Button>

                                    {/* Next/Submit Button */}
                                    {currentIdx === questions.length - 1 ? (
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            size="lg"
                                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg font-semibold"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Menghantar...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Hantar Jawapan
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleNext}
                                            size="lg"
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg font-semibold"
                                        >
                                            Seterusnya
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        </div>

                        {/* Question Navigation Grid - 1 column on large screens */}
                        <div className="lg:col-span-1">
                            <Card className="shadow-lg border-0 ring-1 ring-gray-100 sticky top-24">
                                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                                    <h3 className="font-bold text-gray-900">Navigasi Soalan</h3>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Klik pada nombor untuk lompat ke soalan
                                    </p>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-5 gap-2">
                                        {questions.map((q, idx) => {
                                            const isAnswered = !!answers[q.id];
                                            const isCurrent = currentIdx === idx;

                                            return (
                                                <button
                                                    key={q.id}
                                                    onClick={() => setCurrentIdx(idx)}
                                                    className={`
                                                        h-12 w-full rounded-lg text-sm font-bold transition-all border-2
                                                        ${isCurrent
                                                            ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white border-blue-600 shadow-lg scale-110"
                                                            : isAnswered
                                                                ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:scale-105"
                                                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:scale-105"
                                                        }
                                                    `}
                                                >
                                                    {idx + 1}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Legend */}
                                    <div className="mt-4 pt-4 border-t space-y-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded bg-gradient-to-br from-blue-600 to-purple-600"></div>
                                            <span className="text-gray-600">Soalan semasa</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded bg-green-100 border-2 border-green-300"></div>
                                            <span className="text-gray-600">Sudah dijawab</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded bg-white border-2 border-gray-200"></div>
                                            <span className="text-gray-600">Belum dijawab</span>
                                        </div>
                                    </div>

                                    {/* Submit button if all answered */}
                                    {allAnswered && (
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg font-semibold"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Menghantar...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Hantar Semua Jawapan
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </DashboardLayout>
    );
}
