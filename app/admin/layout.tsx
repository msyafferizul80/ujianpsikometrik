import { Sidebar } from "@/components/Sidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar /> {/* Reuse existing sidebar for now, maybe customize later */}
            <div className="flex-1 md:ml-64 transition-all duration-300">
                {children}
            </div>
        </div>
    );
}
