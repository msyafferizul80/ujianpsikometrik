"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState, Suspense } from "react";

function PaymentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [processing, setProcessing] = useState(false);

    const amount = parseInt(searchParams.get("amount") || "0");
    const description = searchParams.get("description");
    const callbackUrl = searchParams.get("callback_url");
    const billId = searchParams.get("id");

    const handlePayment = async (status: 'paid' | 'failed') => {
        if (!callbackUrl) return;
        setProcessing(true);

        // Simulate network delay
        await new Promise(r => setTimeout(r, 1500));

        // Construct redirect URL with query params like Billplz does
        const redirectUrl = new URL(callbackUrl);
        redirectUrl.searchParams.set("billplz[id]", billId || "mock-id");
        redirectUrl.searchParams.set("billplz[paid]", status === 'paid' ? "true" : "false");
        redirectUrl.searchParams.set("billplz[x_signature]", "mock-signature");

        window.location.href = redirectUrl.toString();
    };

    return (
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
            <CardHeader className="text-center border-b border-gray-100 bg-white">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-blue-600">B</span>
                </div>
                <CardTitle className="text-xl">Billplz Mock Gateway (Test Mode)</CardTitle>
                <CardDescription>Simulasi pembayaran tanpa wang sebenar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 bg-white">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Item:</span>
                        <span className="font-medium">{description}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                        <span className="text-gray-700">Jumlah:</span>
                        <span className="text-blue-600">RM {(amount / 100).toFixed(2)}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
                        onClick={() => handlePayment('paid')}
                        disabled={processing}
                    >
                        {processing ? "Memproses..." : (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                Bayar Sekarang (Berjaya)
                            </span>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full h-12 text-red-600 hover:bg-red-50 border-red-200"
                        onClick={() => handlePayment('failed')}
                        disabled={processing}
                    >
                        <span className="flex items-center gap-2">
                            <XCircle className="w-5 h-5" />
                            Batal / Gagal
                        </span>
                    </Button>
                </div>

                <p className="text-xs text-center text-gray-400">
                    Ini adalah halaman simulasi. Tiada wang akan ditolak.
                </p>
            </CardContent>
        </Card>
    );
}

export default function MockBillplzPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Suspense fallback={<div className="text-center p-4">Memuatkan Gerbang Pembayaran...</div>}>
                <PaymentContent />
            </Suspense>
        </div>
    );
}
