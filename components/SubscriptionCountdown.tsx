"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Rocket, Lock } from "lucide-react";
import Link from "next/link";
import { quizRepository } from "@/utils/supabaseRepository";
import { useRouter } from "next/navigation";

interface SubscriptionCountdownProps {
    planType: string;
    expiryDate: string | null;
}

export function SubscriptionCountdown({ planType, expiryDate }: SubscriptionCountdownProps) {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);
    const [examDate, setExamDate] = useState<Date | null>(null);

    // Fetch Global Exam Date if user is on Exam-Ready plan
    useEffect(() => {
        const loadExamDate = async () => {
            if (planType === 'exam_ready') {
                try {
                    const dateStr = await quizRepository.getExamDate();
                    if (dateStr) {
                        setExamDate(new Date(dateStr));
                    } else if (expiryDate) {
                        // Fallback to user's specific expiry if global not set
                        setExamDate(new Date(expiryDate));
                    }
                } catch (err) {
                    console.error("Failed to load exam date", err);
                }
            } else if (expiryDate) {
                // For other plans (e.g. 24h pass), use specific expiry
                setExamDate(new Date(expiryDate));
            }
        };

        loadExamDate();
    }, [planType, expiryDate]);

    // Countdown Logic
    useEffect(() => {
        if (!examDate) return;

        const timer = setInterval(() => {
            const now = new Date();
            const difference = examDate.getTime() - now.getTime();

            if (difference <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                clearInterval(timer);
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            setTimeLeft({ days, hours, minutes, seconds });
        }, 1000);

        return () => clearInterval(timer);
    }, [examDate]);

    // 1. FREE TIER VIEW
    if (planType === 'free') {
        return (
            <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white border-none shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Lock className="h-24 w-24 text-white" />
                </div>
                <CardContent className="p-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-yellow-400 mb-2 flex items-center gap-2">
                            Akses Terhad
                        </h3>
                        <p className="text-gray-300 max-w-md">
                            Anda sedang menggunakan akaun percuma. Dapatkan akses penuh ke Bank Soalan, Latih Tubi Emosi, dan AI Analysis sekarang.
                        </p>
                    </div>
                    <Link href="/pricing">
                        <Button className="bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-bold whitespace-nowrap shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse">
                            <Rocket className="mr-2 h-4 w-4" />
                            Upgrade Premium
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    // 2. ACTIVE PREMIUM VIEW
    return (
        <Card className="bg-gradient-to-r from-blue-900 to-blue-800 text-white border-none shadow-lg overflow-hidden">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-lg font-medium text-blue-200 mb-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {planType === 'exam_ready' ? 'Masa Menuju Peperiksaan' : 'Masa Tamat Langganan'}
                    </h3>
                    <div className="flex items-baseline gap-4 mt-2">
                        {timeLeft ? (
                            <>
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{timeLeft.days}</div>
                                    <div className="text-xs text-blue-300 uppercase">Hari</div>
                                </div>
                                <div className="text-3xl font-bold opacity-50">:</div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
                                    <div className="text-xs text-blue-300 uppercase">Jam</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
                                    <div className="text-xs text-blue-300 uppercase">Minit</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-yellow-400">{String(timeLeft.seconds).padStart(2, '0')}</div>
                                    <div className="text-xs text-blue-300 uppercase">Saat</div>
                                </div>
                            </>
                        ) : (
                            <div className="text-xl animate-pulse">Mengira masa...</div>
                        )}
                    </div>
                </div>

                {/* Visual Indicator for Exam Ready */}
                <div className="hidden md:block text-right">
                    <div className="text-sm text-blue-300">Target Tarikh</div>
                    <div className="text-xl font-bold">
                        {examDate ? examDate.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
