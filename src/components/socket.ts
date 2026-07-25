import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function createSocket(token?: string) {
  if (socket) return socket;
  const url = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:4000";
  socket = io(url, {
    auth: { token },
    transports: ["websocket"],
  });
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not initialized. Call createSocket first.");
  return socket;
}
