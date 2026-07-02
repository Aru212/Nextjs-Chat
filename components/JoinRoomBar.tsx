'use client';

import { useState } from 'react';

interface JoinRoomBarProps {
  currentRoom: string;
  onJoin: (room: string) => void;
}

const QUICK_ROOMS = ['general', 'random', 'dev-talk'];

export default function JoinRoomBar({ currentRoom, onJoin }: JoinRoomBarProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const room = value.trim();
    if (!room || room === currentRoom) return;
    onJoin(room);
    setValue('');
  };

  return (
    <div className="flex items-center gap-3 border-b px-6 py-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex gap-1.5">
        {QUICK_ROOMS.map((r) => (
          <button
            key={r}
            onClick={() => onJoin(r)}
            className="rounded-full border px-2.5 py-1 text-xs transition-colors"
            style={{
              borderColor: r === currentRoom ? 'var(--accent)' : 'var(--border-subtle)',
              color: r === currentRoom ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            #{r}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="ml-auto flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Join another room…"
          maxLength={32}
          className="rounded-full border px-3 py-1 text-xs outline-none transition-colors focus:border-[var(--accent)]"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--foreground)' }}
        />
      </form>
    </div>
  );
}
