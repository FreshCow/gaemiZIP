// 예약 체결 등 이벤트 발생 시 서버가 생성하는 알림
export interface NotificationItem {
  id: number;
  stockCode: string;
  message: string;
  read: boolean;
  createdAt: string;
}
