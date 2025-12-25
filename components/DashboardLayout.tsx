import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            // 1. Check Supabase Session
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                setAuthenticated(true);
                setLoading(false);
            } else {
                // 2. Fallback: Check localStorage/Cookie (Legacy/Demo support)
                // If we strictly want Supabase, we comment this out.
                // For now, let's strictly enforce Supabase OTP as requested.
                // router.push("/login");

                // Allow "Admin" bypass if they are logged in as admin in localStorage (optional)
                // But user requested "use supabase instead of localstorage".
                router.push("/login");
            }
        };

        checkAuth();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
            <Sidebar />
            <main className="flex-1 lg:ml-64">
                {children}
            </main>
        </div>
    );
}
