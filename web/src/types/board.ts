export const BOARD_TAGS = ["DAILY", "QUESTION", "SHARE", "STOCK", "NOTICE"] as const;
export type BoardTag = (typeof BOARD_TAGS)[number];

export const BOARD_TAG_LABELS: Record<BoardTag, string> = {
  DAILY: "일상",
  QUESTION: "질문",
  SHARE: "공유",
  STOCK: "주식",
  NOTICE: "공지사항",
};

// 필터바 노출 태그 — 공지사항은 항상 최상단 고정이라 필터 대상에서 제외
export const FILTERABLE_TAGS: BoardTag[] = ["DAILY", "QUESTION", "SHARE", "STOCK"];

// 태그별 고유 색상 — 옅은 배지/텍스트용
export const BOARD_TAG_BADGE_CLASSES: Record<BoardTag, string> = {
  DAILY: "bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400",
  QUESTION: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  SHARE: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  STOCK: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  NOTICE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

// 태그별 고유 색상 — 진한 배경(필터/선택 활성 상태)용
export const BOARD_TAG_ACTIVE_CLASSES: Record<BoardTag, string> = {
  DAILY: "bg-gray-700 text-white dark:bg-neutral-200 dark:text-black",
  QUESTION: "bg-blue-600 text-white",
  SHARE: "bg-purple-600 text-white",
  STOCK: "bg-emerald-600 text-white",
  NOTICE: "bg-amber-600 text-white",
};

// 태그별 고유 색상 — 텍스트 전용(목록 제목 앞 "(태그)")
export const BOARD_TAG_TEXT_CLASSES: Record<BoardTag, string> = {
  DAILY: "text-gray-400 dark:text-neutral-500",
  QUESTION: "text-blue-500 dark:text-blue-400",
  SHARE: "text-purple-500 dark:text-purple-400",
  STOCK: "text-emerald-500 dark:text-emerald-400",
  NOTICE: "text-amber-600 dark:text-amber-400",
};

export interface BoardStockShare {
  stockCode: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
  priceAtShare: number;
  profitLossAmount: number;
  profitLossRate: number;
}

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
  tag: BoardTag;
  sharedStocks: BoardStockShare[];
}

// 목록 조회(GET /boards) 응답 — content 없이 commentCount 포함
export interface BoardListItem {
  id: number;
  title: string;
  author: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  stockCode?: string;
  stockName?: string;
  blinded: boolean;
  tag: BoardTag;
}

export interface BoardListPage {
  items: BoardListItem[];
  page: number; // 0-based
  size: number;
  totalPages: number;
  totalElements: number;
}

export interface BoardCreateDto {
  title: string;
  content: string;
  tag: BoardTag;
  sharedStocks?: BoardStockShare[];
}

export interface Comment {
  id: number;
  boardId: number;
  parentCommentId: number | null;
  author: string;
  content: string;
  createdAt: string;
  likeCount: number;
  blinded: boolean;
}

export interface CommentCreateDto {
  author: string;
  content: string;
  parentCommentId?: number | null;
}
