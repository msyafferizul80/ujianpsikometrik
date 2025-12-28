"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Target, Zap, Lock, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export default function AICoachPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('subscription_tier, subscription_end_date, role')
                .eq('id', session.user.id)
                .single();

            // Check if premium
            let isPremium = false;
            if (profile) {
                if (profile.role === 'admin') isPremium = true;
                else if (profile.subscription_tier !== 'free') {
                    if (profile.subscription_end_date && new Date(profile.subscription_end_date) > new Date()) {
                        isPremium = true;
                    }
                }
            }

            if (isPremium) {
                setHasAccess(true);
            } else {
                // Determine if we should redirect or show locked state
                // We will show locked state if they somehow got here, or clean redirect
                // But for a menu item that is hidden, hitting the URL manually should probably redirect.
                // However, let's allow them to see the page but with "LOCKED" overlay to upsell.
                setHasAccess(false);
            }
            setLoading(false);
        };

        checkAccess();
    }, [router]);

    const handleStartFocus = (topic: string) => {
        if (!hasAccess) {
            router.push('/pricing');
            return;
        }
        window.location.href = `/quiz/select?filter=${topic}`;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">
                                <Sparkles className="h-3 w-3 mr-1" /> Premium Feature
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <BrainCircuit className="h-8 w-8 text-purple-600" />
                            AI Coach
                        </h1>
                        <p className="text-gray-600 mt-1 max-w-2xl">
                            Jurulatih peribadi anda yang menggunakan kecerdasan buatan untuk menganalisis kelemahan dan menyediakan latihan fokus.
                        </p>
                    </div>
                </div>

                {!hasAccess ? (
                    /* Locked View for Free Users */
                    <Card className="border-2 border-orange-200 bg-orange-50/50">
                        <CardContent className="py-12 flex flex-col items-center text-center">
                            <div className="bg-white p-4 rounded-full shadow-md mb-6">
                                <Lock className="h-10 w-10 text-orange-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Akses Terhad</h2>
                            <p className="text-gray-600 max-w-md mb-8">
                                Ciri AI Coach hanya tersedia untuk pengguna Premium. Dapatkan akses penuh untuk meningkatkan peluang lulus anda.
                            </p>
                            <Button
                                size="lg"
                                onClick={() => router.push('/pricing')}
                                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/20"
                            >
                                <Zap className="mr-2 h-5 w-5 fill-current" />
                                Naik Taraf Sekarang
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    /* Active View for Premium Users */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Focus Modules */}
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="text-lg font-semibold text-gray-800">Latih Tubi Fokus (Smart Practice)</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="hover:shadow-md transition-all border-purple-100 bg-gradient-to-br from-white to-purple-50/50 cursor-pointer" onClick={() => handleStartFocus('emosi')}>
                                    <CardHeader className="pb-3">
                                        <Badge className="w-fit mb-2 bg-pink-100 text-pink-700 hover:bg-pink-100">Topik Utama</Badge>
                                        <CardTitle className="flex items-center gap-2 text-gray-800">
                                            <Target className="h-5 w-5 text-pink-500" />
                                            Kompetensi Emosi
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-600">Latih tubi soalan berkaitan kawalan emosi, tekanan, dan kematangan.</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="ghost" className="w-full text-purple-700 hover:text-purple-800 hover:bg-purple-100">
                                            Mula Latihan <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>

                                <Card className="hover:shadow-md transition-all border-blue-100 bg-gradient-to-br from-white to-blue-50/50 cursor-pointer" onClick={() => handleStartFocus('kerjasama')}>
                                    <CardHeader className="pb-3">
                                        <Badge className="w-fit mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100">Topik Utama</Badge>
                                        <CardTitle className="flex items-center gap-2 text-gray-800">
                                            <Target className="h-5 w-5 text-blue-500" />
                                            Kerjasama
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-600">Fokus kepada soalan kerja berpasukan, kepimpinan, dan toleransi.</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="ghost" className="w-full text-blue-700 hover:text-blue-800 hover:bg-blue-100">
                                            Mula Latihan <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>

                                <Card className="hover:shadow-md transition-all border-green-100 bg-gradient-to-br from-white to-green-50/50 cursor-pointer" onClick={() => handleStartFocus('komunikasi')}>
                                    <CardHeader className="pb-3">
                                        <Badge className="w-fit mb-2 bg-green-100 text-green-700 hover:bg-green-100">Topik Utama</Badge>
                                        <CardTitle className="flex items-center gap-2 text-gray-800">
                                            <Target className="h-5 w-5 text-green-500" />
                                            Komunikasi
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-600">Latih tubi komunikasi berkesan dan perhubungan interpersonal.</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="ghost" className="w-full text-green-700 hover:text-green-800 hover:bg-green-100">
                                            Mula Latihan <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>

                                <Card className="hover:shadow-md transition-all border-gray-200 bg-white opacity-70">
                                    <CardHeader className="pb-3">
                                        <Badge variant="outline" className="w-fit mb-2">Akan Datang</Badge>
                                        <CardTitle className="flex items-center gap-2 text-gray-500">
                                            <Lock className="h-4 w-4" />
                                            Analisis Mendalam
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-500">Analisis trend masa menjawab dan pola kesilapan lazim.</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Sidebar Stats */}
                        <div className="space-y-6">
                            <Card className="bg-indigo-900 text-white border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-yellow-400" />
                                        AI Tip Hari Ini
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-indigo-100 text-sm italic">
                                        "Konsistensi adalah kunci dalam ujian psikometrik. AI kami mengesan corak jawapan anda untuk memastikan anda tidak memberikan isyarat yang bercanggah."
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
