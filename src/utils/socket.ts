import { io } from "socket.io-client";

const SOCKET_URL = "http://192.168.100.14:3000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});
