import api from "./api";
import type { BoardPost, BoardCreateDto } from "@/types/board";

export const boardApi = {
  getList: () => api.get<BoardPost[]>("/boards").then((r) => r.data),

  create: (dto: BoardCreateDto) =>
    api.post<BoardPost>("/boards", dto).then((r) => r.data),

  remove: (id: number, password: string) =>
    api.delete(`/boards/${id}`, { params: { password } }).then((r) => r.data),
};
