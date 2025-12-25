"use client";

import { Sidebar } from "@/components/Sidebar";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
            <Sidebar />
            <main className="flex-1 lg:ml-64">
                {children}
            </main>
        </div>
    );
}
