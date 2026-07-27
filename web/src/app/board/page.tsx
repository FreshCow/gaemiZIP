"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { boardApi } from "@/services/boardApi";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Plus, X, ThumbsUp, MessageCircle } from "lucide-react";

export default function BoardPage() {
  const router = useRouter();
  const { boards, setBoards } = useAppStore();
  const { nickname, isLoggedIn } = useAuthStore();
  const [error, setError] = useState("");

  useEffect(() => {
    boardApi.getList().then(setBoards);
  }, [setBoards]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setError("");
    try {
      await boardApi.remove(id);
      setBoards(boards.filter((b) => b.id !== id));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: string } })?.response?.data ??
        "게시글 삭제 중 오류가 발생했습니다.";
      setError(typeof msg === "string" ? msg : "게시글 삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="mx-auto p-6 space-y-6 max-w-[80%]">
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

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-neutral-800 dark:border-neutral-800">
        {boards.map((post) => (
          <motion.div
            key={post.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => router.push(`/board/${post.id}`)}
            className="flex cursor-pointer items-center gap-3 px-2 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900"
          >
            <h3 className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-white">
              {post.title}
            </h3>
            <p className="shrink-0 text-gray-400 dark:text-neutral-600">
              {post.author} · {formatDateTime(post.createdAt)}
            </p>
            <div className="flex shrink-0 items-center gap-3 text-gray-400 dark:text-neutral-600">
              <span className="flex items-center gap-1">
                <ThumbsUp size={11} />
                {post.likeCount ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={11} />
                {post.commentCount ?? 0}
              </span>
            </div>
            {post.author === nickname && (
              <button
                onClick={(e) => handleDelete(e, post.id)}
                className="shrink-0 text-gray-300 transition-colors hover:text-rose-500 dark:text-neutral-700 dark:hover:text-rose-400"
              >
                <X size={16} />
              </button>
            )}
          </motion.div>
        ))}
        {boards.length === 0 && (
          <p className="text-center py-12 text-sm text-gray-400 dark:text-neutral-600">게시글이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
