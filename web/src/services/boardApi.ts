import api from "./api";
import type { BoardPost, BoardListItem, BoardCreateDto, BoardTag, Comment, CommentCreateDto } from "@/types/board";

export const boardApi = {
  getList: (tag?: BoardTag) =>
    api.get<BoardListItem[]>("/boards", { params: tag ? { tag } : undefined }).then((r) => r.data),

  getPopular: (days = 7, limit = 5) =>
    api.get<BoardListItem[]>("/boards/popular", { params: { days, limit } }).then((r) => r.data),

  getById: (id: number) => api.get<BoardPost>(`/boards/${id}`).then((r) => r.data),

  create: (dto: BoardCreateDto) =>
    api.post<BoardPost>("/boards", dto).then((r) => r.data),

  update: (id: number, dto: BoardCreateDto) =>
    api.put<BoardPost>(`/boards/${id}`, dto).then((r) => r.data),

  // 서버가 raw Board 엔티티를 반환 — tag/sharedStocks는 안 옴, likeCount만 신뢰
  like: (id: number) => api.post<{ likeCount: number }>(`/boards/${id}/like`).then((r) => r.data),

  remove: (id: number) => api.delete(`/boards/${id}`).then((r) => r.data),

  getComments: (boardId: number) =>
    api.get<Comment[]>(`/boards/${boardId}/comments`).then((r) => r.data),

  createComment: (boardId: number, dto: CommentCreateDto) =>
    api.post<Comment>(`/boards/${boardId}/comments`, dto).then((r) => r.data),

  likeComment: (commentId: number) =>
    api.post<Comment>(`/comments/${commentId}/like`).then((r) => r.data),
};
