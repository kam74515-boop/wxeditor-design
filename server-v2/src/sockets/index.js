const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    socket.on('join-document', (data) => {
      socket.join(data.documentId);
      socket.to(data.documentId).emit('user-joined', {
        user: { id: socket.userId, name: data.userInfo?.name || 'Anonymous' },
      });
    });

    socket.on('leave-document', (data) => {
      socket.leave(data.documentId);
      socket.to(data.documentId).emit('user-left', { userId: socket.userId });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
