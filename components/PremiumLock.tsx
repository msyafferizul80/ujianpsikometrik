"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
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

export function PremiumLock({ children, featureCode, fallbackHeight = "h-40", title = "Ciri Premium", description = "Langgan untuk akses ciri ini." }: PremiumLockProps) {
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
                .select('features_unlocked, subscription_tier, subscription_end_date')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                // Check 1: Is usage still valid (date)
                const isExpired = profile.subscription_end_date ? new Date(profile.subscription_end_date) < new Date() : true;

                // If special 'free' tier but has unlocked features manually (addon)
                const unlockedFeatures = (profile.features_unlocked as string[]) || [];

                // Logic: Access if feature is strictly in the list AND (date not expired OR it's a lifetime addon?)
                // For simplicity: If feature is in list, we assume it's valid. 
                // BUT if plan is 'exam_ready', it has ALL access.

                if (profile.subscription_tier === 'exam_ready' && !isExpired) {
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
        return <div className={`w-full ${fallbackHeight} bg-gray-100 animate-pulse rounded-lg`} />;
    }

    if (hasAccess) {
        return <>{children}</>;
    }

    return (
        <div className="relative w-full rounded-lg overflow-hidden group">
            <div className="blur-sm select-none pointer-events-none opacity-50">
                {children}
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/60 z-10 p-4 text-center backdrop-blur-[2px]">
                <div className="bg-white p-4 rounded-full shadow-lg mb-3">
                    <Lock className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600 mb-4 max-w-xs mx-auto">
                    {description}
                </p>
                <Button
                    onClick={() => router.push('/pricing')}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                    Buka Kunci (RM 20)
                </Button>
            </div>
        </div>
    );
}
