"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from 'next/link';
import { BookOpen, Trophy, Clock, PlayCircle, Target, Flame, CheckCircle2, BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { TipsSection } from "@/components/TipsSection";
import { RecentActivity } from "@/components/RecentActivity";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ShareButton } from "@/components/ShareButton";
import { getQuizStats, hasInProgressQuiz } from "@/utils/stats";

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        quizzesCompleted: 0,
        readinessPercentage: 0,
        currentStreak: 0,
        lastQuizDate: null as string | null
    });
    const [inProgress, setInProgress] = useState(false);

    useEffect(() => {
        // Simulate network delay for verification of skeleton
        const timer = setTimeout(() => {
            const quizStats = getQuizStats();
            setStats(quizStats);
            setInProgress(hasInProgressQuiz());
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const getReadinessStatus = () => {
        if (stats.readinessPercentage >= 80) return "Sangat Bersedia";
        if (stats.readinessPercentage >= 60) return "Bersedia";
        if (stats.readinessPercentage >= 40) return "Sederhana";
        if (stats.readinessPercentage > 0) return "Perlu Latihan";
        return "Belum Mula";
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-6 max-w-7xl mx-auto">
                    <DashboardSkeleton />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Welcome Section */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Selamat Datang, Ahmad! 👋
                        </h2>
                        <p className="text-gray-600">
                            Teruskan latihan anda untuk meningkatkan prestasi ujian psikometrik.
                        </p>
                    </div>
                    <ShareButton className="bg-green-600 hover:bg-green-700 text-white" text="Kongsi Aplikasi" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
                    <StatCard
                        title="Kuiz Selesai"
                        value={stats.quizzesCompleted}
                        subtitle="Jumlah set dijawab"
                        icon={BookOpen}
                        colorClass="blue"
                        tooltip="Jumlah keseluruhan set soalan yang telah anda selesaikan."
                    />
                    <StatCard
                        title="Kesediaan"
                        value={`${stats.readinessPercentage}%`}
                        subtitle="Tahap persediaan"
                        icon={CheckCircle2}
                        colorClass="green"
                        tooltip="Purata skor berdasarkan 3 ujian terkini anda."
                    />
                    <StatCard
                        title="Streak"
                        value={`${stats.currentStreak} Hari`}
                        subtitle="Konsistensi latihan"
                        icon={Flame}
                        colorClass="orange"
                        tooltip="Bilangan hari berturut-turut anda telah membuat latihan."
                    />
                    <StatCard
                        title="Ranking"
                        value="Top 10%"
                        subtitle="Dalam kalangan pengguna"
                        icon={Trophy}
                        colorClass="purple"
                        tooltip="Kedudukan anda berbanding pengguna lain berdasarkan skor terkini."
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Main Quiz Card */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-lg border-0 ring-1 ring-gray-100 overflow-hidden">
                            {/* Hero Section with Gradient */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Mula Latihan</h3>
                                        <p className="text-blue-100 text-sm">
                                            {inProgress ? "Sambung ujian anda" : "Cuba kuiz demo atau akses koleksi premium"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="p-6">
                                {/* Quiz Info */}
                                <div className="bg-gradient-to-br from-gray-50 to-blue-50/50 p-5 rounded-xl border border-gray-100 mb-6">
                                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-blue-600" />
                                        Ujian Psikometrik Lengkap (2025)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <BookOpen className="h-4 w-4 text-blue-500" />
                                            <span>100 soalan</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock className="h-4 w-4 text-green-500" />
                                            <span>60 minit</span>
                                        </div>
                                    </div>
                                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
                                        <li>Jawab semua soalan dengan jujur dan teliti</li>
                                        <li>Fokus kepada kompetensi <strong>Kerjasama, Emosi, dan Komunikasi</strong></li>
                                        <li>Dapatkan laporan AI yang dipersonalisasi</li>
                                    </ul>
                                </div>

                                {/* Progress and CTA */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-500">Progress</p>
                                        <Progress
                                            value={inProgress ? 50 : 0}
                                            className="w-[150px] sm:w-[200px]"
                                        />
                                        {inProgress && (
                                            <p className="text-xs text-gray-500">Ujian sedang berjalan</p>
                                        )}
                                    </div>
                                    <Link href="/quiz/select">
                                        <Button
                                            size="lg"
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all"
                                        >
                                            <PlayCircle className="mr-2 h-5 w-5" />
                                            {inProgress ? "Sambung Ujian" : "Mula Ujian"}
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Activity */}
                    <div className="lg:col-span-1">
                        <RecentActivity />
                    </div>
                </div>

                {/* Tips Section */}
                <TipsSection />
            </div>
        </DashboardLayout>
    );
}
