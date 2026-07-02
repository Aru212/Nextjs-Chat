'use client';

import { useState } from 'react';
import { Role } from '@/types/chat';

interface LoginScreenProps {
  onSubmit: (mode: 'login' | 'register', username: string, password: string) => Promise<{ ok: boolean; role?: Role; error?: string }>;
}

export default function LoginScreen({ onSubmit }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const u = username.trim();
    if (!u || !password) {
      setError('Enter a username and password.');
      return;
    }
    setLoading(true);
    const result = await onSubmit(mode, u, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'Something went wrong.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="mb-6 flex items-center gap-2">
          <span className="presence-dot h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <h1 className="text-lg font-semibold tracking-tight">Live Chat</h1>
        </div>

        <div className="mb-5 flex rounded-lg border p-1" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className="flex-1 rounded-md py-1.5 text-sm font-medium transition-colors"
            style={{
              background: mode === 'login' ? 'var(--bg-elevated)' : 'transparent',
              color: mode === 'login' ? 'var(--foreground)' : 'var(--text-secondary)',
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className="flex-1 rounded-md py-1.5 text-sm font-medium transition-colors"
            style={{
              background: mode === 'register' ? 'var(--bg-elevated)' : 'transparent',
              color: mode === 'register' ? 'var(--foreground)' : 'var(--text-secondary)',
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Username
            </label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. priya or admin"
              maxLength={24}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)]"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', color: 'var(--foreground)' }}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'login'
              ? <>Don&apos;t have an account? Switch to &quot;Create account&quot; above.</>
              : <>Usernames must be unique — pick one nobody else has used.</>}
            <br />
            Admin login: <span className="font-mono">admin / admin123</span>
          </p>
        </form>
      </div>
    </div>
  );
}
