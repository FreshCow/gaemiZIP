"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { adminApi } from "@/services/adminApi";
import type { BoardPost, Comment } from "@/types/board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function getErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error ?? fallback;
}

function BlindBadge({ blinded }: { blinded: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        blinded
          ? "border-rose-700 text-rose-500 dark:text-rose-400"
          : "border-emerald-700 text-emerald-500 dark:text-emerald-400"
      }
    >
      {blinded ? "블라인드" : "노출중"}
    </Badge>
  );
}

export default function AdminContentPage() {
  const [boards, setBoards] = useState<BoardPost[]>([]);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [commentsByBoard, setCommentsByBoard] = useState<Record<number, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    adminApi.getBoards().then(setBoards).catch((e) => setError(getErrorMessage(e, "게시글을 불러오지 못했습니다.")));
  }, []);

  const handleToggleBlindBoard = async (board: BoardPost) => {
    try {
      await adminApi.blindBoard(board.id);
      setBoards((prev) => prev.map((b) => (b.id === board.id ? { ...b, blinded: !b.blinded } : b)));
    } catch (e) {
      setError(getErrorMessage(e, "블라인드 처리에 실패했습니다."));
    }
  };

  const handleToggleBlindComment = async (boardId: number, comment: Comment) => {
    try {
      await adminApi.blindComment(comment.id);
      setCommentsByBoard((prev) => ({
        ...prev,
        [boardId]: prev[boardId].map((c) => (c.id === comment.id ? { ...c, blinded: !c.blinded } : c)),
      }));
    } catch (e) {
      setError(getErrorMessage(e, "블라인드 처리에 실패했습니다."));
    }
  };

  const handleExpand = async (boardId: number) => {
    if (expandedId === boardId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(boardId);
    if (!commentsByBoard[boardId]) {
      setCommentsLoading(true);
      try {
        const comments = await adminApi.getComments(boardId);
        setCommentsByBoard((prev) => ({ ...prev, [boardId]: comments }));
      } catch (e) {
        setError(getErrorMessage(e, "댓글을 불러오지 못했습니다."));
      } finally {
        setCommentsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-500">
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 text-left font-medium">제목</th>
              <th className="px-4 py-3 text-left font-medium">작성자</th>
              <th className="px-4 py-3 text-left font-medium">작성일</th>
              <th className="px-4 py-3 text-left font-medium">상태</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {boards.map((board) => (
              <React.Fragment key={board.id}>
                <tr
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-100/60 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
                  onClick={() => handleExpand(board.id)}
                >
                  <td className="px-2 py-3 text-gray-400">
                    {expandedId === board.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{board.title}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-neutral-300">{board.author}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-neutral-500">{board.createdAt?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <BlindBadge blinded={board.blinded} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBlindBoard(board);
                      }}
                    >
                      {board.blinded ? "블라인드 해제" : "블라인드"}
                    </Button>
                  </td>
                </tr>
                {expandedId === board.id && (
                  <tr className="border-b border-gray-100 bg-gray-100/40 dark:border-neutral-800/60 dark:bg-neutral-900/60">
                    <td colSpan={6} className="px-4 py-3">
                      {commentsLoading && !commentsByBoard[board.id] ? (
                        <p className="py-2 text-center text-xs text-gray-400 dark:text-neutral-600">불러오는 중...</p>
                      ) : (commentsByBoard[board.id]?.length ?? 0) === 0 ? (
                        <p className="py-2 text-center text-xs text-gray-400 dark:text-neutral-600">댓글이 없습니다.</p>
                      ) : (
                        <ul className="space-y-2">
                          {commentsByBoard[board.id].map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs dark:bg-neutral-900">
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-gray-700 dark:text-neutral-300">{c.author}</span>
                                <span className="ml-2 text-gray-500 dark:text-neutral-400">{c.content}</span>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <BlindBadge blinded={c.blinded} />
                                <Button size="xs" variant="outline" onClick={() => handleToggleBlindComment(board.id, c)}>
                                  {c.blinded ? "해제" : "블라인드"}
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {boards.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-neutral-600">
                  게시글이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
