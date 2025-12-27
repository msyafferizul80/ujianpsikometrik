"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Brain,
  Target,
  Clock,
  Trophy,
  Users,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ChevronDown
} from "lucide-react";
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100/50 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700">
                Psikometrik Online
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                Log Masuk
              </Link>
              <Link href="/login">
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all rounded-full px-6">
                  Mula Sekarang
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Badge variant="secondary" className="mb-8 px-4 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 border-indigo-100 rounded-full animate-fade-in shadow-sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline-block text-amber-500" />
            Dikemaskini untuk Format 2025
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight animate-slide-up">
            Lulus Ujian Psikometrik dengan <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">
              Analisis AI & Keyakinan Penuh
            </span>
          </h1>
          <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Platform persediaan nombor #1 dengan 500+ soalan berkualiti tinggi dan laporan analisis personaliti dikuasakan AI untuk kejayaan kerjaya awam anda.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all rounded-full">
                Mula Simulasi Percuma <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg border-2 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-full bg-white/50 backdrop-blur-sm">
                Lihat Ciri-Ciri
              </Button>
            </Link>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-sm font-medium text-slate-500 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm border border-slate-100">
              <Users className="h-5 w-5 text-indigo-500" />
              <span>10,000+ Calon</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm border border-slate-100">
              <Clock className="h-5 w-5 text-amber-500" />
              <span>Masa Nyata SKOR</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm border border-slate-100">
              <Target className="h-5 w-5 text-emerald-500" />
              <span>Format Terkini SPA</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Glass Effect */}
      <section className="py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl p-8 shadow-2xl shadow-indigo-100/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100/0 md:divide-slate-200">
              {[
                { label: "Calon Berjaya", value: "85%", icon: Trophy, color: "text-amber-500", bg: "bg-amber-100" },
                { label: "Soalan Bank", value: "500+", icon: Target, color: "text-rose-500", bg: "bg-rose-100" },
                { label: "Analisis AI", value: "24/7", icon: Brain, color: "text-violet-500", bg: "bg-violet-100" },
                { label: "Pengguna Aktif", value: "12k+", icon: Users, color: "text-sky-500", bg: "bg-sky-100" },
              ].map((stat, i) => (
                <div key={i} className="space-y-3 p-2">
                  <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} mb-3 group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-6 font-display">Kenapa Calon Pilih Kami?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Kami bukan sekadar bank soalan. Kami adalah jurulatih digital anda untuk memastikan anda bersedia sepenuhnya.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Brain className="h-6 w-6 text-white" />}
              title="Laporan Analisis AI"
              description="Dapatkan 'feedback' mendalam tentang personaliti anda. AI kami akan memberitahu kekuatan dan kelemahan anda berdasarkan jawapan anda."
              color="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <FeatureCard
              icon={<Target className="h-6 w-6 text-white" />}
              title="Simulasi Peperiksaan Sebenar"
              description="Rasa tekanan sebenar dengan pemasa undur dan format soalan yang menepati standard SPA terkini."
              color="bg-gradient-to-br from-rose-500 to-pink-600"
            />
            <FeatureCard
              icon={<CheckCircle2 className="h-6 w-6 text-white" />}
              title="Pemarkahan Automatik"
              description="Tidak perlu menyemak manual. Lihat markah anda serta-merta dan fahami di mana anda berdiri."
              color="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <FeatureCard
              icon={<Smartphone className="h-6 w-6 text-white" />}
              title="Akses Di Mana Sahaja"
              description="Buat latihan di telefon pintar, tablet atau laptop. Sistem kami responsif sepenuhnya."
              color="bg-gradient-to-br from-blue-500 to-cyan-600"
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6 text-white" />}
              title="Bank Soalan Premium"
              description="Soalan yang sentiasa dikemaskini mingguan untuk memastikan anda tidak ketinggalan dengan trend terbaru."
              color="bg-gradient-to-br from-amber-500 to-orange-600"
            />
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6 text-white" />}
              title="Tips & Strategi Menjawab"
              description="Bukan sekadar soalan, kami sediakan panduan bagaimana memilih jawapan yang 'dikehendaki' oleh ketua jabatan."
              color="bg-gradient-to-br from-indigo-500 to-blue-600"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-4 border-indigo-200 text-indigo-600 bg-indigo-50">Testimoni</Badge>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Kisah Kejayaan</h2>
            <p className="text-slate-600 text-lg">Mereka dah berjaya. Anda bila lagi?</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Ahmad Zaki",
                role: "Pegawai Tadbir N41",
                content: "Soalan dalam sistem ni memang mencabar minda. Bila masuk exam sebenar, saya rasa lebih tenang sebab dah biasa dengan format macam ni. Analisis AI tu sangat membantu!",
                initial: "AZ",
                color: "bg-blue-100 text-blue-700"
              },
              {
                name: "Sarah Lim",
                role: "Penolong Pegawai Kastam",
                content: "Saya gagal 2 kali sebelum ni. Lepas guna Psikometrik Online dan faham apa yang panel nak cari melalui 'AI Report', alhamdulillah kali ketiga lulus!",
                initial: "SL",
                color: "bg-pink-100 text-pink-700"
              },
              {
                name: "Mohd Hafiz",
                role: "Penolong Pegawai Belia S29",
                content: "Sangat recommended! Interface cantik, laju, dan paling penting soalan dia berkualiti. Berbaloi dengan harga langganan.",
                initial: "MH",
                color: "bg-emerald-100 text-emerald-700"
              }
            ].map((t, i) => (
              <Card key={i} className="border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-300 group hover:-translate-y-1">
                <CardContent className="pt-8 px-8">
                  <div className="flex items-center gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(star => (
                      <svg key={star} className="w-5 h-5 text-amber-400 fill-current drop-shadow-sm" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-slate-600 mb-8 italic leading-relaxed">"{t.content}"</p>
                  <div className="flex items-center gap-4 pt-6 border-t border-slate-50">
                    <div className={`h-12 w-12 rounded-full ${t.color} flex items-center justify-center font-bold text-lg ring-4 ring-white shadow-sm`}>
                      {t.initial}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{t.name}</div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Soalan Lazim</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Adakah soalan ini soalan bocor?", a: "Tidak. Kami tidak menyediakan soalan bocor. Kami menyediakan soalan simulasi yang dibina berdasarkan format dan standard SPA untuk melatih minda anda." },
              { q: "Berapa lama akses akaun?", a: "Akses bergantung pada pelan yang anda pilih. Untuk demo percuma, anda boleh cuba serta-merta tanpa had masa." },
              { q: "Boleh saya akses guna telefon?", a: "Ya, sistem kami mesra mudah alih sepenuhnya. Anda boleh berlatih di mana-mana sahaja menggunakan telefon pintar atau tablet." }
            ].map((faq, i) => (
              <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="cursor-pointer">
                  <CardTitle className="text-lg font-semibold text-slate-900 flex justify-between items-center">
                    {faq.q}
                    <ChevronDown className="h-5 w-5 text-indigo-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mixed-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 bg-indigo-500/30 w-96 h-96 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 bg-purple-500/30 w-96 h-96 rounded-full blur-3xl"></div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">Bersedia Untuk Menjadi Penjawat Awam?</h2>
          <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto leading-relaxed">Jangan biarkan peluang ini terlepas. Mulakan persediaan anda hari ini dengan sistem yang terbukti berkesan.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-16 px-10 text-lg bg-white text-indigo-900 hover:bg-indigo-50 font-bold border-none shadow-2xl hover:scale-105 transition-all rounded-full">
                Daftar Akaun Percuma (Login)
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-sm text-indigo-300/80">Tiada kad kredit diperlukan untuk pendaftaran asas.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-indigo-600 p-2 rounded-xl">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">Psikometrik Online</span>
              </div>
              <p className="text-slate-500 max-w-sm leading-relaxed">
                Membantu calon peperiksaan kerajaan lulus dengan cemerlang melalui teknologi, data, dan persediaan yang sistematik.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Pautan</h4>
              <ul className="space-y-4 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-indigo-600 transition-colors">Tentang Kami</Link></li>
                <li><Link href="#" className="hover:text-indigo-600 transition-colors">Terma & Syarat</Link></li>
                <li><Link href="#" className="hover:text-indigo-600 transition-colors">Privasi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Hubungi</h4>
              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <div className="bg-green-100 p-2 rounded-full">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-600" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 font-medium">Hubungi melalui WhatsApp</span>
                    <span className="font-semibold text-slate-900">+6012 3011082</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 text-center text-sm text-slate-400">
            © 2025 Psikometrik Online. Hak Cipta Terpelihara.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Updated Feature Card to support Gradients
function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) {
  return (
    <Card className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 h-full group hover:-translate-y-2 bg-white">
      <CardHeader>
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
