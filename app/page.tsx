'use client';

import { useEffect, useState } from 'react';
import LoginScreen from '@/components/LoginScreen';
import ChatRoom from '@/components/ChatRoom';
import AdminDashboard from '@/components/AdminDashboard';
import { getSocket, resetSocket } from '@/lib/socket';
import { Role } from '@/types/chat';
import { loadSession, saveSession, clearSession } from '@/lib/session';

interface Session {
  username: string;
  role: Role;
}

type AuthResult = { ok: boolean; role?: Role; error?: string };

// 'checking' = attempting to silently resume a saved session (prevents a flash of the login screen
// on refresh). 'ready' = resume attempt finished (succeeded or not) and we know what to show.
type Phase = 'checking' | 'ready';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>('checking');

  useEffect(() => {
    const saved = loadSession();
    if (!saved) {
      setPhase('ready');
      return;
    }

    const socket = getSocket();

    const attemptResume = () => {
      socket.emit('resume_session', saved, (result: AuthResult) => {
        if (result.ok && result.role) {
          setSession({ username: saved.username, role: result.role });
        } else {
          // Saved credentials no longer valid (e.g. banned, or server restarted and lost state) —
          // clear them so the user isn't stuck retrying a dead session.
          clearSession();
        }
        setPhase('ready');
      });
    };

    if (socket.connected) {
      attemptResume();
    } else {
      socket.once('connect', attemptResume);
    }
  }, []);

  const handleAuthSubmit = (mode: 'login' | 'register', username: string, password: string) => {
    return new Promise<AuthResult>((resolve) => {
      const socket = getSocket();
      const event = mode === 'login' ? 'login' : 'register';

      const attempt = () => {
        socket.emit(event, { username, password }, (result: AuthResult) => {
          if (result.ok && result.role) {
            setSession({ username, role: result.role });
            saveSession({ username, password });
          }
          resolve(result);
        });
      };

      if (socket.connected) {
        attempt();
      } else {
        socket.once('connect', attempt);
      }
    });
  };

  const handleLeave = () => {
    clearSession();
    resetSocket();
    setSession(null);
  };

  if (phase === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--background)' }}>
        <span className="presence-dot h-3 w-3 rounded-full" style={{ background: 'var(--accent)' }} />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onSubmit={handleAuthSubmit} />;
  }

  if (session.role === 'admin') {
    return <AdminDashboard onLeave={handleLeave} />;
  }

  return <ChatRoom username={session.username} onLeave={handleLeave} />;
}
