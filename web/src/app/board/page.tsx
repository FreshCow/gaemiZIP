"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { boardApi } from "@/services/boardApi";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { BoardCreateDto } from "@/types/board";

export default function BoardPage() {
  const { boards, setBoards } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BoardCreateDto>({ title: "", content: "", author: "", password: "" });

  const handleCreate = async () => {
    const created = await boardApi.create(form);
    setBoards([created, ...boards]);
    setShowForm(false);
    setForm({ title: "", content: "", author: "", password: "" });
  };

  const handleDelete = async (id: number) => {
    const pw = prompt("비밀번호를 입력하세요");
    if (!pw) return;
    await boardApi.remove(id, pw);
    setBoards(boards.filter((b) => b.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">게시판</h1>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "취소" : "글쓰기"}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-3 dark:border-neutral-800 dark:bg-neutral-900">
              <input
                className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                placeholder="제목"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 min-h-24 resize-none dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                placeholder="내용"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                  placeholder="작성자 (익명)"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
                <input
                  type="password"
                  className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                  placeholder="비밀번호"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <Button size="sm" onClick={handleCreate}>등록</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {boards.map((post) => (
          <motion.div
            key={post.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{post.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2 dark:text-neutral-400">{post.content}</p>
              </div>
              <button
                onClick={() => handleDelete(post.id)}
                className="text-gray-300 transition-colors hover:text-rose-500 ml-4 shrink-0 dark:text-neutral-700 dark:hover:text-rose-400"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3 dark:text-neutral-600">
              {post.author} · {post.createdAt}
            </p>
          </motion.div>
        ))}
        {boards.length === 0 && (
          <p className="text-center py-12 text-sm text-gray-400 dark:text-neutral-600">게시글이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
