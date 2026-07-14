"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { boardApi } from "@/services/boardApi";
import { Button } from "@/components/ui/button";
import { Plus, X, ThumbsUp, MessageCircle } from "lucide-react";

export default function BoardPage() {
  const router = useRouter();
  const { boards, setBoards } = useAppStore();
  const nickname = useAuthStore((s) => s.nickname);

  useEffect(() => {
    boardApi.getList().then(setBoards);
  }, [setBoards]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await boardApi.remove(id);
    setBoards(boards.filter((b) => b.id !== id));
  };

  return (
    <div className="p-6 space-y-6 max-w-[80%]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">게시판</h1>
        <Button
          size="sm"
          onClick={() => router.push("/board/write")}
          className="gap-1.5"
        >
          <Plus size={14} />
          글쓰기
        </Button>
      </div>

      <div className="space-y-3">
        {boards.map((post) => (
          <motion.div
            key={post.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => router.push(`/board/${post.id}`)}
            className="rounded-2xl border border-gray-200 bg-gray-50 p-5 cursor-pointer transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">{post.title}</h3>
              </div>
              {post.author === nickname && (
                <button
                  onClick={(e) => handleDelete(e, post.id)}
                  className="text-gray-300 transition-colors hover:text-rose-500 ml-4 shrink-0 dark:text-neutral-700 dark:hover:text-rose-400"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400 dark:text-neutral-600">
                {post.author} · {post.createdAt}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-neutral-600">
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
    </div>
  );
}
