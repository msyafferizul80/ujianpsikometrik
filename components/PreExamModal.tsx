"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface PreExamModalProps {
    open: boolean;
    quizId: string;
    quizTitle: string;
    onExamStarted: (attemptId: number, endsAt: string) => void;
    onCancel: () => void;
}

export function PreExamModal({ open, quizId, quizTitle, onExamStarted, onCancel }: PreExamModalProps) {
    const [starting, setStarting] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const handleStart = async () => {
        if (!agreed) return;
        setStarting(true);
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            const userName = session?.user?.user_metadata?.full_name || 'Calon';

            const res = await fetch('/api/exam/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quiz_id: quizId,
                    user_id: userId,
                    user_name: userName,
                    duration_minutes: 90,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            onExamStarted(data.attempt_id, data.ends_at);
        } catch (e) {
            console.error('Failed to start exam', e);
            alert('Gagal memulakan sesi peperiksaan. Sila cuba lagi.');
        } finally {
            setStarting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <span className="text-2xl">📋</span>
                        Mod Peperiksaan Sebenar
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        {quizTitle}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Exam Details */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                            <Clock className="h-6 w-6 text-blue-600 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-blue-600 font-medium uppercase">Tempoh</p>
                                <p className="text-lg font-bold text-blue-900">90 Minit</p>
                            </div>
                        </div>
                        <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-3">
                            <CheckCircle className="h-6 w-6 text-indigo-600 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-indigo-600 font-medium uppercase">Soalan</p>
                                <p className="text-lg font-bold text-indigo-900">170 Soalan</p>
                            </div>
                        </div>
                    </div>

                    {/* Anti-Cheat Warning */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 font-semibold text-amber-800">
                            <Shield className="h-4 w-4" />
                            Sistem Kawalan Anti-Penipuan Aktif
                        </div>
                        <ul className="text-sm text-amber-700 space-y-1 list-none">
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                Masa dikira dari pelayan (server) — refresh tidak akan reset masa
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                Pertukaran tab atau tetingkap lain akan direkodkan sebagai pelanggaran
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                Fungsi klik kanan & salin-tampal dilumpuhkan semasa ujian
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                Jawapan diselamatkan ke pelayan setiap 30 saat secara automatik
                            </li>
                        </ul>
                    </div>

                    {/* Agreement checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div
                            onClick={() => setAgreed(a => !a)}
                            className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${agreed ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                                }`}
                        >
                            {agreed && <CheckCircle className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm text-gray-700">
                            Saya faham dan bersetuju dengan syarat-syarat peperiksaan di atas. Saya akan menjawab dengan jujur dan tidak akan cuba menipu.
                        </span>
                    </label>
                </div>

                <DialogFooter className="gap-3 flex-col sm:flex-row">
                    <Button variant="outline" onClick={onCancel} disabled={starting} className="w-full sm:w-auto">
                        Batal
                    </Button>
                    <Button
                        onClick={handleStart}
                        disabled={!agreed || starting}
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0"
                    >
                        {starting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memulakan...</>
                        ) : (
                            <>📋 Mulakan Peperiksaan</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
