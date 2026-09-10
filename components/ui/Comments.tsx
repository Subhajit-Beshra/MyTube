'use client';

import { formatDistanceToNow } from 'date-fns';
import { Pencil, Send, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Avatar, AvatarFallback } from './avatar';
import { Button } from './button';

type Comment = {
  id: number;
  author: string;
  text: string;
  createdAt: string;
};

const initialComments: Comment[] = [
  {
    id: 1,
    author: 'Alex Morgan',
    text: 'This was really helpful. Thanks for sharing!',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    author: 'Jamie Lee',
    text: 'The explanation near the end was my favorite part.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const Comments = () => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleAddComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = newComment.trim();
    if (!text) return;

    setComments((currentComments) => [
      {
        id: Date.now(),
        author: 'You',
        text,
        createdAt: new Date().toISOString(),
      },
      ...currentComments,
    ]);
    setNewComment('');
  };

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const handleEditComment = (event: FormEvent<HTMLFormElement>, id: number) => {
    event.preventDefault();
    const text = editText.trim();
    if (!text) return;

    setComments((currentComments) => currentComments.map((comment) => (
      comment.id === id ? { ...comment, text } : comment
    )));
    setEditingId(null);
    setEditText('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDeleteComment = (id: number) => {
    if (!window.confirm('Delete this comment?')) return;
    setComments((currentComments) => currentComments.filter((comment) => comment.id !== id));
    if (editingId === id) cancelEditing();
  };

  return (
    <section className='space-y-6' aria-labelledby='comments-heading'>
      <div className='flex items-center gap-2'>
        <h2 id='comments-heading' className='text-lg font-semibold'>Comments</h2>
        <span className='text-sm text-gray-500'>{comments.length}</span>
      </div>

      <form onSubmit={handleAddComment} className='flex items-start gap-3'>
        <Avatar className='mt-1'>
          <AvatarFallback>Y</AvatarFallback>
        </Avatar>
        <div className='flex-1 space-y-2'>
          <textarea
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            placeholder='Add a comment...'
            aria-label='Add a comment'
            rows={2}
            className='w-full resize-y border-b border-input bg-transparent px-1 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring'
          />
          <div className='flex justify-end'>
            <Button type='submit' size='sm' disabled={!newComment.trim()}>
              <Send />
              Comment
            </Button>
          </div>
        </div>
      </form>

      <div className='space-y-5'>
        {comments.map((comment) => (
          <article key={comment.id} className='flex items-start gap-3'>
            <Avatar className='mt-1'>
              <AvatarFallback>{comment.author[0]}</AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                <h3 className='text-sm font-medium'>{comment.author}</h3>
                <time className='text-xs text-gray-500' dateTime={comment.createdAt}>
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </time>
              </div>

              {editingId === comment.id ? (
                <form onSubmit={(event) => handleEditComment(event, comment.id)} className='mt-2 space-y-2'>
                  <textarea
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    aria-label='Edit comment'
                    rows={2}
                    autoFocus
                    className='w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/20'
                  />
                  <div className='flex gap-2'>
                    <Button type='submit' size='sm' disabled={!editText.trim()}>Save</Button>
                    <Button type='button' variant='ghost' size='sm' onClick={cancelEditing}>
                      <X />
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className='mt-1 text-sm leading-6'>{comment.text}</p>
                  {comment.author === 'You' && (
                    <div className='mt-1 flex gap-1'>
                      <Button type='button' variant='ghost' size='sm' onClick={() => startEditing(comment)} aria-label='Edit comment'>
                        <Pencil />
                        Edit
                      </Button>
                      <Button type='button' variant='ghost' size='sm' onClick={() => handleDeleteComment(comment.id)} aria-label='Delete comment'>
                        <Trash2 />
                        Delete
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Comments;
