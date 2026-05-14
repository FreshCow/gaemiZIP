export interface BoardPost {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  likeCount: number;
  stockCode?: string;
  stockName?: string;
}

export interface BoardCreateDto {
  title: string;
  content: string;
  author: string;
}

export interface Comment {
  id: number;
  boardId: number;
  parentCommentId: number | null;
  author: string;
  content: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
}

export interface CommentCreateDto {
  author: string;
  content: string;
  parentCommentId?: number | null;
}
