import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import { ClienteProvider } from "@/context/ClienteContext";

import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ID Performance - Automação de Marketing",
  description: "Plataforma de automação de marketing da ID Performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn("dark", inter.variable)}>
      <body className="font-sans antialiased bg-background text-foreground h-screen flex overflow-hidden">
        <NextTopLoader color="#22c55e" showSpinner={false} />
        <ClienteProvider>
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-muted/20">
              {children}
            </main>
          </div>
          <Toaster />
        </ClienteProvider>
      </body>
    </html>
  );
}
