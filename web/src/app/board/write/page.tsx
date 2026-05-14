"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { boardApi } from "@/services/boardApi";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function BoardWritePage() {
  const router = useRouter();
  const { boards, setBoards } = useAppStore();
  const nickname = useAuthStore((s) => s.nickname);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const created = await boardApi.create({ title, content, author: nickname ?? "익명" });
      setBoards([created, ...boards]);
      router.push("/board");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-5">
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

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-neutral-800">
          <span className="text-xs text-gray-400 dark:text-neutral-500">작성자</span>
          <span className="text-sm font-medium text-gray-700 dark:text-neutral-300">{nickname ?? "익명"}</span>
        </div>

        <input
          className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 min-h-52 resize-none dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
          placeholder="내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => router.push("/board")}>
            취소
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
          >
            {submitting ? "등록 중..." : "등록"}
          </Button>
        </div>
      </div>
    </div>
  );
}
