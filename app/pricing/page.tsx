"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Zap, ShieldCheck, BrainCircuit, Star, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { createClient } from "@supabase/supabase-js";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

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
            originalPrice: "RM 39",
            description: "Akses pantas untuk ulangkaji saat akhir.",
            features: [
                "Akses Bank Soalan Penuh (24 Jam)",
                "Analisis Prestasi Penuh",
                "Tiada Komitmen Bulanan"
            ],
            icon: Zap,
            color: "text-orange-500",
            borderColor: "border-orange-200",
            bg: "bg-white",
            buttonVariant: "outline",
            badge: null
        },
        {
            id: "momentum_7d",
            name: "Pas Momentum (7 Hari) 🔥",
            price: "RM 40",
            originalPrice: "RM 89",
            description: "Pakej paling berbaloi untuk pecutan akhir seminggu.",
            features: [
                "Akses Bank Soalan UNLIMITED",
                "Analisis Prestasi Penuh",
                "Tempoh Akses: 7 Hari",
                "AI Coach (Baiki Kelemahan) 🤖",
                "Tutor AI (Penjelasan Jawapan) ✨",
                "Analisis Konsistensi Jawapan 🆕"
            ],
            icon: Star,
            color: "text-red-600",
            borderColor: "border-red-500",
            bg: "bg-red-50",
            recommended: true,
            buttonVariant: "default",
            badge: "Tawaran Istimewa"
        },
        {
            id: "exam_ready",
            name: "Pas Exam-Ready (1 Bulan)",
            price: "RM 79",
            originalPrice: "RM 159",
            description: "Pakej LENGKAP untuk jaminan persediaan yang lebih yakin.",
            features: [
                "Akses Bank Soalan UNLIMITED",
                "Analisis Prestasi Penuh",
                "Tempoh Akses: 30 Hari",
                "AI Coach (Baiki Kelemahan) 🔥",
                "Tutor AI (Penerangan Jawapan) ✨",
                "Analisis Konsistensi Jawapan 🆕",
                "Support Group WhatsApp Eksklusif"
            ],
            icon: ShieldCheck,
            color: "text-green-600",
            borderColor: "border-green-200",
            bg: "bg-white",
            recommended: false,
            buttonVariant: "outline",
            badge: null
        },
        {
            id: "addon_ai",
            name: "Add-on: AI Coach",
            price: "RM 20",
            originalPrice: "RM 49",
            description: "Buka kunci ciri 'Baiki Kelemahan' secara spesifik.",
            features: [
                "Feature Unlock: AI Coach",
                "Tutor AI (Penjelasan Jawapan) ✨",
                "Analisis Konsistensi Jawapan 🆕",
                "Baiki Kelemahan Topikal",
                "Jana Soalan Targeted"
            ],
            icon: BrainCircuit,
            color: "text-purple-600",
            borderColor: "border-purple-200",
            bg: "bg-white",
            buttonVariant: "outline",
            badge: null
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
            <div className="py-12 bg-gray-50/50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Header Section */}
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                            Labur Untuk Masa Depan Kerjaya Anda
                        </h2>
                        <p className="max-w-2xl mx-auto text-xl text-gray-600">
                            Jangan ambil risiko gagal. Dapatkan akses penuh kepada sistem simulasi peperiksaan sebenar hari ini.
                        </p>

                        {/* Trust Badges */}
                        <div className="flex items-center justify-center gap-6 mt-8 opacity-80 grayscale hover:grayscale-0 transition-all">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span>Dipercayai 500+ Calon</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border">
                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                <span>Pembayaran Selamat</span>
                            </div>
                        </div>
                    </div>

                    {/* Pricing Config */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-8 items-start">
                        {plans.map((plan) => (
                            <Card
                                key={plan.id}
                                className={`
                                    relative flex flex-col transition-all duration-300
                                    ${plan.recommended
                                        ? 'border-2 shadow-2xl scale-100 lg:scale-110 z-10 lg:-mt-4'
                                        : 'border shadow-md hover:shadow-xl hover:-translate-y-1'
                                    } 
                                    ${plan.recommended ? plan.borderColor : 'border-gray-200'}
                                `}
                            >
                                {plan.recommended && (
                                    <div className="absolute top-0 inset-x-0 -mt-4 flex justify-center">
                                        <div className={`
                                            px-6 py-1.5 rounded-full text-sm font-bold shadow-lg uppercase tracking-wide
                                            ${plan.id === 'momentum_7d' ? 'bg-red-600 text-white' : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'}
                                        `}>
                                            {plan.badge}
                                        </div>
                                    </div>
                                )}

                                <CardHeader className={`${plan.bg} ${plan.recommended ? 'pt-10' : ''} rounded-t-lg border-b border-gray-100 pb-8`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`p-3 rounded-lg ${plan.recommended ? 'bg-white/80' : 'bg-gray-100'}`}>
                                            <plan.icon className={`h-6 w-6 ${plan.color}`} />
                                        </div>
                                        {plan.recommended && (
                                            <span className={`text-xs font-semibold px-2 py-1 rounded ${plan.id === 'momentum_7d' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                Jimat 50%
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-900">{plan.name}</CardTitle>
                                    <CardDescription className="text-gray-600 mt-2">{plan.description}</CardDescription>
                                </CardHeader>

                                <CardContent className="flex-1 pt-8">
                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-gray-400 line-through text-lg">{plan.originalPrice}</span>
                                            <span className="text-5xl font-extrabold text-gray-900 tracking-tight">{plan.price}</span>
                                        </div>
                                        {plan.id !== 'exam_ready' && plan.id !== 'addon_ai' && plan.id !== 'momentum_7d' && <span className="text-sm font-medium text-gray-500"> / akses sekali</span>}
                                        {plan.id === 'exam_ready' && <span className="text-sm font-medium text-green-600 block mt-1">Pembayaran sekali sahaja. Tiada langganan automatik.</span>}
                                    </div>

                                    <ul className="space-y-4">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <Check className={`h-5 w-5 ${plan.isGreen ? 'text-green-500' : (plan.id === 'momentum_7d' ? 'text-red-500' : 'text-gray-400')}`} />
                                                </div>
                                                <p className="ml-3 text-sm text-gray-700 font-medium">{feature}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>

                                <CardFooter className="pb-8 pt-4">
                                    <Button
                                        onClick={() => handleCheckout(plan.id)}
                                        disabled={loading === plan.id}
                                        className={`w-full h-12 text-base font-bold shadow-sm transition-all
                                            ${plan.recommended
                                                ? (plan.id === 'momentum_7d'
                                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200 hover:shadow-red-300 hover:scale-[1.02]'
                                                    : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 hover:shadow-green-300 hover:scale-[1.02]')
                                                : ''
                                            }
                                        `}
                                        variant={plan.buttonVariant as any}
                                    >
                                        {loading === plan.id ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            "Dapatkan Akses Sekarang"
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    {/* FAQ Section */}
                    <div className="mt-24 max-w-3xl mx-auto">
                        <div className="text-center mb-10">
                            <h3 className="text-2xl font-bold text-gray-900">Soalan Lazim (FAQ)</h3>
                            <p className="text-gray-500 mt-2">Jawapan kepada persoalan anda.</p>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Adakah pembayaran ini sekali sahaja?</AccordionTrigger>
                                <AccordionContent>
                                    Ya, pembayaran adalah secara "One-Time Payment". Tiada caj bulanan automatik akan dikenakan kepada anda.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>Berapa lama akses akan diberikan?</AccordionTrigger>
                                <AccordionContent>
                                    Untuk Pas Pecutan, anda mendapat akses 24 jam. Untuk Pas Exam-Ready, akses adalah selama 30 hari penuh.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>Apa itu "AI Coach"?</AccordionTrigger>
                                <AccordionContent>
                                    AI Coach adalah sistem pintar yang menganalisis corak jawapan anda. Ia akan memberitahu topik mana anda lemah (cth: Matematik, Logik) dan memberikan soalan latih tubi KHAS untuk topik tersebut.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-4">
                                <AccordionTrigger>Boleh refund jika tidak berpuas hati?</AccordionTrigger>
                                <AccordionContent>
                                    Kami menawarkan jaminan kepuasan. Jika anda menghadapi masalah teknikal yang menghalang penggunaan sistem, hubungi support kami untuk bantuan.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>

                    {/* Support Contact */}
                    <div className="mt-16 text-center border-t border-gray-200 pt-8">
                        <p className="text-sm text-gray-500">
                            Perlukan bantuan lanjut? <a href="https://wa.me/60123011082" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Hubungi Sokongan</a>
                        </p>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}

