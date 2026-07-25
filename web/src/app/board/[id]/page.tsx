"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { boardApi } from "@/services/boardApi";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, ThumbsUp, MessageCircle, CornerDownRight } from "lucide-react";
import type { BoardPost, Comment } from "@/types/board";

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const nickname = useAuthStore((s) => s.nickname);

  const [post, setPost] = useState<BoardPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    boardApi.getById(id).then(setPost);
    boardApi.getComments(id).then(setComments);
  }, [id]);

  const handleLikePost = async () => {
    const updated = await boardApi.like(id);
    setPost(updated);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await boardApi.createComment(id, {
        author: nickname ?? "익명의 개미",
        content: commentText,
        parentCommentId: null,
      });
      setComments((prev) => [...prev, created]);
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: number) => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await boardApi.createComment(id, {
        author: nickname ?? "익명의 개미",
        content: replyText,
        parentCommentId,
      });
      setComments((prev) => [...prev, created]);
      setReplyText("");
      setReplyingTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: number) => {
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
    <div className="mx-auto p-6 max-w-[80%] space-y-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.push("/board")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-neutral-500 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={15} />
        게시판으로
      </button>

      {/* 게시글 본문 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{post.title}</h1>
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500 pb-4 border-b border-gray-100 dark:border-neutral-800">
          <span className="font-medium text-gray-600 dark:text-neutral-400">{post.author}</span>
          <span>·</span>
          <span>{formatDateTime(post.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed min-h-24">
          {post.content}
        </p>
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-neutral-800">
          <button
            onClick={handleLikePost}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 border border-gray-200 hover:border-emerald-400 hover:text-emerald-500 transition-colors dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
          >
            <ThumbsUp size={14} />
            추천 {post.likeCount}
          </button>
          <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-neutral-500">
            <MessageCircle size={14} />
            댓글 {comments.length}
          </span>
        </div>
      </div>

      {/* 댓글 섹션 */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">
          댓글 {comments.length}개
        </h2>

        {topLevelComments.length === 0 && (
          <p className="text-center py-6 text-sm text-gray-400 dark:text-neutral-600">첫 댓글을 작성해보세요.</p>
        )}

        {topLevelComments.map((comment) => {
          const replies = comments.filter((c) => c.parentCommentId === comment.id);
          const isReplying = replyingTo === comment.id;

          return (
            <div key={comment.id} className="space-y-2">
              {/* 댓글 */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
                    {comment.author}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-neutral-600">{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-500 transition-colors dark:text-neutral-600 dark:hover:text-emerald-400"
                  >
                    <ThumbsUp size={12} />
                    <span>{comment.likeCount}</span>
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(isReplying ? null : comment.id);
                      setReplyText("");
                    }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors dark:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    <CornerDownRight size={12} />
                    답글
                  </button>
                </div>
              </div>

              {/* 대댓글 목록 */}
              {replies.length > 0 && (
                <div className="ml-6 space-y-2">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-xl border border-gray-100 bg-white p-4 dark:border-neutral-800/60 dark:bg-neutral-800/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <CornerDownRight size={11} className="text-gray-300 dark:text-neutral-600" />
                          <span className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
                            {reply.author}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-neutral-600">{formatDateTime(reply.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed pl-5">
                        {reply.content}
                      </p>
                      <div className="flex items-center gap-4 mt-3 pl-5">
                        <button
                          onClick={() => handleLikeComment(reply.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-500 transition-colors dark:text-neutral-600 dark:hover:text-emerald-400"
                        >
                          <ThumbsUp size={12} />
                          <span>{reply.likeCount}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 대댓글 입력창 */}
              {isReplying && (
                <div className="ml-6 flex gap-2 items-start">
                  <CornerDownRight size={13} className="mt-3 shrink-0 text-gray-300 dark:text-neutral-600" />
                  <textarea
                    className="flex-1 rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 min-h-16 resize-none dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                    placeholder="답글을 입력하세요"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim() || submitting}
                    >
                      등록
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 댓글 입력창 */}
        <div className="flex gap-2 items-end pt-2">
          <textarea
            className="flex-1 rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 min-h-16 resize-none dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
            placeholder="댓글을 입력하세요"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <Button
            size="sm"
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
          >
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}
