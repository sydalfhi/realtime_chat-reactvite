// src/hooks/useCloseChat.ts
import { useCallback } from "react";
import { socket } from "../utils/socket";
import { useAuthStore } from "../stores/authStore";

export const useCloseChat = () => {
  const { user } = useAuthStore();

  const closeChat = useCallback(() => {
    if (!user) return;

    console.log("🚪 Closing chat and leaving all rooms...");

    // Leave dari semua room chat
    socket.emit("chat:leave", {
      user_id: user.id,
      timestamp: new Date().toISOString(),
    });

    // Reset state terkait chat
    return {
      roomId: "",
      activeRoom: "",
      messages: [],
      message: "",
      replyingTo: null,
      searchQuery: "",
    };
  }, [user]);

  const leaveRoom = useCallback(
    (roomId: string) => {
      if (!user || !roomId) return;

      console.log(`🚪 Leaving room: ${roomId}`);

      socket.emit("chat:leave", {
        room_id: roomId,
        user_id: user.id,
      });

      // Keluar dari room di socket
      socket.off(`chat:receive:${roomId}`);

      return roomId;
    },
    [user]
  );

  return {
    closeChat,
    leaveRoom,
  };
};
