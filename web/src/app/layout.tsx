import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { WebSocketProvider } from "@/components/layout/WebSocketProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthStoreInitializer } from "@/components/layout/AuthStoreInitializer";
import { GoogleAuthProvider } from "@/components/layout/GoogleAuthProvider";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "gaemiZIP - 주식정보 플랫폼",
  description: "주식정보 확인 및 게시판 기능을 제공하는 플랫폼입니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex h-full">
        <ThemeProvider>
          <GoogleAuthProvider>
            <TooltipProvider>
              <AuthStoreInitializer />
              <WebSocketProvider>
                <Sidebar />
                <main className="flex-1 overflow-y-auto">{children}</main>
              </WebSocketProvider>
            </TooltipProvider>
          </GoogleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
