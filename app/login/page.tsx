"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { createClient } from '@supabase/supabase-js';
import { Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

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
                    shouldCreateUser: true, // Allow new users (candidates) to sign up
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
                // Determine if user is Admin or Candidate based on email/role?
                // For now, redirect to Dashboard. 
                // We can save the user profile in Supabase if needed, but for now session is enough.
                router.push("/dashboard");
            }
        } catch (err: any) {
            setError(err.message || "Ralat pengesahan OTP.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-xl border-blue-100">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-2">
                        <span className="text-white text-lg font-bold">UP</span>
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Log Masuk Calon</CardTitle>
                    <CardDescription>
                        {step === 'email'
                            ? "Masukkan emel untuk memulakan sesi latihan."
                            : "Kod pengesahan telah dihantar ke emel anda."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 'email' ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Emel</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <Input
                                        type="email"
                                        placeholder="nama@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                            {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">{error}</p>}
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 font-semibold h-11"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                    <>
                                        Hantar Kod OTP <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-sm text-gray-500 mb-1">Dihantar ke</p>
                                <p className="font-medium text-gray-900">{email}</p>
                            </div>

                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    placeholder="• • • • • •"
                                    value={otp}
                                    maxLength={6}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="text-center text-3xl tracking-[1em] h-14 font-mono"
                                    required
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">{error}</p>}
                            <Button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 font-semibold h-11"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-5 w-5" />
                                        Sahkan & Masuk
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-gray-500"
                                onClick={() => setStep('email')}
                            >
                                Tukar Emel
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="justify-center border-t bg-gray-50/50 p-4">
                    <p className="text-xs text-gray-500">
                        Admin? <a href="/admin/login" className="text-blue-600 hover:underline">Log masuk di sini</a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
