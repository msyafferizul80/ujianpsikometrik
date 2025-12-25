import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PageTransition } from "@/components/PageTransition";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ujian Psikometrik Online",
  description: "Sistem Latihan dan Simulasi Ujian",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body className={inter.className}>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
