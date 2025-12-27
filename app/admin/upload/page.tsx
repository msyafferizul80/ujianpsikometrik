"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileText, Check, AlertCircle, Save, Loader2, Code } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { quizRepository } from "@/utils/supabaseRepository";

export default function UploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [questions, setQuestions] = useState<any[]>([]);
    const [error, setError] = useState("");
    const [quizTitle, setQuizTitle] = useState("");
    const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
    const [rawText, setRawText] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError("");
        }
    };

    const parseTextClientSide = (text: string) => {
        const questions = [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        let currentQuestion: any = null;
        let parsingState = 'init';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 1. Detect New Question
            const questionStartMatch = line.match(/^(?:Soalan|Question)\s*(\d+)[\.\:\)]?|^(\d+)[\.\)\-\:](?!\d)/i);

            if (questionStartMatch) {
                if (currentQuestion) {
                    questions.push(currentQuestion);
                }

                const qNum = questionStartMatch[1] || questionStartMatch[2];
                let qText = line.replace(/^(?:Soalan|Question)\s*\d+[\.\:\)]?\s*|^\d+[\.\)\-\:]\s*/i, '').trim();

                if (/^Teras\s*[\:\-]/i.test(qText)) {
                    qText = '';
                }

                currentQuestion = {
                    id: parseInt(qNum) || questions.length + 1,
                    question: qText,
                    options: [],
                    correctAnswer: '',
                    answerPoints: {},
                    teras: 'General',
                    explanation: ''
                };
                parsingState = 'question_text';
                continue;
            }

            if (!currentQuestion) continue;

            // 2. Detect "Teras:"
            if (/^Teras\s*[\:\-]/i.test(line)) {
                currentQuestion.teras = line.replace(/^Teras\s*[\:\-]\s*/i, '').trim();
                continue;
            }

            // 3. Detect "Soalan:" prefix
            if (/^Soalan\s*[\:\-]/i.test(line)) {
                currentQuestion.question = line.replace(/^Soalan\s*[\:\-]\s*/i, '').trim();
                parsingState = 'question_text';
                continue;
            }

            // 4. Detect "Pernyataan:"
            if (/^Pernyataan\s*[\:\-]/i.test(line)) {
                // Remove "Pernyataan:" label, keep only the text
                const val = line.replace(/^Pernyataan\s*[\:\-]\s*/i, '').trim();
                if (currentQuestion.question) {
                    currentQuestion.question += "\n\n" + val;
                } else {
                    currentQuestion.question = val;
                }
                parsingState = 'question_text';
                continue;
            }

            // 5. Detect Options (e.g. "A.", "• A.", "A)")
            const optionMatch = line.match(/^(?:[\•\-\*]\s*)?([A-E])\s*[\.\)\-\–]\s+(.*)/i);

            // 6. Detect Headers that force state change
            if (/^Pilihan Jawapan[\:\-]/i.test(line)) {
                parsingState = 'options';
                continue;
            }

            if (/^(Cadangan Jawapan|Jawapan|Answer)/i.test(line)) {
                const match = line.match(/[\:\-]\s*([A-E])/i);
                if (match) {
                    currentQuestion.correctAnswer = match[1].toUpperCase();
                }
                parsingState = 'meta';
                continue;
            }

            if (/^(Kenapa|Penerangan|Explanation)/i.test(line)) {
                parsingState = 'explanation';
                // Don't continue, capture the header as part of explanation context if needed, or just let loop proceed
            }

            // --- State Handling ---

            if (parsingState === 'question_text') {
                // Check if it's an option before appending to question
                if (optionMatch) {
                    parsingState = 'options';
                } else if (!/^(Cadangan|Jawapan|Answer)/i.test(line) && !/^(Kenapa|Penerangan)/i.test(line)) {
                    currentQuestion.question += (currentQuestion.question ? "\n" : "") + line;
                }
            }

            if (parsingState === 'options') {
                if (optionMatch) {
                    currentQuestion.options.push({
                        label: optionMatch[1].toUpperCase(),
                        text: optionMatch[2].trim()
                    });
                }
            }

            if (parsingState === 'explanation') {
                // If line matches "Kenapa" or "Penerangan", we just entered this state.
                // We append lines until we hit new question or answer (though answer usually comes before explanation).
                if (!/^(Cadangan Jawapan|Jawapan|Answer)\s*[\:\-]/i.test(line)) {
                    if (!currentQuestion.explanation) currentQuestion.explanation = "";
                    currentQuestion.explanation += (currentQuestion.explanation ? "\n" : "") + line;
                }
            }
        }
        if (currentQuestion) questions.push(currentQuestion);

        // Score Processing
        return questions.map(q => {
            const points: any = {};
            q.options.forEach((opt: any) => {
                if (opt.label === q.correctAnswer) {
                    points[opt.label] = 10;
                } else {
                    points[opt.label] = 0;
                }
            });
            return { ...q, answerPoints: points };
        });
    };

    const handleUpload = async () => {
        setParsing(true);
        setError("");

        try {
            // CLIENT SIDE PARSING FOR TEXT
            if (activeTab === 'text') {
                if (!rawText.trim()) {
                    setError("Sila masukkan teks soalan.");
                    setParsing(false);
                    return;
                }
                console.log("Starting client-side parse...");
                const parsed = parseTextClientSide(rawText);
                console.log("Parsed result:", parsed);

                if (parsed.length > 0) {
                    setQuestions(parsed);
                } else {
                    setError("Tiada soalan dikesan. Sila pastikan format betul (Soalan 1..., Pilihan Jawapan:, dll).");
                }
                setParsing(false);
                return;
            }

            // SERVER SIDE FOR FILES
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/admin/parse-docx', {
                method: 'POST',
                body: formData
            });

            let data;
            try {
                data = await res.json();
            } catch (jsonErr) {
                console.error("JSON Parse Error", jsonErr);
                setError("Respon dari server tidak sah.");
                setParsing(false);
                return;
            }

            if (data.success) {
                setQuestions(data.data);
            } else {
                setError(data.error || "Gagal memproses fail.");
            }

        } catch (err) {
            console.error(err);
            setError("Ralat tidak dijangka.");
        } finally {
            setParsing(false);
        }
    };

    const handleSaveQuiz = async () => {
        if (!quizTitle) {
            setError("Sila masukkan tajuk set soalan.");
            return;
        }

        try {
            setParsing(true); // Re-use parsing state for loading UI

            // 1. Create Quiz Entry
            const quiz = await quizRepository.createQuiz(quizTitle, "Set soalan yang dimuat naik oleh admin.", questions.length);

            if (quiz && quiz.id) {
                // 2. Save Questions
                await quizRepository.saveQuestions(quiz.id, questions);

                alert("Set soalan berjaya disimpan ke database!");
                router.push('/admin/dashboard');
            }
        } catch (err: any) {
            console.error("Save Error:", err);
            setError("Gagal menyimpan ke database: " + err.message);
        } finally {
            setParsing(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Upload Soalan Baru</h1>
                <Button variant="outline" onClick={() => router.back()}>Kembali</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>1. Sumber Soalan</CardTitle>
                        <CardDescription>Pilih cara untuk masukkan soalan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Tabs */}
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button
                                onClick={() => setActiveTab('file')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'file' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Upload Fail
                            </button>
                            <button
                                onClick={() => setActiveTab('text')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'text' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Paste Teks
                            </button>
                        </div>

                        {activeTab === 'file' ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors relative">
                                <input
                                    type="file"
                                    accept=".docx,.json"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center pointer-events-none">
                                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                                    <span className="text-gray-600 font-medium">Klik atau Drag fail ke sini</span>
                                    <span className="text-xs text-gray-400 mt-1">Microsoft Word (.docx) atau JSON</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <textarea
                                    className="w-full h-[200px] p-3 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder={`Contoh format:\n1. Soalan pertama...\nA. Pilihan A\nB. Pilihan B\nJawapan: A`}
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 text-right">Paste terus dari Microsoft Word</p>
                            </div>
                        )}

                        {activeTab === 'file' && file && (
                            <div className="mt-4 flex items-center justify-center gap-2 bg-blue-50 py-3 px-4 rounded-lg border border-blue-100">
                                {file.name.endsWith('.json') ? <Code className="h-5 w-5 text-emerald-600" /> : <FileText className="h-5 w-5 text-blue-600" />}
                                <span className="font-medium text-gray-700 truncate max-w-[200px]">{file.name}</span>
                                <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                        )}

                        <Button
                            onClick={handleUpload}
                            disabled={(activeTab === 'file' && !file) || (activeTab === 'text' && !rawText) || parsing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                        >
                            {parsing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sedang Memproses...
                                </>
                            ) : "Proses Soalan"}
                        </Button>

                        {error && (
                            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Ralat</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Preview & Save Section */}
                <Card className={`transition-opacity duration-300 ${questions.length > 0 ? "opacity-100" : "opacity-60 pointer-events-none"}`}>
                    <CardHeader>
                        <CardTitle>2. Semak & Simpan</CardTitle>
                        <CardDescription>
                            {questions.length > 0
                                ? <span className="text-green-600 font-bold">{questions.length} soalan berjaya dikesan.</span>
                                : "Sila proses fail dahulu."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tajuk Set Soalan</label>
                            <Input
                                placeholder="Contoh: Set Pegawai Tadbir N41 (2024)"
                                value={quizTitle}
                                onChange={(e) => setQuizTitle(e.target.value)}
                            />
                        </div>

                        <div className="bg-gray-100 p-4 rounded-lg h-[300px] overflow-y-auto text-sm space-y-4 border scrollbar-thin scrollbar-thumb-gray-300">
                            {questions.map((q, i) => (
                                <div key={i} className="bg-white p-3 rounded border shadow-sm">
                                    <p className="font-semibold text-gray-800 mb-2 truncate">{i + 1}. {q.question}</p>
                                    <ul className="space-y-1 ml-4 text-gray-600 list-none">
                                        {q.options.map((opt: any, j: number) => (
                                            <li key={j} className={opt.label === q.correctAnswer ? "text-green-600 font-bold bg-green-50 px-2 py-1 rounded" : ""}>
                                                {opt.label}. {opt.text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                            {questions.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                                    <FileText className="h-12 w-12 mb-2" />
                                    <p>Preview soalan akan muncul di sini</p>
                                </div>
                            )}
                        </div>

                        <Button onClick={handleSaveQuiz} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-11">
                            <Save className="mr-2 h-4 w-4" />
                            Simpan ke Bank Soalan
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
