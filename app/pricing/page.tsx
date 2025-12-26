"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Zap, ShieldCheck, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { createClient } from "@supabase/supabase-js";

export default function PricingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const savedName = localStorage.getItem('userName') || session.user.email?.split('@')[0] || "Calon";
                setUser({
                    id: session.user.id,
                    email: session.user.email!,
                    name: savedName
                });
            }
        };
        fetchUser();
    }, []);

    const plans = [
        {
            id: "cram_24h",
            name: "Pas Pecutan (24 Jam)",
            price: "RM 15",
            description: "Akses pantas untuk ulangkaji saat akhir.",
            features: [
                "Akses Bank Soalan Penuh (24 Jam)",
                "Analisis Prestasi Penuh",
                "Tiada Komitmen Bulanan"
            ],
            icon: Zap,
            color: "text-orange-500",
            borderColor: "border-orange-200",
            bg: "bg-orange-50",
            buttonVariant: "outline"
        },
        {
            id: "exam_ready",
            name: "Pas Exam-Ready",
            price: "RM 79",
            description: "Jaminan persediaan sehingga tarikh peperiksaan.",
            features: [
                "Akses Bank Soalan UNLIMITED",
                "Analisis Prestasi Penuh",
                "Zero-Renew: Akses Sampai Exam",
                "AI Coach (Baiki Kelemahan) ✅",
                "Support Group WhatsApp"
            ],
            icon: ShieldCheck,
            color: "text-green-600",
            borderColor: "border-green-500",
            bg: "bg-green-50",
            recommended: true,
            buttonVariant: "default"
        },
        {
            id: "addon_ai",
            name: "Add-on: AI Coach",
            price: "RM 20",
            description: "Bukac kunci ciri 'Baiki Kelemahan' secara spesifik.",
            features: [
                "Feature Unlock: AI Coach",
                "Baiki Kelemahan Topikal",
                "Jana Soalan Targeted"
            ],
            icon: BrainCircuit,
            color: "text-purple-600",
            borderColor: "border-purple-200",
            bg: "bg-purple-50",
            buttonVariant: "outline"
        },
        // Test Plan
        {
            id: "test_rm1",
            name: "Pas Testing (RM 1)",
            price: "RM 1",
            description: "Untuk tujuan pengujian sistem sahaja.",
            features: [
                "Akses Penuh (1 Jam)",
                "Testing Payment Flow Exists"
            ],
            icon: Zap,
            color: "text-gray-600",
            borderColor: "border-gray-200",
            bg: "bg-gray-100",
            buttonVariant: "ghost"
        }
    ];

    const handleCheckout = async (planId: string) => {
        if (!user) {
            alert("Sila log masuk untuk membuat pembelian.");
            router.push('/login');
            return;
        }

        setLoading(planId);
        try {
            const res = await fetch("/api/payment/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId,
                    email: user.email,
                    name: user.name,
                    userId: user.id
                })
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Gagal memulakan pembayaran: " + (data.error || "Ralat tidak diketahui"));
            }
        } catch (error) {
            console.error(error);
            alert("Ralat sistem.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="py-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            Pilih Pelan Kejayaan Anda
                        </h2>
                        <p className="mt-4 text-xl text-gray-600">
                            Tanpa komitmen tersembunyi. Fokus lulus peperiksaan.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {plans.map((plan) => (
                            <Card
                                key={plan.id}
                                className={`relative flex flex-col ${plan.recommended ? 'border-2 shadow-xl scale-105 z-10' : 'border shadow-sm hover:shadow-md transition-shadow'} ${plan.recommended ? plan.borderColor : ''}`}
                            >
                                {plan.recommended && (
                                    <div className="absolute top-0 right-0 -mt-3 mr-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Paling Popular
                                        </span>
                                    </div>
                                )}
                                <CardHeader className={`${plan.bg} rounded-t-lg`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <plan.icon className={`h-6 w-6 ${plan.color}`} />
                                        <CardTitle className="text-xl font-bold text-gray-900">{plan.name}</CardTitle>
                                    </div>
                                    <CardDescription className="text-gray-700 min-h-[40px]">{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 pt-6">
                                    <div className="mb-6">
                                        <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                                        {plan.id !== 'exam_ready' && plan.id !== 'addon_ai' && <span className="text-base font-medium text-gray-500"> / sekali</span>}
                                    </div>
                                    <ul className="space-y-4">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <Check className="h-5 w-5 text-green-500" />
                                                </div>
                                                <p className="ml-3 text-sm text-gray-700">{feature}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter className="pb-8 pt-4">
                                    <Button
                                        onClick={() => handleCheckout(plan.id)}
                                        disabled={loading === plan.id}
                                        className={`w-full ${plan.id === 'exam_ready' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                        variant={plan.buttonVariant as any}
                                    >
                                        {loading === plan.id ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            "Pilih Pelan Ini"
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
