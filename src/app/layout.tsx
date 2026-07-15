import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistem Rekod Aktiviti Pelajar — ADTEC KT",
  description: "Sistem Rekod Aktiviti Pelajar ADTEC Kota Tinggi — Jabatan Tenaga Manusia (JTM), Malaysia.",
  keywords: ["ADTEC KT", "JTM", "Jabatan Tenaga Manusia", "Sistem Rekod Aktiviti", "Pelajar"],
  authors: [{ name: "Jabatan Tenaga Manusia" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
