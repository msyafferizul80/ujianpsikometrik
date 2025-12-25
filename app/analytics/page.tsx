"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Added Button import
import { DashboardLayout } from "@/components/DashboardLayout";
import { TrendingUp, BarChart, Activity, PieChart } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart as RechartsBarChart,
    Bar,
    Legend
} from "recharts";

interface QuizAttempt {
    date: string;
    score: number;
    percentage: number;
    totalQuestions: number;
    terasScores?: Record<string, { percentage: number }>;
}

export default function AnalyticsPage() {
    const router = require("next/navigation").useRouter();
    const [history, setHistory] = useState<QuizAttempt[]>([]);
    const [averageScore, setAverageScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [terasStats, setTerasStats] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]); // Added trendData state

    const calculateStats = (data: QuizAttempt[]) => {
        if (data.length === 0) return;

        // Overall stats
        const total = data.reduce((sum, item) => sum + item.percentage, 0);
        setAverageScore(Math.round(total / data.length));
        setBestScore(Math.max(...data.map(item => item.percentage)));

        // 1. Trend Data (Last 10)
        const recent = data.slice(-10); // Get last 10 attempts
        const trend = recent.map((item, i) => ({
            attempt: `Ujian ${data.length - recent.length + i + 1}`, // Adjust attempt number
            date: new Date(item.date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit' }),
            score: item.percentage
        }));
        setTrendData(trend);

        // 2. Weak Areas (Score per Teras)
        const terasAgg: Record<string, { total: number; count: number }> = {};

        data.forEach(attempt => {
            if (attempt.terasScores) {
                Object.entries(attempt.terasScores).forEach(([key, value]: [string, { percentage: number }]) => {
                    if (!terasAgg[key]) terasAgg[key] = { total: 0, count: 0 };
                    terasAgg[key].total += value.percentage;
                    terasAgg[key].count += 1;
                });
            }
        });

        const terasChartData = Object.keys(terasAgg).map(key => ({
            subject: key,
            score: Math.round(terasAgg[key].total / terasAgg[key].count),
            fullMark: 100
        }));

        setTerasStats(terasChartData);
    };

    useEffect(() => {
        const saved = localStorage.getItem('quizHistory');
        if (saved) {
            const parsed: QuizAttempt[] = JSON.parse(saved);
            setHistory(parsed);
            calculateStats(parsed);
        }
    }, []);

    // Prepare chart data (Last 10 attempts) - This block is now redundant as trendData is set in calculateStats
    // const trendData = history.slice(-10).map((attempt, i) => ({
    //     attempt: `Ujian ${i + 1}`,
    //     date: new Date(attempt.date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit' }),
    //     score: attempt.percentage
    // }));

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Prestasi</h1>
                    <p className="text-gray-600">Visualisasi data dan perkembangan prestasi anda</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="shadow-sm border-blue-100 bg-blue-50/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-blue-900">Purata Skor</CardTitle>
                            <Activity className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">{averageScore}%</div>
                            <p className="text-xs text-blue-600/80">Daripada {history.length} ujian</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-green-100 bg-green-50/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-green-900">Skor Tertinggi</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">{bestScore}%</div>
                            <p className="text-xs text-green-600/80">Pencapaian terbaik anda</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-purple-100 bg-purple-50/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-purple-900">Fokus Teras</CardTitle>
                            <PieChart className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-700">{terasStats.length > 0 ? terasStats[0]?.name : "-"}</div>
                            <p className="text-xs text-purple-600/80">Teras paling kerap diuji</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trend Line Chart */}
                    <Card className="shadow-md border-0 ring-1 ring-gray-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                Trend Prestasi
                            </CardTitle>
                            <CardDescription>Peningkatan skor anda dalam 10 ujian terakhir</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#2563EB"
                                        strokeWidth={3}
                                        dot={{ fill: '#2563EB', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Teras Bar Chart */}
                    <Card className="shadow-md border-0 ring-1 ring-gray-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BarChart className="h-5 w-5 text-purple-500" />
                                Purata Mengikut Teras
                            </CardTitle>
                            <CardDescription>Kekuatan dan kelemahan mengikut kategori</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={terasStats} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                    <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} width={80} />
                                    <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                                    <Bar dataKey="score" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={32} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>


                {/* Detailed Analysis & Suggestions */}
                <Card className="shadow-md border-0 ring-1 ring-gray-100 bg-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="h-5 w-5 text-orange-500" />
                            Cadangan Penambahbaikan
                        </CardTitle>
                        <CardDescription>Analisis mendalam berdasarkan prestasi semasa anda</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                                <h4 className="font-semibold text-orange-900 mb-2">Analisis Trend</h4>
                                <p className="text-sm text-gray-700">
                                    {history.length < 2 ? "Data tidak mencukupi untuk analisis trend. Teruskan menjawab lebih banyak ujian." :
                                        history[history.length - 1].percentage > history[history.length - 2].percentage ?
                                            "Prestasi anda menunjukkan peningkatan berbanding ujian sebelumnya. Teruskan momentum ini!" :
                                            "Terdapat sedikit penurunan prestasi terkini. Cuba semak semula topik yang lemah."}
                                </p>
                            </div>
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Fokus Utama</h4>
                                <p className="text-sm text-gray-700">
                                    Berdasarkan analisis teras, anda perlu memberikan tumpuan lebih kepada soalan berkaitan
                                    <span className="font-bold"> {[...terasStats].sort((a, b) => a.score - b.score)[0]?.subject || "umum"}</span>.
                                    Cuba fahami pola jawapan terbaik untuk kategori ini.
                                </p>
                                <div className="mt-4">
                                    <Button
                                        onClick={() => {
                                            const weakest = [...terasStats].sort((a, b) => a.score - b.score)[0]?.subject;
                                            if (weakest) {
                                                localStorage.setItem('activeQuizId', 'smart-review');
                                                localStorage.setItem('activeTeras', weakest);
                                                localStorage.setItem('activeQuizTitle', `Latih Tubi Fokus: ${weakest}`);
                                                router.push('/quiz');
                                            } else {
                                                alert("Lengkapkan sekurang-kurangnya satu ujian untuk menggunakan ciri ini.");
                                            }
                                        }}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all text-sm flex items-center justify-center gap-2"
                                    >
                                        <Activity className="h-4 w-4" />
                                        Baiki Kelemahan: {[...terasStats].sort((a, b) => a.score - b.score)[0]?.subject || "Mula Latihan"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout >
    );
}
