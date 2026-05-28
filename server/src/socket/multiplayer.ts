import type { Server } from 'socket.io';
import type { Socket } from 'socket.io';

type RoomState = {
  hostId: string;
  guestId?: string;
};

const rooms = new Map<string, RoomState>();

function randomRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function findRoomBySocket(socketId: string): string | undefined {
  for (const [roomId, room] of rooms.entries()) {
    if (room.hostId === socketId || room.guestId === socketId) {
      return roomId;
    }
  }
  return undefined;
}

export function wireMultiplayer(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on('createRoom', (ack?: (payload: { roomId: string }) => void) => {
      let roomId = randomRoomId();
      while (rooms.has(roomId)) {
        roomId = randomRoomId();
      }

      rooms.set(roomId, { hostId: socket.id });
      socket.join(roomId);
      ack?.({ roomId });
      socket.emit('startMatch', { roomId, side: 'left', isHost: true });
    });

    socket.on('joinRoom', (payload: { roomId: string }, ack?: (response: { ok: boolean; message?: string }) => void) => {
      const room = rooms.get(payload.roomId);

      if (!room) {
        ack?.({ ok: false, message: 'Room not found.' });
        return;
      }

      if (room.guestId) {
        ack?.({ ok: false, message: 'Room is full.' });
        return;
      }

      room.guestId = socket.id;
      socket.join(payload.roomId);

      io.to(payload.roomId).emit('startMatch', { roomId: payload.roomId, side: 'right', isHost: false });
      io.to(room.hostId).emit('opponentReady', { roomId: payload.roomId });
      ack?.({ ok: true });
    });

    socket.on('paddleMove', (payload: { roomId: string; side: 'left' | 'right'; y: number }) => {
      socket.to(payload.roomId).emit('paddleMove', payload);
    });

    socket.on('ballSync', (payload: { roomId: string; x: number; y: number; vx: number; vy: number }) => {
      socket.to(payload.roomId).emit('ballSync', payload);
    });

    socket.on('scoreUpdate', (payload: { roomId: string; left: number; right: number }) => {
      socket.to(payload.roomId).emit('scoreUpdate', payload);
    });

    socket.on('disconnect', () => {
      const roomId = findRoomBySocket(socket.id);

      if (!roomId) {
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        return;
      }

      io.to(roomId).emit('playerDisconnected', { roomId });
      rooms.delete(roomId);
    });
  });
}
