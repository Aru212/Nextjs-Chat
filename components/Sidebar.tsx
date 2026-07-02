'use client';

import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  room: string;
  username: string;
  users: string[];
  connected: boolean;
  muted: boolean;
  isRoomActive: boolean;
  activeDmPeer: string | null;
  dmUnread: Record<string, number>;
  onSelectRoom: () => void;
  onOpenDM: (peer: string) => void;
  onOpenAdminChat: () => void;
  onLogout: () => void;
}

function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
      style={{ background: '#e0473f', color: 'white' }}
    >
      {count}
    </span>
  );
}

export default function Sidebar({
  room,
  username,
  users,
  connected,
  muted,
  isRoomActive,
  activeDmPeer,
  dmUnread,
  onSelectRoom,
  onOpenDM,
  onOpenAdminChat,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      className="flex w-60 flex-col border-r"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
    >
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
        <p className="mt-1 truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
          Signed in as <span className="font-medium" style={{ color: 'var(--foreground)' }}>{username}</span>
        </p>
        {muted && (
          <p className="mt-2 rounded-md px-2 py-1 text-xs" style={{ background: 'var(--bg-elevated)', color: '#e87d4a' }}>
            You are muted by an admin.
          </p>
        )}
      </div>

      <button
        onClick={onSelectRoom}
        className="flex w-full items-center justify-between border-b px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
        style={{
          borderColor: 'var(--border-subtle)',
          background: isRoomActive ? 'var(--bg-elevated)' : 'transparent',
        }}
      >
        <span># {room}</span>
      </button>

      <button
        onClick={onOpenAdminChat}
        className="cursor-pointer flex w-full items-center justify-between border-b px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--accent)',
          background: activeDmPeer === 'admin' ? 'var(--bg-elevated)' : 'transparent',
        }}
      >
        <span>💬 Chat with admin</span>
        <UnreadBadge count={dmUnread['admin'] || 0} />
      </button>

      <div className="flex-1 overflow-y-auto chat-scroll p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Users
        </p>
        <ul className="space-y-1">
          {users
            .filter((u) => u !== username)
            .map((u) => (
              <li key={u}>
                <button
                  onClick={() => onOpenDM(u)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{ background: activeDmPeer === u ? 'var(--bg-elevated)' : 'transparent' }}
                  title={`Message ${u}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="presence-dot h-1.5 w-1.5 rounded-full" style={{ background: '#3fbf63' }} />
                    <span>{u}</span>
                  </span>
                  <UnreadBadge count={dmUnread[u] || 0} />
                </button>
              </li>
            ))}
          {users.filter((u) => u !== username).length === 0 && (
            <p className="px-2 py-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              No other users online.
            </p>
          )}
        </ul>
      </div>

      <div className="border-t p-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={onLogout}
          className="cursor-pointer w-full font-bold rounded-lg border py-2 text-sm transition-colors hover:border-[var(--accent)]"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
