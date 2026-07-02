'use client';

import { ChatMessage, SystemMessage } from '@/types/chat';
import { isSticker } from '@/lib/stickers';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface MessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
  displayName?: string;
  onDelete?: () => void;
}

export function MessageBubble({ message, isSelf, displayName, onDelete }: MessageBubbleProps) {
  const sticker = isSticker(message.text);

  return (
    <div className={`msg-enter group flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {!isSelf && (
          <span className="px-1 text-xs font-medium" style={{ color: 'var(--accent)' }}>
            {displayName ?? message.username}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {isSelf && onDelete && (
            <button
              onClick={onDelete}
              title="Delete message"
              className="opacity-0 transition-opacity group-hover:opacity-100 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              🗑
            </button>
          )}
          {sticker ? (
            <div className="px-1 text-5xl leading-none">{message.text}</div>
          ) : (
            <div
              className="rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
              style={{
                background: isSelf ? 'var(--bubble-self)' : 'var(--bubble-other)',
                color: isSelf ? 'var(--bubble-self-text)' : 'var(--foreground)',
                borderTopRightRadius: isSelf ? 4 : undefined,
                borderTopLeftRadius: !isSelf ? 4 : undefined,
              }}
            >
              {message.text}
            </div>
          )}
          {!isSelf && onDelete && (
            <button
              onClick={onDelete}
              title="Delete message"
              className="opacity-0 transition-opacity group-hover:opacity-100 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              🗑
            </button>
          )}
        </div>
        <span className="px-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

export function SystemMessageRow({ message }: { message: SystemMessage }) {
  return (
    <div className="msg-enter flex justify-center">
      <span
        className="rounded-full px-3 py-1 text-xs"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
      >
        {message.text}
      </span>
    </div>
  );
}
