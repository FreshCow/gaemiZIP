import api from "./api";
import type { BoardPost, BoardListItem, BoardCreateDto, Comment, CommentCreateDto } from "@/types/board";

export const boardApi = {
  getList: () => api.get<BoardListItem[]>("/boards").then((r) => r.data),

  getById: (id: number) => api.get<BoardPost>(`/boards/${id}`).then((r) => r.data),

  create: (dto: BoardCreateDto) =>
    api.post<BoardPost>("/boards", dto).then((r) => r.data),

  like: (id: number) => api.post<BoardPost>(`/boards/${id}/like`).then((r) => r.data),

  remove: (id: number) => api.delete(`/boards/${id}`).then((r) => r.data),

  getComments: (boardId: number) =>
    api.get<Comment[]>(`/boards/${boardId}/comments`).then((r) => r.data),

  createComment: (boardId: number, dto: CommentCreateDto) =>
    api.post<Comment>(`/boards/${boardId}/comments`, dto).then((r) => r.data),

  likeComment: (commentId: number) =>
    api.post<Comment>(`/comments/${commentId}/like`).then((r) => r.data),
};
