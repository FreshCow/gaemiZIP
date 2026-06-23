export interface BoardPost {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  likeCount: number;
  stockCode?: string;
  stockName?: string;
  // 서버 boolean 게터 isBlinded() → Jackson이 "blinded"로 직렬화
  blinded: boolean;
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
  blinded: boolean;
}

export interface CommentCreateDto {
  author: string;
  content: string;
  parentCommentId?: number | null;
}
