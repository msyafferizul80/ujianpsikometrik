"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Loader2, RefreshCcw, FileText, Share2, Download, Copy, Check, TrendingUp, Target, ArrowRight, Lock } from "lucide-react";
import { saveQuizAttempt } from "@/utils/stats";
import { shareResult } from "@/utils/share";
import { DashboardLayout } from "@/components/DashboardLayout";
import { QuestionReview } from "@/components/QuestionReview";
import { InconsistencyReport, Inconsistency } from "@/components/InconsistencyReport";
import html2canvas from 'html2canvas';
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

    const [isPremium, setIsPremium] = useState(false);

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

                        // Fetch AI advice
                        setLoadingAdvice(true);
                        const jobRole = attempt.quizzes?.title || "Penolong Pegawai Belia Dan Sukan";

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
                                    questions: quizQuestions
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
                            if (data?.title) jobRole = data.title;
                        } catch (e) {
                            console.error("Error fetching quiz title for advice", e);
                        }
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
                                questions: fetchedQuestions
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

    const handleShare = () => {
        if (!result) return;
        shareResult(result.totalScore, result.maxScore, result.terasScores);
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
        { name: 'Purata', score: averageScore || overallPercentage, fill: '#94a3b8' },
        { name: 'Terbaik', score: prevBest || overallPercentage, fill: '#16a34a' },
    ];

    const weakestTeras = Object.entries(result.terasScores)
        .sort(([, a], [, b]) => a.percentage - b.percentage)
        .slice(0, 1)
        .map(([key]) => key)[0];

    return (
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
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleShare}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share WhatsApp
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
                        {/* Performance Card (New) */}
                        {percentile !== null && (
                            <Card className="col-span-1 md:col-span-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg text-indigo-900 flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                                        Analisis Prestasi
                                    </CardTitle>
                                    <CardDescription className="text-indigo-700">
                                        Perbandingan skor anda dengan {totalCandidates ? `${totalCandidates} calon lain` : "calon lain"}.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="text-center md:text-left">
                                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Ranking Anda</p>
                                            <div className="flex items-baseline gap-2 justify-center md:justify-start">
                                                <span className="text-4xl font-extrabold text-indigo-600">Top {100 - (percentile || 0)}%</span>
                                                <span className="text-sm text-gray-500">(Lebih tinggi dari {percentile}% calon)</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 w-full space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-semibold text-gray-700">Skor Anda</span>
                                                    <span className="font-bold text-indigo-600">{((result?.totalScore || 0) / (result?.maxScore || 1) * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full"
                                                        style={{ width: `${((result?.totalScore || 0) / (result?.maxScore || 1) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1 opacity-75">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-semibold text-gray-600">Purata Calon</span>
                                                    <span className="font-bold text-gray-600">{globalAverage || 50}%</span>
                                                </div>
                                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
                                                    <div
                                                        className="h-full bg-gray-500 rounded-full"
                                                        style={{ width: `${globalAverage || 50}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Upgrade CTA for visual consistency if needed, though this card is free for now? Let's make it free as teaser */}
                                </CardContent>
                            </Card>
                        )}

                        {/* Score Card */}
                        <Card className="border-blue-100 shadow-md">
                            <CardHeader>
                                <CardTitle>Ramalan Kejayaan</CardTitle>
                                <CardDescription>Skor Keseluruhan</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center py-6">
                                <div className="relative h-40 w-40 flex items-center justify-center rounded-full border-8 border-blue-500 bg-blue-50">
                                    <span className="text-4xl font-extrabold text-blue-700">{overallPercentage}%</span>
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-lg font-semibold text-gray-900">
                                        {overallPercentage >= 80 ? "Sangat Berpotensi Lulus" : overallPercentage >= 50 ? "Perlu Penambahbaikan" : "Berisiko Tinggi"}
                                    </p>
                                    <div className="flex justify-center gap-4 mt-2 text-sm">
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
                                <CardTitle>Indeks Kompetensi (Radar)</CardTitle>
                                <CardDescription>Analisis mengikut Teras</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" />
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
                </div>
            </div>
        </DashboardLayout>
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
