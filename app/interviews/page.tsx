"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Mic, FileText, CheckCircle2, AlertTriangle, ArrowRight, Save, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Simplified Interview Types
type Question = { id: string; text: string; focus: string };
type Response = { q_id: string; text: string };
type Feedback = { score: number; strengths: string[]; weaknesses: string[]; summary: string };

export default function MockInterviewPage() {
    const router = useRouter();
    const [step, setStep] = useState<"setup" | "interview" | "results">("setup");
    const [loading, setLoading] = useState(false);

    // Setup State
    const [jobRoles, setJobRoles] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState("all");
    const [scenarioType, setScenarioType] = useState("General");

    // Interview State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [interviewId, setInterviewId] = useState<string | null>(null);
    const [token, setToken] = useState<string>("");

    // Results State
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    useEffect(() => {
        // Fetch job roles
        fetch('/api/admin/job-tags')
            .then(r => r.json())
            .then(d => setJobRoles((d.tags || []).map((t: any) => t.name)))
            .catch(() => { });

        // Get auth token for API calls
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setToken(session.access_token);
        });
    }, []);

    const handleGenerateQuestions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/interviews/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    jobRole: selectedRole === "all" ? null : selectedRole,
                    scenarioType
                })
            });
            const data = await res.json();

            if (data.questions && data.questions.length > 0) {
                setQuestions(data.questions);
                setInterviewId(data.interviewId || null);
                setStep("interview");
                setCurrentQIdx(0);
                setResponses({});
            } else {
                alert("Gagal menjana soalan (API error).");
            }
        } catch (e) {
            console.error(e);
            alert("Ralat semasa menjana soalan.");
        } finally {
            setLoading(false);
        }
    };

    const handleNextQuestion = () => {
        if (currentQIdx < questions.length - 1) {
            setCurrentQIdx(prev => prev + 1);
        }
    };

    const handleAnswerChange = (val: string) => {
        setResponses(prev => ({
            ...prev,
            [questions[currentQIdx].id]: val
        }));
    };

    const handleSubmitInterview = async () => {
        setLoading(true);
        try {
            // Format responses for API
            const formattedResponses = questions.map(q => ({
                q_text: q.text,
                r_text: responses[q.id] || "(Tiada Jawapan)"
            }));

            const res = await fetch('/api/interviews/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    jobRole: selectedRole === "all" ? null : selectedRole,
                    interviewId,
                    responses: formattedResponses
                })
            });

            const data = await res.json();
            if (data.score !== undefined) {
                setFeedback(data);
                setStep("results");
            } else {
                alert("Gagal menilai jawapan.");
            }
        } catch (e) {
            console.error(e);
            alert("Ralat semasa menghantar penilaian.");
        } finally {
            setLoading(false);
        }
    };

    // ── UI Renderers ──

    const renderSetup = () => (
        <Card className="max-w-xl mx-auto mt-10 shadow-lg border-indigo-100">
            <CardHeader className="text-center bg-indigo-50 rounded-t-xl mb-4">
                <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Mic className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Simulasi Temuduga AI</CardTitle>
                <p className="text-sm text-gray-600">Berlatih menjawab soalan temuduga SPA dan dapatkan maklum balas pantas.</p>
            </CardHeader>
            <CardContent className="space-y-6 px-6">
                <div className="space-y-2">
                    <Label className="font-semibold text-gray-700">Jawatan Disasarkan</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger><SelectValue placeholder="Pilih jawatan..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Sektor Awam Umum</SelectItem>
                            {jobRoles.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="font-semibold text-gray-700">Jenis Senario</Label>
                    <Select value={scenarioType} onValueChange={setScenarioType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="General">Soalan Umum / Latar Belakang</SelectItem>
                            <SelectItem value="Behavioral">Tingkah Laku (Behavioral) & Integriti</SelectItem>
                            <SelectItem value="Situational">Situasi / Penyelesaian Masalah</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="px-6 pb-6 pt-2">
                <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-6 text-lg tracking-wide rounded-xl shadow-md"
                    onClick={handleGenerateQuestions}
                    disabled={loading}
                >
                    {loading ? "Menjana Soalan AI..." : "Mula Temuduga"}
                </Button>
            </CardFooter>
        </Card>
    );

    const renderInterview = () => {
        const q = questions[currentQIdx];
        const isLast = currentQIdx === questions.length - 1;
        const currentAns = responses[q.id] || "";

        return (
            <div className="max-w-3xl mx-auto mt-6 space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex gap-2">
                        {questions.map((_, i) => (
                            <div key={i} className={`h-2.5 rounded-full transition-all ${i === currentQIdx ? 'w-8 bg-indigo-600' : i < currentQIdx ? 'w-4 bg-indigo-300' : 'w-4 bg-gray-200'}`} />
                        ))}
                    </div>
                    <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                        Soalan {currentQIdx + 1} / {questions.length}
                    </span>
                </div>

                <Card className="border-t-4 border-t-indigo-500 shadow-md">
                    <CardHeader>
                        <h2 className="text-2xl font-bold text-gray-900 leading-snug">{q.text}</h2>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md mb-2">Fokus: {q.focus}</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Label className="sr-only">Jawapan Anda</Label>
                        <Textarea
                            placeholder="Taip jawapan atau 'skrip' seolah-olah anda sedang bercakap..."
                            className="min-h-[250px] resize-y text-base p-4 border-gray-300 focus:border-indigo-500 rounded-xl"
                            value={currentAns}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5 font-medium">
                            <Sparkles className="h-3 w-3 text-indigo-400" />
                            Tips: Gunakan model S.T.A.R (Situasi, Tugasan, Tindakan, Résult)
                        </p>
                    </CardContent>
                    <CardFooter className="bg-gray-50 flex justify-between rounded-b-xl border-t border-gray-100 p-4">
                        <div className="text-xs text-gray-400 pt-2 font-medium">Auto-simpan draf.</div>
                        {!isLast ? (
                            <Button onClick={handleNextQuestion} className="bg-gray-800 text-white hover:bg-black px-6">
                                Seterusnya <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmitInterview}
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-sm"
                            >
                                {loading ? "AI Menganalisis..." : "Selesai & Nilaikan"}
                                {!loading && <Save className="ml-2 h-4 w-4" />}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        );
    };

    const renderResults = () => {
        if (!feedback) return null;

        // Interpret Score
        let scoreColor = "text-indigo-600";
        let scoreMsg = "Baik";
        if (feedback.score >= 80) { scoreColor = "text-emerald-600"; scoreMsg = "Cemerlang"; }
        else if (feedback.score < 60) { scoreColor = "text-rose-600"; scoreMsg = "Berisiko"; }

        return (
            <div className="max-w-4xl mx-auto mt-6 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                {/* Score Banner */}
                <Card className="text-center overflow-hidden border-0 shadow-lg ring-1 ring-gray-100">
                    <div className="bg-gradient-to-r from-gray-900 to-indigo-900 h-2" />
                    <CardContent className="pt-8 pb-10">
                        <h2 className="text-xl font-bold text-gray-500 mb-2 uppercase tracking-widest">Markah Penilaian AI</h2>
                        <div className="flex items-end justify-center gap-3">
                            <span className={`text-7xl font-black ${scoreColor} tracking-tighter`}>{feedback.score}</span>
                            <span className="text-2xl text-gray-400 font-bold mb-2">/ 100</span>
                        </div>
                        <div className={`mt-4 inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold ${feedback.score >= 80 ? 'bg-emerald-100 text-emerald-800' : feedback.score >= 60 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'}`}>
                            Kategori: {scoreMsg}
                        </div>
                    </CardContent>
                </Card>

                {/* Summary */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
                    <Sparkles className="absolute -top-3 -right-3 h-8 w-8 text-amber-300 drop-shadow-sm" />
                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                        Ulasan Pegawai SPA (AI)
                    </h3>
                    <p className="text-gray-700 leading-relaxed text-sm md:text-base bg-gray-50/50 p-4 rounded-xl border border-gray-100">{feedback.summary}</p>
                </div>

                {/* Strengths / Weakness Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-emerald-200 shadow-sm bg-gradient-to-b from-white to-emerald-50/30">
                        <CardHeader className="pb-3 border-b border-emerald-50">
                            <CardTitle className="text-emerald-800 flex items-center gap-2 text-lg">
                                <CheckCircle2 className="h-5 w-5" /> Kekuatan Utama
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <ul className="space-y-3">
                                {feedback.strengths.map((s, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-700 items-start">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-rose-200 shadow-sm bg-gradient-to-b from-white to-rose-50/30">
                        <CardHeader className="pb-3 border-b border-rose-50">
                            <CardTitle className="text-rose-800 flex items-center gap-2 text-lg">
                                <AlertTriangle className="h-5 w-5" /> Ruang Penambahbaikan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <ul className="space-y-3">
                                {feedback.weaknesses.map((w, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-700 items-start">
                                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                        <span>{w}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-center pt-6 pb-12">
                    <Button
                        onClick={() => {
                            setStep("setup");
                            setFeedback(null);
                        }}
                        variant="outline"
                        size="lg"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 rounded-xl"
                    >
                        Cuba Lagi Senario Lain
                    </Button>
                    <Button
                        onClick={() => router.push('/dashboard')}
                        size="lg"
                        className="ml-4 bg-gray-900 text-white hover:bg-black px-8 rounded-xl hidden sm:flex"
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Kembali ke Dashboard
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gray-50/50 pb-12">
                <div className="container px-4">
                    {step === "setup" && renderSetup()}
                    {step === "interview" && renderInterview()}
                    {step === "results" && renderResults()}
                </div>
            </div>
        </DashboardLayout>
    );
}
