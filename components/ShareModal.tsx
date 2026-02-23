"use client";

import { useEffect, useRef } from "react";
import { X, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareModalProps {
    imageDataUrl: string;
    onClose: () => void;
    shareText?: string;
    shareUrl?: string;
}

const PLATFORMS = [
    {
        name: "WhatsApp",
        icon: (
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
                <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.668 4.61 1.832 6.5L4 29l7.75-1.812A12.94 12.94 0 0 0 16 28c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22a10.94 10.94 0 0 1-5.576-1.52l-.4-.24-4.6 1.076 1.1-4.48-.26-.42A10.94 10.94 0 0 1 5 15c0-6.065 4.935-11 11-11s11 4.935 11 11-4.935 11-11 11zm6.01-8.26c-.33-.165-1.953-.964-2.255-1.073-.302-.11-.522-.165-.74.165-.22.33-.852 1.073-1.044 1.293-.192.22-.385.247-.715.082-.33-.165-1.393-.514-2.653-1.637-.98-.875-1.64-1.956-1.833-2.285-.192-.33-.02-.508.145-.673.149-.148.33-.385.494-.578.165-.192.22-.33.33-.55.11-.22.055-.412-.028-.578-.082-.165-.74-1.787-1.013-2.448-.267-.643-.538-.556-.74-.566l-.63-.01c-.22 0-.578.082-.88.412-.302.33-1.155 1.128-1.155 2.75s1.183 3.19 1.348 3.41c.165.22 2.327 3.556 5.638 4.984.788.34 1.403.543 1.882.695.79.252 1.51.217 2.08.132.634-.095 1.953-.799 2.228-1.57.275-.77.275-1.43.192-1.57-.082-.137-.302-.22-.632-.385z" />
            </svg>
        ),
        color: "bg-[#25D366] hover:bg-[#1fbf5a] text-white",
        getUrl: (text: string, url: string) =>
            `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`,
    },
    {
        name: "Telegram",
        icon: (
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
                <path d="M16 3C9.373 3 4 8.373 4 15c0 6.628 5.373 12 12 12s12-5.372 12-12c0-6.627-5.373-12-12-12zm5.894 8.221-2.043 9.626c-.153.68-.56.845-1.133.524l-3.126-2.304-1.508 1.451c-.166.166-.306.306-.628.306l.224-3.177 5.776-5.217c.251-.224-.054-.348-.39-.124L9.82 17.167l-3.048-.951c-.663-.207-.675-.663.138-.982l11.9-4.589c.551-.2 1.033.134.884.576z" />
            </svg>
        ),
        color: "bg-[#0088cc] hover:bg-[#0077b5] text-white",
        getUrl: (text: string, url: string) =>
            `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    },
    {
        name: "Facebook",
        icon: (
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
                <path d="M16 3C9.373 3 4 8.373 4 15c0 5.99 4.385 10.954 10.125 11.854v-8.385H11.08v-3.47h3.045V13.43c0-3.007 1.792-4.67 4.532-4.67 1.313 0 2.686.235 2.686.235v2.953h-1.513c-1.49 0-1.955.925-1.955 1.874V15h3.328l-.532 3.47h-2.796v8.385C23.615 25.954 28 20.99 28 15c0-6.627-5.373-12-12-12z" />
            </svg>
        ),
        color: "bg-[#1877F2] hover:bg-[#1461c4] text-white",
        getUrl: (_: string, url: string) =>
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
        name: "X (Twitter)",
        icon: (
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.16-5.39 6.16H2.75l7.73-8.835L2.25 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
        color: "bg-black hover:bg-gray-800 text-white",
        getUrl: (text: string, url: string) =>
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
        name: "Threads",
        icon: (
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
                <path d="M19.59 14.73c-.13-.065-1.37-.66-2.77-.503-1.213.133-2.215.845-2.78 1.94-.423.813-.496 1.748-.207 2.63.31.94.973 1.663 1.866 2.034.89.37 1.893.358 2.773-.032.817-.363 1.447-.994 1.774-1.78.302-.732.315-1.547.038-2.29-.28-.75-.85-1.35-1.694-1.999zm-1.27 4.137c-.453.453-.858.572-1.14.579-.281.007-.576-.1-.796-.286-.32-.275-.49-.688-.467-1.12.024-.443.233-.823.568-1.057.365-.254.837-.317 1.314-.178.482.14.927.498 1.18.956.222.41.245.87.066 1.285-.178.413-.5.624-.725.82z M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4zm3.693 18.217c-.766.267-1.58.4-2.395.397a6.86 6.86 0 0 1-2.595-.495c-1.63-.68-2.878-1.97-3.508-3.616-.634-1.657-.568-3.46.185-5.07.763-1.63 2.143-2.87 3.837-3.446.91-.307 1.858-.426 2.797-.352a7.67 7.67 0 0 1 2.576.713c1.549.784 2.63 2.11 3.045 3.74.41 1.616.14 3.294-.75 4.715-.87 1.395-2.246 2.438-3.892 2.914z" />
            </svg>
        ),
        color: "bg-black hover:bg-gray-800 text-white",
        getUrl: (text: string, url: string) =>
            `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text}\n${url}`)}`,
    },
    {
        name: "Instagram",
        icon: (
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
                <path d="M16 6.163c3.204 0 3.584.012 4.85.07 3.252.148 4.77 1.691 4.918 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM16 4c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C19.668 4.014 19.259 4 16 4zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM16 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
            </svg>
        ),
        color: "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 text-white",
        getUrl: (_: string, url: string) =>
            // Instagram doesn't support deep link sharing from web — copy link instead
            `https://www.instagram.com/`,
    },
];

export function ShareModal({ imageDataUrl, onClose, shareText = "", shareUrl = "" }: ShareModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose]);

    const handleDownload = () => {
        const link = document.createElement("a");
        link.download = "Keputusan-Psikometrik.png";
        link.href = imageDataUrl;
        link.click();
    };

    const handleNativeShare = async () => {
        if (!navigator.share) return;
        try {
            // Convert data URL to Blob for native share
            const res = await fetch(imageDataUrl);
            const blob = await res.blob();
            const file = new File([blob], "Keputusan-Psikometrik.png", { type: "image/png" });
            await navigator.share({
                title: "Keputusan Ujian Psikometrik",
                text: shareText,
                files: navigator.canShare?.({ files: [file] }) ? [file] : undefined,
                url: shareUrl,
            });
        } catch {
            // user cancelled or unsupported — just download
            handleDownload();
        }
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            <div
                className="relative w-full max-w-xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
                style={{ backgroundColor: "#0f1117", border: "1px solid rgba(255,255,255,0.08)" }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <h2 className="text-lg font-bold text-white">Kongsi Keputusan Anda</h2>
                    <p className="text-sm text-white/50 mt-0.5">Muat turun atau kongsi terus ke media sosial</p>
                </div>

                {/* Image preview */}
                <div className="mx-6 rounded-xl overflow-hidden border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageDataUrl}
                        alt="Preview Keputusan"
                        className="w-full object-contain"
                    />
                </div>

                {/* Actions */}
                <div className="p-6 space-y-4">
                    {/* Primary: Download + Web Share */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleDownload}
                            className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                            style={{ backgroundColor: '#4f46e5' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4338ca')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4f46e5')}
                        >
                            <Download className="h-4 w-4" />
                            Muat Turun PNG
                        </button>
                        {typeof navigator !== "undefined" && "share" in navigator && (
                            <button
                                onClick={handleNativeShare}
                                className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                                style={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.15)' }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1f2937')}
                            >
                                <Share2 className="h-4 w-4" />
                                Kongsi ke Peranti
                            </button>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-white/30 uppercase tracking-wider">Atau kongsi ke</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Social platform buttons */}
                    <div className="grid grid-cols-3 gap-2.5">
                        {PLATFORMS.map((p) => (
                            <a
                                key={p.name}
                                href={p.getUrl(shareText, shareUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-opacity ${p.color}`}
                            >
                                {p.icon}
                                <span>{p.name}</span>
                            </a>
                        ))}
                    </div>

                    <p className="text-center text-xs text-white/30">
                        Tip: Untuk Instagram, muat turun imej dahulu kemudian upload secara manual ke Stories atau Post
                    </p>
                </div>
            </div>
        </div>
    );
}
