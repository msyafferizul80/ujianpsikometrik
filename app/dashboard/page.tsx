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
import { createClient } from '@supabase/supabase-js';
import { getQuizStats, hasInProgressQuiz } from "@/utils/stats";

import { SubscriptionCountdown } from "@/components/SubscriptionCountdown";

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        quizzesCompleted: 0,
        readinessPercentage: 0,
        currentStreak: 0,
        lastQuizDate: null as string | null
    });
    const [inProgress, setInProgress] = useState(false);
    const [userName, setUserName] = useState("Calon");
    const [subscription, setSubscription] = useState<{ endDate: string | null; tier: string | null }>({ endDate: null, tier: null });
    const [featuredQuiz, setFeaturedQuiz] = useState<any>(null);

    // Import Supabase Client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        // Fetch User
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Try to get explicit profile name first
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, subscription_end_date, subscription_tier')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    if (profile.full_name) setUserName(profile.full_name);
                    setSubscription({
                        endDate: profile.subscription_end_date,
                        tier: profile.subscription_tier
                    });
                } else {
                    // Fallback to name in localStorage or Email prefix
                    const savedName = localStorage.getItem('userName');
                    setUserName(savedName || session.user.email?.split('@')[0] || "Calon");
                }
            }
        };
        fetchUser();

        // Fetch Featured/Latest Quiz
        const fetchFeaturedQuiz = async () => {
            const { data } = await supabase
                .from('quizzes')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setFeaturedQuiz({
                    title: data.title,
                    totalQuestions: data.total_questions,
                    duration: data.duration_minutes,
                    description: data.description
                });
            } else {
                // Fallback if no quiz exists
                setFeaturedQuiz({
                    title: "Ujian Psikometrik Lengkap",
                    totalQuestions: 100,
                    duration: 60,
                    description: "Set soalan latihan ujian psikometrik."
                });
            }
        };
        fetchFeaturedQuiz();

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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Selamat Pagi";
        if (hour < 18) return "Selamat Petang";
        return "Selamat Malam";
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Subscription Countdown */}
                <SubscriptionCountdown expiryDate={subscription.endDate} planType={subscription.tier || 'free'} />

                {/* 1. Smart Hero Section (Fokus Hari Ini) */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                Fokus Hari Ini
                            </span>
                            <span className="text-gray-400 text-xs">|</span>
                            <span className="text-gray-500 text-xs font-medium">
                                {new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{userName}</span>.
                        </h1>
                        <p className="text-gray-500 mt-2 max-w-xl leading-relaxed">
                            Momentum anda sedang meningkat! Hari ini disarankan untuk memantapkan <span className="font-semibold text-gray-700">Kompetensi Emosi</span>.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/quiz/select?filter=emosi">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 shadow-md hover:shadow-lg transition-all">
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Latih Emosi
                            </Button>
                        </Link>
                        <ShareButton className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm" text="Ajak Kawan" variant="outline" />
                    </div>
                </div>

                {/* 2. Stats Grid (Rebranded) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-slide-up">
                    <StatCard
                        title="Latih Tubi"
                        value={stats.quizzesCompleted}
                        subtitle="Set soalan terjawab"
                        icon={BookOpen}
                        colorClass="blue" // Keep blue for "Intellectual"
                        tooltip="Jumlah set latihan yang telah anda selesaikan sepenuhnya."
                    />
                    <StatCard
                        title="Indeks Kompetensi"
                        value={`${stats.readinessPercentage}%`}
                        subtitle="Tahap penguasaan"
                        icon={Target} // Changed from CheckCircle to Target for "Aim/Goal"
                        colorClass="emerald" // Changed to Emerald for "Success/Growth"
                        tooltip="Skor komposit berdasarkan ketepatan jawapan terkini anda."
                    />
                    <StatCard
                        title="Momentum"
                        value={`${stats.currentStreak} Hari`}
                        subtitle="Fokus berterusan"
                        icon={Flame}
                        colorClass="orange"
                        tooltip="Bilangan hari berturut-turut anda aktif membuat latihan."
                    />
                    <StatCard
                        title="Carta Prestasi"
                        value="Top 10%"
                        subtitle="Pencapaian semasa"
                        icon={BarChart3} // Changed from Trophy to BarChart for "Analytics" vibe
                        colorClass="violet"
                        tooltip="Kedudukan anda berbanding calon-calon lain."
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
                                        {featuredQuiz?.title || "Memuatkan..."}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <BookOpen className="h-4 w-4 text-blue-500" />
                                            <span>{featuredQuiz?.totalQuestions || 0} soalan</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock className="h-4 w-4 text-green-500" />
                                            <span>{featuredQuiz?.duration || 0} minit</span>
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
                                    <Link href={inProgress ? "/quiz" : "/quiz/select"}>
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
        </DashboardLayout >
    );
}
