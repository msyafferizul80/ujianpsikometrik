"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { shareApp } from "@/utils/share";

interface ShareButtonProps {
    variant?: "default" | "outline" | "secondary" | "ghost";
    className?: string;
    text?: string;
}

export function ShareButton({ variant = "outline", className, text = "Kongsi Aplikasi" }: ShareButtonProps) {
    return (
        <Button variant={variant} className={className} onClick={shareApp}>
            <Share2 className="mr-2 h-4 w-4" />
            {text}
        </Button>
    );
}
