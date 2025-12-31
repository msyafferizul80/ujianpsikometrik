"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { quizRepository } from "@/utils/supabaseRepository";
import { Loader2, Shield, User, Ban, CheckCircle, Search, Download, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from 'file-saver';

// Initialize Supabase Client directly for complex queries
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalUsers, setTotalUsers] = useState(0);

    // Derived state for pagination
    const totalPages = Math.ceil(totalUsers / pageSize);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            // Build Query
            let query = supabase
                .from('profiles')
                .select('*', { count: 'exact' });

            // Apply Filters
            if (roleFilter !== 'all') {
                query = query.eq('role', roleFilter);
            }
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }
            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            }

            // Apply Pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to).order('created_at', { ascending: false });

            const { data: profiles, count, error } = await query;

            if (error) throw error;

            setTotalUsers(count || 0);

            // Fetch Latest Activity for these users
            if (profiles && profiles.length > 0) {
                const enrichedUsers = await Promise.all(profiles.map(async (user) => {
                    // Try to find latest attempt by email (since user_name in attempts is often email)
                    // Note: If attempts table has user_id, use that. Fallback to email.
                    const { data: latestAttempt } = await supabase
                        .from('attempts')
                        .select('created_at, quizzes(title)')
                        .or(`user_id.eq.${user.id},user_name.eq.${user.email}`) // Flexible match
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    return {
                        ...user,
                        latest_attempt: latestAttempt
                    };
                }));
                setUsers(enrichedUsers);
            } else {
                setUsers([]);
            }

        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, roleFilter, statusFilter, searchTerm]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // Reset to page 1 on search
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, roleFilter, statusFilter, pageSize]); // Don't include fetchUsers to avoid loop, specifically target dependencies

    // Handle Page Change separately to avoid double fetch with debounce
    useEffect(() => {
        fetchUsers();
    }, [page]);


    const toggleRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (confirm(`Adakah anda pasti mahu menukar role user ini kepada ${newRole}?`)) {
            await quizRepository.updateUserRole(userId, newRole as 'user' | 'admin');
            fetchUsers();
        }
    };

    const toggleStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (confirm(`Adakah anda pasti mahu menukar status user ini kepada ${newStatus}?`)) {
            await quizRepository.updateUserStatus(userId, newStatus as 'active' | 'suspended');
            fetchUsers();
        }
    };

    const handleExtend = async (userId: string) => {
        const daysStr = prompt("Masukkan jumlah hari tambahan (contoh: 30):", "30");
        if (!daysStr) return;
        const days = parseInt(daysStr);
        if (isNaN(days) || days <= 0) return alert("Nombor tidak sah.");

        try {
            await quizRepository.extendSubscription(userId, days);
            alert(`Berjaya tambah ${days} hari.`);
            fetchUsers();
        } catch (error) {
            alert("Gagal menambah hari.");
        }
    };

    const handleExport = async () => {
        try {
            const { data: allUsers, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error || !allUsers) return alert("Gagal export data.");

            // Fetch latest attempts for ALL users
            const enrichedUsers = await Promise.all(allUsers.map(async (user) => {
                const { data: latestAttempt } = await supabase
                    .from('attempts')
                    .select('created_at, quizzes(title)')
                    .or(`user_id.eq.${user.id},user_name.eq.${user.email}`) // Flexible match
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                return {
                    ...user,
                    latest_attempt: latestAttempt
                };
            }));

            const csvRows = [];
            // Header
            csvRows.push(["Nama", "Emel", "No. WhatsApp", "Status", "Role", "Tarikh Daftar", "Langganan", "Aktiviti Terakhir", "Tamat Pada"]);

            for (const user of enrichedUsers) {
                let lastActivity = "-";
                if (user.latest_attempt) {
                    const title = user.latest_attempt.quizzes?.title || "Ujian Tanpa Tajuk";
                    const date = new Date(user.latest_attempt.created_at).toLocaleDateString();
                    const time = new Date(user.latest_attempt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    lastActivity = `${title} \n${date} • ${time}`; // Format similar to UI
                }

                // Formatting data
                const row = [
                    user.full_name || "N/A",
                    user.email || "N/A",
                    // Force string for whatsapp to prevent scientific notation in Excel
                    `'${user.whatsapp || "-"}'`,
                    user.status,
                    user.role,
                    new Date(user.created_at).toLocaleDateString(),
                    user.subscription_tier,
                    `"${lastActivity}"`, // Wrap in quotes to handle potential commas or newlines
                    user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString() : "-"
                ];
                csvRows.push(row.join(","));
            }

            const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, `users_export_${new Date().toISOString().split('T')[0]}.csv`);

        } catch (e) {
            console.error(e);
            alert("Export error.");
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-[1600px] mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <User className="h-8 w-8 text-blue-600" />
                            Pengurusan Pengguna
                        </h1>
                        <p className="text-gray-600">Total Pengguna: {totalUsers}</p>
                    </div>
                    <Button onClick={handleExport} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>

                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Cari user (Nama / Emel)..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Role</SelectItem>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(parseInt(val))}>
                                    <SelectTrigger className="w-[100px]">
                                        <SelectValue placeholder="Show" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 / Page</SelectItem>
                                        <SelectItem value="20">20 / Page</SelectItem>
                                        <SelectItem value="50">50 / Page</SelectItem>
                                        <SelectItem value="100">100 / Page</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="w-[300px]">User Info</TableHead>
                                            <TableHead>WhatsApp</TableHead>
                                            <TableHead>Role & Status</TableHead>
                                            <TableHead>Langganan</TableHead>
                                            <TableHead>Aktiviti Terakhir</TableHead>
                                            <TableHead className="text-right">Tindakan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                    Tiada pengguna dijumpai.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map((user) => (
                                                <TableRow key={user.id} className="hover:bg-gray-50/50">
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-900">
                                                                {user.full_name || (user.email ? user.email.split('@')[0] : "Tanpa Nama")}
                                                            </span>
                                                            <span className="text-xs text-gray-500">{user.email}</span>
                                                            <span className="text-[10px] text-gray-400 mt-1">
                                                                Joined: {new Date(user.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {user.whatsapp ? (
                                                            <span className="font-mono text-sm text-gray-700 bg-green-50 px-2 py-1 rounded border border-green-100">
                                                                {user.whatsapp}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs italic">Belum set</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Badge variant={user.role === 'admin' ? "default" : "secondary"} className="h-6">
                                                                {user.role}
                                                            </Badge>
                                                            <Badge variant={user.status === 'active' ? "outline" : "destructive"} className={user.status === 'active' ? "text-green-600 border-green-200 bg-green-50" : ""}>
                                                                {user.status}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-700">
                                                                {user.subscription_tier === 'free' ? 'Free Tier' : user.subscription_tier}
                                                            </Badge>
                                                            {user.subscription_end_date && user.subscription_tier !== 'free' && (
                                                                <span className={`text-[10px] ${new Date(user.subscription_end_date) < new Date() ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                                                    Exp: {new Date(user.subscription_end_date).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {user.latest_attempt ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-xs font-medium text-gray-900" title={user.latest_attempt.quizzes?.title}>
                                                                    {user.latest_attempt.quizzes?.title || "Ujian Tanpa Tajuk"}
                                                                </span>
                                                                <span className="text-[10px] text-gray-500">
                                                                    {new Date(user.latest_attempt.created_at).toLocaleDateString()} • {new Date(user.latest_attempt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleExtend(user.id)}
                                                                className="h-8 w-8 p-0 text-gray-500 hover:text-green-600 hover:bg-green-50"
                                                                title="Extend Sub"
                                                            >
                                                                <span className="font-bold text-lg leading-none">+</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleRole(user.id, user.role)}
                                                                className="h-8 w-8 p-0 text-gray-500 hover:text-purple-600"
                                                                title="Toggle Role"
                                                            >
                                                                <Shield className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleStatus(user.id, user.status)}
                                                                className={`h-8 w-8 p-0 ${user.status === 'active' ? 'text-gray-500 hover:text-red-600' : 'text-red-600 bg-red-50'}`}
                                                                title="Toggle Status"
                                                            >
                                                                <Ban className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {!loading && users.length > 0 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-gray-500">
                                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalUsers)} of {totalUsers} users
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="text-sm font-medium">
                                        Page {page} of {totalPages}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
