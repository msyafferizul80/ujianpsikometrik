"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { quizRepository } from "@/utils/supabaseRepository";
import { Loader2, Shield, User, Ban, Search, Download, ChevronLeft, ChevronRight, Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet, Users } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from 'file-saver';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────
function BulkUploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [rows, setRows] = useState<{ email: string; full_name: string; whatsapp: string; duration?: number }[]>([]);
    const [parseError, setParseError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<any[] | null>(null);
    const [summary, setSummary] = useState<any | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [selectedDuration, setSelectedDuration] = useState<number>(90);

    const parseCSV = (text: string) => {
        setParseError("");
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) { setParseError("Fail CSV mesti ada sekurang-kurangnya 1 baris data."); return; }

        const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
        const emailIdx = header.findIndex(h => h.includes("email"));
        const nameIdx = header.findIndex(h => h.includes("name") || h.includes("nama"));
        const waIdx = header.findIndex(h => h.includes("whatsapp") || h.includes("phone") || h.includes("no"));
        const durationIdx = header.findIndex(h => h.includes("tempoh") || h.includes("duration"));

        if (emailIdx === -1) { setParseError("Kolum 'email' tidak dijumpai dalam CSV."); return; }

        const parsed = lines.slice(1).map(line => {
            const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
            return {
                email: cols[emailIdx] || "",
                full_name: nameIdx >= 0 ? cols[nameIdx] || "" : "",
                whatsapp: waIdx >= 0 ? cols[waIdx] || "" : "",
                duration: durationIdx >= 0 && cols[durationIdx] ? parseInt(cols[durationIdx]) || undefined : undefined,
            };
        }).filter(r => r.email);

        if (parsed.length === 0) { setParseError("Tiada data valid ditemui."); return; }
        setRows(parsed);
    };

    const handleFile = (file: File) => {
        if (!file.name.endsWith(".csv")) { setParseError("Sila muat naik fail .CSV sahaja."); return; }
        const reader = new FileReader();
        reader.onload = e => parseCSV(e.target?.result as string);
        reader.readAsText(file, "utf-8");
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const downloadTemplate = () => {
        const csv = "email,full_name,whatsapp,tempoh_hari\njohnsmith@gmail.com,John Smith,0123456789,90\nalihassan@gmail.com,Ali Hassan,0198765432,30";
        const blob = new Blob([csv], { type: "text/csv" });
        saveAs(blob, "template_bulk_users.csv");
    };

    const handleUpload = async () => {
        if (rows.length === 0) return;
        setUploading(true);
        try {
            const res = await fetch("/api/admin/bulk-create-users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ users: rows, defaultDuration: selectedDuration }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Ralat semasa upload");
            setResults(data.results);
            setSummary(data.summary);
        } catch (err: any) {
            setParseError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="h-6 w-6 text-blue-600" /> Bulk Upload Pengguna
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">Cipta akaun & aktifkan Pas Career Launchpad secara automatik</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Done state */}
                    {results ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Berjaya", val: summary.success, color: "bg-green-50 text-green-700 border-green-200" },
                                    { label: "Sudah Ada", val: summary.skipped, color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
                                    { label: "Gagal", val: summary.failed, color: "bg-red-50 text-red-700 border-red-200" },
                                ].map(s => (
                                    <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
                                        <div className="text-3xl font-bold">{s.val}</div>
                                        <div className="text-sm font-medium mt-1">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
                                <Table>
                                    <TableHeader><TableRow className="bg-gray-50">
                                        <TableHead>Emel</TableHead><TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>Maklumat</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {results.map((r, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-sm">{r.email}</TableCell>
                                                <TableCell className="text-sm">{r.full_name}</TableCell>
                                                <TableCell>
                                                    <Badge className={r.status === 'success' ? 'bg-green-100 text-green-700 border-green-200' : r.status === 'skipped' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} variant="outline">
                                                        {r.status === 'success' ? '✅ Berjaya' : r.status === 'skipped' ? '⚠️ Skip' : '❌ Gagal'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-500">{r.reason || (r.status === 'success' ? 'Email dikirim' : '')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <Button onClick={() => { onDone(); onClose(); }} className="w-full bg-blue-600 hover:bg-blue-700">
                                Selesai & Refresh Senarai
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Plan info */}
                            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                <div className="w-full">
                                    <p className="text-sm font-semibold text-green-800">Tetapan Langganan (Default):</p>
                                    <div className="flex gap-4 mt-2 mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="duration" checked={selectedDuration === 90} onChange={() => setSelectedDuration(90)} className="text-blue-600 w-4 h-4" />
                                            <span className="text-sm font-medium text-green-900">90 Hari (3 Bulan)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="duration" checked={selectedDuration === 30} onChange={() => setSelectedDuration(30)} className="text-blue-600 w-4 h-4" />
                                            <span className="text-sm font-medium text-green-900">30 Hari (1 Bulan)</span>
                                        </label>
                                    </div>
                                    <p className="text-xs text-green-700 leading-relaxed">✅ Semua pengguna akan mendapat Akaun Ujian Psikometrik, Pas Career Launchpad, dan Email Selamat Datang.<br/>ℹ️ Anda juga boleh ubah tempoh untuk pengguna spesifik dengan menambah kolum <code>tempoh_hari</code> dalam fail CSV.</p>
                                </div>
                            </div>

                            {/* Template download */}
                            <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                <FileSpreadsheet className="h-4 w-4" /> Muat turun Template CSV
                            </button>

                            {/* Drop zone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onClick={() => fileRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
                            >
                                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-600">Seret & lepas fail CSV di sini</p>
                                <p className="text-xs text-gray-400 mt-1">atau klik untuk pilih fail</p>
                                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                            </div>

                            {parseError && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{parseError}
                                </div>
                            )}

                            {/* Preview */}
                            {rows.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 mb-2">{rows.length} pengguna akan dicipta:</p>
                                    <div className="rounded-lg border overflow-hidden max-h-52 overflow-y-auto">
                                        <Table>
                                            <TableHeader><TableRow className="bg-gray-50">
                                                <TableHead>#</TableHead><TableHead>Emel</TableHead><TableHead>Nama</TableHead><TableHead>WhatsApp</TableHead><TableHead>Tempoh</TableHead>
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {rows.slice(0, 50).map((r, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="text-xs text-gray-400">{i + 1}</TableCell>
                                                        <TableCell className="text-sm">{r.email}</TableCell>
                                                        <TableCell className="text-sm text-gray-600">{r.full_name || "-"}</TableCell>
                                                        <TableCell className="text-sm text-gray-600">{r.whatsapp || "-"}</TableCell>
                                                        <TableCell className="text-sm font-medium text-blue-600">{r.duration || selectedDuration} Hari</TableCell>
                                                    </TableRow>
                                                ))}
                                                {rows.length > 50 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-gray-400 py-2">...dan {rows.length - 50} lagi</TableCell></TableRow>}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 font-semibold text-base py-5"
                                    >
                                        {uploading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Sedang memproses...</> : <><Upload className="h-5 w-5 mr-2" /> Cipta {rows.length} Akaun & Hantar Email</>}
                                    </Button>
                                    {uploading && <p className="text-xs text-gray-400 text-center mt-2">Sila tunggu, proses ini mungkin mengambil masa beberapa minit...</p>}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalUsers, setTotalUsers] = useState(0);
    const [showBulkModal, setShowBulkModal] = useState(false);

    const totalPages = Math.ceil(totalUsers / pageSize);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from('profiles').select('*', { count: 'exact' });
            if (roleFilter !== 'all') query = query.eq('role', roleFilter);
            if (statusFilter !== 'all') query = query.eq('status', statusFilter);
            if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            const from = (page - 1) * pageSize;
            query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });
            const { data: profiles, count, error } = await query;
            if (error) throw error;
            setTotalUsers(count || 0);
            if (profiles && profiles.length > 0) {
                const enriched = await Promise.all(profiles.map(async (user) => {
                    const { data: latestAttempt } = await supabase.from('attempts').select('created_at, quizzes(title)').or(`user_id.eq.${user.id},user_name.eq.${user.email}`).order('created_at', { ascending: false }).limit(1).single();
                    return { ...user, latest_attempt: latestAttempt };
                }));
                setUsers(enriched);
            } else { setUsers([]); }
        } catch (error) { console.error("Error fetching users:", error); }
        finally { setLoading(false); }
    }, [page, pageSize, roleFilter, statusFilter, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => { setPage(1); fetchUsers(); }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, roleFilter, statusFilter, pageSize]);

    useEffect(() => { fetchUsers(); }, [page]);

    const toggleRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (confirm(`Tukar role kepada ${newRole}?`)) { await quizRepository.updateUserRole(userId, newRole as 'user' | 'admin'); fetchUsers(); }
    };
    const toggleStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (confirm(`Tukar status kepada ${newStatus}?`)) { await quizRepository.updateUserStatus(userId, newStatus as 'active' | 'suspended'); fetchUsers(); }
    };
    const handleExtend = async (userId: string) => {
        const daysStr = prompt("Jumlah hari tambahan:", "30");
        if (!daysStr) return;
        const days = parseInt(daysStr);
        if (isNaN(days) || days <= 0) return alert("Nombor tidak sah.");
        const amountStr = prompt("Jumlah bayaran RM (0 jika percuma):", "0");
        const amount = amountStr ? parseFloat(amountStr) : 0;
        try { await quizRepository.extendSubscription(userId, days, amount); alert(`Berjaya tambah ${days} hari.`); fetchUsers(); }
        catch { alert("Gagal menambah hari."); }
    };

    const handleExport = async () => {
        try {
            const { data: allUsers, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            if (error || !allUsers) return alert("Gagal export data.");
            const csvRows = [["Nama", "Emel", "No. WhatsApp", "Status", "Role", "Tarikh Daftar", "Langganan", "Tamat Pada"]];
            for (const user of allUsers) {
                csvRows.push([user.full_name || "N/A", user.email || "N/A", `'${user.whatsapp || "-"}'`, user.status, user.role, new Date(user.created_at).toLocaleDateString(), user.subscription_tier, user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString() : "-"]);
            }
            const blob = new Blob(["\uFEFF" + csvRows.map(r => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        } catch (e) { alert("Export error."); }
    };

    return (
        <DashboardLayout>
            {showBulkModal && <BulkUploadModal onClose={() => setShowBulkModal(false)} onDone={fetchUsers} />}
            <div className="p-6 max-w-[1600px] mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"><User className="h-8 w-8 text-blue-600" /> Pengurusan Pengguna</h1>
                        <p className="text-gray-600">Total Pengguna: {totalUsers}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            onClick={() => setShowBulkModal(true)}
                            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                        >
                            <Upload className="h-4 w-4" /> Bulk Upload Pengguna
                        </Button>
                        <Button onClick={handleExport} variant="outline" className="gap-2">
                            <Download className="h-4 w-4" /> Export CSV
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input placeholder="Cari user (Nama / Emel)..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex gap-2">
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Role" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Semua Role</SelectItem><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Semua Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent>
                                </Select>
                                <Select value={pageSize.toString()} onValueChange={val => setPageSize(parseInt(val))}>
                                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="10">10 / Page</SelectItem><SelectItem value="20">20 / Page</SelectItem><SelectItem value="50">50 / Page</SelectItem><SelectItem value="100">100 / Page</SelectItem></SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
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
                                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Tiada pengguna dijumpai.</TableCell></TableRow>
                                        ) : users.map(user => (
                                            <TableRow key={user.id} className="hover:bg-gray-50/50">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900">{user.full_name || user.email?.split('@')[0] || "Tanpa Nama"}</span>
                                                        <span className="text-xs text-gray-500">{user.email}</span>
                                                        <span className="text-[10px] text-gray-400 mt-1">Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {user.whatsapp ? <span className="font-mono text-sm text-gray-700 bg-green-50 px-2 py-1 rounded border border-green-100">{user.whatsapp}</span> : <span className="text-gray-400 text-xs italic">Belum set</span>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Badge variant={user.role === 'admin' ? "default" : "secondary"} className="h-6">{user.role}</Badge>
                                                        <Badge variant={user.status === 'active' ? "outline" : "destructive"} className={user.status === 'active' ? "text-green-600 border-green-200 bg-green-50" : ""}>{user.status}</Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-700">{user.subscription_tier === 'free' ? 'Free Tier' : user.subscription_tier}</Badge>
                                                        {user.subscription_end_date && user.subscription_tier !== 'free' && (
                                                            <span className={`text-[10px] ${new Date(user.subscription_end_date) < new Date() ? 'text-red-500 font-bold' : 'text-gray-500'}`}>Exp: {new Date(user.subscription_end_date).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {user.latest_attempt ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-medium text-gray-900">{user.latest_attempt.quizzes?.title || "Ujian Tanpa Tajuk"}</span>
                                                            <span className="text-[10px] text-gray-500">{new Date(user.latest_attempt.created_at).toLocaleDateString()} • {new Date(user.latest_attempt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    ) : <span className="text-gray-400 text-xs">-</span>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => handleExtend(user.id)} className="h-8 w-8 p-0 text-gray-500 hover:text-green-600 hover:bg-green-50" title="Extend Sub"><span className="font-bold text-lg leading-none">+</span></Button>
                                                        <Button variant="ghost" size="sm" onClick={() => toggleRole(user.id, user.role)} className="h-8 w-8 p-0 text-gray-500 hover:text-purple-600" title="Toggle Role"><Shield className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(user.id, user.status)} className={`h-8 w-8 p-0 ${user.status === 'active' ? 'text-gray-500 hover:text-red-600' : 'text-red-600 bg-red-50'}`} title="Toggle Status"><Ban className="h-4 w-4" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {!loading && users.length > 0 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-gray-500">Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalUsers)} of {totalUsers} users</div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                                    <div className="text-sm font-medium">Page {page} of {totalPages}</div>
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
