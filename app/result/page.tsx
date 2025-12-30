"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Loader2, RefreshCcw, FileText, Share2, Download, Copy, Check, TrendingUp, Target, ArrowRight } from "lucide-react";
import { saveQuizAttempt } from "@/utils/stats";
import { shareResult } from "@/utils/share";
import { DashboardLayout } from "@/components/DashboardLayout";
import { QuestionReview } from "@/components/QuestionReview";
import { InconsistencyReport } from "@/components/InconsistencyReport";
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
    const [inconsistencies, setInconsistencies] = useState<any[]>([]);
    const [checkingInconsistency, setCheckingInconsistency] = useState(false);
    const [prevBest, setPrevBest] = useState<number | null>(null);
    const [averageScore, setAverageScore] = useState<number | null>(null);
    const router = useRouter();
    const [searchParams] = useState(new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''));
    const [copied, setCopied] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    // Load Data
    useEffect(() => {
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

                        quizQuestions.forEach((q: any) => {
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
    const percentile = overallPercentage >= 90 ? 99 : overallPercentage >= 80 ? 90 : overallPercentage >= 70 ? 75 : overallPercentage >= 60 ? 50 : 25;

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
                        <InconsistencyReport
                            inconsistencies={inconsistencies}
                            loading={checkingInconsistency}
                        />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <span className="text-blue-600 font-medium">Top {100 - percentile}% Peserta</span>
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
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* AI Advice Section */}
                    <Card className="border-purple-100 shadow-md bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-purple-900">
                                <FileText className="h-5 w-5" />
                                Laporan Penambahbaikan (AI)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
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
                    </Card>

                    {/* Question Review Section */}
                    {questions.length > 0 && result.answers && (
                        <div id="review-section">
                            <QuestionReview
                                questions={questions.filter(q => result.answers && result.answers[q.id] !== undefined)}
                                userAnswers={result.answers}
                            />
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
