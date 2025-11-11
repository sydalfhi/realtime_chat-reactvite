import { ChatRoom, Contact } from "../types/chat";

// 🔹 HELPER FUNCTIONS
export const formatRoomsToContacts = (
  rooms: ChatRoom[],
  currentUserId: string
): Contact[] => {
  const contactsList: Contact[] = [];

  rooms.forEach((room) => {
    const userIds = room.room_id.split("_");

    if (userIds.length === 2) {
      const otherUserId = userIds.find((id) => id !== currentUserId.toString());

      if (otherUserId) {
        contactsList.push({
          user_id: otherUserId,
          room_id: room.room_id,
          last_activity: room.created_at,
        });
      }
    }
  });

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

  if (config.logLevel === "warn") {
    console.warn(`${data.type}:`, data.details);
  } else {
    console.error(`${data.type}:`, data.details);
  }

  if (config.showAlert && !data.message.includes("mark messages as read")) {
    alert("Error: " + data.message);
  }
};
