"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Flag,
  Languages,
  Pencil,
  Reply,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ReactNode } from "react";
import { platformRequest } from "@/lib/platform-api";
import { useAuth } from "@/lib/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";

type CommentEntry = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  dislikeCount: number;
  myVote: "like" | "dislike" | null;
  author: { id: string; name: string; image: string };
  replies: CommentEntry[];
};

type TranslationState = {
  translatedText?: string;
  targetLanguage?: string;
  loading: boolean;
  visible: boolean;
  error?: string;
};

const translationLanguages = [
  { code: "ar", name: "Arabic" },
  { code: "bn", name: "Bengali" },
  { code: "de", name: "German" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "hi", name: "Hindi" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "pt", name: "Portuguese" },
];

function renderMentions(content: string): ReactNode[] {
  return content.split(/(@[\w-]+)/g).map((part, index) =>
    part.startsWith("@") ? (
      <span key={`${part}-${index}`} className="font-semibold text-indigo-600">{part}</span>
    ) : (
      part
    ),
  );
}

function formatAge(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "just now"
    : formatDistanceToNow(date, { addSuffix: true });
}

export default function Comments({ videoId }: { videoId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [sort, setSort] = useState("newest");
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({});

  const loadComments = useCallback(async () => {
    const result = await platformRequest<{ comments: CommentEntry[] }>(
      `/comments/${encodeURIComponent(videoId)}?sort=${sort}`,
    );
    setComments(result.comments);
  }, [sort, videoId]);

  useEffect(() => {
    let active = true;
    platformRequest<{ comments: CommentEntry[] }>(
      `/comments/${encodeURIComponent(videoId)}?sort=${sort}`,
    )
      .then(({ comments: result }) => {
        if (active) setComments(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load comments.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sort, videoId]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setError("Sign in to post or reply to a comment.");
      return;
    }
    if (!content.trim()) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editId) {
        await platformRequest(`/comments/${editId}`, {
          method: "PATCH",
          body: JSON.stringify({ content }),
        });
        setNotice("Comment updated.");
      } else {
        await platformRequest(`/comments/${encodeURIComponent(videoId)}`, {
          method: "POST",
          body: JSON.stringify({ content, ...(replyId ? { parentId: replyId } : {}) }),
        });
        setNotice(replyId ? "Reply posted." : "Comment posted.");
      }
      setContent("");
      setEditId(null);
      setReplyId(null);
      await loadComments();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your comment.");
    } finally {
      setBusy(false);
    }
  }

  async function vote(commentId: string, value: "like" | "dislike") {
    if (!user) {
      setError("Sign in to react to comments.");
      return;
    }
    setError("");
    try {
      await platformRequest(`/comments/${commentId}/vote`, {
        method: "POST",
        body: JSON.stringify({ vote: value }),
      });
      await loadComments();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your reaction.");
    }
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("Delete this comment and its replies?")) return;
    setError("");
    try {
      await platformRequest(`/comments/${commentId}`, { method: "DELETE" });
      setNotice("Comment deleted.");
      await loadComments();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the comment.");
    }
  }

  async function reportComment(commentId: string) {
    if (!user) {
      setError("Sign in to report a comment.");
      return;
    }
    setError("");
    try {
      const result = await platformRequest<{ message: string }>(`/comments/${commentId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: "Inappropriate or spam content" }),
      });
      setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not report the comment.");
    }
  }

  async function reportAccount(userId: string) {
    if (!user) {
      setError("Sign in to report an account.");
      return;
    }
    setError("");
    try {
      const result = await platformRequest<{ message: string }>(
        `/moderation/accounts/${userId}/report`,
        {
          method: "POST",
          body: JSON.stringify({ reason: "Abusive or inappropriate account behavior" }),
        },
      );
      setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not report this account.");
    }
  }

  async function translateComment(commentId: string) {
    const current = translations[commentId];
    if (
      current?.translatedText &&
      current.targetLanguage === targetLanguage
    ) {
      setTranslations((entries) => ({
        ...entries,
        [commentId]: { ...current, visible: !current.visible },
      }));
      return;
    }

    setTranslations((entries) => ({
      ...entries,
      [commentId]: { loading: true, visible: false },
    }));
    try {
      const result = await platformRequest<{
        translatedText: string;
        targetLanguage: string;
      }>(`/comments/${commentId}/translate`, {
        method: "POST",
        body: JSON.stringify({ targetLanguage }),
      });
      setTranslations((entries) => ({
        ...entries,
        [commentId]: {
          translatedText: result.translatedText,
          targetLanguage: result.targetLanguage,
          loading: false,
          visible: true,
        },
      }));
    } catch (cause) {
      setTranslations((entries) => ({
        ...entries,
        [commentId]: {
          loading: false,
          visible: false,
          error: cause instanceof Error ? cause.message : "Could not translate this comment.",
        },
      }));
    }
  }

  function beginEdit(comment: CommentEntry) {
    setEditId(comment.id);
    setReplyId(null);
    setContent(comment.content);
    setError("");
  }

  function beginReply(commentId: string) {
    setReplyId(commentId);
    setEditId(null);
    setContent("");
    setError("");
  }

  function cancelComposer() {
    setReplyId(null);
    setEditId(null);
    setContent("");
  }

  function renderComment(comment: CommentEntry, isReply = false): ReactNode {
    const isOwner = user?.id === comment.author.id;
    const isEditing = editId === comment.id;
    const translation = translations[comment.id];
    return (
      <article key={comment.id} className={`flex items-start gap-3 ${isReply ? "ml-8 border-l border-slate-200 pl-4" : ""}`}>
        <Avatar className="mt-1 size-9 shrink-0">
          <AvatarImage src={comment.author.image || undefined} alt="" />
          <AvatarFallback>{comment.author.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-sm font-medium">{comment.author.name}</h3>
            <time className="text-xs text-slate-500" dateTime={comment.createdAt}>{formatAge(comment.createdAt)}</time>
            {comment.updatedAt !== comment.createdAt && <span className="text-xs text-slate-400">edited</span>}
          </div>
          {isEditing ? (
            <p className="mt-1 text-xs text-indigo-600">Edit the comment in the form above.</p>
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{renderMentions(comment.content)}</p>
              {translation?.visible && translation.translatedText && (
                <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-950">
                  {translation.translatedText}
                </p>
              )}
              {translation?.error && <p role="alert" className="mt-2 text-xs text-red-700">{translation.error}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <Button type="button" variant="ghost" size="sm" aria-pressed={comment.myVote === "like"} onClick={() => void vote(comment.id, "like")}><ThumbsUp />{comment.likeCount}</Button>
                <Button type="button" variant="ghost" size="sm" aria-pressed={comment.myVote === "dislike"} onClick={() => void vote(comment.id, "dislike")}><ThumbsDown />{comment.dislikeCount}</Button>
                {!isReply && <Button type="button" variant="ghost" size="sm" onClick={() => beginReply(comment.id)}><Reply />Reply</Button>}
                {isOwner && <Button type="button" variant="ghost" size="sm" onClick={() => beginEdit(comment)} aria-label="Edit comment"><Pencil />Edit</Button>}
                {isOwner && <Button type="button" variant="ghost" size="sm" onClick={() => void deleteComment(comment.id)} aria-label="Delete comment"><Trash2 />Delete</Button>}
                {user && !isOwner && <Button type="button" variant="ghost" size="sm" onClick={() => void reportComment(comment.id)} aria-label="Report comment"><Flag />Report</Button>}
                {user && !isOwner && <Button type="button" variant="ghost" size="sm" onClick={() => void reportAccount(comment.author.id)} aria-label="Report account"><Flag />Report user</Button>}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={translation?.loading}
                  onClick={() => void translateComment(comment.id)}
                  aria-label="Translate comment"
                >
                  <Languages />
                  {translation?.loading
                    ? "Translating…"
                    : translation?.visible
                      ? "Hide translation"
                      : translation?.translatedText && translation.targetLanguage === targetLanguage
                        ? "Show translation"
                        : "Translate"}
                </Button>
              </div>
            </>
          )}
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      </article>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="comments-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id="comments-heading" className="text-lg font-semibold">Comments</h2>
          <span className="text-sm text-slate-500">{comments.reduce((total, comment) => total + 1 + comment.replies.length, 0)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Translate to
            <select
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {translationLanguages.map((language) => (
                <option key={language.code} value={language.code}>{language.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sort by
            <select value={sort} onChange={(event) => { setLoading(true); setSort(event.target.value); }} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most-liked">Most liked</option>
            </select>
          </label>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

      {replyId && <p className="text-xs text-slate-500">Replying to a comment <button type="button" onClick={cancelComposer} className="font-semibold text-indigo-700">Cancel</button></p>}
      {editId && <p className="text-xs text-slate-500">Editing comment <button type="button" onClick={cancelComposer} className="font-semibold text-indigo-700">Cancel</button></p>}
      <form onSubmit={(event) => void submitComment(event)} className="flex items-start gap-3">
        <Avatar className="mt-1">
          <AvatarImage src={user?.image || undefined} alt="" />
          <AvatarFallback>{user?.name?.slice(0, 1).toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={authLoading ? "Checking sign-in…" : user ? (replyId ? "Write a reply…" : "Add a comment…") : "Sign in to comment"}
            aria-label={replyId ? "Write a reply" : "Add a comment"}
            rows={2}
            maxLength={2000}
            disabled={authLoading || !user}
            className="w-full resize-y border-b border-slate-300 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between">
            {!user && !authLoading ? <Link href="/login" className="text-sm font-medium text-indigo-700 hover:underline">Sign in</Link> : <span className="text-xs text-slate-400">{content.length}/2000</span>}
            <Button type="submit" size="sm" disabled={busy || !user || !content.trim()}><Send />{busy ? "Saving…" : replyId ? "Reply" : editId ? "Save" : "Comment"}</Button>
          </div>
        </div>
      </form>

      {loading ? (
        <p role="status" className="py-4 text-sm text-slate-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">No comments yet. Start the conversation.</p>
      ) : (
        <div className="space-y-5">{comments.map((comment) => renderComment(comment))}</div>
      )}
    </section>
  );
}
