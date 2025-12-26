"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { quizRepository } from "@/utils/supabaseRepository";
import { Loader2, Shield, User, Ban, CheckCircle } from "lucide-react";

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await quizRepository.getAllUsers();
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (confirm(`Adakah anda pasti mahu menukar role user ini kepada ${newRole}?`)) {
            try {
                await quizRepository.updateUserRole(userId, newRole as 'user' | 'admin');
                fetchUsers(); // Refresh
            } catch (error) {
                alert("Gagal mengemaskini role.");
            }
        }
    };

    const toggleStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (confirm(`Adakah anda pasti mahu menukar status user ini kepada ${newStatus}?`)) {
            try {
                await quizRepository.updateUserStatus(userId, newStatus as 'active' | 'suspended');
                fetchUsers();
            } catch (error) {
                alert("Gagal mengemaskini status.");
            }
        }
    };

    const handleExtend = async (userId: string) => {
        const daysStr = prompt("Masukkan jumlah hari tambahan (contoh: 30):", "30");
        if (!daysStr) return;

        const days = parseInt(daysStr);
        if (isNaN(days) || days <= 0) {
            alert("Sila masukkan nombor yang sah.");
            return;
        }

        try {
            await quizRepository.extendSubscription(userId, days);
            alert(`Berjaya tambah ${days} hari untuk user ini.`);
            fetchUsers();
        } catch (error) {
            console.error(error);
            alert("Gagal menambah hari langganan.");
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="h-8 w-8 text-blue-600" />
                        Pengurusan Pengguna
                    </h1>
                    <p className="text-gray-600">Urus akses, langganan, dan status pengguna.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Senarai Pengguna ({users.length})</CardTitle>
                        <CardDescription>
                            Senarai lengkap pengguna berdaftar dan status langganan mereka.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status Akaun</TableHead>
                                        <TableHead>Langganan</TableHead>
                                        <TableHead>Tamat Pada</TableHead>
                                        <TableHead className="text-right">Tindakan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">
                                                        {user.full_name || (user.email ? user.email.split('@')[0] : "Tanpa Nama")}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{user.email}</span>
                                                    {!user.full_name && (
                                                        <span className="text-[10px] text-orange-500 italic">*Belum update profil</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === 'admin' ? "default" : "outline"} className={user.role === 'admin' ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-100 text-gray-700"}>
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.status === 'active' ? (
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive">
                                                        Suspended
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-700">
                                                        {user.subscription_tier === 'cram_24h'
                                                            ? 'Pas Pecutan (24 Jam)'
                                                            : (user.subscription_tier === 'exam_ready'
                                                                ? 'Pas Exam-Ready (Premium)'
                                                                : (user.subscription_tier === 'free' ? 'Free Tier' : user.subscription_tier))}
                                                    </Badge>
                                                    {user.subscription_status === 'active' && user.subscription_tier !== 'free' && (
                                                        <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                                            <CheckCircle className="h-3 w-3" /> LANGGANAN AKTIF
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(user.subscription_end_date && user.subscription_tier !== 'free') ? (
                                                    <span className={`text-sm font-mono ${new Date(user.subscription_end_date) < new Date() ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                                                        {new Date(user.subscription_end_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleExtend(user.id)}
                                                        className="hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"
                                                        title="Tambah Hari Langganan"
                                                    >
                                                        <span className="flex items-center gap-1">
                                                            + Hari
                                                        </span>
                                                    </Button>

                                                    <div className="flex bg-gray-50 rounded-md border border-gray-100 p-0.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-500 hover:text-purple-600 hover:bg-white rounded shadow-sm transition-all"
                                                            onClick={() => toggleRole(user.id, user.role)}
                                                            title={user.role === 'admin' ? "Jadikan User" : "Lantik Admin"}
                                                        >
                                                            <Shield className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={`h-7 w-7 rounded shadow-sm transition-all ${user.status === 'active' ? 'text-gray-500 hover:text-red-600 hover:bg-white' : 'text-red-500 bg-red-50 hover:bg-red-100'}`}
                                                            onClick={() => toggleStatus(user.id, user.status)}
                                                            title={user.status === 'active' ? "Gantung Akaun" : "Aktifkan Akaun"}
                                                        >
                                                            <Ban className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
