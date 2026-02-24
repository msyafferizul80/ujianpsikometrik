"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from 'next/link';
import { BookOpen, Trophy, Clock, PlayCircle, Target, Flame, CheckCircle2, BarChart3, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { TipsSection } from "@/components/TipsSection";
import { RecentActivity } from "@/components/RecentActivity";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ShareButton } from "@/components/ShareButton";
import { PreExamModal } from "@/components/PreExamModal";
import { createClient } from '@supabase/supabase-js';
import { getQuizStats, hasInProgressQuiz } from "@/utils/stats";
import { SubscriptionCountdown } from "@/components/SubscriptionCountdown";

// Import Supabase Client outside for singleton stability
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const [streak, setStreak] = useState(0);
    const [todaysMission, setTodaysMission] = useState<any>(null);
    const [showPreExamModal, setShowPreExamModal] = useState(false);
    const [examQuizId, setExamQuizId] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUserName(session.user.identities?.[0]?.identity_data?.full_name || session.user.email?.split('@')[0] || 'Calon');

                // Load Study Plan from LocalStorage
                const savedPlan = localStorage.getItem('studyPlan');
                if (savedPlan) {
                    try {
                        const plan = JSON.parse(savedPlan);
                        if (Array.isArray(plan)) {
                            const todayStr = new Date().toDateString();
                            const mission = plan.find((p: any) => new Date(p.date).toDateString() === todayStr);
                            if (mission) {
                                setTodaysMission(mission);
                            }
                        } else {
                            // If it's malformed or the wrong format, we clear it out to avoid persistent crashes.
                            localStorage.removeItem('studyPlan');
                        }
                    } catch (e) {
                        console.error("Error parsing study plan", e);
                        localStorage.removeItem('studyPlan');
                    }
                }

                // Fetch Streak and Subscription
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('full_name, streak_count, subscription_tier, role, subscription_end_date')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    if (profile.full_name) setUserName(profile.full_name);
                    setStreak(profile.streak_count || 0); // Set streak from profile
                    setSubscription({
                        endDate: profile.subscription_end_date,
                        tier: profile.subscription_tier
                    });

                    // Force admin to have premium tier if not set
                    if (profile.role === 'admin' && profile.subscription_tier === 'free') {
                        setSubscription(prev => ({ ...prev, tier: 'admin_premium' }));
                    }
                } else if (error) {
                    console.error("Error fetching profile:", error);
                }

                // Fetch Featured/Latest Quiz
                const { data: quizData } = await supabase
                    .from('quizzes')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (quizData) {
                    setFeaturedQuiz({
                        title: quizData.title,
                        totalQuestions: quizData.total_questions,
                        duration: quizData.duration_minutes,
                        description: quizData.description
                    });
                } else {
                    // Fallback if no quiz exists
                    setFeaturedQuiz({
                        title: "PsikoPro Lengkap",
                        totalQuestions: 100,
                        duration: 60,
                        description: "Set soalan latihan PsikoPro."
                    });
                }
            } else {
                // If no session, redirect to login or handle as anonymous
                // For now, we'll just set loading to false and let the page render
                // router.push('/login'); // Uncomment if you want to force login
            }
            setLoading(false);
        };

        fetchUserData();

        // Simulate network delay for verification of skeleton
        const timer = setTimeout(() => {
            const quizStats = getQuizStats();
            setStats(quizStats);
            setInProgress(hasInProgressQuiz());
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []); // Removed router from dependency array as it's not used in this effect

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
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    {todaysMission && (
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Sparkles className="h-48 w-48 text-indigo-500" />
                        </div>
                    )}
                    <div className="z-10 relative">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${todaysMission ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                {todaysMission ? "Jadual AI Aktif" : "Fokus Hari Ini"}
                            </span>
                            <span className="text-gray-400 text-xs">|</span>
                            <span className="text-gray-500 text-xs font-medium">
                                {new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                        </div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                    {todaysMission ? (
                                        <>Misi: <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{todaysMission.topic}</span></>
                                    ) : (
                                        <>{getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{userName}</span></>
                                    )}
                                </h1>
                                <p className="text-gray-500 mt-1 max-w-xl leading-relaxed">
                                    {todaysMission ? todaysMission.activity : "Teruskan momentum kecemerlangan anda hari ini."}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-3">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border transition-all ${streak > 0 ? 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 border-dashed'}`}>
                                        <Flame className={`h-4 w-4 ${streak > 0 ? 'fill-orange-500 text-orange-600' : 'text-gray-400'}`} />
                                        {streak} Hari Streak
                                    </span>
                                    {todaysMission && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            <Clock className="h-3 w-3" />
                                            {todaysMission.duration}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4 md:mt-0 z-10 shrink-0">
                        {todaysMission ? (
                            <Link href="/study-plan">
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 shadow-md hover:shadow-lg transition-all">
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Lihat Jadual
                                </Button>
                            </Link>
                        ) : (
                            <Link href="/ai-coach">
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 shadow-md hover:shadow-lg transition-all">
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Latih Emosi
                                </Button>
                            </Link>
                        )}
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
                </div >

                {/* Main Content Grid */}
                < div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" >
                    {/* Main Quiz Card */}
                    < div className="lg:col-span-2" >
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

                        {/* NEW: Killer Questions Card */}
                        <Card className="mt-6 shadow-lg border-0 ring-1 ring-red-100 overflow-hidden relative group cursor-pointer hover:shadow-xl transition-all"
                            onClick={() => {
                                localStorage.setItem('activeQuizId', 'killer-mode');
                                localStorage.setItem('activeQuizTitle', '🔥🔥 Soalan Maut (High Failure Rate)');
                                // For now, redirect to quiz page directly. Ideally check premium first.
                                window.location.href = '/quiz';
                            }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-inner">
                                        <Flame className="h-8 w-8 text-yellow-300 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            Koleksi Soalan Maut
                                            <span className="bg-yellow-400 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                                                Premium
                                            </span>
                                        </h3>
                                        <p className="text-red-100 text-sm max-w-md">
                                            Berani sahut cabaran? Himpunan 20 soalan dengan kadar kegagalan tertinggi calon tahun lepas.
                                        </p>
                                    </div>
                                </div>
                                <Button className="bg-white text-red-600 hover:bg-gray-100 font-bold border-0 shadow-md whitespace-nowrap">
                                    <Target className="mr-2 h-4 w-4" />
                                    Cuba Sekarang
                                </Button>
                            </div>
                        </Card>

                        {/* Real Exam Simulation Card */}
                        <Card className="mt-6 shadow-lg border-0 ring-1 ring-blue-900 overflow-hidden relative group cursor-pointer hover:shadow-xl transition-all"
                            onClick={() => {
                                // Show pre-exam briefing modal instead of navigating directly
                                const uniqueId = `real-exam-mode-${Date.now()}`;
                                setExamQuizId(uniqueId);
                                setShowPreExamModal(true);
                            }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 opacity-95 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center shadow-inner border border-white/20">
                                        <Clock className="h-8 w-8 text-blue-200" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2 text-blue-50">
                                            Simulasi Peperiksaan
                                            <span className="bg-blue-900 text-blue-100 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-700">
                                                INTENSIF
                                            </span>
                                        </h3>
                                        <p className="text-slate-300 text-sm max-w-md mt-1">
                                            Suasana ujian sebenar. 170 Soalan. 1 Jam 30 Minit. Tiada gangguan. Uji tahap kesediaan mental anda sekarang.
                                        </p>
                                    </div>
                                </div>
                                <Button className="bg-blue-600 text-white hover:bg-blue-500 font-bold border-0 shadow-lg whitespace-nowrap ring-1 ring-blue-400">
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Mula Sesi
                                </Button>
                            </div>
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

            {/* Pre-Exam Briefing Modal */}
            <PreExamModal
                open={showPreExamModal}
                quizId={examQuizId}
                quizTitle="Simulasi Peperiksaan SPA — 170 Soalan"
                onExamStarted={(attemptId, endsAt) => {
                    localStorage.setItem('activeQuizId', examQuizId);
                    localStorage.setItem('activeQuizTitle', '📋 Simulasi Peperiksaan Sebenar');
                    localStorage.setItem('examAttemptId', attemptId.toString());
                    localStorage.setItem('examEndsAt', endsAt);
                    setShowPreExamModal(false);
                    window.location.href = '/quiz';
                }}
                onCancel={() => setShowPreExamModal(false)}
            />
        </DashboardLayout>
    );
}
