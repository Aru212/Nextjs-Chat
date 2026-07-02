'use client';

import { useState } from 'react';

interface JoinScreenProps {
  onJoin: (username: string, room: string) => void;
}

const QUICK_ROOMS = ['general', 'random', 'dev-talk'];

export default function JoinScreen({ onJoin }: JoinScreenProps) {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = username.trim();
    const trimmedRoom = room.trim();
    if (!trimmedName) {
      setError('Enter a name to continue.');
      return;
    }
    if (!trimmedRoom) {
      setError('Enter a room to join.');
      return;
    }
    onJoin(trimmedName, trimmedRoom);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="mb-6 flex items-center gap-2">
          <span
            className="presence-dot h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
          <h1 className="text-lg font-semibold tracking-tight">Live Chat</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Your name
            </label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Priya"
              maxLength={24}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Room
            </label>
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. general"
              maxLength={32}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--foreground)' }}
            />
            <div className="mt-2 flex gap-2">
              {QUICK_ROOMS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRoom(r)}
                  className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  #{r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#15171c' }}
          >
            Join room
          </button>
        </form>
      </div>
    </div>
  );
}
