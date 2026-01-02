"use client";

import { useState, useEffect } from "react";
import { Lock, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

interface PremiumLockProps {
    children: React.ReactNode;
    featureCode: string; // e.g., 'ai_coach', 'full_bank'
    fallbackHeight?: string;
    title?: string;
    description?: string;
}

export function PremiumLock({ children, featureCode, fallbackHeight = "h-64", title = "Akses Premium Diperlukan", description = "Buka kunci kandungan ini dengan Pas Exam-Ready." }: PremiumLockProps) {
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('features_unlocked, subscription_tier, subscription_end_date, role')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                // Check 1: Is usage still valid (date)
                const isExpired = profile.subscription_end_date ? new Date(profile.subscription_end_date) < new Date() : true;

                // If special 'free' tier but has unlocked features manually (addon)
                const unlockedFeatures = (profile.features_unlocked as string[]) || [];

                if (profile.role === 'admin') {
                    setHasAccess(true);
                } else if (profile.subscription_tier === 'exam_ready' && !isExpired) {
                    setHasAccess(true);
                } else if (!isExpired && unlockedFeatures.includes(featureCode)) {
                    setHasAccess(true);
                } else {
                    setHasAccess(false);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className={`w-full ${fallbackHeight} bg-gray-50/50 animate-pulse rounded-xl border border-gray-100/50`} />;
    }

    if (hasAccess) {
        return <>{children}</>;
    }

    return (
        <div className="relative w-full rounded-xl overflow-hidden group border border-gray-200 shadow-sm bg-white">
            {/* Blurred Content Placeholder Layer */}
            <div className="blur-md select-none pointer-events-none opacity-30 p-8 grayscale">
                {children}
            </div>

            {/* Premium Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center bg-gray-900/5 backdrop-blur-md transition-all hover:backdrop-blur-lg">
                <div className="bg-white/90 p-4 rounded-full shadow-xl mb-4 ring-4 ring-orange-100 animate-in zoom-in duration-300">
                    <Lock className="w-8 h-8 text-orange-600" />
                </div>

                <h3 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
                    {title}
                </h3>

                <p className="text-gray-600 mb-6 max-w-sm mx-auto leading-relaxed">
                    {description}
                </p>

                {/* Micro-Sales Pitch */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-sm text-gray-700 bg-white/60 py-2 px-4 rounded-lg border border-gray-200/50 shadow-sm">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Jawapan Penuh</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>AI Analysis</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-1.5">
                        <span>🚀 Unlimited Access</span>
                    </div>
                </div>

                <Button
                    onClick={() => router.push('/pricing')}
                    size="lg"
                    className="group bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-orange-500/25 transition-all duration-300 font-bold px-8"
                >
                    <span>Buka Kunci Sekarang</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="mt-4 text-xs text-gray-500">
                    Sertai 500+ calon yang telah lulus.
                </p>
            </div>
        </div>
    );
}

