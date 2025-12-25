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

            // 1. Try to load from Supabase if we have an ID (and it's not a demo ID string like "demo-1")
            if (activeQuizId && !activeQuizId.startsWith('demo-')) {
                try {
                    const data = await quizRepository.getQuestionsByQuizId(activeQuizId);
                    if (data && data.length > 0) {
                        // Map options correctly if they are complex objects, but repository already maps them
                        setQuestions(data);
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error("Failed to load from Supabase", err);
                    // If fail, fall through to demo logic
                }
            }

            // 2. Fallback / Default Demo Logic
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

            // Load saved state (User progress)
            const savedAnswers = localStorage.getItem('quizAnswers');
            const savedQuestion = localStorage.getItem('currentQuestion');
            if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
            if (savedQuestion) setCurrentIdx(parseInt(savedQuestion));
            localStorage.setItem('quizInProgress', 'true');
        };

        loadQuizData();
    }, []);

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
            // 1. Calculate Score (Frontend calculation for immediate feedback)
            // Simple scoring: 1 point per correct answer (can be enhanced later)
            const score = questions.reduce((acc, q) => {
                return acc + (answers[q.id] === q.correctAnswer ? 1 : 0); // Need to ensure q has correctAnswer
            }, 0);

            // 2. Save to Supabase
            const activeQuizId = localStorage.getItem('activeQuizId');
            if (activeQuizId && !activeQuizId.startsWith('demo-')) {
                // Use a default user name for now since Auth isn't fully enforced on frontend
                const userName = localStorage.getItem('userName') || 'Anonymous Candidate';
                await quizRepository.saveAttempt(userName, parseInt(activeQuizId), score * 10, answers); // Assuming 10 points per q or logic
            }

            const res = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers })
            });
            const result = await res.json();

            // Save result (User context)
            const resultWithAnswers = { ...result, answers };
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
                                    Ujian Psikometrik 2025
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
                                            Soalan {currentQ.id}
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
