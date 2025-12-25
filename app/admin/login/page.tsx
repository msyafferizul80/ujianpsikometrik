"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { createClient } from '@supabase/supabase-js';

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    // Import Supabase client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: true
                }
            });

            if (error) {
                setError(error.message);
            } else {
                setStep('otp');
            }
        } catch (err: any) {
            setError(err.message || "Ralat penghantaran OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data: { session }, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email',
            });

            if (error) {
                setError(error.message);
            } else if (session) {
                // Success
                // Set legacy helper for existing components if they check localStorage
                localStorage.setItem("isAdmin", "true");
                router.push("/admin/dashboard");
            }
        } catch (err: any) {
            setError(err.message || "Ralat pengesahan OTP.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit">
                        <Lock className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-800">Admin Login (OTP)</CardTitle>
                    <CardDescription>
                        {step === 'email'
                            ? "Masukkan emel untuk menerima kod OTP."
                            : "Masukkan kod 6-digit yang dihantar ke emel anda."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 'email' ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="nama@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="text-center text-lg"
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                disabled={loading}
                            >
                                {loading ? "Sedang Menghantar..." : "Hantar OTP"}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    placeholder="123456"
                                    value={otp}
                                    maxLength={6}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="text-center text-2xl tracking-widest"
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <Button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                                disabled={loading}
                            >
                                {loading ? "Sedang Mengesahkan..." : "Sahkan & Masuk"}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={() => setStep('email')}
                            >
                                Tukar Emel
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
