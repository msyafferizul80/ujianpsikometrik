"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Question {
    id: number;
    teras: string;
    question: string;
    options: { label: string; text: string }[];
    bestAnswer: string;
    explanation: string;
}

interface QuestionReviewProps {
    questions: Question[];
    userAnswers: Record<number, string>;
}

export function QuestionReview({ questions, userAnswers }: QuestionReviewProps) {
    const [filter, setFilter] = useState<'all' | 'best' | 'close' | 'weak'>('all');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Helper to get score quality
    const getAnswerQuality = (q: Question, answer: string) => {
        if (answer === q.bestAnswer) return 'best';

        // Simple close match logic (matches scoring.ts logic roughly)
        // A<>B, D<>E logic
        const best = q.bestAnswer;
        if ((best === 'A' && answer === 'B') || (best === 'B' && answer === 'A')) return 'close';
        if ((best === 'D' && answer === 'E') || (best === 'E' && answer === 'D')) return 'close';

        return 'weak';
    };

    const filteredQuestions = questions.filter(q => {
        const answer = userAnswers[q.id];
        const quality = getAnswerQuality(q, answer);
        if (filter === 'all') return true;
        return quality === filter;
    });

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <Card className="shadow-md border-0 ring-1 ring-gray-100">
            <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span>Semakan Jawapan</span>
                    <div className="flex gap-2">
                        <Button
                            variant={filter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('all')}
                        >
                            Semua
                        </Button>
                        <Button
                            variant={filter === 'best' ? 'default' : 'outline'}
                            size="sm"
                            className={filter === 'best' ? 'bg-green-600 hover:bg-green-700' : ''}
                            onClick={() => setFilter('best')}
                        >
                            Terbaik
                        </Button>
                        <Button
                            variant={filter === 'close' ? 'default' : 'outline'}
                            size="sm"
                            className={filter === 'close' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                            onClick={() => setFilter('close')}
                        >
                            Hampir
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {filteredQuestions.map(q => {
                        const answer = userAnswers[q.id];
                        const quality = getAnswerQuality(q, answer);
                        const isExpanded = expandedId === q.id;

                        let statusColor = "bg-gray-100 border-gray-200";
                        let StatusIcon = HelpCircle;

                        if (quality === 'best') {
                            statusColor = "bg-green-50 border-green-200";
                            StatusIcon = CheckCircle2;
                        } else if (quality === 'close') {
                            statusColor = "bg-yellow-50 border-yellow-200";
                            StatusIcon = AlertCircle;
                        } else {
                            statusColor = "bg-red-50 border-red-200";
                            StatusIcon = AlertCircle;
                        }

                        return (
                            <div key={q.id} className={`rounded-lg border ${statusColor} transition-all`}>
                                <div
                                    className="p-4 cursor-pointer flex items-start gap-3"
                                    onClick={() => toggleExpand(q.id)}
                                >
                                    <div className={`mt-1 ${quality === 'best' ? 'text-green-600' :
                                            quality === 'close' ? 'text-yellow-600' : 'text-red-500'
                                        }`}>
                                        <StatusIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold uppercase tracking-wider opacity-70">{q.teras}</span>
                                            <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full border border-black/5">Soalan {q.id}</span>
                                        </div>
                                        <p className="font-medium text-gray-900 text-sm sm:text-base">{q.question}</p>

                                        {!isExpanded && (
                                            <div className="mt-2 text-xs flex items-center gap-2">
                                                <span className="text-gray-500">Jawapan anda:</span>
                                                <span className="font-bold">{answer}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t border-black/5 bg-white/50 rounded-b-lg">
                                        <div className="mt-4 grid gap-2">
                                            {q.options.map(opt => {
                                                const isSelected = answer === opt.label;
                                                const isBest = q.bestAnswer === opt.label;

                                                let optionClass = "p-3 rounded border text-sm flex justify-between items-center ";
                                                if (isBest) optionClass += "bg-green-100 border-green-300 text-green-900 font-medium ring-1 ring-green-300";
                                                else if (isSelected) optionClass += "bg-red-50 border-red-300 text-red-900"; // If selected but not best
                                                else optionClass += "bg-white border-gray-200 text-gray-600";

                                                return (
                                                    <div key={opt.label} className={optionClass}>
                                                        <span>{opt.label}. {opt.text}</span>
                                                        {isBest && <Badge className="bg-green-600 hover:bg-green-700 ml-2">Pilihan Terbaik</Badge>}
                                                        {isSelected && !isBest && <Badge variant="destructive" className="ml-2">Pilihan Anda</Badge>}
                                                        {isSelected && isBest && <Badge className="bg-green-600 hover:bg-green-700 ml-2">Pilihan Anda</Badge>}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
                                            <p className="font-bold mb-1 flex items-center gap-2">
                                                <HelpCircle className="h-4 w-4" />
                                                Penjelasan:
                                            </p>
                                            <p className="whitespace-pre-line">{q.explanation}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
