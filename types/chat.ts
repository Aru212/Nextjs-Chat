export type Role = 'admin' | 'user';

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  threadId?: string; // present on DM messages: canonical "userA::userB" key
}

export interface SystemMessage {
  id: string;
  text: string;
  timestamp: number;
}

export interface TypingUpdate {
  username: string;
  isTyping: boolean;
}

export type FeedItem =
  | { kind: 'message'; data: ChatMessage }
  | { kind: 'system'; data: SystemMessage };

export interface ThreadSummary {
  username: string; // the other party in the thread
  online: boolean;
  muted: boolean;
  banned: boolean;
  lastMessage: { text: string; timestamp: number; fromUsername: string } | null;
}

export interface LoginResult {
  ok: boolean;
  username?: string;
  role?: Role;
  error?: string;
}
