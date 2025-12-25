"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl border-blue-100">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">UP</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-900">Ujian Psikometrik Online</CardTitle>
          <CardDescription>
            Penolong Pegawai Belia Dan Sukan Gred S5
            <br />
            <Badge variant="outline" className="mt-2 border-blue-200 text-blue-700 bg-blue-50">Sistem Simulasi</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600 mb-6">
            <p>100 Soalan • Masa Dicadangkan: 60 Minit</p>
            <p className="mt-2">Nilai kompetensi anda dalam aspek:</p>
            <div className="flex justify-center gap-2 mt-2">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Kerjasama</Badge>
              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">Emosi</Badge>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Komunikasi</Badge>
            </div>
          </div>

          <div className="space-y-3">
            {/* Simple login bypass for this demo */}
            <Link href="/dashboard" className="w-full">
              <Button className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all">
                Mula Sesi
              </Button>
            </Link>
            <div className="text-xs text-center text-gray-400 mt-4">
              Sistem ini adalah simulasi untuk tujuan persediaan.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
