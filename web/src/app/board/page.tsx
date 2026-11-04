"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { boardApi } from "@/services/boardApi";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime } from "@/lib/utils";
import { Plus, ThumbsUp, MessageCircle, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import {
  BOARD_TAG_ACTIVE_CLASSES,
  BOARD_TAG_BADGE_CLASSES,
  BOARD_TAG_LABELS,
  BOARD_TAG_TEXT_CLASSES,
  FILTERABLE_TAGS,
  type BoardListItem,
  type BoardTag,
} from "@/types/board";

const PAGE_SIZE = 20;

export default function BoardPage() {
  const router = useRouter();
  const { boards, setBoards } = useAppStore();
  const { isLoggedIn } = useAuthStore();
  const [activeTag, setActiveTag] = useState<BoardTag | null>(null);
  const [popularBoards, setPopularBoards] = useState<BoardListItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    boardApi.getPopular().then(setPopularBoards).catch(() => {});
  }, []);

  // 현재 페이지 목록은 store에 보관(글쓰기 직후 반영용)
  useEffect(() => {
    boardApi.getList(activeTag ?? undefined, page, PAGE_SIZE).then((res) => {
      setBoards(res.items);
      setTotalPages(res.totalPages);
    });
  }, [activeTag, page, setBoards]);

  const selectTag = (tag: BoardTag | null) => {
    setPage(0);
    setActiveTag(tag);
  };

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    el?.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el?.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [popularBoards, updateScrollState]);

  const scrollBy = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 420 : -420, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-full space-y-6 p-4 sm:max-w-[80%] sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">게시판</h1>
        {isLoggedIn ? (
          <Button
            size="sm"
            onClick={() => router.push("/board/write")}
            className="gap-1.5"
          >
            <Plus size={14} />
            글쓰기
          </Button>
        ) : (
          <Button size="sm" onClick={() => router.push("/login")} className="gap-1.5">
            로그인 후 글쓰기
          </Button>
        )}
      </div>

      {/* 인기글 */}
      {popularBoards.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={15} className="fill-orange-400 text-orange-400" />
            <h2 className="text-sm font-medium text-gray-700 dark:text-neutral-300">인기글</h2>
          </div>

          <div className="relative overflow-hidden">
            {canScrollLeft && (
              <>
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-white dark:from-neutral-900 to-transparent" />
                <button
                  onClick={() => scrollBy("left")}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <ChevronLeft size={14} className="text-gray-600 dark:text-neutral-300" />
                </button>
              </>
            )}

            {canScrollRight && (
              <>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent" />
                <button
                  onClick={() => scrollBy("right")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <ChevronRight size={14} className="text-gray-600 dark:text-neutral-300" />
                </button>
              </>
            )}

            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5"
            >
              {popularBoards.map((post) => (
                <div
                  key={post.id}
                  onClick={() => router.push(`/board/${post.id}`)}
                  className="flex-shrink-0 w-96 h-40 cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-lg dark:hover:border-neutral-700"
                >
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BOARD_TAG_BADGE_CLASSES[post.tag]}`}>
                      {BOARD_TAG_LABELS[post.tag]}
                    </span>
                    <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 dark:text-white">
                      {post.title}
                    </h3>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-neutral-400">
                    {post.author} · {formatDateTime(post.createdAt)}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-gray-400 dark:text-neutral-600">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={12} />
                      {post.likeCount ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} />
                      {post.commentCount ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 태그 필터 */}
      <div className="flex items-center gap-1.5 text-sm">
        <button
          onClick={() => selectTag(null)}
          className={`rounded-full px-3 py-1 transition-colors ${
            activeTag === null
              ? "bg-gray-900 text-white dark:bg-white dark:text-black"
              : "text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          }`}
        >
          전체
        </button>
        {FILTERABLE_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => selectTag(tag)}
            className={`rounded-full px-3 py-1 transition-colors ${
              activeTag === tag ? BOARD_TAG_ACTIVE_CLASSES[tag] : BOARD_TAG_BADGE_CLASSES[tag]
            }`}
          >
            {BOARD_TAG_LABELS[tag]}
          </button>
        ))}
      </div>

      <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-neutral-800 dark:border-neutral-800">
        {boards.map((post) => (
          <motion.div
            key={post.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => router.push(`/board/${post.id}`)}
            className={`flex cursor-pointer flex-col gap-1 px-2 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900 sm:flex-row sm:items-center sm:gap-3 ${
              post.tag === "NOTICE" ? "bg-amber-50/60 dark:bg-amber-900/10" : ""
            }`}
          >
            <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
              <span className={BOARD_TAG_TEXT_CLASSES[post.tag]}>({BOARD_TAG_LABELS[post.tag]})</span>{" "}
              {post.title}
            </h3>
            <div className="flex shrink-0 items-center justify-between gap-3 text-xs text-gray-400 dark:text-neutral-600 sm:contents">
              <p className="truncate">
                {post.author} · {formatDateTime(post.createdAt)}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <span className="flex items-center gap-1">
                  <ThumbsUp size={11} />
                  {post.likeCount ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={11} />
                  {post.commentCount ?? 0}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
        {boards.length === 0 && (
          <p className="text-center py-12 text-sm text-gray-400 dark:text-neutral-600">게시글이 없습니다.</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

    </div>
  );
}
