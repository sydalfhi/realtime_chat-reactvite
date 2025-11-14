import { io } from "socket.io-client";

const SOCKET_URL = "http://192.168.100.14:3000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

// Debugging events
socket.on("connect", () => {
  console.log("🟢 Connected to server:", socket.id);
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected from server");
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error);
});
