'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePlus, LoaderCircle, Plus, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { platformRequest } from '@/lib/platform-api';

type ChannelDialogProps = {
  trigger?: ReactNode;
};

export default function ChannelDialog({ trigger }: ChannelDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
  });
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  function closeDialog() {
    if (saving) return;
    setOpen(false);
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    const channelname = form.name.trim();
    const description = form.description.trim();
    if (!channelname) {
      setError('Enter a channel name.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await platformRequest(`/auth/update/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ channelname, description }),
      });
      await refreshUser();
      setOpen(false);
      setForm({ name: '', description: '' });
      router.push(`/channel/${encodeURIComponent(user.id)}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your channel.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {trigger ? (
        <div
          onClick={() => {
            setError('');
            setOpen(true);
          }}
        >
          {trigger}
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="gap-1.5 rounded-full bg-black text-white hover:bg-gray-800"
          onClick={() => {
            setError('');
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New channel
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="w-full max-w-xl rounded-2xl border bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">Creator</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Create a channel</h2>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-[140px_1fr]">
              <div className="flex items-center justify-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400">
                  <ImagePlus className="h-8 w-8" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="channel-name" className="mb-1.5 block text-sm font-medium text-gray-700">Channel name</label>
                  <Input
                    id="channel-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="MyTube Studio"
                    maxLength={100}
                    required
                    className="h-10"
                  />
                </div>

                <div>
                  <label htmlFor="channel-description" className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    id="channel-description"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Tell viewers what your channel is about"
                    maxLength={500}
                    className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/50"
                  />
                  <p className="mt-1 text-right text-xs text-gray-500">{form.description.length}/500</p>
                </div>
              </div>
            </div>

            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
                Cancel
              </Button>
              {!user ? (
                <Button type="button" onClick={() => router.push('/login')} className="bg-black text-white hover:bg-gray-800">
                  Sign in to create
                </Button>
              ) : (
                <Button type="submit" disabled={saving || !form.name.trim()} className="bg-black text-white hover:bg-gray-800">
                  {saving && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                  {saving ? 'Saving…' : 'Save channel'}
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
