"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { Loader2, RefreshCcw, FileText, Share2, Download, Copy, Check, TrendingUp, Target, ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { saveQuizAttempt } from "@/utils/stats";
import { shareResult } from "@/utils/share";
import { DashboardLayout } from "@/components/DashboardLayout";
import { QuestionReview } from "@/components/QuestionReview";
import { InconsistencyReport, Inconsistency } from "@/components/InconsistencyReport";
import { ShareModal } from "@/components/ShareModal";
import jsPDF from 'jspdf';

interface TerasResult {
    score: number;
    max: number;
    percentage: number;
}

interface ResultData {
    totalScore: number;
    maxScore: number;
    terasScores: Record<string, TerasResult>;
    answers?: Record<number, string>; // Extended with answers
}

interface Question {
    id: number;
    teras: string;
    question: string;
    options: { label: string; text: string }[];
    correctAnswer: string;
    explanation: string;
}

export default function ResultPage() {
    const [result, setResult] = useState<ResultData | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [advice, setAdvice] = useState<string>("");
    const [loadingAdvice, setLoadingAdvice] = useState(false);
    const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);
    const [consistencyScore, setConsistencyScore] = useState<number | undefined>(undefined);
    const [checkingInconsistency, setCheckingInconsistency] = useState(false);
    const [prevBest, setPrevBest] = useState<number | null>(null);
    const [averageScore, setAverageScore] = useState<number | null>(null);
    const [percentile, setPercentile] = useState<number | null>(null);
    const [globalAverage, setGlobalAverage] = useState<number | null>(null);
    const [totalCandidates, setTotalCandidates] = useState<number | null>(null);
    const router = useRouter();
    const [searchParams] = useState(new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''));
    const [copied, setCopied] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);
    const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);

    const [isPremium, setIsPremium] = useState(false);
    const [jobTitle, setJobTitle] = useState<string>("Pegawai Kerajaan");
    const shareRef = useRef<HTMLDivElement>(null);

    // Load Data
    useEffect(() => {
        // Check Premium Status
        const checkPremium = async () => {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('subscription_tier, role, subscription_end_date')
                    .eq('id', session.user.id)
                    .single();

                if (profile && (profile.role === 'admin' || profile.subscription_tier !== 'free')) {
                    if (!profile.subscription_end_date || new Date(profile.subscription_end_date) > new Date()) {
                        setIsPremium(true);
                    }
                }
            }
        };
        checkPremium();

        const attemptId = searchParams.get('attempt_id');

        // Mode 1: Historical View via URL
        if (attemptId) {
            const fetchAttempt = async () => {
                try {
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    );

                    // Fetch attempt with quiz relation
                    const { data: attempt, error } = await supabase
                        .from('attempts')
                        .select('*, quizzes(*)')
                        .eq('id', attemptId)
                        .single();

                    if (error || !attempt) {
                        console.error("Attempt not found", error);
                        router.push('/history');
                        return;
                    }

                    // Fetch questions to reconstruct Report
                    const { quizRepository } = await import("@/utils/supabaseRepository");
                    const quizQuestions = await quizRepository.getQuestionsByQuizId(attempt.quiz_id.toString());

                    if (quizQuestions) {
                        setQuestions(quizQuestions);

                        // Recalculate Teras Scores (Score Reconstruction)
                        const terasScores: Record<string, TerasResult> = {};

                        quizQuestions.forEach((q: Question) => {
                            const selected = attempt.answers?.[q.id];
                            const correct = q.correctAnswer;
                            const isCorrect = selected === correct;

                            if (!terasScores[q.teras]) {
                                terasScores[q.teras] = { score: 0, max: 0, percentage: 0 };
                            }

                            // Reconstruction logic: 
                            // If user was scored 10 points for matches (based on backend logic), we approximate here.
                            // To match Radar Chart needs, we just need relative strength (0-100%).
                            terasScores[q.teras].score += isCorrect ? 1 : 0;
                            terasScores[q.teras].max += 1;
                        });

                        Object.keys(terasScores).forEach(key => {
                            terasScores[key].percentage = Math.round((terasScores[key].score / terasScores[key].max) * 100);
                        });

                        setResult({
                            totalScore: attempt.score,
                            maxScore: quizQuestions.length * 10,
                            terasScores,
                            answers: attempt.answers
                        });

                        // Fetch previous best from DB (same quiz, same user, excluding this attempt)
                        const { data: allAttempts } = await supabase
                            .from('attempts')
                            .select('score')
                            .eq('quiz_id', attempt.quiz_id)
                            .eq('user_id', attempt.user_id)
                            .neq('id', attempt.id)
                            .order('score', { ascending: false })
                            .limit(20);

                        if (allAttempts && allAttempts.length > 0) {
                            const maxQ = quizQuestions.length * 10;
                            const bestPct = Math.round((allAttempts[0].score / maxQ) * 100);
                            setPrevBest(bestPct);
                            const avgPct = Math.round(
                                allAttempts.reduce((s: number, a: { score: number }) => s + a.score, 0) / allAttempts.length / maxQ * 100
                            );
                            setAverageScore(avgPct);
                        }

                        // Fetch AI advice
                        setLoadingAdvice(true);
                        const jobRole = attempt.quizzes?.title || "Penolong Pegawai Belia Dan Sukan";
                        setJobTitle(jobRole);

                        fetch('/api/generate-advice', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                scores: terasScores,
                                jobRole: jobRole
                            })
                        })
                            .then(res => res.json())
                            .then(data => {
                                setAdvice(data.advice);
                                setLoadingAdvice(false);
                            })
                            .catch(err => setLoadingAdvice(false));

                        // Fetch Analytics
                        fetch('/api/analytics/performance', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                score: attempt.score,
                                quizId: attempt.quiz_id
                            })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.percentile) setPercentile(data.percentile);
                                if (data.averageScore) setGlobalAverage(data.averageScore);
                                if (data.totalCandidates) setTotalCandidates(data.totalCandidates);
                            })
                            .catch(err => console.error("Analytics fetch error", err));

                        // Check Inconsistency
                        if (quizQuestions.length > 0) {
                            setCheckingInconsistency(true);
                            fetch('/api/analyze-inconsistency', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    answers: attempt.answers,
                                    questions: quizQuestions,
                                    attempt_id: attempt.id,
                                })
                            })
                                .then(res => res.json())
                                .then(data => {
                                    if (data.inconsistencies) setInconsistencies(data.inconsistencies);
                                    if (data.score !== undefined) setConsistencyScore(data.score);
                                    setCheckingInconsistency(false);
                                })
                                .catch(err => {
                                    console.error(err);
                                    setCheckingInconsistency(false);
                                });
                        }
                    }
                } catch (e) {
                    console.error("Failed to load historical attempt", e);
                    router.push('/history');
                }
            };
            fetchAttempt();
        } else {
            // Mode 2: Standard Local Storage (Post-Quiz)
            const saved = localStorage.getItem('quizResult');
            const historyStr = localStorage.getItem('quizHistory');

            if (saved) {
                const parsed = JSON.parse(saved);
                setResult(parsed);

                if (historyStr) {
                    const history = JSON.parse(historyStr);
                    if (history.length > 0) {
                        const best = Math.max(...history.map((h: { percentage: number }) => h.percentage));
                        const avg = Math.round(history.reduce((a: number, b: { percentage: number }) => a + b.percentage, 0) / history.length);
                        setPrevBest(best);
                        setAverageScore(avg);
                    }
                }

                saveQuizAttempt(parsed.totalScore, parsed.maxScore, parsed.terasScores, parsed.answers);

                // Fetch Questions Logic to get Title first if possible (async race condition fix)
                const activeQuizId = localStorage.getItem('activeQuizId');

                // Fetch Analytics (Post-Quiz)
                if (activeQuizId && !activeQuizId.startsWith('demo-')) {
                    fetch('/api/analytics/performance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            score: parsed.totalScore,
                            quizId: activeQuizId
                        })
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.percentile) setPercentile(data.percentile);
                            if (data.averageScore) setGlobalAverage(data.averageScore);
                            if (data.totalCandidates) setTotalCandidates(data.totalCandidates);
                        })
                        .catch(err => console.error("Analytics fetch error", err));
                }

                // Helper to fetch title
                const fetchTitleAndAdvice = async () => {
                    let jobRole = "Penolong Pegawai Belia Dan Sukan"; // Default

                    if (activeQuizId && !activeQuizId.startsWith('demo-') && activeQuizId !== 'smart-review') {
                        try {
                            const { createClient } = await import('@supabase/supabase-js');
                            const supabase = createClient(
                                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                            );
                            const { data } = await supabase.from('quizzes').select('title').eq('id', activeQuizId).single();
                            if (data?.title) {
                                jobRole = data.title;
                                setJobTitle(jobRole);
                            }
                        } catch (e) {
                            console.error("Error fetching quiz title for advice", e);
                        }
                    } else {
                        setJobTitle("Pegawai Kerajaan");
                    }

                    setLoadingAdvice(true);
                    fetch('/api/generate-advice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            scores: parsed.terasScores,
                            jobRole: jobRole
                        })
                    })
                        .then(res => res.json())
                        .then(data => {
                            setAdvice(data.advice);
                            setLoadingAdvice(false);
                        })
                        .catch(err => setLoadingAdvice(false));
                };

                fetchTitleAndAdvice();
                const fetchQuestions = async () => {
                    let fetchedQuestions: Question[] = [];
                    if (activeQuizId === 'smart-review') {
                        const teras = localStorage.getItem('activeTeras');
                        if (teras) {
                            const { quizRepository } = await import("@/utils/supabaseRepository");
                            const data = await quizRepository.getQuestionsByTeras(teras, 10);
                            if (data) fetchedQuestions = data;
                        }
                    } else if (activeQuizId && !activeQuizId.startsWith('demo-')) {
                        try {
                            const { quizRepository } = await import("@/utils/supabaseRepository");
                            const data = await quizRepository.getQuestionsByQuizId(activeQuizId);
                            if (data) fetchedQuestions = data;
                        } catch (err) { console.error(err); }
                    }

                    if (fetchedQuestions.length === 0) {
                        const res = await fetch('/api/questions');
                        fetchedQuestions = await res.json();
                    }
                    setQuestions(fetchedQuestions);

                    if (fetchedQuestions.length > 0) {
                        setCheckingInconsistency(true);
                        fetch('/api/analyze-inconsistency', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                answers: parsed.answers,
                                questions: fetchedQuestions,
                                attempt_id: null,
                            })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.inconsistencies) setInconsistencies(data.inconsistencies);
                                if (data.score !== undefined) setConsistencyScore(data.score);
                                setCheckingInconsistency(false);
                            })
                            .catch(err => {
                                console.error(err);
                                setCheckingInconsistency(false);
                            });
                    }
                };
                fetchQuestions();
            } else {
                router.push('/dashboard');
            }
        }
    }, [router, searchParams]);

    const handleDownloadSummary = () => {
        try {
            setDownloading(true);

            const W = 1200, H = 630;
            const canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d')!;
            if (!ctx) return;

            // ─── BACKGROUND ───────────────────────────────────────────────
            ctx.fillStyle = '#06060f';
            ctx.fillRect(0, 0, W, H);

            // Subtle grid lines
            ctx.strokeStyle = 'rgba(99,102,241,0.06)';
            ctx.lineWidth = 1;
            for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
            for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

            // Glow orb top-right
            const orb1 = ctx.createRadialGradient(W - 80, 80, 0, W - 80, 80, 280);
            orb1.addColorStop(0, 'rgba(99,102,241,0.35)');
            orb1.addColorStop(1, 'transparent');
            ctx.fillStyle = orb1;
            ctx.fillRect(0, 0, W, H);

            // Glow orb bottom-left
            const orb2 = ctx.createRadialGradient(120, H - 80, 0, 120, H - 80, 220);
            orb2.addColorStop(0, 'rgba(139,92,246,0.3)');
            orb2.addColorStop(1, 'transparent');
            ctx.fillStyle = orb2;
            ctx.fillRect(0, 0, W, H);

            // ─── TOP GOLD ACCENT BAR ──────────────────────────────────────
            const goldBar = ctx.createLinearGradient(0, 0, W, 0);
            goldBar.addColorStop(0, 'transparent');
            goldBar.addColorStop(0.2, '#f59e0b');
            goldBar.addColorStop(0.8, '#fbbf24');
            goldBar.addColorStop(1, 'transparent');
            ctx.fillStyle = goldBar;
            ctx.fillRect(0, 0, W, 4);

            // ─── LEFT VERTICAL ACCENT ─────────────────────────────────────
            const vGold = ctx.createLinearGradient(0, 0, 0, H);
            vGold.addColorStop(0, 'transparent');
            vGold.addColorStop(0.3, '#f59e0b');
            vGold.addColorStop(0.7, '#fbbf24');
            vGold.addColorStop(1, 'transparent');
            ctx.fillStyle = vGold;
            ctx.fillRect(0, 0, 3, H);

            // ─── CORNER BRACKET TL ────────────────────────────────────────
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(40, 70); ctx.lineTo(40, 40); ctx.lineTo(70, 40); ctx.stroke();

            // Corner bracket BR
            ctx.beginPath(); ctx.moveTo(W - 40, H - 70); ctx.lineTo(W - 40, H - 40); ctx.lineTo(W - 70, H - 40); ctx.stroke();

            // ─── APP BRAND ────────────────────────────────────────────────
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 22px sans-serif';
            ctx.letterSpacing = '2px';
            ctx.fillText('ONLINE PSIKOMETRIK EXAM', 88, 84);
            ctx.letterSpacing = '0px';

            ctx.fillStyle = 'rgba(253,230,138,0.7)';
            ctx.font = '13px sans-serif';
            ctx.fillText('Sistem Penilaian Psikometrik Penjawat Awam Malaysia', 88, 106);

            // ─── DIVIDER ──────────────────────────────────────────────────
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(88, 126); ctx.lineTo(W - 88, 126); ctx.stroke();

            // ─── CANDIDATE RESULT LABEL ───────────────────────────────────
            ctx.fillStyle = 'rgba(165,180,252,0.6)';
            ctx.font = '700 13px sans-serif';
            ctx.letterSpacing = '3px';
            ctx.fillText('REKOD PRESTASI UJIAN PSIKOMETRIK', 88, 165);
            ctx.letterSpacing = '0px';

            // ─── SCORE (GIANT) ────────────────────────────────────────────
            const score = overallPercentage;
            const scoreGrad = ctx.createLinearGradient(88, 180, 88, 340);
            scoreGrad.addColorStop(0, '#ffffff');
            scoreGrad.addColorStop(1, 'rgba(199,210,254,0.7)');
            ctx.fillStyle = scoreGrad;
            ctx.font = '800 160px sans-serif';
            ctx.fillText(`${score}%`, 88, 340);

            // Thin line between score & details
            ctx.strokeStyle = 'rgba(255,255,255,0.10)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(440, 170); ctx.lineTo(440, 360); ctx.stroke();

            // ─── RIGHT PANEL ──────────────────────────────────────────────
            const statusText = score >= 80 ? 'LAYAK CEMERLANG' : score >= 50 ? 'SEDERHANA' : 'BERISIKO GAGAL';
            const statusHex = score >= 80 ? '#4ade80' : score >= 50 ? '#fb923c' : '#f87171';

            // Status pill
            ctx.fillStyle = score >= 80 ? 'rgba(74,222,128,0.12)' : score >= 50 ? 'rgba(251,146,60,0.12)' : 'rgba(248,113,113,0.12)';
            ctx.beginPath(); ctx.roundRect(480, 182, 240, 36, 18); ctx.fill();
            ctx.strokeStyle = statusHex;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(480, 182, 240, 36, 18); ctx.stroke();
            ctx.fillStyle = statusHex;
            ctx.font = '700 14px sans-serif';
            ctx.letterSpacing = '2px';
            const sw = ctx.measureText(statusText).width;
            ctx.fillText(statusText, 480 + (240 - sw) / 2, 206);
            ctx.letterSpacing = '0px';

            // Label
            ctx.fillStyle = 'rgba(199,210,254,0.5)';
            ctx.font = '12px sans-serif';
            ctx.fillText('STATUS PENILAIAN', 480, 262);

            // Ranking
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 42px sans-serif';
            ctx.fillText(`Top ${100 - (percentile || 0)}%`, 480, 308);

            ctx.fillStyle = 'rgba(199,210,254,0.55)';
            ctx.font = '14px sans-serif';
            ctx.fillText(jobTitle, 480, 335);

            // Divider horizontal in right panel
            ctx.strokeStyle = 'rgba(255,255,255,0.07)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(480, 355); ctx.lineTo(W - 88, 355); ctx.stroke();

            // Consistency
            const cons = consistencyScore !== undefined ? consistencyScore : 100;
            const consHex = cons >= 80 ? '#4ade80' : '#fb923c';
            ctx.fillStyle = 'rgba(199,210,254,0.5)';
            ctx.font = '12px sans-serif';
            ctx.fillText('INDEKS KONSISTENSI', 480, 385);
            ctx.fillStyle = consHex;
            ctx.font = '700 28px sans-serif';
            ctx.fillText(`${cons}%`, 480, 418);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '14px sans-serif';
            ctx.fillText(cons >= 80 ? '— Integriti Tinggi' : '— Sederhana', 548, 418);

            // ─── BOTTOM DIVIDER ───────────────────────────────────────────
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(88, H - 72); ctx.lineTo(W - 88, H - 72); ctx.stroke();

            // ─── FOOTER ───────────────────────────────────────────────────
            ctx.fillStyle = 'rgba(253,230,138,0.5)';
            ctx.font = '700 14px sans-serif';
            ctx.letterSpacing = '1px';
            ctx.fillText('www.onlinepsikometrikexam.com', 88, H - 44);
            ctx.letterSpacing = '0px';

            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '13px sans-serif';
            const dateStr = new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' });
            const dw = ctx.measureText(dateStr).width;
            ctx.fillText(dateStr, W - 88 - dw, H - 44);

            // ─── SHOW SHARE MODAL ─────────────────────────────────────────
            const url = canvas.toDataURL('image/png');
            setShareImageUrl(url);
        } catch (err) {
            console.error('Failed to generate image', err);
        } finally {
            setDownloading(false);
        }
    };

    const handleCopyLink = () => {
        if (!result) return;
        const score = Math.round((result.totalScore / result.maxScore) * 100);
        const text = `Skor Ujian Psikometrik: ${score}%`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        window.print();
    };

    if (!result) return null;

    const chartData = Object.keys(result.terasScores)
        .filter(key => !['General', 'Umum'].includes(key))
        .map(key => ({
            subject: key,
            A: result.terasScores[key].percentage,
            fullMark: 100
        }));

    const overallPercentage = Math.round((result.totalScore / result.maxScore) * 100);
    const improvement = prevBest !== null ? overallPercentage - prevBest : 0;
    // const percentile = overallPercentage >= 90 ? 99 : overallPercentage >= 80 ? 90 : overallPercentage >= 70 ? 75 : overallPercentage >= 60 ? 50 : 25;

    const comparisonData = [
        { name: 'Anda', score: overallPercentage, fill: '#2563eb' },
        ...(globalAverage !== null ? [{ name: 'Purata Peserta', score: globalAverage, fill: '#94a3b8' }] : []),
        ...(prevBest !== null ? [{ name: 'Terbaik Anda', score: prevBest, fill: '#16a34a' }] : []),
    ];

    const weakestTeras = Object.entries(result.terasScores)
        .sort(([, a], [, b]) => a.percentage - b.percentage)
        .slice(0, 1)
        .map(([key]) => key)[0];

    return (
        <>
            <DashboardLayout>
                <div className="min-h-screen bg-gray-50 p-6">
                    <div className="max-w-5xl mx-auto space-y-8" ref={resultRef}>
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Rekod Latihan</h1>
                                <p className="text-gray-600">Analisis Prestasi Psikometrik Anda</p>
                            </div>
                            <div className="flex gap-2 print:hidden">
                                <Button variant="outline" onClick={handleCopyLink}>
                                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                    {copied ? "Disalin" : "Salin Skor"}
                                </Button>
                                <Button variant="outline" onClick={handlePrint}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Simpan PDF
                                </Button>
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0" onClick={handleDownloadSummary} disabled={downloading}>
                                    {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                                    Kongsi Keputusan
                                </Button>
                            </div>
                        </div>

                        {/* Inconsistency Report (New) */}
                        {result && questions.length > 0 && (
                            <div className="relative">
                                <InconsistencyReport
                                    inconsistencies={inconsistencies}
                                    score={consistencyScore}
                                    loading={checkingInconsistency}
                                />
                                {/* LOCK: Blur Overlay for Free Users */}
                                {!isPremium && !checkingInconsistency && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 border border-gray-200 rounded-lg">
                                        <Target className="h-10 w-10 text-gray-400 mb-2" />
                                        <h3 className="text-lg font-bold text-gray-900">Analisis Konsistensi Dikunci</h3>
                                        <p className="text-gray-600 max-w-sm mb-4">
                                            Naik taraf ke Premium untuk melihat jika jawapan anda konsisten atau 'Red Flag' di mata penemuduga.
                                        </p>
                                        <Button onClick={() => router.push('/pricing')} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
                                            Buka Kunci Premium
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Performance Card */}
                            {percentile !== null && (
                                <Card className="col-span-1 md:col-span-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg text-indigo-900 flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                                            Analisis Prestasi
                                        </CardTitle>
                                        <CardDescription className="text-indigo-700">
                                            Perbandingan skor anda dengan {totalCandidates ? `${totalCandidates} calon lain` : "calon lain"} dalam set soalan yang sama.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="text-center md:text-left">
                                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Ranking Anda</p>
                                                <div className="flex flex-col items-center md:items-start justify-center md:justify-start gap-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-4xl font-extrabold text-indigo-600">
                                                            Top {100 - percentile}%
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-medium text-indigo-800 bg-indigo-100/80 px-2.5 py-0.5 rounded-full mt-1 border border-indigo-200">
                                                        Bagi jawatan {jobTitle}
                                                    </span>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Anda mengatasi <strong>{percentile}%</strong> daripada {totalCandidates} peserta lain
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex-1 w-full space-y-3">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-semibold text-gray-700">Skor Anda</span>
                                                        <span className="font-bold text-indigo-600">{overallPercentage}%</span>
                                                    </div>
                                                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                                            style={{ width: `${overallPercentage}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {globalAverage !== null && (
                                                    <div className="space-y-1 opacity-75">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="font-semibold text-gray-600">Purata Calon</span>
                                                            <span className="font-bold text-gray-600">{globalAverage}%</span>
                                                        </div>
                                                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
                                                            <div
                                                                className="h-full bg-gray-500 rounded-full transition-all duration-700"
                                                                style={{ width: `${globalAverage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Score Card */}
                            <Card className="border-blue-100 shadow-md">
                                <CardHeader>
                                    <CardTitle>Ramalan Kejayaan</CardTitle>
                                    <CardDescription>Skor Keseluruhan</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center pt-2 pb-6">
                                    <div className="relative h-32 w-32 flex items-center justify-center rounded-full border-8 border-blue-500 bg-blue-50">
                                        <span className="text-3xl font-extrabold text-blue-700">{overallPercentage}%</span>
                                    </div>
                                    <div className="mt-4 text-center">
                                        <p className="text-base font-semibold text-gray-900">
                                            {overallPercentage >= 80 ? "Berpotensi Lulus" : overallPercentage >= 50 ? "Penambahbaikan" : "Berisiko Tinggi"}
                                        </p>
                                        <div className="flex justify-center gap-4 mt-2 text-xs">
                                            {prevBest !== null && (
                                                <span className={`${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {improvement > 0 ? `+${improvement}%` : improvement < 0 ? `${improvement}%` : "="} vs Terbaik
                                                </span>
                                            )}
                                            <span className="text-blue-600 font-medium">Top {100 - (percentile || 0)}% Peserta</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Radar Chart */}
                            <Card className="border-gray-100 shadow-md">
                                <CardHeader>
                                    <CardTitle>Indeks Kompetensi</CardTitle>
                                    <CardDescription>Analisis mengikut Teras</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[230px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                            <Radar
                                                name="Skor Anda"
                                                dataKey="A"
                                                stroke="#2563eb"
                                                fill="#2563eb"
                                                fillOpacity={0.6}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Consistency Gauge (New Priority 1 Feature) */}
                            <Card className="border-amber-100 shadow-md relative overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        Tolok Kejujuran
                                        {isPremium && <Check className="h-4 w-4 text-green-500" />}
                                    </CardTitle>
                                    <CardDescription>Tahap konsistensi jawapan</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center pt-2 pb-6">
                                    {!checkingInconsistency ? (
                                        <div className="relative w-full flex flex-col items-center">
                                            <div className="h-[120px] w-full relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={[
                                                                { name: 'Score', value: consistencyScore !== undefined ? consistencyScore : 100 },
                                                                { name: 'Remainder', value: 100 - (consistencyScore !== undefined ? consistencyScore : 100) }
                                                            ]}
                                                            cx="50%"
                                                            cy="100%"
                                                            startAngle={180}
                                                            endAngle={0}
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            <Cell fill={(consistencyScore !== undefined ? consistencyScore : 100) >= 80 ? '#10b981' : (consistencyScore !== undefined ? consistencyScore : 100) >= 60 ? '#f59e0b' : '#ef4444'} />
                                                            <Cell fill="#f3f4f6" />
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="absolute bottom-0 flex flex-col items-center w-full pb-2">
                                                <span className={`text-4xl font-extrabold ${(consistencyScore !== undefined ? consistencyScore : 100) >= 80 ? 'text-green-600' : (consistencyScore !== undefined ? consistencyScore : 100) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {consistencyScore !== undefined ? consistencyScore : 100}%
                                                </span>
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">
                                                    {(consistencyScore !== undefined ? consistencyScore : 100) >= 80 ? 'Sangat Konsisten' : (consistencyScore !== undefined ? consistencyScore : 100) >= 60 ? 'Sederhana' : 'Bahaya! Red Flag'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-[120px] text-amber-600/50">
                                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                            <p className="text-xs">Audit Integriti AI...</p>
                                        </div>
                                    )}
                                </CardContent>

                                {/* Explanatory footer */}
                                {!checkingInconsistency && (
                                    <div className="px-4 pb-4 text-center space-y-1 border-t border-gray-100 pt-3">
                                        <p className="text-[10px] text-gray-400 leading-snug">
                                            Skor ini dijana oleh AI berdasarkan analisis <strong>percanggahan personaliti</strong> dalam jawapan anda.
                                        </p>
                                        <p className="text-[10px] text-gray-400 leading-snug">
                                            {(consistencyScore !== undefined ? consistencyScore : 100) >= 80
                                                ? '✅ Jawapan konsisten — penemuduga akan percaya anda ikhlas.'
                                                : (consistencyScore !== undefined ? consistencyScore : 100) >= 60
                                                    ? '⚠️ Ada beberapa jawapan yang bercanggah — perlu diperbaiki.'
                                                    : '🚨 Terlalu banyak percanggahan — risiko ditolak dalam tapisan integriti.'}
                                        </p>
                                    </div>
                                )}

                                {!isPremium && !checkingInconsistency && (
                                    <div className="absolute inset-0 bg-white/50 backdrop-blur-md z-10 flex flex-col items-center justify-center p-4">
                                        <div className="bg-white p-2 rounded-full shadow-sm mb-2">
                                            <Lock className="h-5 w-5 text-gray-500" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">Tolok Kejujuran Dikuci</p>
                                        <p className="text-xs text-center text-gray-600 mt-1 mb-2">Lihat markah integriti secara visual</p>
                                        <Button onClick={() => router.push('/pricing')} size="sm" variant="outline" className="border-gray-300">
                                            Buka Kunci
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Comparison & Analysis Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Comparison Chart */}
                            <Card className="shadow-md border-0 ring-1 ring-gray-100">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                        Perbandingan Prestasi
                                    </CardTitle>
                                    <CardDescription>Bandingkan skor anda dengan purata</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={comparisonData} layout="vertical" margin={{ left: 20 }}>
                                            <XAxis type="number" domain={[0, 100]} hide />
                                            <YAxis dataKey="name" type="category" width={60} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={30}>
                                                {comparisonData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Next Steps / Focus Area */}
                            <Card className="shadow-md border-0 ring-1 ring-gray-100 bg-gradient-to-br from-indigo-50 to-white">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg text-indigo-900">
                                        <Target className="h-5 w-5 text-indigo-600" />
                                        Fokus Seterusnya
                                    </CardTitle>
                                    <CardDescription>Cadangan tindakan untuk anda</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                        <h4 className="font-semibold text-indigo-900 mb-1">Tingkatkan: {weakestTeras}</h4>
                                        <p className="text-sm text-gray-600">
                                            Skor terendah anda adalah dalam seksyen {weakestTeras}. Fokuskan latihan pada soalan-soalan kategori ini.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/dashboard')}>
                                            Latih Tubi
                                        </Button>
                                        <Button variant="outline" className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => {
                                            const element = document.getElementById('review-section');
                                            element?.scrollIntoView({ behavior: 'smooth' });
                                        }}>
                                            Lihat Kesilapan
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* AI Advice Section - GATED */}
                        <Card className="border-purple-100 shadow-md bg-white relative overflow-hidden">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-purple-900">
                                    <FileText className="h-5 w-5" />
                                    Laporan Penambahbaikan (AI)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className={!isPremium ? "blur-md select-none" : ""}>
                                {loadingAdvice ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                                            <span className="text-sm text-gray-500">Sedang menganalisis personaliti anda...</span>
                                        </div>
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-[90%]" />
                                        <Skeleton className="h-4 w-[80%]" />
                                    </div>
                                ) : (
                                    <div className="prose text-gray-700 whitespace-pre-line animate-fade-in">
                                        {advice || "Tiada nasihat dapat dijana."}
                                    </div>
                                )}
                            </CardContent>

                            {/* Lock Overlay for AI Report */}
                            {!isPremium && !loadingAdvice && (
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-8">
                                    <div className="bg-white p-3 rounded-full shadow-lg mb-4">
                                        <Lock className="h-8 w-8 text-purple-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Buka Kunci Laporan AI</h3>
                                    <p className="text-gray-700 max-w-md mb-6 font-medium">
                                        Dapatkan analisis mendalam tentang psikologi jawapan anda dan cara menjawab dengan lebih tepat mengikut skema.
                                    </p>
                                    <Button onClick={() => router.push('/pricing')} size="lg" className="bg-purple-600 hover:bg-purple-700 text-white shadow-xl">
                                        Upgrade Sekarang (RM79)
                                    </Button>
                                </div>
                            )}
                        </Card>

                        {/* Question Review Section - GATED (Partially) */}
                        {questions.length > 0 && result.answers && (
                            <div id="review-section" className="relative">
                                <QuestionReview
                                    questions={!isPremium ? questions.slice(0, 3) : questions.filter(q => result.answers && result.answers[q.id] !== undefined)}
                                    userAnswers={result.answers}
                                />

                                {/* Premium Gate for Reviews */}
                                {!isPremium && questions.length > 3 && (
                                    <div className="relative mt-[-100px] h-[300px] bg-gradient-to-t from-gray-50 via-white/90 to-transparent flex flex-col items-center justify-end pb-12 z-20">
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Lihat 100+ Soalan Lain</h3>
                                        <p className="text-gray-600 mb-4 text-center max-w-md">
                                            Anda hanya melihat 3 soalan pertama. Pengguna Premium boleh melihat kesemua jawapan salah dan huraian penuh.
                                        </p>
                                        <Button onClick={() => router.push('/pricing')} className="bg-gray-900 text-white hover:bg-gray-800">
                                            Buka Semua Jawapan
                                        </Button>
                                        <p className="text-xs text-gray-400 mt-4">
                                            *Huraian jawapan membantu anda faham 'pattern' soalan sebenar.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-center mt-8 pb-8 print:hidden">
                            <Button variant="outline" size="lg" onClick={() => router.push('/dashboard')}>
                                <RefreshCcw className="mr-2 h-4 w-4" /> Kembali ke Dashboard
                            </Button>
                        </div>

                        {/* Hidden Shareable Summary Card for html2canvas */}
                        <div
                            className="absolute left-[-9999px] top-0 p-8 w-[600px] h-fit rounded-[24px] text-white z-0"
                            ref={shareRef}
                            style={{
                                fontFamily: 'sans-serif',
                                backgroundColor: '#1e1b4b',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}
                        >
                            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight text-white m-0">SISTEM <span className="text-indigo-400">PSIKOMETRIK</span></h2>
                                    <p className="text-indigo-200 text-xs mt-1 opacity-80">Platform Persediaan Peperiksaan Penjawat Awam</p>
                                </div>
                                <span className="bg-indigo-600/30 border border-indigo-400/30 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-100">Laporan Rasmi</span>
                            </div>

                            <div className="flex bg-white/5 rounded-2xl p-6 mb-6 backdrop-blur-sm border border-white/5">
                                <div className="flex-1 text-center border-r border-white/10 pr-6">
                                    <p className="text-indigo-200 text-xs uppercase tracking-widest font-semibold mb-2">Skor Pencapaian</p>
                                    <div className="text-7xl font-black text-white leading-none">{overallPercentage}<span className="text-3xl text-indigo-400">%</span></div>
                                </div>
                                <div className="flex-1 pl-6 flex flex-col justify-center">
                                    <p className="text-indigo-200 text-[10px] uppercase font-bold mb-1">Status Penilaian</p>
                                    <p className={`text-lg font-bold ${overallPercentage >= 80 ? 'text-green-400' : overallPercentage >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {overallPercentage >= 80 ? "Layak Cemerlang" : overallPercentage >= 50 ? "Sederhana" : "Berisiko Gagal"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center">
                                    <Target className="h-6 w-6 text-indigo-400 mb-2 opacity-80" />
                                    <p className="text-indigo-200 text-[10px] uppercase tracking-wider font-bold mb-1">Ranking Semasa</p>
                                    <p className="text-2xl font-black text-white">Top {100 - (percentile || 0)}%</p>
                                    <p className="text-[10px] text-indigo-300 mt-1 uppercase font-medium line-clamp-2 max-w-[150px]">{jobTitle}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center">
                                    <ShieldCheck className="h-6 w-6 text-indigo-400 mb-2 opacity-80" />
                                    <p className="text-indigo-200 text-[10px] uppercase tracking-wider font-bold mb-1">Integriti AI</p>
                                    <p className={`text-2xl font-black ${(consistencyScore !== undefined ? consistencyScore : 100) >= 80 ? 'text-green-400' : 'text-amber-400'}`}>
                                        {consistencyScore !== undefined ? consistencyScore : 100}%
                                    </p>
                                    <p className="text-[10px] text-indigo-300 mt-1 uppercase font-medium">Indeks Konsistensi</p>
                                </div>
                            </div>

                            <div className="text-center pt-2 text-indigo-200/50 text-xs flex flex-col items-center justify-center border-t border-white/10 mt-2">
                                <p className="mt-3">Ketahui kelemahan anda di: <strong className="text-white ml-1">ujianpsikometrik.my</strong></p>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            {/* Share Modal */}
            {shareImageUrl && (
                <ShareModal
                    imageDataUrl={shareImageUrl}
                    onClose={() => setShareImageUrl(null)}
                    shareText={`Saya baru sahaja selesai Ujian Psikometrik dan mendapat ${overallPercentage}%! Cuba uji diri anda juga 🎯`}
                    shareUrl="https://www.onlinepsikometrikexam.com/"
                />
            )}
        </>
    );
}

// Added global style for fade animation
const globalStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
`;
