'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { ChatMessage, FeedItem } from '@/types/chat';
import Sidebar from './Sidebar';
import { MessageBubble, SystemMessageRow } from './MessageBubble';
import JoinRoomBar from './JoinRoomBar';
import DMThread from './DMThread';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';

interface ChatRoomProps {
  username: string;
  onLeave: () => void;
}

const TYPING_TIMEOUT_MS = 1500;
const DEFAULT_ROOM = 'general';

// What's currently shown in the main panel: the group room feed, or a DM
// thread with a specific peer (which may be 'admin' or another user).
type ActiveView = { type: 'room' } | { type: 'dm'; peer: string };

export default function ChatRoom({ username, onLeave }: ChatRoomProps) {
  const [room, setRoom] = useState(DEFAULT_ROOM);
  const [roomFeed, setRoomFeed] = useState<FeedItem[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [kicked, setKicked] = useState<string | null>(null);

  // Main-panel view: either the group room, or a DM thread. Both user-to-user
  // and user-to-admin DMs open here — no floating popups for regular users.
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'room' });
  const [dmUnread, setDmUnread] = useState<Record<string, number>>({});

  const feedEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const activeViewRef = useRef<ActiveView>(activeView);
  activeViewRef.current = activeView;

  useEffect(() => {
    const socket = getSocket();

    function joinCurrentRoom() {
      socket.emit('join_room', { room });
    }
    function onConnect() {
      setConnected(true);
      joinCurrentRoom();
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onHistory(history: ChatMessage[]) {
      setRoomFeed(history.map((m) => ({ kind: 'message', data: m })));
    }
    function onReceiveMessage(message: ChatMessage) {
      setRoomFeed((prev) => [...prev, { kind: 'message', data: message }]);
    }
    function onSystemMessage(message: { id: string; text: string; timestamp: number }) {
      setRoomFeed((prev) => [...prev, { kind: 'system', data: message }]);
    }
    function onUserList(list: string[]) {
      setUsers(list);
    }
    function onTypingUpdate({ username: who, isTyping }: { username: string; isTyping: boolean }) {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(who);
        else next.delete(who);
        return next;
      });
    }
    function onModerationStatus({ muted: isMuted }: { muted: boolean }) {
      setMuted(isMuted);
    }
    function onModerationNotice({ text }: { text: string }) {
      alert(text);
    }
    function onForceDisconnect({ reason }: { reason: string }) {
      setKicked(reason);
    }
    function onMessageDeleted({ messageId }: { messageId: string }) {
      setRoomFeed((prev) => prev.filter((item) => !(item.kind === 'message' && item.data.id === messageId)));
    }
    // A DM arrived. If we're not currently looking at that peer's thread,
    // bump their unread badge in the sidebar instead of interrupting whatever
    // is open in the main panel (room feed or a different DM).
    function onDmMessage(message: ChatMessage) {
      if (message.username === username) return; // our own message, already shown in its thread
      if (!message.threadId) return;
      const [a, b] = message.threadId.split('::');
      const peer = a === username ? b : a;

      const current = activeViewRef.current;
      if (current.type === 'dm' && current.peer === peer) return; // already viewing this thread

      setDmUnread((prev) => ({ ...prev, [peer]: (prev[peer] || 0) + 1 }));
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('history', onHistory);
    socket.on('receive_message', onReceiveMessage);
    socket.on('system_message', onSystemMessage);
    socket.on('user_list', onUserList);
    socket.on('typing_update', onTypingUpdate);
    socket.on('moderation_status', onModerationStatus);
    socket.on('moderation_notice', onModerationNotice);
    socket.on('force_disconnect', onForceDisconnect);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('dm_message', onDmMessage);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('history', onHistory);
      socket.off('receive_message', onReceiveMessage);
      socket.off('system_message', onSystemMessage);
      socket.off('user_list', onUserList);
      socket.off('typing_update', onTypingUpdate);
      socket.off('moderation_status', onModerationStatus);
      socket.off('moderation_notice', onModerationNotice);
      socket.off('force_disconnect', onForceDisconnect);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('dm_message', onDmMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, username]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomFeed]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      getSocket().emit('typing', { room, isTyping: false });
    }
  }, [room]);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    const socket = getSocket();
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', { room, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    getSocket().emit('send_message', { room, text });
    setDraft('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    stopTyping();
  };

  const handleEmojiSelect = (emoji: string) => {
    setDraft((prev) => prev + emoji);
  };

  const handleStickerSend = (sticker: string) => {
    if (!connected || muted) return;
    getSocket().emit('send_message', { room, text: sticker });
  };

  const handleJoinRoom = (newRoom: string) => {
    setRoom(newRoom);
    setRoomFeed([]);
  };

  const selectRoom = () => {
    setActiveView({ type: 'room' });
  };

  const openDM = (peer: string) => {
    setActiveView({ type: 'dm', peer });
    setDmUnread((prev) => ({ ...prev, [peer]: 0 }));
  };

  const typingNames = Array.from(typingUsers).filter((u) => u !== username);

  if (kicked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-sm rounded-2xl border p-8 text-center" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <p className="mb-4 text-sm" style={{ color: 'var(--foreground)' }}>{kicked}</p>
          <button
            onClick={onLeave}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--background)' }}>
      <Sidebar
        room={room}
        username={username}
        users={users}
        connected={connected}
        muted={muted}
        isRoomActive={activeView.type === 'room'}
        activeDmPeer={activeView.type === 'dm' ? activeView.peer : null}
        dmUnread={dmUnread}
        onSelectRoom={selectRoom}
        onOpenDM={openDM}
        onOpenAdminChat={() => openDM('admin')}
        onLogout={onLeave}
      />

      {activeView.type === 'room' ? (
        <div className="flex flex-1 flex-col">
          <JoinRoomBar currentRoom={room} onJoin={handleJoinRoom} />

          <div className="flex-1 overflow-y-auto chat-scroll px-6 py-5">
            <div className="mx-auto flex max-w-2xl flex-col gap-3">
              {roomFeed.length === 0 ? (
                <p className="mt-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No messages yet. Say hello to #{room}.
                </p>
              ) : (
                roomFeed.map((item) =>
                  item.kind === 'message' ? (
                    <MessageBubble key={item.data.id} message={item.data} isSelf={item.data.username === username} />
                  ) : (
                    <SystemMessageRow key={item.data.id} message={item.data} />
                  )
                )
              )}
              <div ref={feedEndRef} />
            </div>
          </div>

          <div className="px-6 pb-1">
            <div className="mx-auto max-w-2xl">
              <p className="h-5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {typingNames.length > 0 &&
                  (typingNames.length === 1
                    ? `${typingNames[0]} is typing…`
                    : `${typingNames.join(', ')} are typing…`)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSend} className="px-6 pb-6">
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <EmojiPicker onSelect={handleEmojiSelect} />
              <StickerPicker onSend={handleStickerSend} />
              <input
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                placeholder={muted ? 'You are muted' : 'Write a message…'}
                maxLength={1000}
                disabled={!connected || muted}
                className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)] disabled:opacity-50"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'var(--foreground)' }}
              />
              <button
                type="submit"
                disabled={!connected || muted || !draft.trim()}
                className="cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b px-6 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <span className="presence-dot h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold">
                {activeView.peer === 'admin' ? 'Admin' : activeView.peer}
              </h3>
            </div>
            <button
              onClick={selectRoom}
              className="rounded-md border px-2.5 py-1 text-xs transition-colors hover:border-[var(--accent)]"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
            >
              Back to #{room}
            </button>
          </div>
          <DMThread
            key={activeView.peer}
            selfUsername={username}
            peerUsername={activeView.peer}
            peerLabel={activeView.peer === 'admin' ? 'Admin' : activeView.peer}
          />
        </div>
      )}
    </div>
  );
}
