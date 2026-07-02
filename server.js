const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.argv[2] !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ---------------------------------------------------------------------------
// In-memory state. Resets on server restart. Not for production multi-instance
// use — swap for Redis/DB + the Socket.io Redis adapter if you scale out.
// ---------------------------------------------------------------------------

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// All known users. username (lowercase key) -> { username, password, role }
const users = new Map();
users.set(ADMIN_USERNAME, { username: ADMIN_USERNAME, password: ADMIN_PASSWORD, role: 'admin' });

// Moderation state
const mutedUsers = new Set();
const bannedUsers = new Set();

// Public rooms
const rooms = new Map(); // roomName -> Map<socketId, { username }>
const roomHistory = new Map(); // roomName -> messages[]
const MAX_ROOM_HISTORY = 50;

// Generic 1:1 DM threads (covers user<->admin AND user<->user).
// Thread key is a canonical, order-independent string built from both usernames.
const dmHistory = new Map(); // threadId -> messages[]
const MAX_DM_HISTORY = 100;

// Live socket bookkeeping
const socketsByUsername = new Map(); // username -> Set<socketId> (multi-tab support)
const socketMeta = new Map(); // socketId -> { username, role, currentRoom }
const adminSockets = new Set();

function nowId(prefix) {
  return `${Date.now()}-${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function threadIdFor(userA, userB) {
  return [userA, userB].sort().join('::');
}

function otherParty(threadId, username) {
  const [a, b] = threadId.split('::');
  return a === username ? b : a;
}

function getRoomUserList(room) {
  const map = rooms.get(room);
  if (!map) return [];
  return Array.from(map.values()).map((u) => u.username);
}

function pushHistory(historyMap, key, message, max) {
  if (!historyMap.has(key)) historyMap.set(key, []);
  const hist = historyMap.get(key);
  hist.push(message);
  if (hist.length > max) hist.shift();
  return hist;
}

function emitToUser(io, username, event, payload) {
  const socketIds = socketsByUsername.get(username);
  if (!socketIds) return;
  socketIds.forEach((id) => io.to(id).emit(event, payload));
}

function emitToAdmins(io, event, payload) {
  adminSockets.forEach((id) => io.to(id).emit(event, payload));
}

// All DM threads a given user participates in, with last message preview.
function getThreadSummariesFor(username) {
  const summaries = [];
  dmHistory.forEach((messages, threadId) => {
    const [a, b] = threadId.split('::');
    if (a !== username && b !== username) return;
    const peer = a === username ? b : a;
    const last = messages[messages.length - 1];
    summaries.push({
      username: peer,
      online: socketsByUsername.has(peer),
      muted: mutedUsers.has(peer),
      banned: bannedUsers.has(peer),
      lastMessage: last ? { text: last.text, timestamp: last.timestamp, fromUsername: last.username } : null,
    });
  });
  return summaries;
}

// Admin's view: every non-admin user who has a thread with admin OR is online.
function getAdminUserSummaries() {
  const usernames = new Set();
  dmHistory.forEach((_messages, threadId) => {
    const [a, b] = threadId.split('::');
    if (a === ADMIN_USERNAME) usernames.add(b);
    else if (b === ADMIN_USERNAME) usernames.add(a);
  });
  socketsByUsername.forEach((_set, username) => {
    if (username !== ADMIN_USERNAME) usernames.add(username);
  });

  const summaries = [];
  usernames.forEach((username) => {
    const threadId = threadIdFor(ADMIN_USERNAME, username);
    const hist = dmHistory.get(threadId) || [];
    const last = hist[hist.length - 1];
    summaries.push({
      username,
      online: socketsByUsername.has(username),
      muted: mutedUsers.has(username),
      banned: bannedUsers.has(username),
      lastMessage: last ? { text: last.text, timestamp: last.timestamp, fromUsername: last.username } : null,
    });
  });
  summaries.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
  return summaries;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    socketMeta.set(socket.id, { username: null, role: null, currentRoom: null });

    function attachSession(username, role) {
      const meta = socketMeta.get(socket.id);
      meta.username = username;
      meta.role = role;

      if (!socketsByUsername.has(username)) socketsByUsername.set(username, new Set());
      socketsByUsername.get(username).add(socket.id);

      if (role === 'admin') adminSockets.add(socket.id);
    }

    function sendPostLoginPayload(username, role) {
      if (role === 'admin') {
        socket.emit('admin_user_list', getAdminUserSummaries());
      } else {
        emitToAdmins(io, 'admin_user_list', getAdminUserSummaries());
        socket.emit('dm_thread_list', getThreadSummariesFor(username));
        socket.emit('moderation_status', { muted: mutedUsers.has(username) });
      }
    }

    // ---- Auth: register/login -------------------------------------------
    socket.on('login', ({ username, password }, callback) => {
      username = (username || '').trim();
      password = password || '';
      const key = username.toLowerCase();

      if (!username || !password) {
        callback?.({ ok: false, error: 'Username and password are required.' });
        return;
      }
      if (bannedUsers.has(username)) {
        callback?.({ ok: false, error: 'This account has been banned.' });
        return;
      }

      let record = users.get(key);
      if (!record) {
        record = { username, password, role: key === ADMIN_USERNAME ? 'admin' : 'user' };
        users.set(key, record);
      } else if (record.password !== password) {
        callback?.({ ok: false, error: 'Incorrect password.' });
        return;
      }

      attachSession(record.username, record.role);
      callback?.({ ok: true, username: record.username, role: record.role });
      sendPostLoginPayload(record.username, record.role);
    });

    // Explicit registration: rejects if the username already exists (case-insensitive),
    // regardless of password — this is what "username must be unique" requires.
    socket.on('register', ({ username, password }, callback) => {
      username = (username || '').trim();
      password = password || '';
      const key = username.toLowerCase();

      if (!username || !password) {
        callback?.({ ok: false, error: 'Username and password are required.' });
        return;
      }
      if (users.has(key)) {
        callback?.({ ok: false, error: 'User already exists.' });
        return;
      }

      const record = { username, password, role: key === ADMIN_USERNAME ? 'admin' : 'user' };
      users.set(key, record);

      attachSession(record.username, record.role);
      callback?.({ ok: true, username: record.username, role: record.role });
      sendPostLoginPayload(record.username, record.role);
    });

    // Restore a session after a page refresh, using the username saved client-side.
    // No password needed since the browser already proved it once this page-load... actually
    // we still require the password was remembered too, for this demo-level auth scheme.
    socket.on('resume_session', ({ username, password }, callback) => {
      username = (username || '').trim();
      password = password || '';
      const key = username.toLowerCase();

      if (!username || !password) {
        callback?.({ ok: false });
        return;
      }
      if (bannedUsers.has(username)) {
        callback?.({ ok: false, error: 'This account has been banned.' });
        return;
      }
      const record = users.get(key);
      if (!record || record.password !== password) {
        callback?.({ ok: false });
        return;
      }

      attachSession(record.username, record.role);
      callback?.({ ok: true, username: record.username, role: record.role });
      sendPostLoginPayload(record.username, record.role);
    });

    // ---- Public rooms -------------------------------------------------------
    socket.on('join_room', ({ room }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta?.username) return;
      const username = meta.username;

      if (meta.currentRoom) {
        socket.leave(meta.currentRoom);
        const prevMap = rooms.get(meta.currentRoom);
        if (prevMap) {
          prevMap.delete(socket.id);
          io.to(meta.currentRoom).emit('user_list', getRoomUserList(meta.currentRoom));
        }
      }

      meta.currentRoom = room;
      socket.join(room);

      if (!rooms.has(room)) rooms.set(room, new Map());
      rooms.get(room).set(socket.id, { username });

      socket.emit('history', roomHistory.get(room) || []);
      io.to(room).emit('user_list', getRoomUserList(room));
      socket.to(room).emit('system_message', {
        id: nowId('join'),
        text: `${username} joined the room`,
        timestamp: Date.now(),
      });
    });

    socket.on('send_message', ({ room, text }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta?.username || !room || !text) return;
      if (mutedUsers.has(meta.username)) {
        socket.emit('moderation_notice', { text: 'You are muted and cannot send messages.' });
        return;
      }

      const message = {
        id: nowId('msg'),
        username: meta.username,
        text,
        timestamp: Date.now(),
      };
      pushHistory(roomHistory, room, message, MAX_ROOM_HISTORY);
      io.to(room).emit('receive_message', message);
    });

    socket.on('typing', ({ room, isTyping }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta?.username || !room) return;
      socket.to(room).emit('typing_update', { username: meta.username, isTyping });
    });

    // ---- Generic direct messages (user<->admin, user<->user) ---------------
    socket.on('dm_send', ({ targetUsername, text }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta?.username || !targetUsername || !text) return;
      if (mutedUsers.has(meta.username)) {
        socket.emit('moderation_notice', { text: 'You are muted and cannot send messages.' });
        return;
      }

      const threadId = threadIdFor(meta.username, targetUsername);
      const message = {
        id: nowId('dm'),
        username: meta.username,
        text,
        timestamp: Date.now(),
        threadId,
      };
      pushHistory(dmHistory, threadId, message, MAX_DM_HISTORY);

      emitToUser(io, targetUsername, 'dm_message', message);
      emitToUser(io, meta.username, 'dm_message', message);

      // Keep both sides' thread lists fresh
      emitToUser(io, targetUsername, 'dm_thread_list', getThreadSummariesFor(targetUsername));
      emitToUser(io, meta.username, 'dm_thread_list', getThreadSummariesFor(meta.username));

      if (meta.username === ADMIN_USERNAME || targetUsername === ADMIN_USERNAME) {
        emitToAdmins(io, 'admin_user_list', getAdminUserSummaries());
      }
    });

    socket.on('dm_typing', ({ targetUsername, isTyping }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta?.username || !targetUsername) return;
      emitToUser(io, targetUsername, 'dm_typing_update', { from: meta.username, isTyping });
    });

    // Fetch full history for a specific thread (lazy-load when opening a conversation)
    socket.on('dm_get_thread', (targetUsername, callback) => {
      const meta = socketMeta.get(socket.id);
      if (!meta?.username) return;
      const threadId = threadIdFor(meta.username, targetUsername);
      callback?.(dmHistory.get(threadId) || []);
    });

    socket.on('dm_get_thread_list', () => {
      const meta = socketMeta.get(socket.id);
      if (!meta?.username) return;
      socket.emit('dm_thread_list', getThreadSummariesFor(meta.username));
    });

    // ---- Admin moderation controls ---------------------------------------
    socket.on('admin_action', ({ action, targetUsername }) => {
      const meta = socketMeta.get(socket.id);
      if (meta?.role !== 'admin' || !targetUsername) return;

      switch (action) {
        case 'mute':
          mutedUsers.add(targetUsername);
          emitToUser(io, targetUsername, 'moderation_status', { muted: true });
          break;
        case 'unmute':
          mutedUsers.delete(targetUsername);
          emitToUser(io, targetUsername, 'moderation_status', { muted: false });
          break;
        case 'kick': {
          const ids = socketsByUsername.get(targetUsername);
          if (ids) {
            ids.forEach((id) => {
              io.to(id).emit('force_disconnect', { reason: 'You were disconnected by an admin.' });
              io.sockets.sockets.get(id)?.disconnect(true);
            });
          }
          break;
        }
        case 'ban': {
          bannedUsers.add(targetUsername);
          const ids = socketsByUsername.get(targetUsername);
          if (ids) {
            ids.forEach((id) => {
              io.to(id).emit('force_disconnect', { reason: 'You have been banned.' });
              io.sockets.sockets.get(id)?.disconnect(true);
            });
          }
          break;
        }
        case 'unban':
          bannedUsers.delete(targetUsername);
          break;
        case 'close_conversation': {
          const threadId = threadIdFor(ADMIN_USERNAME, targetUsername);
          dmHistory.set(threadId, []);
          emitToUser(io, targetUsername, 'dm_thread_cleared', { peer: ADMIN_USERNAME });
          emitToAdmins(io, 'dm_thread_cleared', { peer: targetUsername });
          break;
        }
        default:
          return;
      }

      emitToAdmins(io, 'admin_user_list', getAdminUserSummaries());
    });

    // Delete a single message: works for public room messages and DM messages
    socket.on('delete_message', ({ scope, key, messageId }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta?.username) return;

      if (scope === 'room') {
        if (meta.role !== 'admin') return; // only admin can delete room messages
        const hist = roomHistory.get(key);
        if (hist) {
          const idx = hist.findIndex((m) => m.id === messageId);
          if (idx !== -1) hist.splice(idx, 1);
        }
        io.to(key).emit('message_deleted', { messageId });
      } else if (scope === 'dm') {
        // key is the other party's username; verify the requester is actually in this thread (or is admin)
        const threadId = threadIdFor(meta.username, key);
        if (meta.role !== 'admin' && !dmHistory.has(threadId)) return;
        const hist = dmHistory.get(threadId);
        if (hist) {
          const idx = hist.findIndex((m) => m.id === messageId);
          if (idx !== -1) hist.splice(idx, 1);
        }
        emitToUser(io, key, 'message_deleted', { messageId });
        emitToUser(io, meta.username, 'message_deleted', { messageId });
      }
    });

    socket.on('admin_get_user_list', () => {
      const meta = socketMeta.get(socket.id);
      if (meta?.role !== 'admin') return;
      socket.emit('admin_user_list', getAdminUserSummaries());
    });

    // ---- Disconnect -------------------------------------------------------
    socket.on('disconnect', () => {
      const meta = socketMeta.get(socket.id);
      if (meta?.username) {
        const set = socketsByUsername.get(meta.username);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) socketsByUsername.delete(meta.username);
        }
        adminSockets.delete(socket.id);

        if (meta.currentRoom) {
          const roomMap = rooms.get(meta.currentRoom);
          if (roomMap) {
            roomMap.delete(socket.id);
            io.to(meta.currentRoom).emit('user_list', getRoomUserList(meta.currentRoom));
            socket.to(meta.currentRoom).emit('system_message', {
              id: nowId('leave'),
              text: `${meta.username} left the room`,
              timestamp: Date.now(),
            });
          }
        }

        if (meta.role !== 'admin') {
          emitToAdmins(io, 'admin_user_list', getAdminUserSummaries());
        }
      }
      socketMeta.delete(socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Admin login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  });
});
