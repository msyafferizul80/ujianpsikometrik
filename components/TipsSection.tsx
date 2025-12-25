"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Target, Clock, TrendingUp } from "lucide-react";

const tips = [
    {
        icon: Target,
        title: "Fokus pada Kekuatan",
        description: "Kenalpasti kekuatan anda dan gunakan ia untuk menjawab soalan dengan yakin.",
        color: "blue"
    },
    {
        icon: Clock,
        title: "Urus Masa dengan Bijak",
        description: "Jangan terlalu lama pada satu soalan. Jawab semua soalan dahulu, kemudian semak semula.",
        color: "green"
    },
    {
        icon: TrendingUp,
        title: "Latihan Berterusan",
        description: "Semakin kerap berlatih, semakin baik prestasi anda. Cuba ulang ujian untuk penambahbaikan.",
        color: "purple"
    },
    {
        icon: Lightbulb,
        title: "Jawab dengan Jujur",
        description: "Tiada jawapan betul atau salah mutlak. Jawab mengikut personaliti sebenar anda.",
        color: "orange"
    }
];

export function TipsSection() {
    return (
        <Card className="shadow-md border-0 ring-1 ring-gray-100">
            <CardHeader>
                <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Tips Kejayaan
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tips.map((tip, index) => {
                        const Icon = tip.icon;
                        const colorClasses = {
                            blue: "bg-blue-50 border-blue-200 text-blue-700",
                            green: "bg-green-50 border-green-200 text-green-700",
                            purple: "bg-purple-50 border-purple-200 text-purple-700",
                            orange: "bg-orange-50 border-orange-200 text-orange-700"
                        };

                        return (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border ${colorClasses[tip.color as keyof typeof colorClasses]} hover:shadow-sm transition-shadow`}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-sm mb-1">{tip.title}</h4>
                                        <p className="text-xs opacity-80">{tip.description}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
