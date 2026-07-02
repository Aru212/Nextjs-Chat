'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { ChatMessage } from '@/types/chat';
import { MessageBubble } from './MessageBubble';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';

interface DMThreadProps {
  selfUsername: string;
  peerUsername: string;
  peerLabel?: string; // display override, e.g. "Admin"
  canDelete?: boolean;
  emptyStateText?: string;
}

/**
 * Core DM conversation: message feed + typing indicator + composer.
 * No outer card/border — the caller decides whether to wrap this in a
 * small floating popup (DMPopup) or drop it straight into a main panel.
 */
export default function DMThread({ selfUsername, peerUsername, peerLabel, canDelete, emptyStateText }: DMThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);

  const feedEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    socket.emit('dm_get_thread', peerUsername, (history: ChatMessage[]) => {
      setMessages(history);
    });

    function onDmMessage(message: ChatMessage) {
      const involvesUs =
        (message.username === peerUsername || message.username === selfUsername) &&
        message.threadId === [selfUsername, peerUsername].sort().join('::');
      if (!involvesUs) return;
      setMessages((prev) => [...prev, message]);
    }
    function onTypingUpdate({ from, isTyping }: { from: string; isTyping: boolean }) {
      if (from === peerUsername) setPeerTyping(isTyping);
    }
    function onMessageDeleted({ messageId }: { messageId: string }) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
    function onThreadCleared({ peer }: { peer: string }) {
      if (peer === peerUsername) setMessages([]);
    }

    socket.on('dm_message', onDmMessage);
    socket.on('dm_typing_update', onTypingUpdate);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('dm_thread_cleared', onThreadCleared);

    return () => {
      socket.off('dm_message', onDmMessage);
      socket.off('dm_typing_update', onTypingUpdate);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('dm_thread_cleared', onThreadCleared);
    };
  }, [peerUsername, selfUsername]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopTyping = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      getSocket().emit('dm_typing', { targetUsername: peerUsername, isTyping: false });
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket().emit('dm_typing', { targetUsername: peerUsername, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 1500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    getSocket().emit('dm_send', { targetUsername: peerUsername, text });
    setDraft('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    stopTyping();
  };

  const handleDelete = (messageId: string) => {
    getSocket().emit('delete_message', { scope: 'dm', key: peerUsername, messageId });
  };

  const handleEmojiSelect = (emoji: string) => {
    setDraft((prev) => prev + emoji);
  };

  const handleStickerSend = (sticker: string) => {
    getSocket().emit('dm_send', { targetUsername: peerUsername, text: sticker });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto chat-scroll px-3 py-3">
        <div className="flex flex-col gap-2.5">
          {messages.length === 0 && (
            <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
              {emptyStateText ?? `Say hello to ${peerLabel ?? peerUsername}.`}
            </p>
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isSelf={m.username === selfUsername}
              displayName={m.username === peerUsername ? (peerLabel ?? peerUsername) : m.username}
              onDelete={canDelete ? () => handleDelete(m.id) : undefined}
            />
          ))}
          <div ref={feedEndRef} />
        </div>
      </div>

      <p className="h-4 px-4 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        {peerTyping ? `${peerLabel ?? peerUsername} is typing…` : ''}
      </p>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <EmojiPicker onSelect={handleEmojiSelect} />
        <StickerPicker onSend={handleStickerSend} />
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          placeholder="Message…"
          maxLength={1000}
          className="flex-1 rounded-full border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--foreground)' }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-full px-3.5 py-2 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
