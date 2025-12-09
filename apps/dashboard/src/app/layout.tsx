import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { ConfigProvider } from "@/lib/config-context";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Vela Dashboard",
};

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-b-2 border-gray-900 rounded-full animate-spin" />
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigProvider>
          <Suspense fallback={<Loading />}>{children}</Suspense>
          <Toaster position="top-right" richColors />
        </ConfigProvider>
      </body>
    </html>
  );
}
