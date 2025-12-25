"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: LucideIcon;
    colorClass: "blue" | "green" | "orange" | "purple" | "emerald" | "violet";
    tooltip?: string;
}

const colorStyles = {
    blue: {
        bg: "bg-blue-50/50",
        border: "border-blue-100",
        text: "text-blue-900",
        value: "text-blue-700",
        subtitle: "text-blue-600/80",
        icon: "text-blue-600"
    },
    green: {
        bg: "bg-green-50/50",
        border: "border-green-100",
        text: "text-green-900",
        value: "text-green-700",
        subtitle: "text-green-600/80",
        icon: "text-green-600"
    },
    orange: {
        bg: "bg-orange-50/50",
        border: "border-orange-100",
        text: "text-orange-900",
        value: "text-orange-700",
        subtitle: "text-orange-600/80",
        icon: "text-orange-600"
    },
    purple: {
        bg: "bg-purple-50/50",
        border: "border-purple-100",
        text: "text-purple-900",
        value: "text-purple-700",
        subtitle: "text-purple-600/80",
        icon: "text-purple-600"
    },
    emerald: {
        bg: "bg-emerald-50/50",
        border: "border-emerald-100",
        text: "text-emerald-900",
        value: "text-emerald-700",
        subtitle: "text-emerald-600/80",
        icon: "text-emerald-600"
    },
    violet: {
        bg: "bg-violet-50/50",
        border: "border-violet-100",
        text: "text-violet-900",
        value: "text-violet-700",
        subtitle: "text-violet-600/80",
        icon: "text-violet-600"
    }
};

export function StatCard({ title, value, subtitle, icon: Icon, colorClass, tooltip }: StatCardProps) {
    const styles = colorStyles[colorClass];

    return (
        <Card className={`${styles.border} ${styles.bg} shadow-sm hover:shadow-md transition-shadow`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <CardTitle className={`text-sm font-medium ${styles.text}`}>{title}</CardTitle>
                    {tooltip && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className={`h-3 w-3 ${styles.text} opacity-50 hover:opacity-100 cursor-help`} />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <Icon className={`h-5 w-5 ${styles.icon}`} />
            </CardHeader>
            <CardContent>
                <div className={`text-3xl font-bold ${styles.value}`}>{value}</div>
                <p className={`text-xs ${styles.subtitle} mt-1`}>{subtitle}</p>
            </CardContent>
        </Card>
    );
}
