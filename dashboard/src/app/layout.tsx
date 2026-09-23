import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KATANA // Monitor Tongkat Pintar Tunanetra",
  description: "Dashboard telemetri real-time untuk alat bantu navigasi kruk pintar KATANA.",
  icons: {
    icon: "/katana-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen transition-colors duration-200`}>
        {children}
      </body>
    </html>
  );
}
