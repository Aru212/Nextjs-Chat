'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { ThreadSummary, ChatMessage } from '@/types/chat';
import { MessageBubble } from './MessageBubble';
import DMPopup from './DMPopup';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';
import ThemeToggle from './ThemeToggle';

interface AdminDashboardProps {
  onLeave: () => void;
}

export default function AdminDashboard({ onLeave }: AdminDashboardProps) {
  const [summaries, setSummaries] = useState<ThreadSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [popupPeer, setPopupPeer] = useState<string | null>(null); // corner-icon popup window
  const [showPeerList, setShowPeerList] = useState(false); // corner-icon dropdown (multiple senders)

  const feedEndRef = useRef<HTMLDivElement>(null);
  const selectedUserRef = useRef<string | null>(null);
  selectedUserRef.current = selectedUser;

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      setConnected(true);
      socket.emit('admin_get_user_list');
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onAdminUserList(list: ThreadSummary[]) {
      setSummaries(list);
    }
    function onDmMessage(message: ChatMessage) {
      if (!message.threadId) return;
      const [a, b] = message.threadId.split('::');
      const peer = a === 'admin' ? b : a;

      setThreads((prev) => ({ ...prev, [peer]: [...(prev[peer] || []), message] }));

      if (message.username !== 'admin' && selectedUserRef.current !== peer) {
        setUnread((prev) => ({ ...prev, [peer]: (prev[peer] || 0) + 1 }));
      }
    }
    function onThreadCleared({ peer }: { peer: string }) {
      setThreads((prev) => ({ ...prev, [peer]: [] }));
    }
    function onMessageDeleted({ messageId }: { messageId: string }) {
      setThreads((prev) => {
        const next: Record<string, ChatMessage[]> = {};
        Object.entries(prev).forEach(([k, msgs]) => {
          next[k] = msgs.filter((m) => m.id !== messageId);
        });
        return next;
      });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('admin_user_list', onAdminUserList);
    socket.on('dm_message', onDmMessage);
    socket.on('dm_thread_cleared', onThreadCleared);
    socket.on('message_deleted', onMessageDeleted);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('admin_user_list', onAdminUserList);
      socket.off('dm_message', onDmMessage);
      socket.off('dm_thread_cleared', onThreadCleared);
      socket.off('message_deleted', onMessageDeleted);
    };
  }, []);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, selectedUser]);

  const selectUser = (username: string) => {
    setSelectedUser(username);
    setUnread((prev) => ({ ...prev, [username]: 0 }));
    setShowPeerList(false);
    if (!threads[username]) {
      getSocket().emit('dm_get_thread', username, (history: ChatMessage[]) => {
        setThreads((prev) => ({ ...prev, [username]: history }));
      });
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedUser) return;
    getSocket().emit('dm_send', { targetUsername: selectedUser, text });
    setDraft('');
  };

  const handleEmojiSelect = (emoji: string) => {
    setDraft((prev) => prev + emoji);
  };

  const handleStickerSend = (sticker: string) => {
    if (!selectedUser) return;
    getSocket().emit('dm_send', { targetUsername: selectedUser, text: sticker });
  };

  const handleAction = (action: string, targetUsername: string) => {
    getSocket().emit('admin_action', { action, targetUsername });
  };

  const handleDelete = (messageId: string) => {
    if (!selectedUser) return;
    getSocket().emit('delete_message', { scope: 'dm', key: selectedUser, messageId });
  };

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const selectedSummary = summaries.find((s) => s.username === selectedUser);
  const messages = selectedUser ? threads[selectedUser] || [] : [];

  return (
    <div className="flex h-screen" style={{ background: 'var(--background)' }}>
      {/* Conversation list */}
      <aside className="flex w-72 flex-col border-r" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
        <div className="border-b p-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`presence-dot h-2 w-2 rounded-full ${connected ? '' : 'opacity-30'}`}
                style={{ background: connected ? 'var(--accent)' : 'var(--text-secondary)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {connected ? 'Connected' : 'Reconnecting…'}
              </span>
            </div>
            <ThemeToggle />
          </div>
          <h2 className="mt-2 text-base font-semibold">Admin dashboard</h2>
        </div>

        <div className="flex-1 overflow-y-auto chat-scroll">
          {summaries.length === 0 && (
            <p className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              No users yet.
            </p>
          )}
          {summaries.map((s) => (
            <button
              key={s.username}
              onClick={() => selectUser(s.username)}
              className="flex w-full items-start gap-2 border-b px-4 py-3 text-left transition-colors"
              style={{
                borderColor: 'var(--border-subtle)',
                background: selectedUser === s.username ? 'var(--bg-elevated)' : 'transparent',
              }}
            >
              <span
                className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: s.online ? '#3fbf63' : 'var(--border-subtle)' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{s.username}</span>
                  {s.muted && <span className="text-[10px]" title="Muted">🔇</span>}
                  {s.banned && <span className="text-[10px]" title="Banned">⛔</span>}
                </div>
                {s.lastMessage && (
                  <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {s.lastMessage.fromUsername === 'admin' ? 'You: ' : ''}
                    {s.lastMessage.text}
                  </p>
                )}
              </div>
              {unread[s.username] > 0 && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ background: '#e0473f', color: 'white' }}
                >
                  {unread[s.username]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="border-t p-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={onLeave}
            className="w-full cursor-pointer font-bold p-5 rounded-lg border py-2 text-base transition-colors hover:border-[var(--accent)]"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Conversation view */}
      <div className="flex flex-1 flex-col">
        {selectedUser ? (
          <>
            <div className="flex items-center justify-between border-b px-6 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h3 className="text-sm font-semibold">{selectedUser}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {selectedSummary?.online ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedSummary?.muted ? (
                  <button
                    onClick={() => handleAction('unmute', selectedUser)}
                    className="rounded-md border px-2.5 py-1 text-xs transition-colors hover:border-[var(--accent)]"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                  >
                    Unmute
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('mute', selectedUser)}
                    className="rounded-md border px-2.5 py-1 text-xs transition-colors hover:border-[var(--accent)]"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                  >
                    Mute
                  </button>
                )}
                <button
                  onClick={() => handleAction('kick', selectedUser)}
                  className="rounded-md border px-2.5 py-1 text-xs transition-colors hover:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  Kick
                </button>
                {selectedSummary?.banned ? (
                  <button
                    onClick={() => handleAction('unban', selectedUser)}
                    className="rounded-md border px-2.5 py-1 text-xs transition-colors hover:border-[var(--accent)]"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                  >
                    Unban
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`Ban ${selectedUser}? They will be disconnected and unable to log back in.`)) {
                        handleAction('ban', selectedUser);
                      }
                    }}
                    className="rounded-md border px-2.5 py-1 text-xs transition-colors hover:border-red-400"
                    style={{ borderColor: 'var(--border-subtle)', color: '#e0473f' }}
                  >
                    Ban
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Close conversation with ${selectedUser}? This clears their chat history with you.`)) {
                      handleAction('close_conversation', selectedUser);
                    }
                  }}
                  className="rounded-md border px-2.5 py-1 text-xs transition-colors hover:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto chat-scroll px-6 py-5">
              <div className="mx-auto flex max-w-2xl flex-col gap-3">
                {messages.length === 0 && (
                  <p className="mt-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No messages in this conversation yet.
                  </p>
                )}
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isSelf={m.username === 'admin'}
                    displayName={m.username}
                    onDelete={() => handleDelete(m.id)}
                  />
                ))}
                <div ref={feedEndRef} />
              </div>
            </div>

            <form onSubmit={handleSend} className="px-6 pb-6">
              <div className="mx-auto flex max-w-2xl items-center gap-2">
                <EmojiPicker onSelect={handleEmojiSelect} />
                <StickerPicker onSend={handleStickerSend} />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${selectedUser}…`}
                  maxLength={1000}
                  disabled={!connected}
                  className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent)] disabled:opacity-50"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'var(--foreground)' }}
                />
                <button
                  type="submit"
                  disabled={!connected || !draft.trim()}
                  className="rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Select a conversation from the left to start chatting.
            </p>
          </div>
        )}
      </div>

      {/* Corner notification icon: lets admin handle a new incoming DM without leaving
          whatever conversation is open in the main panel.
          - Exactly one sender waiting -> clicking opens a small popup to reply right there.
          - Multiple senders waiting -> clicking shows a list; picking a name jumps the
            main panel to that user's conversation. */}
      {totalUnread > 0 && !popupPeer && (
        <button
          onClick={() => {
            const peersWithUnread = Object.entries(unread)
              .filter(([, count]) => count > 0)
              .map(([peer]) => peer);
            if (peersWithUnread.length === 1) {
              setPopupPeer(peersWithUnread[0]);
              setShowPeerList(false);
            } else if (peersWithUnread.length > 1) {
              setShowPeerList((prev) => !prev);
            }
          }}
          className="fixed bottom-6 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
          style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          title="New messages from users"
        >
          <span className="text-lg">💬</span>
          <span
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: '#e0473f', color: 'white' }}
          >
            {totalUnread}
          </span>
        </button>
      )}

      {showPeerList && !popupPeer && (
        <div
          className="fixed bottom-[76px] right-6 z-30 w-60 overflow-hidden rounded-xl border shadow-2xl"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
        >
          <p
            className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            New messages
          </p>
          {Object.entries(unread)
            .filter(([, count]) => count > 0)
            .map(([peer, count]) => (
              <button
                key={peer}
                onClick={() => selectUser(peer)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <span className="flex items-center gap-2">
                  <span className="presence-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                  <span className="truncate">{peer}</span>
                </span>
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ background: '#e0473f', color: 'white' }}
                >
                  {count}
                </span>
              </button>
            ))}
        </div>
      )}

      {popupPeer && (
        <div className="fixed bottom-6 right-6 z-30">
          <DMPopup
            selfUsername="admin"
            peerUsername={popupPeer}
            onClose={() => {
              setUnread((prev) => ({ ...prev, [popupPeer]: 0 }));
              setPopupPeer(null);
            }}
            canDelete
          />
        </div>
      )}
    </div>
  );
}
