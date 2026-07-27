import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../config/api";

let socket: Socket | null = null;
let currentToken: string | undefined;

export function createSocket(token?: string) {
  if (socket && currentToken === token) {
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  const url = (process.env.EXPO_PUBLIC_SOCKET_URL || API_BASE_URL).replace(
    /\/+$/,
    "",
  );
  socket = io(url, {
    auth: token ? { token } : undefined,
    transports: ["websocket"],
  });
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not initialized. Call createSocket first.");
  return socket;
}

export function disconnectSocket() {
  if (!socket) {
    currentToken = undefined;
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  currentToken = undefined;
}
