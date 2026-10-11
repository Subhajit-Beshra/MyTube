'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePlus, Plus, X } from 'lucide-react';

type ChannelDialogProps = {
  trigger?: ReactNode;
};

export default function ChannelDialog({ trigger }: ChannelDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    handle: '',
    description: '',
  });

  const handleSubmit = () => {
    setOpen(false);
    setForm({ name: '', handle: '', description: '' });
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="gap-1.5 rounded-full bg-black text-white hover:bg-gray-800"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New channel
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">Creator</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Create a channel</h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
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
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Channel name</label>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="MyTube Studio"
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Handle</label>
                  <Input
                    value={form.handle}
                    onChange={(event) => setForm({ ...form, handle: event.target.value })}
                    placeholder="@mytubestudio"
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Tell viewers what your channel is about"
                    className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} className="bg-black text-white hover:bg-gray-800">
                Create channel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
