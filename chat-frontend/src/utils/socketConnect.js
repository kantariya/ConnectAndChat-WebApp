// src/utils/socket.js
import { io } from "socket.io-client";

let socket;

export function getConnectSocket() {
  if (!socket) {
    const socketURL =
      import.meta.env.NODE_ENV === "production"
        ? "/"
        : import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

    socket = io(socketURL, {
      withCredentials: true,
      transports: ["websocket"],
    });
  }
  return socket;
}
