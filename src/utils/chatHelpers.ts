import type { ChatRoom, Contact } from "../types/chat";

// 🔹 HELPER FUNCTIONS

export const formatRoomsToContacts = (
  rooms: ChatRoom[],
  currentUserId: string
): Contact[] => {
  const contactsList: Contact[] = [];

  rooms.forEach((room) => {
    const userIds = room.room_id.split("_");

    // Tentukan last activity berdasarkan last message
    const lastActivity = room.last_message_created_at ?? room.room_created;

    // === PRIVATE CHAT (1_2 format) ===
    if (!room.is_group && userIds.length === 2) {
      const otherUserId = userIds.find((id) => id !== currentUserId.toString());

      if (otherUserId) {
        contactsList.push({
          user_id: otherUserId,
          room_id: room.room_id,
          name: room.full_name ?? "",
          email: room.email ?? "",
          unread: room.unread ?? 0,
          last_activity: lastActivity,
          is_group: false,
          last_message: room.last_message ?? "",
          last_message_type: room.last_message_type ?? "text",
        });
      }
    }

    // === GROUP CHAT ===
    if (room.is_group) {
      contactsList.push({
        user_id: null,
        room_id: room.room_id,
        name: room.full_name ?? "Group Chat",
        email: null,
        unread: room.unread ?? 0,
        last_activity: lastActivity,
        is_group: true,
        last_message: room.last_message ?? "",
        last_message_type: room.last_message_type ?? "text",
      });
    }
  });

  // Sorting berdasarkan last activity terbaru
  return contactsList.sort((a, b) => {
    if (!a.last_activity && !b.last_activity) return 0;
    if (!a.last_activity) return 1;
    if (!b.last_activity) return -1;

    return (
      new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
    );
  });
};

// 🔹 ERROR HANDLING CONFIG
export const errorConfig = {
  "mark-read-error": { showAlert: false, logLevel: "warn" },
  "send-error": { showAlert: true, logLevel: "error" },
  default: { showAlert: true, logLevel: "error" },
} as const;

export const handleChatError = (data: any) => {
  const config =
    errorConfig[data.type as keyof typeof errorConfig] || errorConfig.default;

  if (config.logLevel == "warn") {
    console.warn(`${data.type}:`, data.details);
  } else {
    console.error(`${data.type}:`, data.details);
  }

  if (config.showAlert && !data.message.includes("mark messages as read")) {
    alert("Error: " + data.message);
  }
};
