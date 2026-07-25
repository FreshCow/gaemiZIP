import api from "./api";
import type { NotificationItem } from "@/types/notification";
import type { PageResponse } from "@/types/common";

export const notificationApi = {
  getList: (page = 0, size = 10) =>
    api.get<PageResponse<NotificationItem>>("/notifications", { params: { page, size } }).then((r) => r.data),

  getUnreadCount: () =>
    api.get<{ count: number }>("/notifications/unread-count").then((r) => r.data.count),

  markAsRead: (id: number) => api.patch<void>(`/notifications/${id}/read`),

  markAllAsRead: () => api.patch<void>("/notifications/read-all"),
};
