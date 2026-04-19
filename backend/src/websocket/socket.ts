import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[socket] User ${userId} connected (${socket.id})`);
    }

    socket.on('disconnect', () => {
      console.log(`[socket] User ${userId ?? 'unknown'} disconnected (${socket.id})`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToUser(userId: number, event: string, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}
