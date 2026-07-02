'use client';

import DMThread from './DMThread';

interface DMPopupProps {
  selfUsername: string;
  peerUsername: string;
  peerLabel?: string; // display override, e.g. "Admin"
  onClose: () => void;
  canDelete?: boolean;
}

/**
 * Small floating chat window (bottom-right corner). Used for a quick reply
 * without leaving whatever conversation is open in the main panel.
 */
export default function DMPopup({ selfUsername, peerUsername, peerLabel, onClose, canDelete }: DMPopupProps) {
  return (
    <div
      className="flex h-[420px] w-80 flex-col overflow-hidden rounded-2xl border shadow-2xl"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="presence-dot h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold">{peerLabel ?? peerUsername}</h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-sm transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-secondary)' }}
          title="Close"
        >
          ✕
        </button>
      </div>

      <DMThread selfUsername={selfUsername} peerUsername={peerUsername} peerLabel={peerLabel} canDelete={canDelete} />
    </div>
  );
}
