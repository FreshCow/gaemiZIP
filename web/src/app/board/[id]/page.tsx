"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { boardApi } from "@/services/boardApi";
import { Button } from "@/components/ui/button";
import ErrorToast from "@/components/ui/ErrorToast";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, ThumbsUp, MessageCircle, CornerDownRight, Pencil, Trash2 } from "lucide-react";
import { StockLogo } from "@/components/stock/StockLogo";
import type { BoardPost, Comment } from "@/types/board";
import { BOARD_TAG_BADGE_CLASSES, BOARD_TAG_LABELS } from "@/types/board";

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { nickname, isLoggedIn } = useAuthStore();

  const [post, setPost] = useState<BoardPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    boardApi.getById(id).then(setPost);
    boardApi.getComments(id).then(setComments);
  }, [id]);

  const handleLikePost = async () => {
    if (!isLoggedIn) return;
    // 서버가 raw Board 엔티티를 반환해 tag/sharedStocks가 안 담겨있음 — likeCount만 반영
    const updated = await boardApi.like(id);
    setPost((prev) => (prev ? { ...prev, likeCount: updated.likeCount } : prev));
  };

  const handleSubmitComment = async () => {
    if (!isLoggedIn || !commentText.trim() || submitting) return;
    setSubmitting(true);
    setCommentError("");
    try {
      const created = await boardApi.createComment(id, {
        author: nickname ?? "익명의 개미",
        content: commentText,
        parentCommentId: null,
      });
      setComments((prev) => [...prev, created]);
      setCommentText("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: string } })?.response?.data ??
        "댓글 작성 중 오류가 발생했습니다.";
      setCommentError(typeof msg === "string" ? msg : "댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: number) => {
    if (!isLoggedIn || !replyText.trim() || submitting) return;
    setSubmitting(true);
    setCommentError("");
    try {
      const created = await boardApi.createComment(id, {
        author: nickname ?? "익명의 개미",
        content: replyText,
        parentCommentId,
      });
      setComments((prev) => [...prev, created]);
      setReplyText("");
      setReplyingTo(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: string } })?.response?.data ??
        "댓글 작성 중 오류가 발생했습니다.";
      setCommentError(typeof msg === "string" ? msg : "댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("게시글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.")) return;
    try {
      await boardApi.remove(id);
      router.push("/board");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: string } })?.response?.data ??
        "게시글 삭제 중 오류가 발생했습니다.";
      setError(typeof msg === "string" ? msg : "게시글 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleLikeComment = async (commentId: number) => {
    if (!isLoggedIn) return;
    const updated = await boardApi.likeComment(commentId);
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const topLevelComments = comments.filter((c) => c.parentCommentId === null);

  if (!post) {
    return (
      <div className="p-6 flex items-center justify-center h-40">
        <p className="text-sm text-gray-400 dark:text-neutral-600">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full space-y-6 p-4 sm:max-w-[80%] sm:p-6">
      {/* 뒤로가기 */}
      <div className="relative">
        <button
          onClick={() => router.push("/board")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-neutral-500 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          게시판으로
        </button>
        <ErrorToast message={error} onDismiss={() => setError("")} />
      </div>

      {/* 게시글 본문 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BOARD_TAG_BADGE_CLASSES[post.tag]}`}>
            {BOARD_TAG_LABELS[post.tag]}
          </span>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{post.title}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500 pb-4 border-b border-gray-100 dark:border-neutral-800">
          <span className="font-medium text-gray-600 dark:text-neutral-400">{post.author}</span>
          <span>·</span>
          <span>{formatDateTime(post.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed min-h-24">
          {post.content}
        </p>

        {/* 공유된 보유종목 */}
        {post.sharedStocks.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-2 border-t border-gray-100 dark:border-neutral-800">
            {post.sharedStocks.map((s) => {
              const isPos = s.profitLossRate >= 0;
              return (
                <div
                  key={s.stockCode}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
                >
                  <div className="flex items-center gap-2">
                    <StockLogo code={s.stockCode} name={s.stockName} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-semibold text-gray-800 dark:text-neutral-200">{s.stockName}</span>
                        <span className={`shrink-0 text-sm font-medium ${isPos ? "text-emerald-500" : "text-rose-500"}`}>
                          {isPos ? "+" : ""}
                          {s.profitLossRate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-400 dark:text-neutral-500">
                        <span>{s.quantity}주 · 평단 {s.avgPrice.toLocaleString()}원</span>
                        <span className={isPos ? "text-emerald-500" : "text-rose-500"}>
                          {isPos ? "+" : ""}
                          {s.profitLossAmount.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-neutral-800">
          <button
            onClick={handleLikePost}
            disabled={!isLoggedIn}
            title={!isLoggedIn ? "로그인 후 사용할 수 있습니다." : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
              isLoggedIn
                ? "border-emerald-400 text-emerald-500 dark:border-emerald-600 dark:text-emerald-400"
                : "cursor-not-allowed border-gray-200 text-gray-300 dark:border-neutral-800 dark:text-neutral-700"
            }`}
          >
            <ThumbsUp size={14} />
            추천 {post.likeCount}
          </button>
          {post.tag !== "NOTICE" && (
            <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-neutral-500">
              <MessageCircle size={14} />
              댓글 {comments.length}
            </span>
          )}
          {post.author === nickname && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => router.push(`/board/edit/${id}`)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
              >
                <Pencil size={14} />
                수정
              </button>
              <button
                onClick={handleDeletePost}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-500 transition-colors hover:border-rose-400 hover:text-rose-500 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-rose-600 dark:hover:text-rose-400"
              >
                <Trash2 size={14} />
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 댓글 섹션 — 공지사항은 댓글 기능 자체를 노출하지 않음 */}
      {post.tag !== "NOTICE" && (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">
          댓글 {comments.length}개
        </h2>

        {topLevelComments.length === 0 && (
          <p className="text-center py-6 text-sm text-gray-400 dark:text-neutral-600">첫 댓글을 작성해보세요.</p>
        )}

        <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-neutral-800 dark:border-neutral-800">
          {topLevelComments.map((comment) => {
            const replies = comments.filter((c) => c.parentCommentId === comment.id);
            const isReplying = replyingTo === comment.id;

            return (
              <div key={comment.id}>
                {/* 댓글 행 */}
                <div className="flex flex-col gap-1 px-2 py-3 sm:flex-row sm:items-start sm:gap-4">
                  <span className="shrink-0 truncate text-sm text-gray-500 sm:w-36 dark:text-neutral-400">
                    {comment.author}
                  </span>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 dark:text-neutral-200">
                    {comment.content}
                  </p>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-gray-400 dark:text-neutral-600">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      disabled={!isLoggedIn}
                      title={!isLoggedIn ? "로그인 후 사용할 수 있습니다." : undefined}
                      className={`flex items-center gap-1 transition-colors ${
                        isLoggedIn
                          ? "text-emerald-500 dark:text-emerald-400"
                          : "cursor-not-allowed text-gray-300 dark:text-neutral-700"
                      }`}
                    >
                      <ThumbsUp size={12} />
                      <span>{comment.likeCount}</span>
                    </button>
                    {isLoggedIn && (
                      <button
                        onClick={() => {
                          setReplyingTo(isReplying ? null : comment.id);
                          setReplyText("");
                        }}
                        className="flex items-center gap-1 transition-colors hover:text-gray-700 dark:hover:text-neutral-300"
                      >
                        <CornerDownRight size={12} />
                        답글
                      </button>
                    )}
                    <span className="tabular-nums">{formatDateTime(comment.createdAt)}</span>
                  </div>
                </div>

                {/* 대댓글 박스 */}
                {(replies.length > 0 || isReplying) && (
                  <div className="mx-2 mb-3 divide-y divide-gray-200 border border-gray-200 bg-gray-50 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/60 sm:ml-6">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-start sm:gap-4"
                      >
                        <div className="flex shrink-0 items-center gap-1.5 sm:w-36">
                          <CornerDownRight size={12} className="shrink-0 text-blue-700 dark:text-blue-400" />
                          <span className="truncate text-sm text-gray-500 dark:text-neutral-400">{reply.author}</span>
                        </div>
                        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 dark:text-neutral-200">
                          {reply.content}
                        </p>
                        <div className="flex shrink-0 items-center gap-3 text-xs text-gray-400 dark:text-neutral-600">
                          <button
                            onClick={() => handleLikeComment(reply.id)}
                            disabled={!isLoggedIn}
                            title={!isLoggedIn ? "로그인 후 사용할 수 있습니다." : undefined}
                            className={`flex items-center gap-1 transition-colors ${
                              isLoggedIn
                                ? "text-emerald-500 dark:text-emerald-400"
                                : "cursor-not-allowed text-gray-300 dark:text-neutral-700"
                            }`}
                          >
                            <ThumbsUp size={12} />
                            <span>{reply.likeCount}</span>
                          </button>
                          <span className="tabular-nums">{formatDateTime(reply.createdAt)}</span>
                        </div>
                      </div>
                    ))}

                    {/* 대댓글 입력창 */}
                    {isReplying && (
                      <div className="flex items-start gap-2 px-3 py-2.5">
                        <CornerDownRight size={13} className="mt-3 shrink-0 text-blue-700 dark:text-blue-400" />
                        <textarea
                          className="min-h-16 flex-1 resize-none rounded-lg bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                          placeholder="답글을 입력하세요"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex shrink-0 flex-col gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleSubmitReply(comment.id)}
                            disabled={!replyText.trim() || submitting}
                          >
                            등록
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setReplyingTo(null)}>
                            취소
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 댓글 입력창 */}
        <div className="relative flex gap-2 items-center pt-2">
          <ErrorToast message={commentError} onDismiss={() => setCommentError("")} />
          {!isLoggedIn && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 dark:bg-neutral-900/70">
              <button
                onClick={() => router.push("/login")}
                className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                로그인 후 사용할 수 있습니다
              </button>
            </div>
          )}
          <div className={`flex flex-1 items-center gap-2 ${!isLoggedIn ? "pointer-events-none opacity-40" : ""}`}>
            <textarea
              className="flex-1 h-9 rounded-lg bg-gray-100 px-4 py-2 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 resize-none dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
              placeholder="댓글을 입력하세요"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button
              size="lg"
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
            >
              등록
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
