"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { boardApi } from "@/services/boardApi";
import BoardForm, { type BoardFormValues } from "@/components/board/BoardForm";
import { ArrowLeft } from "lucide-react";

export default function BoardWritePage() {
  const router = useRouter();
  const { boards, setBoards } = useAppStore();

  const handleSubmit = async ({ title, content, tag, sharedStocks }: BoardFormValues) => {
    const created = await boardApi.create({ title, content, tag, sharedStocks });
    setBoards([
      {
        id: created.id,
        title: created.title,
        author: created.author,
        createdAt: created.createdAt,
        likeCount: created.likeCount,
        commentCount: 0,
        stockCode: created.stockCode,
        stockName: created.stockName,
        blinded: created.blinded,
        tag: created.tag,
      },
      ...boards,
    ]);
    router.push("/board");
  };

  return (
    <div className="mx-auto max-w-full space-y-5 p-4 sm:max-w-[80%] sm:p-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/board")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-neutral-500 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          게시판
        </button>
        <span className="text-gray-300 dark:text-neutral-700">/</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">글쓰기</h1>
      </div>

      <BoardForm
        submitLabel="등록"
        submittingLabel="등록 중..."
        onSubmit={handleSubmit}
        onCancel={() => router.push("/board")}
      />
    </div>
  );
}
