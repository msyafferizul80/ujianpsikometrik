"use client";

import { AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface Inconsistency {
    question1_id: number;
    question2_id: number;
    question1_text?: string;
    question2_text?: string;
    answer1_text?: string;
    answer2_text?: string;
    reason: string;
    severity: "HIGH" | "MEDIUM";
}

interface InconsistencyReportProps {
    inconsistencies: Inconsistency[];
    loading: boolean;
}

export function InconsistencyReport({ inconsistencies, loading }: InconsistencyReportProps) {
    if (loading) {
        return (
            <Card className="border-blue-100 bg-blue-50/50 animate-pulse">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Sedang mengaudit konsistensi jawapan...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-4 bg-blue-100 rounded w-3/4"></div>
                </CardContent>
            </Card>
        );
    }

    if (inconsistencies.length === 0) {
        return (
            <Card className="border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
                <CardContent className="py-4 flex items-center gap-4">
                    <div className="bg-green-100 p-2 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-green-900">Integriti Tinggi</h4>
                        <p className="text-sm text-green-700">Analisis AI mendapati jawapan anda konsisten dan tiada percanggahan ketara.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-amber-200 bg-amber-50 shadow-md">
            <CardHeader className="pb-2 border-b border-amber-100">
                <CardTitle className="flex items-center gap-2 text-amber-800 text-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Laporan Ketidakkonsistenan
                    <Badge variant="outline" className="ml-auto border-amber-300 text-amber-700 bg-amber-100">
                        {inconsistencies.length} Isu Dikesan
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <p className="text-sm text-amber-900 mb-4 font-medium">
                    Amaran: Jawapan yang bercanggah boleh menyebabkan anda gagal dalam tapisan integriti.
                </p>

                <Accordion type="single" collapsible className="space-y-2">
                    {inconsistencies.map((item, idx) => (
                        <AccordionItem key={idx} value={`item-${idx}`} className="border border-amber-200 bg-white rounded-lg px-2">
                            <AccordionTrigger className="hover:no-underline py-2 text-sm text-amber-900">
                                <span className="flex items-center gap-2 text-left">
                                    <Badge variant={item.severity === 'HIGH' ? 'destructive' : 'secondary'} className="text-[10px]">
                                        {item.severity}
                                    </Badge>
                                    Isu #{idx + 1}: Percanggahan Jawapan
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 px-2">
                                <div className="bg-amber-50 p-3 rounded text-sm text-amber-800 mb-3 border border-amber-100 italic">
                                    &quot;{item.reason}&quot;
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Situasi 1</p>
                                        <div className="p-2 border rounded bg-gray-50">
                                            <p className="text-xs text-gray-800 mb-1">{item.question1_text || `Soalan ID ${item.question1_id}`}</p>
                                            <Badge variant="outline" className="bg-white">Jawapan Anda: {item.answer1_text || "..."}</Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Situasi 2</p>
                                        <div className="p-2 border rounded bg-gray-50">
                                            <p className="text-xs text-gray-800 mb-1">{item.question2_text || `Soalan ID ${item.question2_id}`}</p>
                                            <Badge variant="outline" className="bg-white">Jawapan Anda: {item.answer2_text || "..."}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}
