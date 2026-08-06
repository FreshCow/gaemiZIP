"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { boardApi } from "@/services/boardApi";
import BoardForm, { type BoardFormValues } from "@/components/board/BoardForm";
import { ArrowLeft } from "lucide-react";
import type { BoardPost } from "@/types/board";

export default function BoardEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const nickname = useAuthStore((s) => s.nickname);

  const [post, setPost] = useState<BoardPost | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    boardApi
      .getById(id)
      .then(setPost)
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    // 작성자 본인이 아니면 상세 페이지로 되돌림 (최종 권한 검증은 서버가 수행)
    if (post && post.author !== nickname) {
      router.replace(`/board/${id}`);
    }
  }, [post, nickname, id, router]);

  const handleSubmit = async ({ title, content, tag, sharedStocks }: BoardFormValues) => {
    await boardApi.update(id, { title, content, tag, sharedStocks });
    router.push(`/board/${id}`);
  };

  if (notFound) {
    return (
      <div className="p-6 flex items-center justify-center h-40">
        <p className="text-sm text-gray-400 dark:text-neutral-600">게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  if (!post || post.author !== nickname) {
    return (
      <div className="p-6 flex items-center justify-center h-40">
        <p className="text-sm text-gray-400 dark:text-neutral-600">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full space-y-5 p-4 sm:max-w-[80%] sm:p-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/board/${id}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-neutral-500 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          게시글
        </button>
        <span className="text-gray-300 dark:text-neutral-700">/</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">글 수정</h1>
      </div>

      <BoardForm
        initialTitle={post.title}
        initialContent={post.content}
        initialTag={post.tag}
        initialStockCodes={post.sharedStocks.map((s) => s.stockCode)}
        submitLabel="수정 완료"
        submittingLabel="수정 중..."
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/board/${id}`)}
      />
    </div>
  );
}
