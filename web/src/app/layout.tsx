import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { WebSocketProvider } from "@/components/layout/WebSocketProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthStoreInitializer } from "@/components/layout/AuthStoreInitializer";
import { GoogleAuthProvider } from "@/components/layout/GoogleAuthProvider";
import { LogoDevAttribution } from "@/components/layout/LogoDevAttribution";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "gaemiZIP - 주식정보 플랫폼",
  description: "주식정보 확인 및 게시판 기능을 제공하는 플랫폼입니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex flex-col h-full">
        {/* Google GSI 스크립트를 next/script로 선제 로드 — @react-oauth/google 라이브러리가
            JSX 내부에서 <script> 태그를 직접 렌더링하면 React가 경고를 발생시키므로
            여기서 먼저 로드해 라이브러리가 재주입하지 않도록 함.
            beforeInteractive는 이 스크립트 로딩이 끝날 때까지 페이지 전체를 막아서,
            외부 인터넷이 느리거나 안 되는 네트워크(LAN 전용 등)에서 화면이 무한 로딩되는
            문제가 있어 afterInteractive로 변경 */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <ThemeProvider>
          <GoogleAuthProvider>
            <TooltipProvider>
              <AuthStoreInitializer />
              <WebSocketProvider>
                <Sidebar />
                <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
                  <div className="min-h-full grid grid-cols-1 lg:grid-cols-[14vw_1fr_14vw]">
                    <aside className="hidden lg:block" />
                    <div className="min-w-0">{children}</div>
                    <aside className="hidden lg:block" />
                  </div>
                </main>
                <MobileBottomNav />
                <LogoDevAttribution />
              </WebSocketProvider>
            </TooltipProvider>
          </GoogleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
