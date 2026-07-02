'use client';

import { useEffect, useRef, useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😂', '😅', '😊', '😉', '😍', '🤔', '😎', '😢', '😭', '😡', '😱', '🥳', '😴', '🙄', '😬'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙏', '🙌', '👋', '🤝', '💪', '✌️', '🤞', '👀', '🔥', '💯', '✅', '❌', '⭐'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕'],
  },
];

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border text-base transition-colors hover:border-[var(--accent)]"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
        title="Add emoji"
      >
        🙂
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-xl border p-3 shadow-xl chat-scroll"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', maxHeight: 220, overflowY: 'auto' }}
        >
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {group.label}
              </p>
              <div className="grid grid-cols-8 gap-1">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                    className="rounded-md p-1 text-lg transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
