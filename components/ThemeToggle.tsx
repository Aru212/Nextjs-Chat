'use client';

import { useTheme } from '@/lib/theme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="cursor-pointer flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm transition-colors hover:border-[var(--accent)]"
      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
