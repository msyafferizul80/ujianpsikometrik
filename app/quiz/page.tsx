"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ArrowLeft, Send, Save, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AnswerOption } from "@/components/AnswerOption";
import { DashboardLayout } from "@/components/DashboardLayout";
import { QuizSkeleton } from "@/components/QuizSkeleton";
import { ExamViolationBanner } from "@/components/ExamViolationBanner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useScreenWakeLock } from "@/utils/useScreenWakeLock";
import { DiscussionBoard } from "@/components/DiscussionBoard";

import { quizRepository } from "@/utils/supabaseRepository";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const router = useRouter();

    // Server-side exam timer state
    const [examEndsAt, setExamEndsAt] = useState<string | undefined>(undefined);
    const [examAttemptId, setExamAttemptId] = useState<number | null>(null);
    const [isRealExamMode, setIsRealExamMode] = useState(false);

    // Anti-cheat state
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [showViolationBanner, setShowViolationBanner] = useState(false);
    const answersRef = useRef<Record<number, string>>({});
    const tabSwitchRef = useRef(0);

    // Offline / PWA state
    const [isOffline, setIsOffline] = useState(false);
    const [pendingSync, setPendingSync] = useState(false);

    // Apply Screen Wake Lock
    useScreenWakeLock(isRealExamMode);

    // Load questions and saved progress
    // ... imports ...
    // ... imports ...

    // ... inside component ...
    // Helper to securely set questions with limit check
    const setQuestionsWithSecurity = async (allQuestions: Question[]) => {
        // Fetch User Session & Profile
        const { data: { session } } = await supabase.auth.getSession();
        let isPremium = false;

        if (session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('subscription_tier, role, subscription_end_date')
                .eq('id', session.user.id)
                .single();

            // Check criteria for premium
            if (profile && (profile.role === 'admin' || profile.subscription_tier !== 'free')) {
                // Check expiry date
                if (profile.subscription_end_date) {
                    const endDate = new Date(profile.subscription_end_date);
                    if (endDate > new Date()) {
                        isPremium = true;
                    } else {
                        isPremium = false; // Expired
                    }
                } else {
                    // No date but not free? Assume active unless explicitly handled
                    isPremium = true;
                }
            }
        }

        // Enforce Limit
        if (!isPremium && allQuestions.length > 10) {
            console.log("🔒 Enforcing Free Limit: Slicing to 10 questions");
            setQuestions(allQuestions.slice(0, 10));
            localStorage.setItem('isFreeLimit', 'true');
        } else {
            console.log("🔓 Full Access Granted");
            setQuestions(allQuestions);
            localStorage.removeItem('isFreeLimit');
        }
    };

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
                            await setQuestionsWithSecurity(data);
                            setLoading(false);
                            return;
                        }
                    } catch (err) {
                        console.error("Failed to load smart review questions", err);
                    }
                }
            }

            // 1.5 Killer Questions Mode
            if (activeQuizId === 'killer-mode') {
                try {
                    const res = await fetch('/api/questions/killer-questions');
                    const data = await res.json();
                    if (data && data.length > 0) {
                        await setQuestionsWithSecurity(data);
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error("Failed to load killer questions", err);
                }
            }

            // 2. Real Exam Mode
            if (activeQuizId && activeQuizId.startsWith('real-exam-mode')) {
                try {
                    const res = await fetch('/api/questions');
                    let data = await res.json();

                    if (data && data.length > 0) {
                        // Ensure we have 170 questions
                        let finalQuestions = [...data];

                        // If less than 170, recycle questions (Shuffle & Duplicate) to simulate fatigue
                        if (finalQuestions.length < 170) {
                            while (finalQuestions.length < 170) {
                                const needed = 170 - finalQuestions.length;
                                const extra = data.sort(() => 0.5 - Math.random()).slice(0, needed);
                                finalQuestions = [...finalQuestions, ...extra];
                            }
                        }

                        // Final Shuffle
                        const shuffled = finalQuestions.sort(() => 0.5 - Math.random());
                        // Assign unique IDs to duplicates to prevent key clashes in React
                        const remapped = shuffled.map((q: any, i: number) => ({
                            ...q,
                            id: i + 10000 // Temporary ID for session
                        }));

                        await setQuestionsWithSecurity(remapped.slice(0, 170));
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error("Failed to load real exam questions", err);
                }
            }

            // 2.5 Adaptive Learning Mode
            if (activeQuizId === 'adaptive-mode') {
                try {
                    const token = (await supabase.auth.getSession()).data.session?.access_token || ''; // Pass token to API for user perf context
                    const teras = localStorage.getItem('activeTeras');
                    const url = teras ? `/api/questions/adaptive?teras=${encodeURIComponent(teras)}` : `/api/questions/adaptive`;

                    const res = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (data && data.length > 0) {
                        await setQuestionsWithSecurity(data);
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error("Failed to load adaptive questions", err);
                }
            }

            // 3. Try to load from Supabase if we have a normal ID
            if (activeQuizId && !activeQuizId.startsWith('demo-') && activeQuizId !== 'smart-review' && activeQuizId !== 'killer-mode' && activeQuizId !== 'adaptive-mode' && !activeQuizId.startsWith('real-exam-mode')) {
                try {
                    const data = await quizRepository.getQuestionsByQuizId(activeQuizId);
                    if (data && data.length > 0) {
                        await setQuestionsWithSecurity(data);

                        // Validate Data Integrity
                        const missingAnswers = data.filter((q: any) => !q.correctAnswer).length;
                        if (missingAnswers > 0 && missingAnswers === data.length) {
                            alert("AMARAN: Set soalan ini mungkin rosak (Tiada Jawapan). Hubungi Admin.");
                        }

                        setLoading(false);
                        return;
                    } else {
                        throw new Error("No questions found");
                    }
                } catch (err) {
                    console.error("Failed to load from Supabase", err);
                    alert("Gagal memuat turun soalan. Sila refresh.");
                    setLoading(false);
                    return;
                }
            }

            // 3. Fallback / Default Demo Logic
            if (!activeQuizId || activeQuizId.startsWith('demo-')) {
                fetch('/api/questions')
                    .then(res => res.json())
                    .then(async (data) => {
                        await setQuestionsWithSecurity(data);
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error("Failed to load demo questions", err);
                        setLoading(false);
                    });
            } else {
                setLoading(false);
            }

            // Load saved state (User progress)
            const savedAnswers = localStorage.getItem('quizAnswers');
            if (savedAnswers) {
                setAnswers(JSON.parse(savedAnswers));
            };

            localStorage.setItem('quizInProgress', 'true');
        };

        loadQuizData();
    }, []);

    // Keep answers ref in sync for heartbeat
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    // ─── ANTI-CHEAT EFFECTS (Real Exam Mode only) ─────────────────────────────
    useEffect(() => {
        const activeQuizId = localStorage.getItem('activeQuizId');
        const realExam = activeQuizId?.startsWith('real-exam-mode');
        setIsRealExamMode(!!realExam);

        if (!realExam) return;

        // 1. Disable right-click
        const onContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', onContextMenu);

        // 2. Disable text selection via CSS
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        // 3. Tab-switch detection
        const onVisibilityChange = () => {
            if (document.hidden) {
                tabSwitchRef.current += 1;
                setTabSwitchCount(tabSwitchRef.current);
                setShowViolationBanner(true);

                // Record violation via heartbeat
                if (examAttemptId) {
                    fetch('/api/exam/heartbeat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            attempt_id: examAttemptId,
                            answers: answersRef.current,
                            tab_switches: tabSwitchRef.current,
                            violation: { type: 'TAB_SWITCH' },
                        }),
                    }).catch(() => { });
                }
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        // 4. Disable copy-paste keyboard shortcuts
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'u'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('contextmenu', onContextMenu);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        };
    }, [examAttemptId]);

    // Check & restore server-side exam session on page load
    useEffect(() => {
        const storedAttemptId = localStorage.getItem('examAttemptId');
        const storedEndsAt = localStorage.getItem('examEndsAt');
        if (storedAttemptId && storedEndsAt) {
            const secsLeft = Math.floor((new Date(storedEndsAt).getTime() - Date.now()) / 1000);
            if (secsLeft > 0) {
                setExamAttemptId(parseInt(storedAttemptId));
                setExamEndsAt(storedEndsAt);
            } else {
                // Expired — clear stored session
                localStorage.removeItem('examAttemptId');
                localStorage.removeItem('examEndsAt');
            }
        }
    }, []);

    // NEW: Network Status & Offline Queue Listener
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        // Initial check
        if (typeof window !== 'undefined') {
            setIsOffline(!navigator.onLine);
            if (localStorage.getItem('offlinePendingQueue')) {
                setPendingSync(true);
            }
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Process Offline Queue when back online
    useEffect(() => {
        const processOfflineQueue = async () => {
            if (!isOffline && pendingSync) {
                const queueStr = localStorage.getItem('offlinePendingQueue');
                if (queueStr) {
                    try {
                        const tasks = JSON.parse(queueStr);
                        // In a real scenario, process all tasks. 
                        // Here we assume a single exam attempt pending.
                        for (const task of tasks) {
                            const activeQuizId = task.quizId;
                            const userName = localStorage.getItem('userName') || 'Anonymous Candidate';

                            const { createClient } = require('@supabase/supabase-js');
                            const supabase = createClient(
                                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                            );
                            const { data: { session } } = await supabase.auth.getSession();
                            const userId = session?.user?.id;

                            const { quizRepository } = await import("@/utils/supabaseRepository");
                            await quizRepository.saveAttempt(userName, parseInt(activeQuizId), task.totalScore, task.answers, userId);

                            if (userId) {
                                await quizRepository.updateStreak(userId);
                            }
                        }

                        // Clear queue
                        localStorage.removeItem('offlinePendingQueue');
                        setPendingSync(false);
                        console.log("✅ Offline sync completed successfully.");
                    } catch (e) {
                        console.error("Failed to sync offline queue", e);
                        // Keep queue if failed
                    }
                }
            }
        };
        processOfflineQueue();
    }, [isOffline, pendingSync]);

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

    // Auto-save functionality (now also syncs to server via heartbeat if in exam mode)
    useEffect(() => {
        if (questions.length === 0) return;

        const autoSaveInterval = setInterval(async () => {
            setAutoSaving(true);
            localStorage.setItem('quizAnswers', JSON.stringify(answers));
            localStorage.setItem('currentQuestion', currentIdx.toString());

            // Heartbeat sync if in real exam mode
            if (examAttemptId) {
                try {
                    await fetch('/api/exam/heartbeat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            attempt_id: examAttemptId,
                            answers: answersRef.current,
                            tab_switches: tabSwitchRef.current,
                        }),
                    });
                } catch { /* silent */ }
            }

            setTimeout(() => setAutoSaving(false), 1000);
        }, 30000);

        return () => clearInterval(autoSaveInterval);
    }, [answers, currentIdx, questions.length, examAttemptId]);

    // Save on answer change (Ensures progress survives sudden shutdown)
    useEffect(() => {
        if (Object.keys(answers).length > 0) {
            setAutoSaving(true);
            localStorage.setItem('quizAnswers', JSON.stringify(answers));
            localStorage.setItem('currentQuestion', currentIdx.toString());
            // Reinforce persistent flag
            localStorage.setItem('quizInProgress', 'true');
            // Instant feedback for save
            setTimeout(() => setAutoSaving(false), 500);
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

    const submitActual = useCallback(async () => {
        setSubmitting(true);
        try {
            // 1. Calculate Score & Stats (Frontend Calculation)
            // This ensures we use the *currently loaded* questions, not the default server ones

            const terasScores: Record<string, { score: number; max: number; percentage: number }> = {};
            let totalScore = 0;
            let maxTotal = 0;

            questions.forEach(q => {
                // Normalize Teras key
                // Normalize Teras key
                let teras = q.teras.trim(); // Trim whitespace

                // If it's a known legacy key or complex string, we might want to clean it,
                // but generally we should trust the parser's output (e.g. "DISIPLIN")

                // Capitalize first letter strictly if needed, or just keep as is.
                // For chart consistency, maybe specific casing?
                // Let's just rely on the stored value but ensure it's not empty.
                if (!teras || teras.toLowerCase() === 'general') teras = 'Umum';

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

            // 2. Save to Supabase OR local offline queue
            const activeQuizId = localStorage.getItem('activeQuizId');
            if (activeQuizId && !activeQuizId.startsWith('demo-')) {
                if (navigator.onLine) {
                    // Online: Save directly
                    const userName = localStorage.getItem('userName') || 'Anonymous Candidate';

                    // Fetch User ID
                    const { createClient } = require('@supabase/supabase-js');
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    );
                    const { data: { session } } = await supabase.auth.getSession();
                    const userId = session?.user?.id;

                    // Using dynamic import to avoid any potential server-component issues
                    const { quizRepository } = await import("@/utils/supabaseRepository");
                    await quizRepository.saveAttempt(userName, parseInt(activeQuizId), totalScore, answers, userId);

                    // Update Streak
                    if (userId) {
                        await quizRepository.updateStreak(userId);
                    }
                } else {
                    // Offline: Queue to localStorage
                    console.log("Device offline. Queuing attempt for later sync.");
                    const existingQueueStr = localStorage.getItem('offlinePendingQueue');
                    const queue = existingQueueStr ? JSON.parse(existingQueueStr) : [];
                    queue.push({
                        quizId: activeQuizId,
                        totalScore,
                        answers,
                        timestamp: Date.now()
                    });
                    localStorage.setItem('offlinePendingQueue', JSON.stringify(queue));
                    setPendingSync(true);
                    alert("Peranti anda kini di luar talian (offline). Jawapan telah disimpan di dalam peranti. Ia akan dihantar secara automatik apabila internet kembali pulih.");
                }
            }

            // Save result (User context)
            localStorage.setItem('quizResult', JSON.stringify(resultWithAnswers));

            // Clean up temporary local progress (DO NOT cleanup offlinePendingQueue)
            localStorage.removeItem('quizAnswers');
            localStorage.removeItem('currentQuestion');
            localStorage.removeItem('quizTimeLeft');
            localStorage.removeItem('quizInProgress');
            // Do not remove isFreeLimit here yet, as it might be needed for logic, but usually it's fine.

            router.push('/result');
        } catch (e) {
            console.error("Submission failed", e);
            setSubmitting(false);
            alert("Gagal menghantar jawapan. Sila cuba lagi.");
        }
    }, [answers, questions, router]);

    const handleSubmit = useCallback(async () => {
        // Check if all questions are answered
        const unansweredCount = questions.filter(q => !answers[q.id]).length;

        if (unansweredCount > 0) {
            const confirm = window.confirm(
                `Anda masih mempunyai ${unansweredCount} soalan yang belum dijawab. Adakah anda pasti mahu menghantar?`
            );
            if (!confirm) return;
        }

        // Check for Free Limit Logic
        const isFreeLimit = localStorage.getItem('isFreeLimit') === 'true';
        if (isFreeLimit) {
            setShowUpgradeModal(true);
            return;
        }

        await submitActual();
    }, [answers, questions, submitActual]);

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
    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / questions.length) * 100;  // Based on answers, not current position
    const allAnswered = answeredCount === questions.length;

    return (
        <DashboardLayout>
            {/* Anti-cheat violation banner */}
            {showViolationBanner && (
                <ExamViolationBanner
                    violationCount={tabSwitchCount}
                    onDismiss={() => setShowViolationBanner(false)}
                />
            )}

            <div
                className={`min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 flex flex-col ${isRealExamMode ? 'select-none' : ''}`}
                onContextMenu={(e) => { if (isRealExamMode) { e.preventDefault(); alert("Right-click is disabled during Real Exam Mode."); } }}
                onCopy={(e) => { if (isRealExamMode) { e.preventDefault(); alert("Copying is disabled during Real Exam Mode."); } }}
                onPaste={(e) => { if (isRealExamMode) { e.preventDefault(); } }}
                onCut={(e) => { if (isRealExamMode) { e.preventDefault(); } }}
            >
                {/* Enhanced Header */}
                <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
                            {/* Title */}
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    {localStorage.getItem('activeQuizTitle') || "PsikoPro 2026"}
                                    {isRealExamMode && (
                                        <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                                            🔴 EXAM SEBENAR
                                        </span>
                                    )}
                                </h1>
                                <p className="text-sm text-gray-600">
                                    Soalan {currentIdx + 1} daripada {questions.length}
                                </p>
                            </div>

                            {/* Timer and Stats */}
                            <div className="flex items-center gap-3">
                                {/* Network Status indicator */}
                                {isOffline ? (
                                    <div className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg border border-red-100">
                                        <WifiOff className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Offline</span>
                                    </div>
                                ) : pendingSync ? (
                                    <div className="flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg border border-blue-100 animate-pulse">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span className="hidden sm:inline">Menyegerak...</span>
                                    </div>
                                ) : (
                                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                                        <Wifi className="h-3.5 w-3.5" />
                                        Online
                                    </div>
                                )}

                                {/* Auto-save indicator */}
                                {autoSaving && (
                                    <div className="flex items-center gap-2 text-xs text-green-600">
                                        <Save className="h-4 w-4" />
                                        <span className="hidden md:inline">Tersimpan</span>
                                    </div>
                                )}

                                {/* Tab violation badge (real exam only) */}
                                {isRealExamMode && tabSwitchCount > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1.5 rounded-lg border border-red-200">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {tabSwitchCount} pelanggaran
                                    </div>
                                )}


                                {/* Answered count */}
                                <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                                    {answeredCount}/{questions.length} dijawab
                                </div>

                                {/* Timer */}
                                <CountdownTimer
                                    onTimeUp={handleTimeUp}
                                    endsAt={examEndsAt}
                                    initialMinutes={
                                        typeof window !== 'undefined' && localStorage.getItem('activeQuizId') === 'killer-mode'
                                            ? 30
                                            : (localStorage.getItem('activeQuizId')?.startsWith('real-exam-mode') ? 90 : 60)
                                    }
                                    quizId={(typeof window !== 'undefined' && localStorage.getItem('activeQuizId')) || 'default'}
                                    onHeartbeat={examAttemptId ? async () => {
                                        try {
                                            const res = await fetch('/api/exam/heartbeat', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    attempt_id: examAttemptId,
                                                    answers: answersRef.current,
                                                    tab_switches: tabSwitchRef.current,
                                                }),
                                            });
                                            const data = await res.json();
                                            return data.seconds_remaining ?? null;
                                        } catch { return null; }
                                    } : undefined}
                                />
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

                                    {/* Discussion Board Integration */}
                                    {!isRealExamMode && (typeof window !== 'undefined' ? localStorage.getItem('activeQuizId') : '') !== 'killer-mode' && (
                                        <div className="mt-8 pt-6 border-t border-gray-100">
                                            <DiscussionBoard questionId={currentQ.id} />
                                        </div>
                                    )}
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
            <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <span className="text-2xl">👑</span>
                            Tahniah! Anda Selesai 10 Soalan
                        </DialogTitle>
                        <DialogDescription className="text-base pt-2">
                            Anda telah melengkapkan percubaan percuma. Untuk keputusan yang lebih tepat dan analisis AI yang mendalam, anda disarankan untuk menjawab kesemua soalan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                <ArrowRight className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-blue-900">Apa yang anda dapat dengan Premium?</h4>
                                <ul className="text-sm text-blue-800 list-disc list-inside mt-1 space-y-1">
                                    <li>Akses penuh koleksi soalan terkini</li>
                                    <li>Analisis AI Kelemahan & Kekuatan</li>
                                    <li>Skor Teras (Emosi, Kerjasama, dll)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={async () => {
                                setShowUpgradeModal(false);
                                await submitActual();
                            }}
                            className="w-full sm:w-auto"
                        >
                            Hantar & Lihat Skor (Free)
                        </Button>
                        <Button
                            onClick={() => router.push('/pricing')}
                            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                        >
                            Naik Taraf Sekarang
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
