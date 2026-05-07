"use client";

import { useWebSocket } from "@/hooks/useWebSocket";

// 앱 최상단에서 WebSocket 연결을 유지하는 클라이언트 컴포넌트
// layout.tsx가 서버 컴포넌트이므로 훅 사용을 위해 별도 분리
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useWebSocket();
  return <>{children}</>;
}
