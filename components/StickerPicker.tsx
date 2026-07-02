'use client';

import { useEffect, useRef, useState } from 'react';
import { STICKER_GROUPS } from '@/lib/stickers';

interface StickerPickerProps {
  onSend: (sticker: string) => void;
}

export default function StickerPicker({ onSend }: StickerPickerProps) {
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
        title="Send a sticker"
      >
        🖼️
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 z-20 mb-2 w-72 rounded-xl border p-3 shadow-xl chat-scroll"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', maxHeight: 260, overflowY: 'auto' }}
        >
          {STICKER_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {group.label}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {group.stickers.map((sticker) => (
                  <button
                    key={sticker}
                    type="button"
                    onClick={() => {
                      onSend(sticker);
                      setOpen(false);
                    }}
                    className="flex items-center justify-center rounded-lg border py-2 text-xl transition-colors hover:border-[var(--accent)] hover:bg-[var(--bg-elevated)]"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    title="Send sticker"
                  >
                    {sticker}
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
