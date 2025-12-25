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
        // 'suspended' logic isn't strictly enforced by Supabase Auth automatically unless we use triggers or check status on login.
        // For now, this is a flag in profiles.
        if (confirm(`Adakah anda pasti mahu menukar status user ini kepada ${newStatus}?`)) {
            try {
                await quizRepository.updateUserStatus(userId, newStatus as 'active' | 'suspended');
                fetchUsers();
            } catch (error) {
                alert("Gagal mengemaskini status.");
            }
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
                    <p className="text-gray-600">Urus akses dan status pengguna sistem.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Senarai Pengguna</CardTitle>
                        <CardDescription>
                            Senarai semua pengguna yang berdaftar.
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
                                        <TableHead>Emel</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Tindakan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.email}</TableCell>
                                            <TableCell>{user.full_name || "-"}</TableCell>
                                            <TableCell>
                                                {user.role === 'admin' ? (
                                                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">
                                                        <Shield className="h-3 w-3 mr-1" /> Admin
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-600">
                                                        User
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.status === 'active' ? (
                                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                                        Aktif
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive">
                                                        Digantung
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => toggleRole(user.id, user.role)}
                                                >
                                                    {user.role === 'admin' ? 'Demote' : 'Promote'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={user.status === 'active' ? "destructive" : "default"}
                                                    onClick={() => toggleStatus(user.id, user.status)}
                                                >
                                                    {user.status === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                                </Button>
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
