"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BookOpen,
    Trophy,
    BarChart3,
    Calendar,
    Settings,
    Menu,
    X,
    Flame,
    Lock,
    Library
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getQuizStats } from "@/utils/stats";

const menuItems = [
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
    },
    {
        title: "Katalog Kuiz",
        icon: Library,
        href: "/quiz/select",
    },
    {
        title: "Keputusan",
        icon: Trophy,
        href: "/result",
    },
    {
        title: "Analisis",
        icon: BarChart3,
        href: "/analytics",
    },
    {
        title: "Kalendar",
        icon: Calendar,
        href: "/calendar",
    },
    {
        title: "Tetapan",
        icon: Settings,
        href: "/settings",
    },
    {
        title: "Admin Panel",
        icon: Lock,
        href: "/admin/dashboard",
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [streak, setStreak] = useState(0);
    const [userName, setUserName] = useState("Calon");
    const [userEmail, setUserEmail] = useState("");
    const [userRole, setUserRole] = useState("user");
    const [mounted, setMounted] = useState(false);

    // Import Supabase Client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        setMounted(true);
        const stats = getQuizStats();
        setStreak(stats.currentStreak);

        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUserEmail(session.user.email || "");
                // Prioritize localStorage name if set, else use email part
                const savedName = localStorage.getItem('userName');
                setUserName(savedName || session.user.email?.split('@')[0] || "Calon");

                // Fetch Role from 'profiles'
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUserRole(profile.role);
                }

                // Fallback for initial admin bootstrap (demo purpose only)
                // If the email matches the developer/admin email, auto-grant admin in UI state (not DB, DB needs manual update)
                if (session.user.email === 'sheffi80@gmail.com') { // Hardcode bootstrap
                    setUserRole('admin');
                }
            }
        };
        fetchUser();

        // Listen for storage changes to update name across tabs/components
        const handleStorageChange = () => {
            const updatedName = localStorage.getItem('userName');
            if (updatedName) setUserName(updatedName);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('user-profile-update', handleStorageChange); // Custom event for same-tab updates

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('user-profile-update', handleStorageChange);
        };
    }, []);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 transition-transform duration-300 flex flex-col",
                    "w-64",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo/Brand */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-sm font-bold">UP</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-800 text-base">PSIKOMETRIK</h1>
                            <p className="text-xs text-gray-500">Sistem Latihan</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            // Hide Admin panel if not admin
                            if (item.href.startsWith('/admin') && userRole !== 'admin') {
                                return null;
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                        "hover:bg-gray-50",
                                        isActive
                                            ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 font-medium shadow-sm"
                                            : "text-gray-600 hover:text-gray-900"
                                    )}
                                >
                                    <Icon className={cn(
                                        "h-5 w-5",
                                        isActive ? "text-blue-600" : "text-gray-400"
                                    )} />
                                    <span className="text-sm">{item.title}</span>
                                    {isActive && (
                                        <div className="ml-auto h-2 w-2 bg-blue-600 rounded-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* User Profile Section */}
                <div className="p-4 border-t border-gray-100">
                    <Link href="/settings">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50/50 hover:shadow-sm transition-shadow cursor-pointer">
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                                {userName ? getInitials(userName) : "AD"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                                <p className="text-xs text-gray-500 truncate">{userEmail || "S5 Candidate"}</p>
                            </div>
                        </div>
                    </Link>

                    {/* Streak Badge */}
                    <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border border-orange-100">
                        <div className="flex items-center gap-2">
                            <Flame className="h-5 w-5 text-orange-500" />
                            <div>
                                <p className="text-xs text-gray-600">Streak Semasa</p>
                                <p className="text-lg font-bold text-orange-600">{streak} hari</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
